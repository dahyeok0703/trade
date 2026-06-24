import Link from "next/link";

import { cn } from "@/lib/utils";
import { SHIPMENT_STATUS, SHIPMENT_STATUS_ORDER } from "@/lib/constants/trade";
import type { ShipmentStatus } from "@/lib/supabase/database.types";

/** Status filter pills. `active` undefined = "전체". */
export function StatusFilter({ active }: { active?: ShipmentStatus }) {
  const items: { key: ShipmentStatus | "all"; label: string; href: string }[] = [
    { key: "all", label: "전체", href: "/shipments" },
    ...SHIPMENT_STATUS_ORDER.map((s) => ({
      key: s,
      label: SHIPMENT_STATUS[s].label,
      href: `/shipments?status=${s}`,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = item.key === "all" ? !active : active === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
