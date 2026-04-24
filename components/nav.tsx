"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Heart, LogOut, Search, ShieldAlert, Car, User } from "lucide-react";
import { useCompare } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/acquisitions";
import { cn } from "@/lib/utils";

export function Nav() {
  const pathname = usePathname();
  const wishlistCount = useCompare((s) => s.wishlist.length);
  const currentUser = useAuth((s) => s.currentUser);
  const logout = useAuth((s) => s.logout);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const initials = currentUser
    ? currentUser.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : null;
  const admin = isAdmin(currentUser?.email);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-500 bg-ink-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-display text-2xl tracking-tight text-bone-100">
            Meridian
          </span>
          <span className="label hidden md:inline">Est. 2024</span>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          <NavLink href="/" active={pathname === "/"}>
            Marketplace
          </NavLink>
          <NavLink href="/compare" active={pathname === "/compare"}>
            Compare
          </NavLink>
          <NavLink href="/#sell" active={false}>
            Sell
          </NavLink>
          <NavLink href="/#journal" active={false}>
            Journal
          </NavLink>
        </nav>

        <div className="flex items-center gap-5">
          <button
            className="text-bone-300 transition hover:text-amber"
            aria-label="Search"
          >
            <Search className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <Link
            href="#"
            className="relative text-bone-300 transition hover:text-amber"
            aria-label="Wishlist"
          >
            <Heart className="h-4 w-4" strokeWidth={1.5} />
            {wishlistCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center bg-amber font-mono text-[9px] text-ink-900">
                {wishlistCount}
              </span>
            )}
          </Link>

          {currentUser ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 border border-ink-500 px-3 py-1.5 transition hover:border-amber"
              >
                <span className="flex h-5 w-5 items-center justify-center bg-amber font-mono text-[9px] text-ink-900">
                  {initials}
                </span>
                <span className="hidden font-mono text-[11px] text-bone-100 md:inline">
                  {currentUser.name.split(" ")[0]}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-64 border border-ink-500 bg-ink-800 shadow-2xl">
                  <div className="border-b border-ink-500 p-4">
                    <p className="label">Signed in as</p>
                    <p className="mt-1 truncate font-mono text-xs text-bone-100">
                      {currentUser.email}
                    </p>
                    {admin && (
                      <p className="mt-2 inline-block border border-amber/40 bg-amber/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber">
                        Admin
                      </p>
                    )}
                  </div>
                  <Link
                    href="/account/acquisitions"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-3 border-b border-ink-500 px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-bone-300 transition hover:bg-ink-700 hover:text-amber"
                  >
                    <Car className="h-3.5 w-3.5" strokeWidth={1.5} />
                    My acquisitions
                  </Link>
                  {admin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-3 border-b border-ink-500 px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-bone-300 transition hover:bg-ink-700 hover:text-amber"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Admin dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-bone-300 transition hover:bg-ink-700 hover:text-signal-red"
                  >
                    <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 border border-ink-500 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-bone-300 transition hover:border-amber hover:text-amber"
            >
              <User className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden md:inline">Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "label transition-colors",
        active ? "label-amber" : "hover:text-bone-100"
      )}
    >
      {children}
    </Link>
  );
}
