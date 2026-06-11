"use client";

import ProductCard from "@/components/ProductCard";
import { getBrandTheme } from "@/lib/brand";
import { useCommerce } from "@/lib/commerce";
import { useLanguage } from "@/lib/language";
import { CatalogProduct } from "@/lib/products";

export default function FavoritesPageContent({
  products,
}: {
  products: CatalogProduct[];
}) {
  const { favoriteIds } = useCommerce();
  const { t } = useLanguage();
  const favoriteProducts = products.filter((product) =>
    favoriteIds.includes(product.id)
  );

  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:py-16">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b97667] sm:text-xs">
        MIO Beauty
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--brand-ink)] sm:text-5xl">
        {t("favorites")}
      </h1>

      {favoriteProducts.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-8 lg:grid-cols-4">
          {favoriteProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              theme={getBrandTheme(product.brand)}
              compact
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[24px] border border-[#f3d2c8] bg-white p-6 text-sm text-[var(--brand-muted)] shadow-sm">
          {t("emptyFavorites")}
        </div>
      )}
    </section>
  );
}
