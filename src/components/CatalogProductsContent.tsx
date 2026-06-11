"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { getBrandTheme } from "@/lib/brand";
import { NavigationCategory } from "@/lib/categories";
import { useLanguage } from "@/lib/language";
import {
  getLocalizedCategory,
  getLocalizedProduct,
} from "@/lib/localized-data";
import { CatalogProduct } from "@/lib/products";

type CatalogProductsContentProps = {
  categories: NavigationCategory[];
  products: CatalogProduct[];
};

export default function CatalogProductsContent({
  categories,
  products,
}: CatalogProductsContentProps) {
  const { language, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const localized = getLocalizedProduct(product, language);
      const matchesCategory =
        categoryId === null || product.category_id === categoryId;
      const matchesSearch =
        !query ||
        localized.name.toLowerCase().includes(query) ||
        (product.brand || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });

    if (sortMode === "price-low") {
      return [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    if (sortMode === "price-high") {
      return [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return filtered;
  }, [categoryId, language, products, search, sortMode]);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 sm:py-16">
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b97667] sm:text-xs">
          MIO Beauty
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--brand-ink)] sm:text-6xl">
          {t("luxuryCatalog")}
        </h1>
      </div>

      <div className="sticky top-[112px] z-30 -mx-4 border-y border-[#f3d2c8]/80 bg-[#faf7f5]/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-[28px] md:border md:bg-white md:p-4 md:shadow-sm">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchProducts")}
          className="h-12 w-full rounded-full border border-[#f0c7bc] bg-white px-5 text-sm font-medium outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/15"
        />

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryChip
            active={categoryId === null}
            label={t("all")}
            onClick={() => setCategoryId(null)}
          />
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              active={categoryId === category.id}
              label={getLocalizedCategory(category, language)}
              onClick={() => setCategoryId(category.id)}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--brand-muted)]">
            {filteredProducts.length} {t("products")}
          </p>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="h-10 rounded-full bg-[var(--brand-ink)] px-5 text-sm font-semibold text-white md:hidden"
          >
            {t("filters")}
          </button>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            className="hidden h-10 rounded-full border border-[#f0c7bc] bg-white px-4 text-sm font-semibold outline-none md:block"
          >
            <option value="featured">{t("featuredPriority")}</option>
            <option value="price-low">{t("priceLow")}</option>
            <option value="price-high">{t("priceHigh")}</option>
          </select>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-8 lg:grid-cols-4">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            theme={getBrandTheme(product.brand)}
            compact
          />
        ))}
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label={t("close")}
            className="absolute inset-0 bg-black/35"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[#f0c7bc]" />
            <h2 className="text-xl font-semibold text-[var(--brand-ink)]">
              {t("filters")}
            </h2>
            <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">
              {t("sort")}
            </label>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-[#f0c7bc] bg-white px-4 text-sm font-semibold outline-none"
            >
              <option value="featured">{t("featuredPriority")}</option>
              <option value="price-low">{t("priceLow")}</option>
              <option value="price-high">{t("priceHigh")}</option>
            </select>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="mt-5 h-12 w-full rounded-full bg-[#EEA391] text-sm font-semibold uppercase tracking-[0.14em] text-white"
            >
              {t("showing")} {filteredProducts.length}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${
        active
          ? "border-[#EEA391] bg-[#EEA391] text-white"
          : "border-[#f0c7bc] bg-white text-[var(--brand-ink)]"
      }`}
    >
      {label}
    </button>
  );
}
