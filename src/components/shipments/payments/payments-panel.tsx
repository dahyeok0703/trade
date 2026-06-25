"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmptyState } from "@/components/empty-state";
import { BadgeDollarSign } from "lucide-react";
import { paymentFormSchema, type PaymentFormValues } from "@/lib/validations/payment";
import { addPaymentAction, updatePaymentAction, deletePaymentAction } from "@/lib/actions/payments";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Payment } from "@/lib/supabase/database.types";

const EMPTY: PaymentFormValues = {
  term: "TT",
  amount: "",
  due_on: "",
  paid_on: "",
  status: "pending",
};

const TODAY = new Date().toISOString().slice(0, 10);

type Derived = { label: string; variant: "success" | "destructive" | "warning" | "secondary"; unpaid: boolean; overdue: boolean };

function derive(p: Payment): Derived {
  if (p.paid_on || p.status === "paid") return { label: "입금완료", variant: "success", unpaid: false, overdue: false };
  const overdue = !!p.due_on && p.due_on < TODAY;
  if (overdue) return { label: "연체", variant: "destructive", unpaid: true, overdue: true };
  if (p.status === "partial") return { label: "부분입금", variant: "warning", unpaid: true, overdue: false };
  return { label: "대기", variant: "secondary", unpaid: true, overdue: false };
}

export function PaymentsPanel({
  shipmentId,
  currency,
  payments,
}: {
  shipmentId: string;
  currency: string;
  payments: Payment[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: EMPTY,
  });

  const derived = payments.map((p) => ({ p, d: derive(p) }));
  const receivable = derived.filter((x) => x.d.unpaid).reduce((s, x) => s + Number(x.p.amount), 0);
  const overdue = derived.filter((x) => x.d.overdue).reduce((s, x) => s + Number(x.p.amount), 0);

  function reset() {
    form.reset(EMPTY);
    setEditingId(null);
  }

  function onSubmit(values: PaymentFormValues) {
    startTransition(async () => {
      const result = editingId
        ? await updatePaymentAction({ ...values, id: editingId })
        : await addPaymentAction({ ...values, shipment_id: shipmentId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "대금을 수정했습니다." : "대금을 추가했습니다.");
      reset();
      router.refresh();
    });
  }

  function startEdit(p: Payment) {
    setEditingId(p.id);
    form.reset({
      term: p.term,
      amount: String(p.amount),
      due_on: p.due_on ?? "",
      paid_on: p.paid_on ?? "",
      status: p.status === "paid" ? "paid" : p.status === "partial" ? "partial" : "pending",
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deletePaymentAction({ id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("대금을 삭제했습니다.");
      if (editingId === id) reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm text-muted-foreground">받을 대금 (미입금)</span>
            <span className="text-lg font-semibold tabular-nums">{formatMoney(receivable, currency)}</span>
          </CardContent>
        </Card>
        <Card className={overdue > 0 ? "border-destructive/40" : undefined}>
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm text-muted-foreground">연체</span>
            <span className={`text-lg font-semibold tabular-nums ${overdue > 0 ? "text-destructive" : ""}`}>
              {formatMoney(overdue, currency)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Add / edit form */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">{editingId ? "대금 수정" : "대금 추가"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <FormField
                  control={form.control}
                  name="term"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">결제수단</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TT">T/T</SelectItem>
                          <SelectItem value="LC">L/C</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">금액 *</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="due_on"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">만기일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paid_on"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">입금일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">상태</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">대기</SelectItem>
                          <SelectItem value="partial">부분입금</SelectItem>
                          <SelectItem value="paid">입금완료</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                {editingId && (
                  <Button type="button" variant="outline" onClick={reset} disabled={isPending}>
                    <X className="h-4 w-4" />
                    취소
                  </Button>
                )}
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingId ? "수정 저장" : "대금 추가"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* List */}
      {payments.length === 0 ? (
        <EmptyState
          icon={BadgeDollarSign}
          title="등록된 대금이 없습니다"
          description="T/T·L/C 대금 조건과 만기·입금 상태를 추가해 받을 대금과 연체를 추적하세요."
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="p-3 text-left font-semibold">수단</th>
                <th className="p-3 text-right font-semibold">금액</th>
                <th className="p-3 text-left font-semibold">만기</th>
                <th className="p-3 text-left font-semibold">입금</th>
                <th className="p-3 text-left font-semibold">상태</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {derived.map(({ p, d }) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3">{p.term}</td>
                  <td className="p-3 text-right font-medium">{formatMoney(Number(p.amount), currency)}</td>
                  <td className="p-3">{formatDate(p.due_on)}</td>
                  <td className="p-3">{formatDate(p.paid_on)}</td>
                  <td className="p-3">
                    <Badge variant={d.variant}>{d.label}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(p)}
                        aria-label="수정"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => remove(p.id)}
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
          </table>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        ※ 금액·일정은 입력값 기반 참고치이며 공식 통관·회계를 대체하지 않습니다.
      </p>
    </div>
  );
}
