"use client";

import Link from "next/link";
import LuxuryFooter from "@/components/LuxuryFooter";
import ProductCard from "@/components/ProductCard";
import SiteHeader from "@/components/SiteHeader";
import { getBrandTheme } from "@/lib/brand";
import { Category, NavigationCategory } from "@/lib/categories";
import { useLanguage } from "@/lib/language";
import { getLocalizedCategory } from "@/lib/localized-data";
import { CategoryProduct } from "@/lib/products";

type CategoryPageContentProps = {
  navCategories: NavigationCategory[];
  category: Category | null;
  products: CategoryProduct[];
  errorMessage?: string;
};

function StatusMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl rounded-[24px] bg-white p-6 text-center shadow-[0_20px_80px_rgba(45,45,45,0.08)] sm:rounded-[34px] sm:p-10">
        <h1 className="text-2xl font-semibold text-[var(--brand-ink)] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-[var(--brand-muted)]">{message}</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-[var(--brand-mio-beauty-primary)] px-6 py-3 font-semibold text-white"
        >
          {t("backToHome")}
        </Link>
      </div>
    </main>
  );
}

export default function CategoryPageContent({
  navCategories,
  category,
  products,
  errorMessage,
}: CategoryPageContentProps) {
  const { language, t } = useLanguage();

  if (errorMessage) {
    return (
      <>
        <SiteHeader categories={navCategories} />
        <StatusMessage title={t("errorTitle")} message={errorMessage} />
      </>
    );
  }

  if (!category) {
    return (
      <>
        <SiteHeader categories={navCategories} />
        <StatusMessage
          title={t("categoryNotFound")}
          message={t("categoryNotFoundMessage")}
        />
      </>
    );
  }

  const theme = getBrandTheme(`${category.name} ${category.slug}`);
  const localizedCategoryName = getLocalizedCategory(category, language);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={navCategories} />
      <section
        className="relative overflow-hidden px-4 py-8 sm:px-6 sm:py-20"
        style={{ background: theme.surface }}
      >
        <div className="mx-auto max-w-7xl">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.24em] sm:text-xs sm:tracking-[0.32em]"
            style={{ color: theme.primary }}
          >
            {t("category")}
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--brand-ink)] sm:mt-4 sm:text-6xl">
            {localizedCategoryName}
          </h1>
          {category.description && (
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--brand-muted)] sm:mt-6 sm:text-lg sm:leading-8">
              {category.description}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 sm:py-14">
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
          {navCategories.map((item) => (
            <Link
              key={item.id}
              href={`/category/${item.slug}`}
              className={`h-10 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
                item.id === category.id
                  ? "border-[#EEA391] bg-[#EEA391] text-white"
                  : "border-[#f0c7bc] bg-white text-[var(--brand-ink)]"
              }`}
            >
              {getLocalizedCategory(item, language)}
            </Link>
          ))}
        </div>

        <div className="mb-5 flex items-center justify-between gap-4 rounded-[22px] bg-white p-4 shadow-sm md:mb-8 md:rounded-[30px] md:p-5">
          <p className="text-sm font-semibold text-[var(--brand-muted)]">
            {products.length} {t("activeProducts")}
          </p>
          <Link
            href="/"
            className="hidden rounded-full border border-black/10 px-5 py-2 text-sm font-semibold text-[var(--brand-ink)] md:inline-flex"
          >
            {t("backToFlagship")}
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-7 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                theme={theme}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] bg-white p-6 text-center shadow-sm sm:rounded-[34px] sm:p-12">
            <h2 className="text-xl font-semibold text-[var(--brand-ink)] sm:text-2xl">
              {t("emptyProducts")}
            </h2>
            <p className="mt-3 text-[var(--brand-muted)]">
              {t("emptyCategoryProducts")}
            </p>
          </div>
        )}
      </section>
      <LuxuryFooter categories={navCategories} />
    </main>
  );
}
