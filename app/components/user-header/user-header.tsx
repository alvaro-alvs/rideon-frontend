"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Bike,
  ChevronRight,
  Command,
  Cpu,
  LayoutDashboard,
  Menu,
  Plus,
  Radio,
  Search,
  Shield,
  Zap,
} from "lucide-react";

import { NotificationPopover } from "@/app/components/user-header/notification-popover";
import { UserDropdownMenu } from "@/app/components/user-header/user-dropdown-menu";
import { QuickSearchModal } from "@/app/components/user-header/quick-search-modal";

interface UserHeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

export function UserHeader({ onMenuClick, className = "" }: UserHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  // Listen for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Determine current page metadata
  const getPageInfo = (path: string) => {
    if (path === "/dashboard") {
      return {
        title: "Visão Geral",
        category: "Central RideOn",
        icon: LayoutDashboard,
      };
    }
    if (path.startsWith("/dashboard/vehicles")) {
      return {
        title: "Meus Veículos",
        category: "Garagem",
        icon: Bike,
      };
    }
    if (path.startsWith("/dashboard/devices") || path.startsWith("/admin/devices")) {
      return {
        title: "Dispositivos & Telemetria",
        category: "Hardware GPS",
        icon: Cpu,
      };
    }
    if (path.startsWith("/dashboard/history")) {
      return {
        title: "Histórico de Rotas",
        category: "Telemetria",
        icon: Zap,
      };
    }
    if (path.startsWith("/dashboard/settings")) {
      return {
        title: "Configurações",
        category: "Conta & Segurança",
        icon: Shield,
      };
    }
    return {
      title: "Painel de Controle",
      category: "Central RideOn",
      icon: LayoutDashboard,
    };
  };

  const pageInfo = getPageInfo(pathname);
  const PageIcon = pageInfo.icon;

  return (
    <>
      <header
        className={`sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border/80 bg-background/80 px-4 sm:px-6 lg:px-8 backdrop-blur-xl transition-all ${className}`}
      >
        {/* Left Side: Mobile Menu Button & Breadcrumb */}
        <div className="flex items-center gap-3 sm:gap-4">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="flex size-10 items-center justify-center rounded-lg border border-border/70 bg-card/60 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground lg:hidden transition-colors"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="size-5" />
            </button>
          )}

          {/* Breadcrumb / Title with Live Badge */}
          <div className="flex items-center gap-2.5">
            <div className="hidden size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 sm:flex">
              <PageIcon className="size-4" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                <span>{pageInfo.category}</span>
                <ChevronRight className="size-3 text-muted/60" />
                <span className="text-primary flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold uppercase tracking-wider text-foreground">
                {pageInfo.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Quick Search Trigger (Desktop) */}
        <div className="hidden md:flex items-center">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/50 px-3.5 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:bg-secondary/80 hover:text-foreground transition-all duration-200"
          >
            <Search className="size-4 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-medium">Buscar páginas, motos ou atalhos...</span>
            <div className="flex items-center gap-0.5 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground border border-border/60">
              <Command className="size-2.5" />
              <span>K</span>
            </div>
          </button>
        </div>

        {/* Right Side: Quick Action + Notifications + User Animated Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Trigger (Mobile icon only) */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex size-10 items-center justify-center rounded-lg border border-border/70 bg-card/60 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground md:hidden transition-colors"
            aria-label="Buscar"
          >
            <Search className="size-4" />
          </button>

          {/* Realtime Live GPS Status Pill (Hidden on small mobile) */}
          <div className="hidden xl:flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-400">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              GPS Conectado
            </span>
          </div>

          {/* Quick Action Button: New Vehicle / Garagem */}
          <Link
            href="/dashboard/vehicles"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-white transition-all duration-200"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Garagem</span>
          </Link>

          {/* Notifications Popover */}
          <NotificationPopover />

          {/* Animated User Dropdown Menu */}
          <UserDropdownMenu />
        </div>
      </header>

      {/* Global Quick Search Modal */}
      <QuickSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
