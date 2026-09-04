"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bike,
  Cpu,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { RideOnLogo } from "@/app/components/rideon-logo";
import { useCurrentUser } from "@/hooks/use-current-user";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: "Visao geral", href: "/dashboard", icon: LayoutDashboard },
  { label: "Veiculos", href: "/dashboard/vehicles", icon: Bike },
  {
    label: "Dispositivos",
    href: "/admin/devices",
    icon: Cpu,
    badge: "Admin",
    adminOnly: true,
  },
  { label: "Historico", href: "/dashboard/history", icon: History },
  { label: "Configuracoes", href: "/dashboard/settings", icon: Settings },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useCurrentUser();

  const isAdmin =
    currentUser.status === "authenticated" && currentUser.user.role === "admin";

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      setLoggingOut(false);
    }
  };
  const navigation = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {visibleNavItems.map(({ label, href, icon: Icon, badge }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center justify-between px-3 py-3 text-xs font-semibold uppercase tracking-[.08em] transition-colors ${
            pathname === href
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon className="size-5" />
            <span>{label}</span>
          </div>
          {badge && (
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-black tracking-widest uppercase ${
                pathname === href
                  ? "bg-black/30 text-white"
                  : "bg-primary/20 text-primary border border-primary/30"
              }`}
            >
              {badge}
            </span>
          )}
        </Link>
      ))}
      <button
        type="button"
        onClick={logout}
        disabled={loggingOut}
        className="mt-auto flex items-center gap-3 border-t border-border px-3 py-4 text-xs font-semibold uppercase tracking-[.08em] text-muted-foreground hover:text-foreground"
      >
        <LogOut className="size-5" />
        {loggingOut ? "Saindo..." : "Sair"}
      </button>
    </nav>
  );
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-20 items-center border-b border-border px-5">
          <RideOnLogo />
        </div>
        {navigation}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden">
          <aside className="flex h-full w-72 flex-col bg-card">
            <div className="flex h-20 items-center justify-between border-b border-border px-5">
              <RideOnLogo />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      )}
      <main className="min-h-screen lg:ml-64">
        <header className="flex h-20 items-center border-b border-border px-5 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <p className="ml-4 text-xs font-bold uppercase tracking-[.13em] text-primary">
            Central RideOn
          </p>
        </header>
        <div className="p-5 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
