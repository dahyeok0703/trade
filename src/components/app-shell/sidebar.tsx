import Link from "next/link";
import { FileCheck2 } from "lucide-react";

import { NavLinks } from "@/components/app-shell/nav-links";

/** Desktop sidebar. Hidden below lg; the header renders a Sheet on mobile. */
export function Sidebar({ workspaceName }: { workspaceName: string }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex print:hidden">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileCheck2 className="h-4 w-4" />
          </span>
          TradeDocs
        </Link>
      </div>
      <div className="border-b px-4 py-3">
        <p className="truncate text-xs text-muted-foreground">워크스페이스</p>
        <p className="truncate text-sm font-medium">{workspaceName}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <NavLinks />
      </div>
    </aside>
  );
}
