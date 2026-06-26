"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { signUpAction } from "@/lib/actions/auth";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { companyName: "", email: "", password: "" },
  });

  function onSubmit(values: SignUpInput) {
    startTransition(async () => {
      const result = await signUpAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.needsConfirmation) {
        toast.success("확인 이메일을 보냈습니다. 메일함을 확인해 주세요.");
        form.reset();
        return;
      }
      toast.success("환영합니다! 회사 계정을 만들었습니다.");
      router.push(result.data.redirectTo ?? "/dashboard");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>업체명</FormLabel>
              <FormControl>
                <Input placeholder="(주)한국무역" autoComplete="organization" {...field} />
              </FormControl>
              <FormDescription>가입 시 회사 계정으로 자동 생성됩니다.</FormDescription>
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
                <Input type="email" autoComplete="email" placeholder="you@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>8자 이상 입력해 주세요.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          무료로 시작하기
        </Button>
      </form>
    </Form>
  );
}
