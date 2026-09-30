"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Bike,
  Cpu,
  History,
  LayoutDashboard,
  Search,
  Settings,
  Shield,
  X,
  ArrowRight,
  Sparkles,
  Command,
} from "lucide-react";

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  category: "Páginas" | "Ações Rápidas" | "Veículos";
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const SEARCH_ITEMS: SearchItem[] = [
  {
    id: "dash",
    title: "Visão Geral",
    subtitle: "Status em tempo real da motocicleta e métricas",
    href: "/dashboard",
    category: "Páginas",
    icon: LayoutDashboard,
  },
  {
    id: "vehicles",
    title: "Meus Veículos",
    subtitle: "Garagem, cadastro de motos e documentos",
    href: "/dashboard/vehicles",
    category: "Páginas",
    icon: Bike,
    badge: "Garagem",
  },
  {
    id: "devices",
    title: "Dispositivos & GPS",
    subtitle: "Gerenciamento de módulos e rastreadores",
    href: "/dashboard/devices",
    category: "Páginas",
    icon: Cpu,
    badge: "GPS",
  },
  {
    id: "history",
    title: "Histórico de Trajetos",
    subtitle: "Rotas percorridas, paradas e velocidades",
    href: "/dashboard/history",
    category: "Páginas",
    icon: History,
  },
  {
    id: "settings",
    title: "Configurações da Conta",
    subtitle: "Perfil, alertas e preferências do sistema",
    href: "/dashboard/settings",
    category: "Páginas",
    icon: Settings,
  },
  {
    id: "security",
    title: "Central de Segurança",
    subtitle: "Autenticação, sessões ativas e privacidade",
    href: "/dashboard/settings#seguranca",
    category: "Ações Rápidas",
    icon: Shield,
  },
  {
    id: "add-vehicle",
    title: "Cadastrar Nova Moto",
    subtitle: "Adicione uma nova motocicleta ao rastreamento",
    href: "/dashboard/vehicles?action=new",
    category: "Ações Rápidas",
    icon: Bike,
    badge: "Novo",
  },
];

export function QuickSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return SEARCH_ITEMS;
    const q = query.toLowerCase();
    return SEARCH_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Handle global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1,
        );
      } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
        e.preventDefault();
        router.push(filteredItems[selectedIndex].href);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, router, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-20 sm:pt-28">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border/90 bg-[#121212]/95 shadow-2xl shadow-black/80 backdrop-blur-2xl ring-1 ring-white/10"
          >
            {/* Top Red Glow Line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3.5">
              <Search className="size-5 text-primary" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar páginas, veículos, alertas ou atalhos..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
              <div className="hidden items-center gap-1 rounded bg-secondary/80 px-2 py-0.5 text-[10px] font-mono text-muted-foreground sm:flex">
                <kbd>ESC</kbd>
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center">
                  <Sparkles className="mx-auto size-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Nenhum resultado encontrado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tente buscar por &ldquo;veículos&rdquo;, &ldquo;dispositivos&rdquo; ou &ldquo;segurança&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item, index) => {
                    const Icon = item.icon;
                    const isSelected = index === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          router.push(item.href);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`group flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left transition-all ${
                          isSelected
                            ? "bg-primary/15 border border-primary/40 text-foreground"
                            : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                              isSelected
                                ? "bg-primary text-white"
                                : "bg-secondary text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary border border-primary/30">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          className={`size-4 transition-transform ${
                            isSelected
                              ? "translate-x-0.5 text-primary opacity-100"
                              : "opacity-0 group-hover:opacity-60"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-border/80 bg-[#0d0d0d]/80 px-4 py-2.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-mono">
                  <kbd className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">↑↓</kbd>
                  Navegar
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <kbd className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">ENTER</kbd>
                  Selecionar
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-primary font-semibold uppercase tracking-wider text-[10px]">
                <Command className="size-3" />
                RideOn QuickNav
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
