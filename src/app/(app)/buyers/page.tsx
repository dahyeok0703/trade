import type { Metadata } from "next";
import { Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "바이어" };

export default function BuyersPage() {
  return (
    <>
      <PageHeader
        title="바이어"
        description="거래하는 해외 바이어를 등록하고 관리합니다."
        action={
          <Button disabled>
            <Plus className="h-4 w-4" />
            바이어 추가
          </Button>
        }
      />
      <EmptyState
        icon={Users}
        title="등록된 바이어가 없습니다"
        description="바이어를 등록하면 수출건과 서류에서 바로 선택할 수 있습니다. (기능 준비 중)"
      />
    </>
  );
}
