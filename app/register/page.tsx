"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

import { AuthLayout } from "@/app/components/auth-layout";
import { Button } from "@/app/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accepted) return;
    setError("");
    setPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Nao foi possivel criar a conta.");
      }

      router.push("/login?registered=1");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Nao foi possivel criar a conta. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <AuthLayout
      title="Comece agora."
      copy="Crie seu acesso demonstrativo e conheca a central RideOn."
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
              autoComplete="new-password"
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
        {error && (
          <p role="alert" className="text-sm text-primary">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={!accepted || pending}
          className="w-full"
        >
          {pending ? "Criando..." : "Criar conta"}{" "}
          <ArrowRight className="size-4" />
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
