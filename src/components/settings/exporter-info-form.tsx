"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImageUp, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { exporterInfoSchema, type ExporterInfoInput } from "@/lib/validations/workspace";
import { updateExporterInfoAction } from "@/lib/actions/workspace";

const MAX_FILE_BYTES = 480 * 1024;

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      toast.error("PNG 또는 JPEG 이미지를 선택해 주세요.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("이미지가 너무 큽니다. (최대 480KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-12 w-auto rounded border bg-white object-contain p-1" />
        ) : (
          <div className="flex h-12 w-20 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
            없음
          </div>
        )}
        <input ref={ref} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onFile} />
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
          <ImageUp className="h-4 w-4" />
          업로드
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <X className="h-4 w-4" />
            제거
          </Button>
        )}
      </div>
    </div>
  );
}

export function ExporterInfoForm({ initial }: { initial: Partial<ExporterInfoInput> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ExporterInfoInput>({
    resolver: zodResolver(exporterInfoSchema),
    defaultValues: {
      company_en: initial.company_en ?? "",
      address_en: initial.address_en ?? "",
      tel: initial.tel ?? "",
      email: initial.email ?? "",
      logo: initial.logo ?? "",
      signature: initial.signature ?? "",
    },
  });

  function onSubmit(values: ExporterInfoInput) {
    startTransition(async () => {
      const result = await updateExporterInfoAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("수출자 정보를 저장했습니다.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>수출자 정보 (서류 출력)</CardTitle>
        <CardDescription>
          인보이스·패킹리스트 등 서류의 Shipper 영역과 로고·서명에 사용됩니다. (영문)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="company_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>영문 상호</FormLabel>
                  <FormControl>
                    <Input placeholder="Demo Trading Co., Ltd." {...field} />
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
                    <Textarea placeholder="15F, 123 Teheran-ro, Gangnam-gu, Seoul, South Korea" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>전화</FormLabel>
                    <FormControl>
                      <Input placeholder="+82-2-1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="export@demotrading.co" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageField label="로고" value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="signature"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageField label="서명 이미지" value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                저장
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
