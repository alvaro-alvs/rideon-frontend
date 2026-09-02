"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import { RideOnLogo } from "@/app/components/rideon-logo";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <RideOnLogo href="/" />
        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Navegação principal"
        >
          <Link href="/" className="nav-link">
            Inicio
          </Link>
          <Link href="/#recursos" className="nav-link">
            Recursos
          </Link>
          <Link href="/#plataforma" className="nav-link">
            Plataforma
          </Link>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="inline-flex min-h-9 items-center px-4 text-xs font-semibold uppercase tracking-[0.08em] hover:text-primary"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-9 items-center bg-primary px-4 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90"
          >
            Registre-se
          </Link>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>
      {open && (
        <nav
          className="border-t border-border bg-background px-5 py-5 md:hidden"
          aria-label="Navegação mobile"
        >
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="mobile-nav-link"
              onClick={() => setOpen(false)}
            >
              Inicio
            </Link>
            <Link
              href="/#recursos"
              className="mobile-nav-link"
              onClick={() => setOpen(false)}
            >
              Recursos
            </Link>
            <Link
              href="/#plataforma"
              className="mobile-nav-link"
              onClick={() => setOpen(false)}
            >
              Plataforma
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center border border-border text-xs font-semibold uppercase tracking-[0.08em]"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-11 items-center justify-center bg-primary text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground"
              >
                Registre-se
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
