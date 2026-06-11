"use client";

import Link from "next/link";
import { NavigationCategory } from "@/lib/categories";
import { useLanguage } from "@/lib/language";
import { getLocalizedCategory } from "@/lib/localized-data";

export default function LuxuryFooter({
  categories,
}: {
  categories: NavigationCategory[];
}) {
  const { language, t } = useLanguage();

  return (
    <footer className="mt-10 bg-[#211f1e] pb-24 text-white md:mt-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:py-16 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <div className="text-4xl font-extrabold tracking-[0.24em] text-[var(--brand-mio-beauty-primary)] md:text-5xl md:tracking-[0.28em]">
            MIO
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/60 md:leading-7">
            {t("footerDescription")}
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/50 md:mb-5 md:tracking-[0.22em]">
            {t("brands")}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-white/75 md:block md:space-y-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="block transition hover:text-white"
              >
                {getLocalizedCategory(category, language)}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/50 md:mb-5 md:tracking-[0.22em]">
            {t("service")}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-white/75 md:block md:space-y-3">
            <p>{t("delivery")}</p>
            <p>{t("payment")}</p>
            <p>{t("dealerAccess")}</p>
            <p>{t("wholesaleCatalog")}</p>
            <p>{t("beautyConsultation")}</p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/50 md:mb-5 md:tracking-[0.22em]">
            {t("connect")}
          </h3>
          <div className="space-y-2 text-sm text-white/75 md:space-y-3">
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
