import { FileText, LayoutDashboard, Package, Settings, Users, type LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

/** Primary navigation for the authenticated app shell. */
export const navItems: NavItem[] = [
  { title: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { title: "바이어", href: "/buyers", icon: Users },
  { title: "수출건", href: "/shipments", icon: Package },
  { title: "서류", href: "/documents", icon: FileText },
  { title: "설정", href: "/settings", icon: Settings },
];
