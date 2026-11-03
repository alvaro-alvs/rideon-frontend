"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function FirstLoginPasswordModal() {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const queryFirstLogin = searchParams.get("first_login") === "1";
    const localFirstLogin = window.localStorage.getItem("rideon_first_login_prompt") === "true";
    const alreadyDismissed = window.sessionStorage.getItem("rideon_password_modal_dismissed") === "true";

    if ((queryFirstLogin || localFirstLogin) && !alreadyDismissed) {
      setIsOpen(true);
      setShowBanner(true);
    }
  }, [searchParams]);

  const handleDismiss = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("rideon_password_modal_dismissed", "true");
    }
  };

  const handleClosePermanently = () => {
    setIsOpen(false);
    setShowBanner(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("rideon_first_login_prompt");
      window.sessionStorage.setItem("rideon_password_modal_dismissed", "true");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas digitadas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = (await res.json()) as { message?: string };

      if (!res.ok) {
        throw new Error(data.message || "Erro ao atualizar senha.");
      }

      setSuccess(true);
      setTimeout(() => {
        handleClosePermanently();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Top Banner if user dismissed modal but hasn't changed password yet */}
      {showBanner && !isOpen && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4 text-xs">
          <div className="flex items-center gap-2.5">
            <KeyRound className="size-4 shrink-0 text-amber-400" />
            <span className="text-foreground">
              <strong>Primeiro acesso detectado:</strong> Recomendamos definir sua própria senha definitiva para a segurança da sua frota.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsOpen(true)}
              className="font-bold text-amber-400 hover:underline transition-colors"
            >
              Definir senha agora
            </button>
            <button
              onClick={handleClosePermanently}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Dispensar aviso"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Suggested Password Change Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground">
            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>

            {/* Header Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
                <KeyRound className="size-6" />
              </div>
              <div>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30">
                  Primeiro Acesso
                </span>
                <h3 className="mt-1 text-base font-bold text-foreground">
                  Sugerimos alterar sua senha
                </h3>
              </div>
            </div>

            {success ? (
              <div className="py-8 text-center space-y-2">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="size-7" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Senha Atualizada com Sucesso!</h4>
                <p className="text-xs text-muted-foreground">Sua nova credencial foi gravada com segurança.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Como seu cadastro inicial foi originado pelo seu gestor de frota,
                  recomendamos definir uma <strong>senha pessoal exclusiva</strong> para manter a privacidade dos seus veículos.
                </p>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Nova Senha */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Nova Senha (Mínimo de 8 caracteres)
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      minLength={8}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Confirmar Nova Senha
                  </label>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    minLength={8}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Buttons */}
                <div className="mt-5 grid grid-cols-2 gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={handleDismiss}
                    className="w-full text-xs font-semibold"
                  >
                    Lembrar mais tarde
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !newPassword}
                    className="w-full gap-1.5 text-xs font-bold uppercase tracking-wider"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Alterar Senha"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
