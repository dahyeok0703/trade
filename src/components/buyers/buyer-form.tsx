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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { buyerSchema, type BuyerInput } from "@/lib/validations/buyer";
import { createBuyerAction, updateBuyerAction } from "@/lib/actions/buyers";
import type { Buyer } from "@/lib/supabase/database.types";

type Props = { buyer?: Buyer };

export function BuyerForm({ buyer }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(buyer);

  const contact = (buyer?.contact ?? {}) as Record<string, string>;
  const notify = (buyer?.notify_party ?? {}) as Record<string, string>;

  const form = useForm<BuyerInput>({
    resolver: zodResolver(buyerSchema),
    defaultValues: {
      name_en: buyer?.name_en ?? "",
      address_en: buyer?.address_en ?? "",
      country: buyer?.country ?? "",
      contact: {
        person: contact.person ?? "",
        email: contact.email ?? "",
        tel: contact.tel ?? "",
      },
      notify_party: {
        name: notify.name ?? "",
        address: notify.address ?? "",
      },
    },
  });

  function onSubmit(values: BuyerInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateBuyerAction({ ...values, id: buyer!.id })
        : await createBuyerAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "바이어 정보를 수정했습니다." : "바이어를 등록했습니다.");
      router.push(`/buyers/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본 정보 (영문)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>영문 상호 *</FormLabel>
                  <FormControl>
                    <Input placeholder="Global Import LLC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>국가</FormLabel>
                  <FormControl>
                    <Input placeholder="United States" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>영문 주소</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="880 Wilshire Blvd, Suite 700, Los Angeles, CA 90017, USA"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">연락처</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="contact.person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>담당자</FormLabel>
                  <FormControl>
                    <Input placeholder="John Carter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@buyer.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact.tel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>전화</FormLabel>
                  <FormControl>
                    <Input placeholder="+1-213-555-0100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">통지처 (Notify Party)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="notify_party.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상호</FormLabel>
                  <FormControl>
                    <Input placeholder="동일 시 비워두면 바이어와 동일" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notify_party.address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>주소</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notify party address" {...field} />
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
            {isEdit ? "수정 저장" : "바이어 등록"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
