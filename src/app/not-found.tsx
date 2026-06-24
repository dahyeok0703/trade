import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">페이지를 찾을 수 없습니다</h2>
        <p className="text-sm text-muted-foreground">
          요청하신 페이지가 이동되었거나 존재하지 않습니다.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">대시보드로 이동</Link>
      </Button>
    </div>
  );
}
