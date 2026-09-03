"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, LockKeyhole, Mail } from "lucide-react";
import { Suspense, useState, type FormEvent } from "react";

import { AuthLayout } from "@/app/components/auth-layout";
import { Button } from "@/app/components/ui/button";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const registered = searchParams.get("registered") === "1";
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Nao foi possivel entrar.");
      }

      router.push("/dashboard");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Nao foi possivel entrar. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
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
            <input
              required
              name="email"
              autoComplete="email"
              type="email"
              placeholder="voce@email.com"
            />
          </div>
        </label>
        <label className="field-label">
          Senha
          <div className="input-wrap">
            <LockKeyhole className="size-4" />
            <input
              required
              name="password"
              autoComplete="current-password"
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
        {registered && !error && (
          <p role="status" className="text-sm text-primary">
            Conta criada. Agora entre com seus dados.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-primary">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Entrando..." : "Entrar"} <ArrowRight className="size-4" />
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
