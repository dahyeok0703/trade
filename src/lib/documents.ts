import type { Buyer, Shipment, ShipmentItem, Workspace } from "@/lib/supabase/database.types";

/**
 * Document model derived from a shipment + its items.
 *
 * Both the Commercial Invoice and the Packing List are built from THIS single
 * model and the SAME `items` array, so the two documents are structurally
 * consistent by construction — there is no second data entry to drift from.
 */

export type DocTotals = {
  amount: number;
  netWeight: number;
  grossWeight: number;
  ctns: number;
  cbm: number;
  quantity: number;
};

export type DocumentParty = {
  name: string;
  lines: string[];
};

export type DocumentModel = {
  shipper: DocumentParty;
  consignee: DocumentParty;
  notifyParty: DocumentParty;
  refNo: string;
  date: string | null;
  incoterms: string | null;
  currency: string;
  paymentTerms: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  etd: string | null;
  lcNo: string | null;
  items: ShipmentItem[];
  totals: DocTotals;
};

function n(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function computeTotals(items: ShipmentItem[]): DocTotals {
  return items.reduce<DocTotals>(
    (acc, it) => ({
      amount: acc.amount + n(it.amount),
      netWeight: acc.netWeight + n(it.net_weight),
      grossWeight: acc.grossWeight + n(it.gross_weight),
      ctns: acc.ctns + n(it.ctns),
      cbm: acc.cbm + n(it.cbm),
      quantity: acc.quantity + n(it.qty),
    }),
    { amount: 0, netWeight: 0, grossWeight: 0, ctns: 0, cbm: 0, quantity: 0 },
  );
}

function exporterParty(workspace: Workspace): DocumentParty {
  const info = (workspace.exporter_info ?? {}) as Record<string, string>;
  return {
    name: info.company_en || workspace.name,
    lines: [info.address_en, info.tel && `Tel: ${info.tel}`, info.email && `Email: ${info.email}`]
      .filter(Boolean)
      .map(String),
  };
}

function buyerParty(buyer: Buyer | null): DocumentParty {
  if (!buyer) return { name: "—", lines: [] };
  const contact = (buyer.contact ?? {}) as Record<string, string>;
  return {
    name: buyer.name_en,
    lines: [
      buyer.address_en,
      buyer.country,
      contact.person && `Attn: ${contact.person}`,
      contact.email && `Email: ${contact.email}`,
      contact.tel && `Tel: ${contact.tel}`,
    ]
      .filter(Boolean)
      .map(String),
  };
}

function notifyParty(buyer: Buyer | null): DocumentParty {
  if (!buyer) return { name: "—", lines: [] };
  const np = (buyer.notify_party ?? {}) as Record<string, string>;
  // Empty notify party → "Same as consignee" (standard trade convention).
  if (!np.name && !np.address) {
    return { name: "Same as consignee", lines: [] };
  }
  return { name: np.name || buyer.name_en, lines: [np.address].filter(Boolean).map(String) };
}

export function buildDocumentModel(
  workspace: Workspace,
  shipment: Shipment,
  buyer: Buyer | null,
  items: ShipmentItem[],
): DocumentModel {
  return {
    shipper: exporterParty(workspace),
    consignee: buyerParty(buyer),
    notifyParty: notifyParty(buyer),
    refNo: shipment.ref_no,
    date: shipment.etd,
    incoterms: shipment.incoterms,
    currency: shipment.currency,
    paymentTerms: shipment.payment_terms,
    portOfLoading: shipment.port_of_loading,
    portOfDischarge: shipment.port_of_discharge,
    etd: shipment.etd,
    lcNo: shipment.lc_no,
    items,
    totals: computeTotals(items),
  };
}
