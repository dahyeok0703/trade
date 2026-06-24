import { MobileNav } from "@/components/app-shell/mobile-nav";
import { UserMenu } from "@/components/app-shell/user-menu";

export function AppHeader({
  workspaceName,
  email,
  role,
}: {
  workspaceName: string;
  email: string;
  role: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 print:hidden">
      <div className="flex items-center gap-2">
        <MobileNav workspaceName={workspaceName} />
        <span className="text-sm font-medium text-muted-foreground lg:hidden">{workspaceName}</span>
      </div>
      <UserMenu email={email} role={role} />
    </header>
  );
}
