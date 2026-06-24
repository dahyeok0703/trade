"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SHIPMENT_STATUS, SHIPMENT_STATUS_ORDER } from "@/lib/constants/trade";
import { updateShipmentStatusAction } from "@/lib/actions/shipments";
import type { ShipmentStatus } from "@/lib/supabase/database.types";

/** Inline status changer on the shipment detail page. */
export function ShipmentStatusSelect({ id, status }: { id: string; status: ShipmentStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(next: string) {
    if (next === status) return;
    startTransition(async () => {
      const result = await updateShipmentStatusAction({ id, status: next as ShipmentStatus });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("상태를 변경했습니다.");
      router.refresh();
    });
  }

  return (
    <Select value={status} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SHIPMENT_STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {SHIPMENT_STATUS[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
