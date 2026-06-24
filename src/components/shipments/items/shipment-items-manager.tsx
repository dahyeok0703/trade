"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmptyState } from "@/components/empty-state";
import { Package } from "lucide-react";
import {
  shipmentItemFormSchema,
  type ShipmentItemFormValues,
} from "@/lib/validations/shipment-item";
import {
  addShipmentItemAction,
  deleteShipmentItemAction,
  updateShipmentItemAction,
} from "@/lib/actions/shipment-items";
import { computeTotals } from "@/lib/documents";
import { formatMoney } from "@/lib/utils";
import type { ProductOption } from "@/lib/data/products";
import type { ShipmentItem } from "@/lib/supabase/database.types";

const EMPTY: ShipmentItemFormValues = {
  product_id: "",
  description_en: "",
  hs_code: "",
  unit: "EA",
  qty: "",
  unit_price: "",
  net_weight: "",
  gross_weight: "",
  ctns: "",
  cbm: "",
};

const toNum = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const round = (v: number, dp: number) => {
  const f = 10 ** dp;
  return Math.round((v + Number.EPSILON) * f) / f;
};
const numCell = (v: number | null) => (v === null || v === undefined ? "—" : v.toLocaleString());

function toFormValues(item: ShipmentItem): ShipmentItemFormValues {
  const s = (v: number | null) => (v === null || v === undefined ? "" : String(v));
  return {
    product_id: item.product_id ?? "",
    description_en: item.description_en,
    hs_code: item.hs_code ?? "",
    unit: item.unit,
    qty: s(item.qty),
    unit_price: s(item.unit_price),
    net_weight: s(item.net_weight),
    gross_weight: s(item.gross_weight),
    ctns: s(item.ctns),
    cbm: s(item.cbm),
  };
}

