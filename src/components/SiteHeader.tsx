"use client";

import Link from "next/link";
import { useState } from "react";
import { NavigationCategory } from "@/lib/categories";
import { Language, languages } from "@/lib/translations";
import { useLanguage } from "@/lib/language";
import { getLocalizedCategory } from "@/lib/localized-data";

export default function SiteHeader({
  categories,
}: {
  categories: NavigationCategory[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/85 backdrop-blur-xl">
      <div className="border-b border-black/5 bg-[var(--brand-mio-beauty-surface)]/70">
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-5 text-xs font-medium uppercase tracking-[0.18em] text-[var(--brand-muted)]">
          <span>{t("platformHeroEyebrow")}</span>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block">+998 (88) 033-85-26</span>
            <div className="flex items-center gap-1 rounded-full border border-black/10 bg-white/70 p-1">
              {languages.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item as Language)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                    language === item
                      ? "bg-[var(--brand-mio-beauty-primary)] text-white"
                      : "text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
                  }`}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-5 px-5 py-5">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-ink)] lg:hidden"
        >
          {t("menu")}
        </button>

        <Link href="/" className="justify-self-start">
          <div className="text-4xl font-extrabold tracking-[0.28em] text-[var(--brand-mio-beauty-primary)]">
            MIO
          </div>
          <div className="text-center text-[10px] font-semibold uppercase tracking-[0.52em] text-[var(--brand-mio-beauty-primary)]">
            Beauty
          </div>
        </Link>

        <nav className="hidden justify-self-center lg:block">
          <ul className="flex items-center gap-9 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-ink)]">
            <li>
              <Link
                href="/#platform"
                className="transition hover:text-[var(--brand-mio-beauty-primary)]"
              >
                {t("platform")}
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/category/${category.slug}`}
                  className="transition hover:text-[var(--brand-mio-beauty-primary)]"
                >
                  {getLocalizedCategory(category, language)}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/#b2b"
                className="transition hover:text-[var(--brand-mio-beauty-primary)]"
              >
                {t("b2b")}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex items-center justify-end gap-3">
          <input
            type="search"
            placeholder={t("searchBeauty")}
            className="hidden h-11 w-56 rounded-full border border-black/10 bg-white px-5 text-sm outline-none transition focus:border-[var(--brand-mio-beauty-primary)] md:block"
          />
          <Link
            href="/#new-arrivals"
            className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
          >
            {t("shop")}
          </Link>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-black/5 bg-white px-5 py-5 lg:hidden">
          <div className="space-y-3 text-sm font-semibold uppercase tracking-[0.18em]">
            <Link
              href="/#platform"
              onClick={() => setMenuOpen(false)}
              className="block rounded-2xl bg-[var(--brand-mio-beauty-surface)] px-4 py-3"
            >
              {t("platform")}
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                onClick={() => setMenuOpen(false)}
                className="block rounded-2xl bg-[var(--brand-mio-beauty-surface)] px-4 py-3"
              >
                {getLocalizedCategory(category, language)}
              </Link>
            ))}
            <Link
              href="/#b2b"
              onClick={() => setMenuOpen(false)}
              className="block rounded-2xl bg-[var(--brand-mio-beauty-surface)] px-4 py-3"
            >
              {t("b2b")}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
