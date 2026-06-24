import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { extractText, getDocumentProxy } from "unpdf";
import * as XLSX from "xlsx";

import {
  EXTRACTION_MODEL,
  FALLBACK_MODEL,
  addUsage,
  type PricedModel,
  type TokenUsage,
} from "@/lib/pricing/cogs";
import {
  extractionSchema,
  LOW_CONFIDENCE_THRESHOLD,
  type ExtractionResult,
} from "@/lib/validations/extraction";

/*
 * ── PII / data minimisation ───────────────────────────────────────────────────
 * We send ONLY the order document content needed to extract line items to the
 * model. Raw documents are never persisted by this module — the request buffer
 * is used in-memory and discarded. Callers should not log document contents.
 * The model extracts items only; it never judges price/compliance/eligibility.
 */

const SYSTEM_PROMPT = `You extract export order line items from a buyer's purchase order, order email, or spreadsheet.

Return ONLY structured data with these fields per item:
- description: the product name/description exactly as written (English if available)
- quantity: numeric quantity ordered (0 if not stated)
- unit: unit of measure (e.g. PC, EA, PR, CTN, SET); use "EA" if unclear
- unit_price: numeric unit price (0 if not stated — do NOT guess)
- currency: ISO currency code if stated (e.g. USD, EUR), else "USD"
- confidence: your extraction confidence for THIS item, 0.0–1.0

Also return overall_confidence (0.0–1.0) and a short notes string.

Rules:
- Extract only. Do NOT judge whether prices are reasonable, whether the order
  is compliant, or whether to proceed. Do NOT invent items, quantities, or prices.
- If a value is missing or unreadable, use 0 (numbers) or a sensible default
  (unit) and lower the confidence. A human will review and correct everything.
- Ignore totals, taxes, shipping lines, and signatures — only real goods lines.`;

const MIN_PDF_TEXT = 40;
const MAX_TEXT_CHARS = 60_000; // guard against oversized inputs

/**
 * JSON Schema for structured outputs — forces JSON-only model output. Plain
 * types only (structured outputs reject min/max-style constraints).
 */
const EXTRACTION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          unit_price: { type: "number" },
          currency: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["description", "quantity", "unit", "unit_price", "currency", "confidence"],
      },
    },
    overall_confidence: { type: "number" },
    notes: { type: "string" },
  },
  required: ["items", "overall_confidence", "notes"],
};

export type PreparedInput = {
  content: Anthropic.ContentBlockParam[];
  /** Human-readable source type for logging/UX. */
  sourceKind: "text" | "image" | "pdf-text" | "pdf-vision" | "spreadsheet";
};

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const SHEET_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]);

function clamp(text: string): string {
  return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
}

function textContent(text: string): Anthropic.ContentBlockParam[] {
  return [{ type: "text", text: `Order document:\n\n${clamp(text)}` }];
}

/**
 * Turns a raw upload (or pasted text) into model content.
 * - PDF → extract text first; fall back to vision (document block) when the PDF
 *   has no extractable text (scanned image).
 * - Image → vision branch.
 * - Spreadsheet → parsed to CSV text.
 * - Plain text / email → text.
 */
export async function prepareInput(args: {
  text?: string;
  file?: { buffer: Buffer; mimeType: string };
}): Promise<PreparedInput> {
  if (args.text && args.text.trim()) {
    return { content: textContent(args.text), sourceKind: "text" };
  }

  if (!args.file) {
    throw new ExtractionError("추출할 입력이 없습니다.", "NO_INPUT");
  }

  const { buffer, mimeType } = args.file;

  if (mimeType === "application/pdf") {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      const joined = Array.isArray(text) ? text.join("\n") : text;
      if (joined && joined.trim().length >= MIN_PDF_TEXT) {
        return { content: textContent(joined), sourceKind: "pdf-text" };
      }
    } catch {
      // fall through to vision
    }
    // Scanned/empty PDF → send the document for vision extraction.
    return {
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
        },
        { type: "text", text: "Extract the order line items from this document." },
      ],
      sourceKind: "pdf-vision",
    };
  }

  if (IMAGE_TYPES.has(mimeType)) {
    return {
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
            data: buffer.toString("base64"),
          },
        },
        { type: "text", text: "Extract the order line items from this image." },
      ],
      sourceKind: "image",
    };
  }

  if (SHEET_TYPES.has(mimeType)) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const name = wb.SheetNames[0];
    const sheet = name ? wb.Sheets[name] : undefined;
    const csv = sheet ? XLSX.utils.sheet_to_csv(sheet) : "";
    return { content: textContent(csv), sourceKind: "spreadsheet" };
  }

  // Treat anything else as UTF-8 text (e.g. .txt, .eml, message/rfc822).
  return { content: textContent(buffer.toString("utf-8")), sourceKind: "text" };
}

export type ExtractionRun = {
  result: ExtractionResult;
  model: PricedModel;
  usage: TokenUsage;
  /** True when the (final) result is below the confidence threshold. */
  lowConfidence: boolean;
};

function toUsage(u: Anthropic.Messages.Usage): TokenUsage {
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadInputTokens: u.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: u.cache_creation_input_tokens ?? 0,
  };
}

async function callModel(
  client: Anthropic,
  model: PricedModel,
  content: Anthropic.ContentBlockParam[],
): Promise<{ parsed: ExtractionResult | null; usage: TokenUsage }> {
  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    // Stable instructions first + cached; volatile document content after.
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
    // Force JSON-only output constrained to the schema.
    output_config: { format: { type: "json_schema", schema: EXTRACTION_JSON_SCHEMA } },
  });

  const usage = toUsage(message.usage);

  // A safety refusal (or truncation) returns no usable JSON.
  if (message.stop_reason === "refusal") return { parsed: null, usage };

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Safe parse: never throw on malformed / partial model output.
  try {
    const result = extractionSchema.safeParse(JSON.parse(text));
    return { parsed: result.success ? result.data : null, usage };
  } catch {
    return { parsed: null, usage };
  }
}

/**
 * Runs extraction on Haiku (fixed). On failure or low confidence, falls back to
 * Sonnet exactly once and keeps whichever result is more confident. Returns the
 * combined token usage so the caller can record it for margin tracking.
 */
export async function runExtraction(
  client: Anthropic,
  content: Anthropic.ContentBlockParam[],
): Promise<ExtractionRun> {
  const first = await callModel(client, EXTRACTION_MODEL, content);
  let usage = first.usage;
  let result = first.parsed;
  let model: PricedModel = EXTRACTION_MODEL;

  const needsFallback = !result || result.overall_confidence < LOW_CONFIDENCE_THRESHOLD;
  if (needsFallback) {
    const second = await callModel(client, FALLBACK_MODEL, content);
    usage = addUsage(usage, second.usage);
    if (
      second.parsed &&
      (!result || second.parsed.overall_confidence >= result.overall_confidence)
    ) {
      result = second.parsed;
      model = FALLBACK_MODEL;
    }
  }

  if (!result) {
    throw new ExtractionError("주문서에서 항목을 추출하지 못했습니다.", "EXTRACTION_FAILED");
  }

  return {
    result,
    model,
    usage,
    lowConfidence: result.overall_confidence < LOW_CONFIDENCE_THRESHOLD,
  };
}

export class ExtractionError extends Error {
  code: string;
  constructor(message: string, code = "EXTRACTION_ERROR") {
    super(message);
    this.name = "ExtractionError";
    this.code = code;
  }
}
