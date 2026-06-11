"use client";

import Link from "next/link";
import { BrandTheme, getBrandTheme } from "@/lib/brand";
import { useLanguage } from "@/lib/language";
import { getLocalizedProduct } from "@/lib/localized-data";
import { CatalogProduct } from "@/lib/products";

type ProductCardProps = {
  product: CatalogProduct;
  theme?: BrandTheme;
};

function formatPrice(price: number | null, language: "ru" | "uz") {
  if (price === null) return null;

  return (
    new Intl.NumberFormat(language === "ru" ? "ru-RU" : "uz-UZ").format(
      price
    ) + (language === "ru" ? " сум" : " so'm")
  );
}

export default function ProductCard({
  product,
  theme = getBrandTheme(product.brand),
}: ProductCardProps) {
  const { language, t } = useLanguage();
  const localizedProduct = getLocalizedProduct(product, language);
  const price = formatPrice(product.price, language);

  return (
    <Link
      href={`/product/${product.slug || product.id}`}
      className="group block overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_18px_60px_rgba(45,45,45,0.06)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(45,45,45,0.12)]"
    >
      <div
        className="relative aspect-[4/5] overflow-hidden"
        style={{ background: theme.surface }}
      >
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          <span
            className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
            style={{ background: theme.primary }}
          >
            {theme.label}
          </span>
          {product.is_new && (
            <span className="rounded-full bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-ink)] backdrop-blur">
              {t("newBadge")}
            </span>
          )}
          {product.is_hit && (
            <span className="rounded-full bg-black/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
              {t("hitBadge")}
            </span>
          )}
        </div>

        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={localizedProduct.name}
            className="h-full w-full object-contain p-8 transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-2xl font-extrabold tracking-[0.35em]"
            style={{ color: theme.primary }}
          >
            MIO
          </div>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            {product.brand || theme.label}
          </p>
          <h3 className="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-[var(--brand-ink)]">
            {localizedProduct.name}
          </h3>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-bold text-[var(--brand-ink)]">
            {price || t("priceOnRequest")}
          </p>
          <span
            className="rounded-full px-4 py-2 text-sm font-semibold text-white transition group-hover:scale-105"
            style={{ background: theme.primary }}
          >
            {t("addToCart")}
          </span>
        </div>
      </div>
    </Link>
  );
}
