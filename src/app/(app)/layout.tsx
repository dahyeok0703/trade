import { ensureWorkspace } from "@/lib/auth/bootstrap";
import { getWorkspaceContext } from "@/lib/auth/session";
import { AppHeader } from "@/components/app-shell/app-header";
import { Sidebar } from "@/components/app-shell/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Resolve the workspace; self-heal if bootstrapping hasn't run yet.
  let ctx = await getWorkspaceContext();
  if (!ctx) {
    await ensureWorkspace();
    ctx = await getWorkspaceContext();
  }

  if (!ctx) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="space-y-2">
          <p className="font-medium">회사 정보를 준비하고 있습니다</p>
          <p className="text-sm text-muted-foreground">
            잠시 후 새로고침해 주세요. 문제가 계속되면 다시 로그인해 주세요.
          </p>
        </div>
      </div>
    );
  }

  const { user, member, workspace } = ctx;

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceName={workspace.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader workspaceName={workspace.name} email={user.email ?? ""} role={member.role} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0">
          <div className="mx-auto w-full max-w-6xl space-y-6 print:max-w-none">{children}</div>
        </main>
      </div>
    </div>
  );
}
