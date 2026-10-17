"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bike,
  Building2,
  Cpu,
  History,
  LayoutDashboard,
  LogOut,
  Palette,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { RideOnLogo } from "@/app/components/rideon-logo";
import { useTenant } from "@/app/components/tenant-provider";
import { UserHeader } from "@/app/components/user-header";
import { notifyAuthChange, useCurrentUser } from "@/hooks/use-current-user";

import { isMasterAdmin, isManager } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const { tenant } = useTenant();

  // Redireciona imediatamente caso a sessão tenha expirado ou sido encerrada
  useEffect(() => {
    if (currentUser.status === "unauthenticated") {
      notifyAuthChange("logout");
      const target = pathname && pathname !== "/dashboard" ? `&from=${encodeURIComponent(pathname)}` : "";
      if (typeof window !== "undefined") {
        window.location.replace(`/login?expired=1${target}`);
      }
    }
  }, [currentUser.status, pathname]);

  const user = currentUser.status === "authenticated" ? currentUser.user : null;
  const role = user?.role;
  const master = isMasterAdmin(role);
  const manager = isManager(role);

  let visibleNavItems: NavItem[] = [];

  if (master) {
    visibleNavItems = [
      { label: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
      { label: "Gerentes", href: "/admin/managers", icon: Building2, badge: "Master" },
      { label: "Clientes", href: "/admin/customers", icon: Users, badge: "Global" },
      { label: "Veículos & Frota", href: "/admin/vehicles", icon: Bike, badge: "Global" },
      { label: "Equipamentos", href: "/admin/devices", icon: Cpu, badge: "Global" },
      { label: "Organizações", href: "/admin/tenants", icon: Building2, badge: "SaaS" },
      { label: "Configurações", href: "/dashboard/settings", icon: Settings },
    ];
  } else if (manager) {
    visibleNavItems = [
      { label: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
      { label: "Clientes", href: "/admin/customers", icon: Users, badge: "Carteira" },
      { label: "Veículos & Frota", href: "/admin/vehicles", icon: Bike, badge: "Frota" },
      { label: "Equipamentos", href: "/admin/devices", icon: Cpu, badge: "IMEI" },
      { label: "Organizações", href: "/admin/tenants", icon: Building2, badge: "Marca" },
      { label: "Configurações", href: "/dashboard/settings", icon: Settings },
    ];
  } else {
    // Cliente (Rider) — 100% focado em UX, sem menus administrativos
    visibleNavItems = [
      { label: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
      { label: "Meus Veículos", href: "/dashboard/vehicles", icon: Bike },
      { label: "Histórico", href: "/dashboard/history", icon: History },
      { label: "Configurações", href: "/dashboard/settings", icon: Settings },
    ];
  }

  const logout = async () => {
    setLoggingOut(true);
    try {
      notifyAuthChange("logout");
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      setLoggingOut(false);
    }
  };

  // Enquanto a sessão está sendo verificada ou sendo encerrada, nunca exibe o painel ou dados inconsistentes
  if (currentUser.status === "loading" || currentUser.status === "unauthenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse">
            <RideOnLogo />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {currentUser.status === "loading"
                ? "Verificando sessão..."
                : "Sessão encerrada. Redirecionando..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const email = user?.email || "piloto@rideon.com";
  const userInitials = email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  const navigation = (
    <div className="flex flex-1 flex-col justify-between p-3">
      {/* Navigation Links */}
      <nav className="flex flex-col gap-1.5" aria-label="Navegação do Dashboard">
        {visibleNavItems.map(({ label, href, icon: Icon, badge }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center justify-between rounded-xl px-3.5 py-3 text-xs font-semibold uppercase tracking-[.08em] transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`size-4.5 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-primary"}`} />
                <span>{label}</span>
              </div>
              {badge && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-black tracking-widest uppercase ${
                    isActive
                      ? "bg-black/30 text-white"
                      : "bg-primary/20 text-primary border border-primary/30"
                  }`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer User Pill & Logout */}
      <div className="mt-auto space-y-2 border-t border-border/70 pt-3">
        {/* User Mini Card */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/60 p-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white shadow-sm shadow-primary/30">
            {userInitials || "RO"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold uppercase tracking-wide text-foreground">
              {email.split("@")[0]}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono truncate">
              {master
                ? "Master Admin • Online"
                : manager
                  ? `${tenant.branding?.brand_name || "Gerente"} • Gestor`
                  : `${tenant.branding?.brand_name || "Piloto"} • Online`}
            </p>

          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 px-3 py-2.5 text-xs font-semibold uppercase tracking-[.08em] text-muted-foreground hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="size-4" />
          <span>{loggingOut ? "Saindo..." : "Sair"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-20 items-center border-b border-border px-5">
          <RideOnLogo />
        </div>
        {navigation}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm lg:hidden">
          <aside className="flex h-full w-72 flex-col bg-card border-r border-border shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex h-20 items-center justify-between border-b border-border px-5">
              <RideOnLogo />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="flex size-9 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      )}

      {/* Main Content Area with Modern User Header */}
      <div className="min-h-screen lg:ml-64 flex flex-col">
        <UserHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

