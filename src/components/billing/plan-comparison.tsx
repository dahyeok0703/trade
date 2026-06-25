import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PLAN_FEATURES, PRO_PRICE_KRW } from "@/lib/billing/plans";
import type { WorkspacePlan } from "@/lib/supabase/database.types";

function PlanCard({
  plan,
  name,
  price,
  current,
  highlight,
  cta,
}: {
  plan: WorkspacePlan;
  name: string;
  price: string;
  current?: boolean;
  highlight?: boolean;
  cta?: React.ReactNode;
}) {
  return (
    <Card className={cn("flex flex-col", highlight && "border-primary shadow-md")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          {current && <Badge variant="success">현재 플랜</Badge>}
        </div>
        <p className="text-2xl font-bold tracking-tight">{price}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <ul className="space-y-2 text-sm">
          {PLAN_FEATURES.map((f) => (
            <li key={f.label} className="flex items-start gap-2">
              <Check className={cn("mt-0.5 h-4 w-4 shrink-0", highlight ? "text-teal" : "text-muted-foreground")} />
              <span>
                <span className="text-muted-foreground">{f.label}:</span>{" "}
                {plan === "pro" ? f.pro : f.free}
              </span>
            </li>
          ))}
        </ul>
        {cta}
      </CardContent>
    </Card>
  );
}

export function PlanComparison({
  currentPlan,
  freeCta,
  proCta,
}: {
  currentPlan?: WorkspacePlan;
  freeCta?: React.ReactNode;
  proCta?: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PlanCard
        plan="free"
        name="Free"
        price="₩0"
        current={currentPlan === "free"}
        cta={freeCta}
      />
      <PlanCard
        plan="pro"
        name="Pro"
        price={`₩${PRO_PRICE_KRW.toLocaleString()} / 월`}
        current={currentPlan === "pro"}
        highlight
        cta={proCta}
      />
    </div>
  );
}
