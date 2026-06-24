import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "서류" };

const docTypes = [
  { name: "Commercial Invoice", desc: "상업송장" },
  { name: "Packing List", desc: "포장명세서" },
  { name: "Proforma Invoice", desc: "견적송장" },
];

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        title="서류"
        description="무역 표준 영문 양식으로 수출 서류를 발행합니다."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {docTypes.map((doc) => (
          <Card key={doc.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-teal" />
                {doc.name}
              </CardTitle>
              <Badge variant="secondary">준비 중</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{doc.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        서류 출력물은 무역 표준에 따라 영문으로 생성됩니다. HS코드·통관 관련 확정은 관세사 영역입니다.
      </p>
    </>
  );
}
