import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { buildDocumentModel } from "@/lib/documents";
import { loadValidationInputs } from "@/lib/data/validations";
import {
  InvoicePdf,
  PackingListPdf,
  CertificateOfOriginPdf,
  type Branding,
} from "@/components/documents/pdf/templates";
import type { TradeDocType } from "@/lib/supabase/database.types";

type DocConfig = {
  docType: TradeDocType;
  prefix: string;
  label: string;
  render: (props: { model: ReturnType<typeof buildDocumentModel>; docNo: string; branding: Branding }) => React.ReactElement;
};

/** URL slug → document config. */
export const DOC_TYPES = {
  invoice: { docType: "commercial_invoice", prefix: "CI", label: "Commercial Invoice", render: InvoicePdf },
  "packing-list": { docType: "packing_list", prefix: "PL", label: "Packing List", render: PackingListPdf },
  "certificate-of-origin": {
    docType: "certificate_of_origin",
    prefix: "CO",
    label: "Certificate of Origin",
    render: CertificateOfOriginPdf,
  },
} satisfies Record<string, DocConfig>;

export type DocSlug = keyof typeof DOC_TYPES;

export function isDocSlug(v: string): v is DocSlug {
  return v in DOC_TYPES;
}

export type RenderedDoc = {
  buffer: Buffer;
  docNo: string;
  filename: string;
  docType: TradeDocType;
  /** The document model captured at render time (for data_snapshot). */
  snapshot: ReturnType<typeof buildDocumentModel>;
};

export type DocMeta = {
  docNo: string;
  docType: TradeDocType;
  snapshot: ReturnType<typeof buildDocumentModel>;
};

/** Builds doc_no + data_snapshot WITHOUT rendering a PDF (for issue history). */
export async function getDocMeta(shipmentId: string, slug: DocSlug): Promise<DocMeta | null> {
  const inputs = await loadValidationInputs(shipmentId);
  if (!inputs) return null;
  const cfg = DOC_TYPES[slug];
  const snapshot = buildDocumentModel(inputs.workspace, inputs.shipment, inputs.buyer, inputs.items);
  return { docNo: `${cfg.prefix}-${inputs.shipment.ref_no}`, docType: cfg.docType, snapshot };
}

/** Renders a shipment's document to a PDF buffer. Returns null if not found. */
export async function renderShipmentPdf(
  shipmentId: string,
  slug: DocSlug,
): Promise<RenderedDoc | null> {
  const inputs = await loadValidationInputs(shipmentId);
  if (!inputs) return null;

  const cfg = DOC_TYPES[slug];
  const model = buildDocumentModel(inputs.workspace, inputs.shipment, inputs.buyer, inputs.items);
  const exporter = (inputs.workspace.exporter_info ?? {}) as Record<string, string>;
  const branding: Branding = { logo: exporter.logo, signature: exporter.signature };
  const docNo = `${cfg.prefix}-${inputs.shipment.ref_no}`;

  const buffer = await renderToBuffer(cfg.render({ model, docNo, branding }));

  return { buffer, docNo, filename: `${docNo}.pdf`, docType: cfg.docType, snapshot: model };
}
