import type { Metadata } from "next";
import Link from "next/link";

import { ResetRequestForm } from "@/components/auth/reset-request-form";

export const metadata: Metadata = { title: "비밀번호 재설정" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">비밀번호 재설정</h1>
        <p className="text-sm text-muted-foreground">
          가입하신 이메일로 재설정 링크를 보내드립니다.
        </p>
      </div>
      <ResetRequestForm />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
