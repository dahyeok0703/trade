import { DocumentShell } from "@/components/documents/document-shell";
import type { DocumentModel } from "@/lib/documents";

const fmt = (v: number, dp = 3) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp });

/** Packing List — quantity / weight / volume view of the SAME item data. */
export function PackingListDocument({ model, docNo }: { model: DocumentModel; docNo: string }) {
  const { items, totals } = model;

  return (
    <DocumentShell title="Packing List" docNo={docNo} model={model}>
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide">
            <th className="p-2 font-semibold">No.</th>
            <th className="p-2 font-semibold">Description of Goods</th>
            <th className="p-2 font-semibold">HS Code</th>
            <th className="p-2 text-right font-semibold">Qty</th>
            <th className="p-2 text-right font-semibold">N/W (kg)</th>
            <th className="p-2 text-right font-semibold">G/W (kg)</th>
            <th className="p-2 text-right font-semibold">CTNS</th>
            <th className="p-2 text-right font-semibold">CBM</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id} className="border-b">
              <td className="p-2 text-muted-foreground">{i + 1}</td>
              <td className="p-2">{it.description_en}</td>
              <td className="p-2 font-mono text-xs">{it.hs_code ?? "—"}</td>
              <td className="p-2 text-right">
                {it.qty.toLocaleString()} {it.unit}
              </td>
              <td className="p-2 text-right">{it.net_weight != null ? fmt(it.net_weight) : "—"}</td>
              <td className="p-2 text-right">
                {it.gross_weight != null ? fmt(it.gross_weight) : "—"}
              </td>
              <td className="p-2 text-right">{it.ctns != null ? it.ctns.toLocaleString() : "—"}</td>
              <td className="p-2 text-right">{it.cbm != null ? fmt(it.cbm, 4) : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-semibold">
            <td className="p-2" colSpan={3}>
              Total
            </td>
            <td className="p-2 text-right">{totals.quantity.toLocaleString()}</td>
            <td className="p-2 text-right">{fmt(totals.netWeight)}</td>
            <td className="p-2 text-right">{fmt(totals.grossWeight)}</td>
            <td className="p-2 text-right text-primary">{totals.ctns.toLocaleString()}</td>
            <td className="p-2 text-right">{fmt(totals.cbm, 4)}</td>
          </tr>
        </tfoot>
      </table>
    </DocumentShell>
  );
}
