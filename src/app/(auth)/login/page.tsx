import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">로그인</h1>
        <p className="text-sm text-muted-foreground">계정에 로그인하여 수출 서류를 관리하세요.</p>
      </div>
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          무료로 시작
        </Link>
      </p>
    </div>
  );
}
