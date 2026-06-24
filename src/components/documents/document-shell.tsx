import { formatDate } from "@/lib/utils";
import type { DocumentModel, DocumentParty } from "@/lib/documents";

function Party({ role, party }: { role: string; party: DocumentParty }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {role}
      </p>
      <p className="font-semibold">{party.name}</p>
      {party.lines.map((line, i) => (
        <p key={i} className="text-sm leading-snug text-muted-foreground">
          {line}
        </p>
      ))}
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

/**
 * Shared paper layout + header for both trade documents. Receiving the same
 * `DocumentModel` guarantees the Invoice and Packing List show identical
 * parties and shipment terms.
 */
export function DocumentShell({
  title,
  docNo,
  model,
  children,
}: {
  title: string;
  docNo: string;
  model: DocumentModel;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-xl border bg-white p-8 text-foreground shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="flex items-start justify-between gap-6 border-b-2 border-primary pb-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-primary">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">No. {docNo}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{model.shipper.name}</p>
          <p className="text-muted-foreground">Date: {formatDate(model.date)}</p>
        </div>
      </div>

      <div className="grid gap-6 py-5 sm:grid-cols-2">
        <Party role="Shipper / Exporter" party={model.shipper} />
        <Party role="Consignee" party={model.consignee} />
        <Party role="Notify Party" party={model.notifyParty} />
        <div className="space-y-0">
          <Meta label="Ref No." value={model.refNo} />
          <Meta label="Incoterms" value={model.incoterms} />
          <Meta label="Currency" value={model.currency} />
          <Meta label="Payment" value={model.paymentTerms} />
          <Meta label="Port of Loading" value={model.portOfLoading} />
          <Meta label="Port of Discharge" value={model.portOfDischarge} />
          <Meta label="ETD" value={formatDate(model.etd)} />
          {model.lcNo && <Meta label="L/C No." value={model.lcNo} />}
        </div>
      </div>

      {children}

      <p className="mt-8 border-t pt-3 text-[11px] text-muted-foreground">
        본 서류는 입력된 품목 데이터로 자동 생성되었습니다. HS코드·통관 분류는 관세사 확인이
        필요하며 본 서비스는 이를 확정·보증하지 않습니다.
      </p>
    </div>
  );
}
