import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = { title: "새 비밀번호 설정" };

export default function UpdatePasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">새 비밀번호 설정</h1>
        <p className="text-sm text-muted-foreground">사용할 새 비밀번호를 입력해 주세요.</p>
      </div>
      <UpdatePasswordForm />
    </div>
  );
}
