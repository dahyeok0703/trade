import type { ShipmentStatus } from "@/lib/supabase/database.types";

/** Incoterms 2020 — the common rules for small exporters. */
export const INCOTERMS = [
  "EXW",
  "FCA",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
] as const;
export type Incoterm = (typeof INCOTERMS)[number];

export const CURRENCIES = ["USD", "EUR", "JPY", "CNY", "KRW", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

type StatusMeta = {
  label: string;
  badge: "secondary" | "warning" | "teal" | "success";
};

/** Shipment status → Korean label + badge variant. */
export const SHIPMENT_STATUS: Record<ShipmentStatus, StatusMeta> = {
  draft: { label: "작성 중", badge: "secondary" },
  documents_ready: { label: "서류 준비 완료", badge: "teal" },
  shipped: { label: "선적 완료", badge: "warning" },
  done: { label: "완료", badge: "success" },
};

export const SHIPMENT_STATUS_ORDER: ShipmentStatus[] = [
  "draft",
  "documents_ready",
  "shipped",
  "done",
];
