"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail, User } from "lucide-react";
import { useState, type FormEvent } from "react";

import { AuthLayout } from "@/app/components/auth-layout";
import { Button } from "@/app/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (accepted) router.push("/dashboard");
  };
  return (
    <AuthLayout
      title="Comece agora."
      copy="Crie seu acesso demonstrativo e conheca a central RideOn."
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="field-label">
          Nome completo
          <div className="input-wrap">
            <User className="size-4" />
            <input required placeholder="Seu nome" />
          </div>
        </label>
        <label className="field-label">
          E-mail
          <div className="input-wrap">
            <Mail className="size-4" />
            <input required type="email" placeholder="voce@email.com" />
          </div>
        </label>
        <label className="field-label">
          Senha
          <div className="input-wrap">
            <LockKeyhole className="size-4" />
            <input
              required
              minLength={6}
              type="password"
              placeholder="Minimo de 6 caracteres"
            />
          </div>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-muted-foreground">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-1 accent-primary"
          />
          Aceito os termos de uso e a politica de privacidade desta
          demonstracao.
        </label>
        <Button type="submit" disabled={!accepted} className="w-full">
          Criar conta <ArrowRight className="size-4" />
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Ja possui acesso?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
