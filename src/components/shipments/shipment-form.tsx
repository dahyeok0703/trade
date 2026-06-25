"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { CURRENCIES, INCOTERMS } from "@/lib/constants/trade";
import { shipmentSchema, type ShipmentInput } from "@/lib/validations/shipment";
import { createShipmentAction, updateShipmentAction } from "@/lib/actions/shipments";
import type { Buyer, Shipment } from "@/lib/supabase/database.types";

const NONE = "__none__";

type Props = {
  buyers: Pick<Buyer, "id" | "name_en">[];
  shipment?: Shipment;
};

export function ShipmentForm({ buyers, shipment }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(shipment);

  const form = useForm<ShipmentInput>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      ref_no: shipment?.ref_no ?? "",
      buyer_id: shipment?.buyer_id ?? "",
      incoterms: (shipment?.incoterms as ShipmentInput["incoterms"]) ?? undefined,
      currency: (shipment?.currency as ShipmentInput["currency"]) ?? "USD",
      port_of_loading: shipment?.port_of_loading ?? "",
      port_of_discharge: shipment?.port_of_discharge ?? "",
      etd: shipment?.etd ?? "",
      eta: shipment?.eta ?? "",
      lc_no: shipment?.lc_no ?? "",
      bl_no: shipment?.bl_no ?? "",
      payment_terms: shipment?.payment_terms ?? "",
      memo: shipment?.memo ?? "",
    },
  });

  function onSubmit(values: ShipmentInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateShipmentAction({ ...values, id: shipment!.id })
        : await createShipmentAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "수출건을 수정했습니다." : "수출건을 등록했습니다.");
      router.push(`/shipments/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="ref_no"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ref No *</FormLabel>
                  <FormControl>
                    <Input placeholder="EXP-2026-0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="buyer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>바이어</FormLabel>
                  <Select
                    value={field.value ? field.value : NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="바이어 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>선택 안 함</SelectItem>
                      {buyers.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">조건 · 선적</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="incoterms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>인코텀즈</FormLabel>
                  <Select
                    value={field.value ? field.value : NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="인코텀즈 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>선택 안 함</SelectItem>
                      {INCOTERMS.map((i) => (
                        <SelectItem key={i} value={i}>
                          {i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>통화</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="port_of_loading"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>선적항 (POL)</FormLabel>
                  <FormControl>
                    <Input placeholder="Busan, South Korea" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="port_of_discharge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>도착항 (POD)</FormLabel>
                  <FormControl>
                    <Input placeholder="Los Angeles, USA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="etd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ETD (출항 예정)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ETA (도착 예정)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lc_no"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>L/C 번호</FormLabel>
                  <FormControl>
                    <Input placeholder="신용장 거래 시 입력" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bl_no"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>B/L 번호</FormLabel>
                  <FormControl>
                    <Input placeholder="선하증권 번호" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment_terms"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>결제조건 (서류 공통)</FormLabel>
                  <FormControl>
                    <Input placeholder="예: T/T 30 days after B/L date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">메모</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="내부 메모 (서류에는 출력되지 않습니다)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "수정 저장" : "수출건 등록"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
