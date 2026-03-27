"use client";

import { useState } from "react";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "../../../i18n/navigation";

export default function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const otherLocale = locale === "ko" ? "en" : "ko";

  const navItems = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/predictions`, label: t("predictions") },
    { href: `/${locale}/rankings`, label: t("rankings") },
    { href: `/${locale}/cheer`, label: t("cheer") },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/60">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href={`/${locale}`}
          className="text-lg font-black tracking-tight text-primary"
        >
          LET&apos;S KO
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                pathname === item.href
                  ? "text-primary bg-primary-light"
                  : "text-muted hover:text-foreground hover:bg-surface"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="w-px h-5 bg-border mx-2" />
          <Link
            href={pathname}
            locale={otherLocale}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            {otherLocale.toUpperCase()}
          </Link>
        </nav>

        {/* Mobile: locale switch + menu button */}
        <div className="sm:hidden flex items-center gap-1">
          <Link
            href={pathname}
            locale={otherLocale}
            className="text-xs font-bold px-2.5 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            {otherLocale.toUpperCase()}
          </Link>
          <button
            className="p-2 -mr-2 text-muted hover:text-foreground rounded-lg hover:bg-surface transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="sm:hidden border-t border-border/60 bg-white/95 backdrop-blur-xl px-6 py-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium px-3 py-2 rounded-lg ${
                pathname === item.href
                  ? "text-primary bg-primary-light"
                  : "text-muted"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
