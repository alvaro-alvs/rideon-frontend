import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";

import { RideOnLogo } from "@/app/components/rideon-logo";

export function AuthLayout({
  title,
  copy,
  children,
}: {
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[.9fr_1.1fr]">
      <section className="flex min-h-screen flex-col bg-background p-6 sm:p-10 lg:p-14">
        <div className="flex items-center justify-between">
          <RideOnLogo href="/" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.08em] hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </div>
        <div className="mx-auto my-auto w-full max-w-md py-16">
          <p className="section-kicker">Area do cliente</p>
          <h1 className="mt-5 text-4xl font-bold uppercase sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">{copy}</p>
          <div className="mt-10">{children}</div>
        </div>
      </section>
      <aside className="auth-visual relative hidden overflow-hidden border-l border-border lg:block">
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative z-10 flex h-full flex-col justify-end p-16">
          <LockKeyhole className="size-10 text-primary" />
          <blockquote className="mt-7 max-w-xl text-3xl font-semibold uppercase leading-tight">
            Liberdade e saber que sua moto esta protegida.
          </blockquote>
          <p className="mt-5 text-sm text-muted-foreground">
            Monitoramento inteligente. Decisoes rapidas.
          </p>
        </div>
      </aside>
    </main>
  );
}
