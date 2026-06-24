"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { resetRequestSchema, type ResetRequestInput } from "@/lib/validations/auth";

export function ResetRequestForm() {
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ResetRequestInput>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ResetRequestInput) {
    startTransition(async () => {
      const result = await requestPasswordResetAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-accent/40 p-6 text-center">
        <MailCheck className="h-8 w-8 text-teal" />
        <p className="text-sm">
          입력하신 이메일이 등록되어 있다면 비밀번호 재설정 링크를 보내드렸습니다.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          재설정 링크 보내기
        </Button>
      </form>
    </Form>
  );
}
