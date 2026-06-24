import { Badge } from "@/components/ui/badge";
import { SHIPMENT_STATUS } from "@/lib/constants/trade";
import type { ShipmentStatus } from "@/lib/supabase/database.types";

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const meta = SHIPMENT_STATUS[status];
  return <Badge variant={meta.badge}>{meta.label}</Badge>;
}
