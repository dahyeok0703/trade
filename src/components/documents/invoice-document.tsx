import { DocumentShell } from "@/components/documents/document-shell";
import { formatMoney } from "@/lib/utils";
import type { DocumentModel } from "@/lib/documents";

/** Commercial Invoice — amount-centric view of the shared item data. */
export function InvoiceDocument({ model, docNo }: { model: DocumentModel; docNo: string }) {
  const { items, totals, currency } = model;

  return (
    <DocumentShell title="Commercial Invoice" docNo={docNo} model={model}>
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide">
            <th className="p-2 font-semibold">No.</th>
            <th className="p-2 font-semibold">Description of Goods</th>
            <th className="p-2 font-semibold">HS Code</th>
            <th className="p-2 text-right font-semibold">Qty</th>
            <th className="p-2 text-right font-semibold">Unit Price</th>
            <th className="p-2 text-right font-semibold">Amount</th>
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
              <td className="p-2 text-right">{it.unit_price.toLocaleString()}</td>
              <td className="p-2 text-right">{it.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-semibold">
            <td className="p-2" colSpan={3}>
              Total
            </td>
            <td className="p-2 text-right">{totals.quantity.toLocaleString()}</td>
            <td className="p-2" />
            <td className="p-2 text-right text-primary">{formatMoney(totals.amount, currency)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-4 text-sm">
        <span className="text-muted-foreground">Total Amount: </span>
        <span className="font-semibold">{formatMoney(totals.amount, currency)}</span>
        {model.incoterms && model.portOfLoading ? (
          <span className="text-muted-foreground">
            {" "}
            ({model.incoterms} {model.portOfLoading})
          </span>
        ) : null}
      </p>
    </DocumentShell>
  );
}
