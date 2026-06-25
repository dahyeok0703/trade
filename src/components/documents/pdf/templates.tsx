/* @react-pdf/renderer <Image> has no alt concept (PDF, not DOM). */
/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

import type { DocumentModel, DocumentParty } from "@/lib/documents";

/* ── Formatting (deterministic, English) ──────────────────────────────────── */

function money(v: number): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function qtyFmt(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
function wt(v: number | null): string {
  return v == null ? "-" : v.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
function cbmFmt(v: number | null): string {
  return v == null ? "-" : v.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function docDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const NAVY = "#17304d";
const TEAL = "#0d9488";
const GRAY = "#6b7280";
const BORDER = "#d1d5db";
const LIGHT = "#f3f4f6";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#111827" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    paddingBottom: 8,
    marginBottom: 12,
  },
  logo: { height: 34, objectFit: "contain", marginBottom: 4 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase" },
  docNo: { fontSize: 9, color: GRAY, marginTop: 2 },
  exporterName: { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "right" },
  small: { fontSize: 8, color: GRAY },
  partiesRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 6,
  },
  partyLabel: { fontSize: 7, color: TEAL, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 2 },
  partyName: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  partyLine: { fontSize: 8, color: "#374151", marginTop: 1 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  metaCell: { width: "25%", paddingVertical: 2 },
  metaLabel: { fontSize: 7, color: GRAY, textTransform: "uppercase" },
  metaValue: { fontSize: 9 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 3, marginBottom: 8 },
  th: {
    flexDirection: "row",
    backgroundColor: LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tfoot: { flexDirection: "row", backgroundColor: LIGHT, borderTopWidth: 1, borderTopColor: NAVY },
  cell: { paddingVertical: 4, paddingHorizontal: 5, fontSize: 8 },
  cellHead: { paddingVertical: 5, paddingHorizontal: 5, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, textTransform: "uppercase" },
  right: { textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  totalLine: { marginTop: 4, textAlign: "right", fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY },
  footer: { position: "absolute", bottom: 28, left: 36, right: 36 },
  sign: { flexDirection: "row", justifyContent: "flex-end", marginTop: 24 },
  signBox: { width: 180, alignItems: "center" },
  signImg: { height: 36, objectFit: "contain", marginBottom: 2 },
  signLine: { borderTopWidth: 1, borderTopColor: "#374151", width: "100%", marginTop: 2, paddingTop: 2, textAlign: "center", fontSize: 8 },
  disclaimer: { fontSize: 7, color: GRAY, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 4 },
  watermark: { position: "absolute", top: "42%", left: 0, right: 0, alignItems: "center" },
  watermarkText: {
    fontSize: 60,
    fontFamily: "Helvetica-Bold",
    color: "#9ca3af",
    opacity: 0.18,
    transform: "rotate(-24deg)",
  },
});

export type Branding = { logo?: string; signature?: string };

function Watermark() {
  return (
    <View style={s.watermark} fixed>
      <Text style={s.watermarkText}>FREE · SAMPLE</Text>
    </View>
  );
}

function Party({ role, party }: { role: string; party: DocumentParty }) {
  return (
    <View style={s.partyBox}>
      <Text style={s.partyLabel}>{role}</Text>
      <Text style={s.partyName}>{party.name}</Text>
      {party.lines.map((line, i) => (
        <Text key={i} style={s.partyLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaCell}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value || "-"}</Text>
    </View>
  );
}

function Header({ title, docNo, model, branding }: { title: string; docNo: string; model: DocumentModel; branding: Branding }) {
  return (
    <View style={s.headerRow}>
      <View>
        {branding.logo ? <Image style={s.logo} src={branding.logo} /> : null}
        <Text style={s.title}>{title}</Text>
        <Text style={s.docNo}>No. {docNo}</Text>
      </View>
      <View>
        <Text style={s.exporterName}>{model.shipper.name}</Text>
        <Text style={[s.small, { textAlign: "right" }]}>Date: {docDate(model.date)}</Text>
      </View>
    </View>
  );
}

function Parties({ model }: { model: DocumentModel }) {
  return (
    <View style={s.partiesRow}>
      <Party role="Shipper / Exporter" party={model.shipper} />
      <Party role="Consignee" party={model.consignee} />
      <Party role="Notify Party" party={model.notifyParty} />
    </View>
  );
}

function MetaGrid({ model }: { model: DocumentModel }) {
  return (
    <View style={s.metaRow}>
      <Meta label="Ref No." value={model.refNo} />
      <Meta label="Incoterms" value={model.incoterms ?? "-"} />
      <Meta label="Currency" value={model.currency} />
      <Meta label="Payment" value={model.paymentTerms ?? "-"} />
      <Meta label="Port of Loading" value={model.portOfLoading ?? "-"} />
      <Meta label="Port of Discharge" value={model.portOfDischarge ?? "-"} />
      <Meta label="ETD" value={docDate(model.etd)} />
      <Meta label="L/C No." value={model.lcNo ?? "-"} />
    </View>
  );
}

function Footer({ model, branding }: { model: DocumentModel; branding: Branding }) {
  return (
    <View style={s.footer}>
      <View style={s.sign}>
        <View style={s.signBox}>
          {branding.signature ? <Image style={s.signImg} src={branding.signature} /> : null}
          <Text style={s.signLine}>{model.shipper.name} — Signature</Text>
        </View>
      </View>
      <Text style={s.disclaimer}>
        This document is generated from the exporter&apos;s data and follows common trade
        conventions. The exporter is solely responsible for its final use. HS codes are for
        reference only; customs classification must be confirmed by a licensed customs broker.
      </Text>
    </View>
  );
}

/* ── Commercial Invoice ───────────────────────────────────────────────────── */

export function InvoicePdf({
  model,
  docNo,
  branding,
  watermark,
}: {
  model: DocumentModel;
  docNo: string;
  branding: Branding;
  watermark?: boolean;
}) {
  const { items, totals, currency } = model;
  return (
    <Document title={`Commercial Invoice ${docNo}`}>
      <Page size="A4" style={s.page}>
        {watermark ? <Watermark /> : null}
        <Header title="Commercial Invoice" docNo={docNo} model={model} branding={branding} />
        <Parties model={model} />
        <MetaGrid model={model} />

        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.cellHead, { width: "6%" }]}>No.</Text>
            <Text style={[s.cellHead, { width: "44%" }]}>Description of Goods</Text>
            <Text style={[s.cellHead, { width: "14%" }]}>HS Code</Text>
            <Text style={[s.cellHead, s.right, { width: "12%" }]}>Qty</Text>
            <Text style={[s.cellHead, s.right, { width: "12%" }]}>Unit Price</Text>
            <Text style={[s.cellHead, s.right, { width: "12%" }]}>Amount</Text>
          </View>
          {items.map((it, i) => (
            <View style={s.tr} key={it.id}>
              <Text style={[s.cell, { width: "6%" }]}>{i + 1}</Text>
              <Text style={[s.cell, { width: "44%" }]}>{it.description_en}</Text>
              <Text style={[s.cell, { width: "14%" }]}>{it.hs_code ?? "-"}</Text>
              <Text style={[s.cell, s.right, { width: "12%" }]}>
                {qtyFmt(it.qty)} {it.unit}
              </Text>
              <Text style={[s.cell, s.right, { width: "12%" }]}>{money(it.unit_price)}</Text>
              <Text style={[s.cell, s.right, { width: "12%" }]}>{money(it.amount)}</Text>
            </View>
          ))}
          <View style={s.tfoot}>
            <Text style={[s.cell, s.bold, { width: "64%" }]}>Total</Text>
            <Text style={[s.cell, s.right, s.bold, { width: "12%" }]}>{qtyFmt(totals.quantity)}</Text>
            <Text style={[s.cell, { width: "12%" }]} />
            <Text style={[s.cell, s.right, s.bold, { width: "12%" }]}>{money(totals.amount)}</Text>
          </View>
        </View>

        <Text style={s.totalLine}>
          Total Amount: {money(totals.amount)} {currency}
        </Text>

        <Footer model={model} branding={branding} />
      </Page>
    </Document>
  );
}

/* ── Packing List ─────────────────────────────────────────────────────────── */

export function PackingListPdf({
  model,
  docNo,
  branding,
  watermark,
}: {
  model: DocumentModel;
  docNo: string;
  branding: Branding;
  watermark?: boolean;
}) {
  const { items, totals } = model;
  return (
    <Document title={`Packing List ${docNo}`}>
      <Page size="A4" style={s.page}>
        {watermark ? <Watermark /> : null}
        <Header title="Packing List" docNo={docNo} model={model} branding={branding} />
        <Parties model={model} />
        <MetaGrid model={model} />

        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.cellHead, { width: "5%" }]}>No.</Text>
            <Text style={[s.cellHead, { width: "33%" }]}>Description of Goods</Text>
            <Text style={[s.cellHead, { width: "12%" }]}>HS Code</Text>
            <Text style={[s.cellHead, s.right, { width: "12%" }]}>Qty</Text>
            <Text style={[s.cellHead, s.right, { width: "12%" }]}>N/W (kg)</Text>
            <Text style={[s.cellHead, s.right, { width: "12%" }]}>G/W (kg)</Text>
            <Text style={[s.cellHead, s.right, { width: "7%" }]}>CTNS</Text>
            <Text style={[s.cellHead, s.right, { width: "7%" }]}>CBM</Text>
          </View>
          {items.map((it, i) => (
            <View style={s.tr} key={it.id}>
              <Text style={[s.cell, { width: "5%" }]}>{i + 1}</Text>
              <Text style={[s.cell, { width: "33%" }]}>{it.description_en}</Text>
              <Text style={[s.cell, { width: "12%" }]}>{it.hs_code ?? "-"}</Text>
              <Text style={[s.cell, s.right, { width: "12%" }]}>
                {qtyFmt(it.qty)} {it.unit}
              </Text>
              <Text style={[s.cell, s.right, { width: "12%" }]}>{wt(it.net_weight)}</Text>
              <Text style={[s.cell, s.right, { width: "12%" }]}>{wt(it.gross_weight)}</Text>
              <Text style={[s.cell, s.right, { width: "7%" }]}>{it.ctns ?? "-"}</Text>
              <Text style={[s.cell, s.right, { width: "7%" }]}>{cbmFmt(it.cbm)}</Text>
            </View>
          ))}
          <View style={s.tfoot}>
            <Text style={[s.cell, s.bold, { width: "50%" }]}>Total</Text>
            <Text style={[s.cell, s.right, s.bold, { width: "12%" }]}>{qtyFmt(totals.quantity)}</Text>
            <Text style={[s.cell, s.right, s.bold, { width: "12%" }]}>{wt(totals.netWeight)}</Text>
            <Text style={[s.cell, s.right, s.bold, { width: "12%" }]}>{wt(totals.grossWeight)}</Text>
            <Text style={[s.cell, s.right, s.bold, { width: "7%" }]}>{totals.ctns}</Text>
            <Text style={[s.cell, s.right, s.bold, { width: "7%" }]}>{cbmFmt(totals.cbm)}</Text>
          </View>
        </View>

        <Footer model={model} branding={branding} />
      </Page>
    </Document>
  );
}

/* ── Certificate of Origin (template) ─────────────────────────────────────── */

export function CertificateOfOriginPdf({
  model,
  docNo,
  branding,
  watermark,
}: {
  model: DocumentModel;
  docNo: string;
  branding: Branding;
  watermark?: boolean;
}) {
  const { items } = model;
  return (
    <Document title={`Certificate of Origin ${docNo}`}>
      <Page size="A4" style={s.page}>
        {watermark ? <Watermark /> : null}
        <Header title="Certificate of Origin" docNo={docNo} model={model} branding={branding} />
        <Parties model={model} />
        <MetaGrid model={model} />

        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.cellHead, { width: "6%" }]}>No.</Text>
            <Text style={[s.cellHead, { width: "56%" }]}>Description of Goods</Text>
            <Text style={[s.cellHead, { width: "18%" }]}>HS Code</Text>
            <Text style={[s.cellHead, s.right, { width: "20%" }]}>Qty</Text>
          </View>
          {items.map((it, i) => (
            <View style={s.tr} key={it.id}>
              <Text style={[s.cell, { width: "6%" }]}>{i + 1}</Text>
              <Text style={[s.cell, { width: "56%" }]}>{it.description_en}</Text>
              <Text style={[s.cell, { width: "18%" }]}>{it.hs_code ?? "-"}</Text>
              <Text style={[s.cell, s.right, { width: "20%" }]}>
                {qtyFmt(it.qty)} {it.unit}
              </Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 8, marginTop: 6 }}>
          The undersigned hereby declares that the above-mentioned goods originate in the country
          stated and that the particulars are correct to the best of their knowledge.
        </Text>
        <Text style={[s.small, { marginTop: 4, fontFamily: "Helvetica-Bold", color: TEAL }]}>
          ※ Country of origin and HS classification must be confirmed by a licensed customs broker.
          This is a reference template only.
        </Text>

        <Footer model={model} branding={branding} />
      </Page>
    </Document>
  );
}
