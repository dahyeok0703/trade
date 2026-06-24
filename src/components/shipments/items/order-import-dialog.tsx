"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addShipmentItemsBulkAction } from "@/lib/actions/shipment-items";
import type { ExtractedCandidate } from "@/lib/ai/match";

type Row = {
  description_en: string;
  qty: string;
  unit: string;
  unit_price: string;
  hs_code: string | null;
  net_weight: number | null;
  gross_weight: number | null;
  product_id: string | null;
  matchedProductName: string | null;
  needsReview: boolean;
};

function toRow(c: ExtractedCandidate): Row {
  return {
    description_en: c.description_en,
    qty: String(c.qty),
    unit: c.unit,
    unit_price: String(c.unit_price),
    hs_code: c.hs_code,
    net_weight: c.net_weight,
    gross_weight: c.gross_weight,
    product_id: c.product_id,
    matchedProductName: c.matchedProductName,
    needsReview: c.needsReview,
  };
}

export function OrderImportDialog({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"input" | "review">("input");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<{ model: string; costKrw: number } | null>(null);
  const [isApplying, startApply] = useTransition();

  function reset() {
    setStage("input");
    setText("");
    setFileName(null);
    setRows([]);
    setMeta(null);
  }

  async function extract() {
    const file = fileRef.current?.files?.[0];
    if (!file && !text.trim()) {
      toast.error("주문서 파일을 선택하거나 텍스트를 붙여넣어 주세요.");
      return;
    }
    setExtracting(true);
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        res = await fetch("/api/extract", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });
      }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "추출에 실패했습니다.");
        return;
      }
      const candidates = data.items as ExtractedCandidate[];
      if (candidates.length === 0) {
        toast.warning("추출된 품목이 없습니다. 다른 파일을 시도해 주세요.");
        return;
      }
      setRows(candidates.map(toRow));
      setMeta({ model: data.model, costKrw: data.usage?.estCostKrw ?? 0 });
      setStage("review");
      if (data.lowConfidence) {
        toast.warning("신뢰도가 낮은 항목이 있습니다. 값을 확인해 주세요.");
      }
    } catch {
      toast.error("추출 요청에 실패했습니다.");
    } finally {
      setExtracting(false);
    }
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function apply() {
    if (rows.length === 0) {
      toast.error("적용할 품목이 없습니다.");
      return;
    }
    startApply(async () => {
      const result = await addShipmentItemsBulkAction({
        shipment_id: shipmentId,
        items: rows.map((r) => ({
          product_id: r.product_id ?? "",
          description_en: r.description_en,
          hs_code: r.hs_code ?? "",
          unit: r.unit,
          qty: r.qty,
          unit_price: r.unit_price,
          net_weight: r.net_weight ?? "",
          gross_weight: r.gross_weight ?? "",
          ctns: "",
          cbm: "",
        })),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.data.inserted}개 품목을 추가했습니다. 값을 확인·수정하세요.`);
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 text-teal" />
          주문서로 채우기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>주문서로 품목 채우기 (AI 초안)</DialogTitle>
          <DialogDescription>
            바이어 PO(PDF·이미지)·주문 이메일·엑셀에서 품목을 추출합니다. 결과는 초안이며 저장
            전에 반드시 검토·수정하세요.
          </DialogDescription>
        </DialogHeader>

        {stage === "input" ? (
          <div className="space-y-4">
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.xls,.csv,.txt,.eml"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="w-full justify-start"
              >
                <Upload className="h-4 w-4" />
                {fileName ?? "주문서 파일 선택 (PDF · 이미지 · 엑셀)"}
              </Button>
            </div>
            <div className="text-center text-xs text-muted-foreground">또는</div>
            <Textarea
              placeholder="주문 이메일 본문을 붙여넣기"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ※ 추출에는 입력한 주문 내용만 전송되며, 원본은 저장하지 않습니다. AI는 항목 추출만
              하고 가격·거래 판단은 하지 않습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-[50vh] overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left font-semibold">품명</th>
                    <th className="p-2 text-right font-semibold">수량</th>
                    <th className="p-2 text-left font-semibold">단위</th>
                    <th className="p-2 text-right font-semibold">단가</th>
                    <th className="p-2 text-left font-semibold">상태</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-1.5">
                        <Input
                          value={r.description_en}
                          onChange={(e) => updateRow(i, { description_en: e.target.value })}
                          className="h-8"
                        />
                        {r.matchedProductName && (
                          <span className="px-1 text-[11px] text-muted-foreground">
                            ↳ {r.matchedProductName}
                          </span>
                        )}
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={r.qty}
                          onChange={(e) => updateRow(i, { qty: e.target.value })}
                          className="h-8 w-20 text-right"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          value={r.unit}
                          onChange={(e) => updateRow(i, { unit: e.target.value })}
                          className="h-8 w-16"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={r.unit_price}
                          onChange={(e) => updateRow(i, { unit_price: e.target.value })}
                          className="h-8 w-24 text-right"
                        />
                      </td>
                      <td className="p-1.5">
                        {r.needsReview ? (
                          <Badge variant="warning">확인 필요</Badge>
                        ) : (
                          <Badge variant="secondary">매칭됨</Badge>
                        )}
                      </td>
                      <td className="p-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeRow(i)}
                          aria-label="행 삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta && (
              <p className="text-xs text-muted-foreground">
                모델: {meta.model} · 추정 비용 ₩{meta.costKrw.toLocaleString()} · 저장 전 값을
                확인하세요.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {stage === "input" ? (
            <Button onClick={extract} disabled={extracting}>
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              추출
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={reset} disabled={isApplying}>
                다시 추출
              </Button>
              <Button onClick={apply} disabled={isApplying || rows.length === 0}>
                {isApplying && <Loader2 className="h-4 w-4 animate-spin" />}
                {rows.length}개 품목 적용
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
