"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Triggers the browser print dialog (→ Save as PDF). */
export function PrintButton({ label = "인쇄 / PDF" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} size="sm" className="print:hidden">
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
