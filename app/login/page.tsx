"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

import { AuthLayout } from "@/app/components/auth-layout";
import { Button } from "@/app/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/dashboard");
  };
  return (
    <AuthLayout
      title="Bem-vindo de volta."
      copy="Acesse sua central e acompanhe seus veiculos em tempo real."
    >
      <form onSubmit={submit} className="space-y-5">
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
              type={showPassword ? "text" : "password"}
              placeholder="Minimo de 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label="Mostrar ou ocultar senha"
            >
              <Eye className="size-4" />
            </button>
          </div>
        </label>
        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
          >
            Esqueci minha senha
          </button>
        </div>
        <Button type="submit" className="w-full">
          Entrar <ArrowRight className="size-4" />
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Ainda nao tem uma conta?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            Registre-se
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
