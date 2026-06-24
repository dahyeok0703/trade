import type { Metadata } from "next";
import { Package, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "수출건" };

export default function ShipmentsPage() {
  return (
    <>
      <PageHeader
        title="수출건"
        description="개별 수출 거래(선적)를 관리하고 서류를 묶어 발행합니다."
        action={
          <Button disabled>
            <Plus className="h-4 w-4" />
            수출건 생성
          </Button>
        }
      />
      <EmptyState
        icon={Package}
        title="등록된 수출건이 없습니다"
        description="수출건을 생성하고 바이어를 연결하면 인보이스·패킹리스트를 함께 관리할 수 있습니다. (기능 준비 중)"
      />
    </>
  );
}
