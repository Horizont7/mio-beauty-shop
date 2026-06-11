"use client";

import Link from "next/link";
import LuxuryFooter from "@/components/LuxuryFooter";
import ProductCard from "@/components/ProductCard";
import SiteHeader from "@/components/SiteHeader";
import { getBrandTheme } from "@/lib/brand";
import { Category, NavigationCategory } from "@/lib/categories";
import { useLanguage } from "@/lib/language";
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
    <main className="min-h-screen bg-[var(--background)] px-6 py-16">
      <div className="mx-auto max-w-7xl rounded-[34px] bg-white p-10 text-center shadow-[0_20px_80px_rgba(45,45,45,0.08)]">
        <h1 className="text-3xl font-semibold text-[var(--brand-ink)]">
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
  const { t } = useLanguage();

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

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={navCategories} />
      <section
        className="relative overflow-hidden px-6 py-20"
        style={{ background: theme.surface }}
      >
        <div className="mx-auto max-w-7xl">
          <p
            className="text-xs font-semibold uppercase tracking-[0.32em]"
            style={{ color: theme.primary }}
          >
            {t("category")}
          </p>
          <h1 className="mt-4 text-6xl font-semibold text-[var(--brand-ink)]">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--brand-muted)]">
              {category.description}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8 flex flex-col gap-4 rounded-[30px] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[var(--brand-muted)]">
            {products.length} {t("activeProducts")}
          </p>
          <Link
            href="/"
            className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold text-[var(--brand-ink)]"
          >
            {t("backToFlagship")}
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                theme={theme}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[34px] bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-[var(--brand-ink)]">
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
