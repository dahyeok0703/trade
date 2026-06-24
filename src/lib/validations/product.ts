import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────────────
 * Server canonical schema.
 * Coerces values from any source (the form sends strings, Excel may send
 * numbers). HS code is stored as reference text only — never validated as a
 * "correct" classification.
 * ──────────────────────────────────────────────────────────────────────────── */

const emptyToUndef = (s: z.ZodString) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), s.optional());

const optionalNonNeg = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().finite("숫자가 올바르지 않습니다.").nonnegative("0 이상이어야 합니다.").optional(),
);

export const productSchema = z.object({
  name_en: z.string().trim().min(1, "영문 품명을 입력해 주세요.").max(200),
  hs_code: emptyToUndef(z.string().trim().max(20)),
  unit: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(20).default("EA"),
  ),
  unit_price_usd: z.coerce
    .number()
    .finite("단가가 올바르지 않습니다.")
    .nonnegative("0 이상이어야 합니다.")
    .default(0),
  net_weight: optionalNonNeg,
  gross_weight: optionalNonNeg,
  dimensions: emptyToUndef(z.string().trim().max(120)),
  origin_country: emptyToUndef(z.string().trim().max(100)),
});

export type ProductInput = z.infer<typeof productSchema>;

/** Bulk import payload — each row is validated individually server-side. */
export const productImportSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1, "가져올 행이 없습니다.").max(2000),
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Client form schema (all-string fields → clean react-hook-form typing).
 * Provides inline UX validation; the server schema above is the source of truth.
 * ──────────────────────────────────────────────────────────────────────────── */

const numericString = (label: string, required = false) =>
  z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (val === "") {
        if (required) ctx.addIssue({ code: "custom", message: `${label}을(를) 입력해 주세요.` });
        return;
      }
      const n = Number(val);
      if (Number.isNaN(n) || !Number.isFinite(n)) {
        ctx.addIssue({ code: "custom", message: `${label}은(는) 숫자여야 합니다.` });
      } else if (n < 0) {
        ctx.addIssue({ code: "custom", message: `${label}은(는) 0 이상이어야 합니다.` });
      }
    });

export const productFormSchema = z.object({
  name_en: z.string().trim().min(1, "영문 품명을 입력해 주세요.").max(200),
  hs_code: z.string().trim().max(20, "HS코드가 너무 깁니다."),
  unit: z.string().trim().min(1, "단위를 입력해 주세요.").max(20),
  unit_price_usd: numericString("단가(USD)", true),
  net_weight: numericString("순중량"),
  gross_weight: numericString("총중량"),
  dimensions: z.string().trim().max(120),
  origin_country: z.string().trim().max(100),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
