"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";
  const { login, register, currentUser } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) router.replace(next);
  }, [currentUser, next, router]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setTimeout(() => {
      const result =
        mode === "signin"
          ? login(form.email, form.password)
          : register(form.name, form.email, form.password);
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      {/* Left — editorial side */}
      <div className="relative hidden overflow-hidden border-r border-ink-500 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(212,165,116,0.08),transparent_60%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="font-display text-2xl tracking-tight text-bone-100">
              Meridian
            </span>
            <span className="label">Est. 2024</span>
          </Link>

          <div>
            <p className="label-amber label">Members only</p>
            <h1 className="mt-6 font-display text-5xl font-light leading-[0.95] text-bone-100 xl:text-6xl">
              Your garage,
              <br />
              <span className="italic">considered</span>.
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-bone-300">
              Sign in to track listings, save wishlists, and pick up where you left off in a
              reservation.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-0 border-t border-ink-500 pt-8">
            <Stat label="Members" value="2,140" />
            <Stat label="Verified" value="96%" />
            <Stat label="Since" value="2024" />
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-col">
        <header className="flex items-center justify-between border-b border-ink-500 px-6 py-5 md:px-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-bone-400 transition hover:text-amber"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Back to marketplace
            </span>
          </Link>
          <Link href="/" className="font-display text-xl text-bone-100 lg:hidden">
            Meridian
          </Link>
          <div className="hidden lg:block">
            <p className="font-mono text-[10px] uppercase tracking-wider text-bone-400 tabular">
              {String(new Date().getDate()).padStart(2, "0")}.
              {String(new Date().getMonth() + 1).padStart(2, "0")}.
              {new Date().getFullYear()}
            </p>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-12 md:px-10">
          <div className="w-full max-w-md">
            {/* Mode toggle */}
            <div className="mb-10 flex items-center border border-ink-500">
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`flex-1 py-3 font-mono text-[10px] uppercase tracking-wider transition ${
                    mode === m
                      ? "bg-amber text-ink-900"
                      : "text-bone-300 hover:text-bone-100"
                  }`}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="label-amber label">
                  {mode === "signin" ? "Welcome back" : "A new account"}
                </p>
                <h2 className="mt-3 font-display text-4xl font-light leading-tight text-bone-100 md:text-5xl">
                  {mode === "signin" ? (
                    <>
                      Enter the <span className="italic">marketplace</span>.
                    </>
                  ) : (
                    <>
                      Begin, <span className="italic">briefly</span>.
                    </>
                  )}
                </h2>

                <form onSubmit={onSubmit} className="mt-8 space-y-5">
                  {mode === "signup" && (
                    <Field
                      label="Full name"
                      value={form.name}
                      onChange={(v) => setForm({ ...form, name: v })}
                      placeholder="As it appears on your licence"
                      type="text"
                    />
                  )}
                  <Field
                    label="Email"
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                  />
                  <div>
                    <label className="label mb-3 block">Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                        autoComplete={
                          mode === "signup" ? "new-password" : "current-password"
                        }
                        className="input-base pr-11 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-bone-400 transition hover:text-amber"
                        tabIndex={-1}
                      >
                        {showPw ? (
                          <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                        ) : (
                          <Eye className="h-4 w-4" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-l-2 border-signal-red bg-signal-red/5 px-4 py-3"
                    >
                      <p className="font-mono text-[11px] text-signal-red">{error}</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group mt-2 flex w-full items-center justify-center gap-3 bg-amber py-4 font-mono text-xs uppercase tracking-wider text-ink-900 transition enabled:hover:bg-amber-soft disabled:opacity-60"
                  >
                    {loading
                      ? mode === "signin"
                        ? "Signing in…"
                        : "Creating account…"
                      : mode === "signin"
                        ? "Sign in"
                        : "Create account"}
                    {!loading && (
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        strokeWidth={2}
                      />
                    )}
                  </button>

                  <p className="pt-2 text-center font-mono text-[11px] text-bone-400">
                    {mode === "signin" ? (
                      <>
                        No account yet?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("signup");
                            setError(null);
                          }}
                          className="text-amber transition hover:text-amber-soft"
                        >
                          Create one
                        </button>
                      </>
                    ) : (
                      <>
                        Already registered?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("signin");
                            setError(null);
                          }}
                          className="text-amber transition hover:text-amber-soft"
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </form>

                <p className="mt-10 border-t border-ink-500 pt-6 text-center font-mono text-[10px] leading-relaxed text-bone-500">
                  Demo auth · accounts are stored locally in your browser. No server, no
                  tracking, no real credentials required.
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-mono text-xs text-bone-400">Loading…</p>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="label mb-3 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="input-base font-mono"
        required
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-2xl text-bone-100 tabular">{value}</p>
      <p className="label mt-1">{label}</p>
    </div>
  );
}