export function ShipmentItemsManager({
  shipmentId,
  items,
  products,
  currency,
}: {
  shipmentId: string;
  items: ShipmentItem[];
  products: ProductOption[];
  currency: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const productByName = useMemo(() => new Map(products.map((p) => [p.name_en, p])), [products]);
  const autoWeights = useRef<{ net: string; gross: string }>({ net: "", gross: "" });

  const form = useForm<ShipmentItemFormValues>({
    resolver: zodResolver(shipmentItemFormSchema),
    defaultValues: EMPTY,
  });

  const qty = form.watch("qty");
  const unitPrice = form.watch("unit_price");
  const productId = form.watch("product_id");
  const liveAmount = round(toNum(qty) * toNum(unitPrice), 2);

  // Line weights track qty from the chosen product's per-unit weights, until the
  // user edits them manually (then we stop overwriting).
  useEffect(() => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const q = toNum(qty);
    if (product.net_weight != null) {
      const next = String(round(product.net_weight * q, 3));
      const cur = form.getValues("net_weight");
      if (cur === "" || cur === autoWeights.current.net) {
        form.setValue("net_weight", next);
        autoWeights.current.net = next;
      }
    }
    if (product.gross_weight != null) {
      const next = String(round(product.gross_weight * q, 3));
      const cur = form.getValues("gross_weight");
      if (cur === "" || cur === autoWeights.current.gross) {
        form.setValue("gross_weight", next);
        autoWeights.current.gross = next;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty, productId]);

  function onDescriptionChange(value: string) {
    const product = productByName.get(value);
    if (!product) {
      form.setValue("product_id", "");
      return;
    }
    // Autofill from the product master (all fields stay editable).
    form.setValue("product_id", product.id);
    form.setValue("hs_code", product.hs_code ?? "");
    form.setValue("unit", product.unit);
    form.setValue("unit_price", String(product.unit_price_usd));
    autoWeights.current = { net: "", gross: "" };
  }

  function resetForm() {
    form.reset(EMPTY);
    autoWeights.current = { net: "", gross: "" };
    setEditingId(null);
  }

  function onSubmit(values: ShipmentItemFormValues) {
    startTransition(async () => {
      const result = editingId
        ? await updateShipmentItemAction({ ...values, id: editingId })
        : await addShipmentItemAction({ ...values, shipment_id: shipmentId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "품목을 수정했습니다." : "품목을 추가했습니다.");
      resetForm();
      router.refresh();
    });
  }

  function startEdit(item: ShipmentItem) {
    setEditingId(item.id);
    autoWeights.current = { net: "", gross: "" };
    form.reset(toFormValues(item));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteShipmentItemAction({ id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("품목을 삭제했습니다.");
      if (editingId === id) resetForm();
      router.refresh();
    });
  }

  const totals = computeTotals(items);

  return (
    <div className="space-y-4">
      {/* Add / edit form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{editingId ? "품목 수정" : "품목 추가"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>품명 (제품 검색·선택)</FormLabel>
                    <FormControl>
                      <Input
                        list="product-options"
                        placeholder="제품명을 입력하거나 마스터에서 선택"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          onDescriptionChange(e.target.value);
                        }}
                      />
                    </FormControl>
                    <datalist id="product-options">
                      {products.map((p) => (
                        <option key={p.id} value={p.name_en} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FormField
                  control={form.control}
                  name="hs_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">HS코드</FormLabel>
                      <FormControl>
                        <Input className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">단위</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">수량 *</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" step="any" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">단가 (USD) *</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FormField
                  control={form.control}
                  name="net_weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">순중량 (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" step="any" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gross_weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">총중량 (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" step="any" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ctns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">박스수 (CTNS)</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="numeric" step="1" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cbm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">용적 (CBM)</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" step="any" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                <p className="text-sm text-muted-foreground">
                  금액(자동) ={" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatMoney(liveAmount, currency)}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  {editingId && (
                    <Button type="button" variant="outline" onClick={resetForm} disabled={isPending}>
                      <X className="h-4 w-4" />
                      취소
                    </Button>
                  )}
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {editingId ? "수정 저장" : "품목 추가"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Items + totals */}
      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="아직 품목이 없습니다"
          description="위에서 제품을 선택해 품목을 추가하세요. 추가한 품목으로 인보이스와 패킹리스트가 함께 생성됩니다."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 text-left font-semibold">Description</th>
                  <th className="p-3 text-left font-semibold">HS</th>
                  <th className="p-3 text-right font-semibold">Qty</th>
                  <th className="p-3 text-right font-semibold">Unit Price</th>
                  <th className="p-3 text-right font-semibold">Amount</th>
                  <th className="p-3 text-right font-semibold">Net</th>
                  <th className="p-3 text-right font-semibold">Gross</th>
                  <th className="p-3 text-right font-semibold">CTNS</th>
                  <th className="p-3 text-right font-semibold">CBM</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="p-3">{it.description_en}</td>
                    <td className="p-3 font-mono text-xs">{it.hs_code ?? "—"}</td>
                    <td className="p-3 text-right">
                      {it.qty.toLocaleString()} {it.unit}
                    </td>
                    <td className="p-3 text-right">{it.unit_price.toLocaleString()}</td>
                    <td className="p-3 text-right font-medium">{it.amount.toLocaleString()}</td>
                    <td className="p-3 text-right text-muted-foreground">{numCell(it.net_weight)}</td>
                    <td className="p-3 text-right text-muted-foreground">{numCell(it.gross_weight)}</td>
                    <td className="p-3 text-right text-muted-foreground">{numCell(it.ctns)}</td>
                    <td className="p-3 text-right text-muted-foreground">{numCell(it.cbm)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEdit(it)}
                          aria-label="수정"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => remove(it.id)}
                          disabled={isPending}
                          aria-label="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="p-3" colSpan={2}>
                    합계 ({items.length}건)
                  </td>
                  <td className="p-3 text-right">{totals.quantity.toLocaleString()}</td>
                  <td className="p-3" />
                  <td className="p-3 text-right text-primary">{totals.amount.toLocaleString()}</td>
                  <td className="p-3 text-right">{round(totals.netWeight, 3).toLocaleString()}</td>
                  <td className="p-3 text-right">{round(totals.grossWeight, 3).toLocaleString()}</td>
                  <td className="p-3 text-right">{totals.ctns.toLocaleString()}</td>
                  <td className="p-3 text-right">{round(totals.cbm, 4).toLocaleString()}</td>
                  <td className="p-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
