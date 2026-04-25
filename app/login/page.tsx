"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";
  const { login, currentUser } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
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
      const result = login(form.email, form.password);
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="label-amber label">Welcome back</p>
              <h2 className="mt-3 font-display text-4xl font-light leading-tight text-bone-100 md:text-5xl">
                Enter the <span className="italic">marketplace</span>.
              </h2>

              <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
                      placeholder="••••••••"
                      autoComplete="current-password"
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
                  {loading ? "Signing in…" : "Sign in"}
                  {!loading && (
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      strokeWidth={2}
                    />
                  )}
                </button>
              </form>

              <div className="mt-10 border-t border-ink-500 pt-6 space-y-3 text-center font-mono text-[10px] leading-relaxed text-bone-500">
                <p>Demo access · use either set of credentials below.</p>
                <div className="space-y-1 text-bone-300">
                  <p>
                    <span className="text-amber">Admin</span> · admin@meridian.com · meridian123
                  </p>
                  <p>
                    <span className="text-amber">Customer</span> · customer@meridian.com · customer123
                  </p>
                </div>
              </div>
            </motion.div>
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
