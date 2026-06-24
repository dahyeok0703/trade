"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { HsCodeNotice } from "@/components/products/hs-code-notice";
import { productFormSchema, type ProductFormValues } from "@/lib/validations/product";
import { createProductAction, updateProductAction } from "@/lib/actions/products";
import type { Product } from "@/lib/supabase/database.types";

const numStr = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(product);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name_en: product?.name_en ?? "",
      hs_code: product?.hs_code ?? "",
      unit: product?.unit ?? "EA",
      unit_price_usd: numStr(product?.unit_price_usd) || "0",
      net_weight: numStr(product?.net_weight),
      gross_weight: numStr(product?.gross_weight),
      dimensions: product?.dimensions ?? "",
      origin_country: product?.origin_country ?? "",
    },
  });

  function onSubmit(values: ProductFormValues) {
    startTransition(async () => {
      const result = isEdit
        ? await updateProductAction({ ...values, id: product!.id })
        : await createProductAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "제품을 수정했습니다." : "제품을 등록했습니다.");
      router.push(`/products/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">제품 정보 (영문)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>영문 품명 *</FormLabel>
                  <FormControl>
                    <Input placeholder="Cotton T-Shirt" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hs_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HS코드 (참고용)</FormLabel>
                  <FormControl>
                    <Input placeholder="6109.10" inputMode="decimal" {...field} />
                  </FormControl>
                  <HsCodeNotice className="mt-1.5" />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>단위</FormLabel>
                    <FormControl>
                      <Input placeholder="EA / PC / PR" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit_price_usd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>단가 (USD) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="origin_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>원산지</FormLabel>
                    <FormControl>
                      <Input placeholder="South Korea" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">중량 · 규격</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="net_weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>순중량 (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" min="0" {...field} />
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
                  <FormLabel>총중량 (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>규격 (Dimensions)</FormLabel>
                  <FormControl>
                    <Input placeholder="30 x 25 x 2 cm" {...field} />
                  </FormControl>
                  <FormDescription>박스/제품 치수 (자유 형식)</FormDescription>
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
            {isEdit ? "수정 저장" : "제품 등록"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
