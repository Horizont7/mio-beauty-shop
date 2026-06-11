"use client";

import Link from "next/link";
import { NavigationCategory } from "@/lib/categories";
import { useLanguage } from "@/lib/language";

export default function LuxuryFooter({
  categories,
}: {
  categories: NavigationCategory[];
}) {
  const { t } = useLanguage();

  return (
    <footer className="mt-24 bg-[#211f1e] text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <div className="text-5xl font-extrabold tracking-[0.28em] text-[var(--brand-mio-beauty-primary)]">
            MIO
          </div>
          <p className="mt-3 max-w-sm text-sm leading-7 text-white/60">
            {t("footerDescription")}
          </p>
        </div>

        <div>
          <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
            {t("brands")}
          </h3>
          <div className="space-y-3 text-sm text-white/75">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="block transition hover:text-white"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
            {t("service")}
          </h3>
          <div className="space-y-3 text-sm text-white/75">
            <p>{t("delivery")}</p>
            <p>{t("payment")}</p>
            <p>{t("dealerAccess")}</p>
            <p>{t("wholesaleCatalog")}</p>
            <p>{t("beautyConsultation")}</p>
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
            {t("connect")}
          </h3>
          <div className="space-y-3 text-sm text-white/75">
            <p>+998 (88) 033-85-26</p>
            <p>info@miobeauty.uz</p>
            <p>Instagram / Telegram / YouTube</p>
            <p>{t("marketplacePartnerships")}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>(c) 2026 MIO Beauty.</span>
          <span>{t("platform")}</span>
          <span>contact@miobeauty.uz</span>
        </div>
      </div>
    </footer>
  );
}
