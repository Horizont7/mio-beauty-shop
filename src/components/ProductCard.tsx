"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BrandTheme, getBrandTheme } from "@/lib/brand";
import { useLanguage } from "@/lib/language";
import { getLocalizedProduct } from "@/lib/localized-data";
import { CatalogProduct } from "@/lib/products";

type ProductCardProps = {
  product: CatalogProduct;
  theme?: BrandTheme;
  compact?: boolean;
};

function formatPrice(price: number | null, language: "ru" | "uz") {
  if (price === null) return null;

  return (
    new Intl.NumberFormat(language === "ru" ? "ru-RU" : "uz-UZ").format(
      price
    ) + (language === "ru" ? " сум" : " so'm")
  );
}

function ProductCardImage({ src, alt }: { src: string; alt: string }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <>
      <div
        className={`absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,0.08),rgba(255,255,255,0.55),rgba(255,255,255,0.08))] transition-opacity duration-500 ${
          imageLoaded ? "opacity-0" : "animate-pulse opacity-100"
        }`}
      />
      <div className="absolute inset-6 sm:inset-8">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={`object-contain drop-shadow-[0_24px_30px_rgba(67,46,39,0.16)] transition duration-700 group-hover:scale-110 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          quality={75}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
    </>
  );
}

export default function ProductCard({
  product,
  theme = getBrandTheme(product.brand),
  compact = false,
}: ProductCardProps) {
  const { language, t } = useLanguage();
  const localizedProduct = getLocalizedProduct(product, language);
  const price = formatPrice(product.price, language);
  const oldPrice = formatPrice(product.old_price ?? null, language);

  return (
    <Link
      href={`/product/${product.slug || product.id}`}
      className="group block overflow-hidden rounded-[20px] border border-white/80 bg-white/90 shadow-[0_20px_60px_rgba(112,72,61,0.1)] backdrop-blur transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_90px_rgba(112,72,61,0.18)] sm:rounded-[24px]"
    >
      <div
        className={`relative overflow-hidden ${
          compact ? "aspect-[1/1.05] sm:aspect-[1/1.18]" : "aspect-[1/1.18]"
        }`}
        style={{
          background: `linear-gradient(145deg, ${theme.surface}, #fffaf7 62%, #f4ddd6)`,
        }}
      >
        <div className="absolute inset-x-6 bottom-5 h-12 rounded-full bg-black/10 blur-2xl transition duration-700 group-hover:scale-110 sm:inset-x-8 sm:bottom-6 sm:h-16" />
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 sm:left-4 sm:top-4 sm:gap-2">
          <span
            className="rounded-full border border-white/50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur sm:px-3 sm:text-[10px] sm:tracking-[0.18em]"
            style={{ background: theme.primary }}
          >
            {theme.label}
          </span>
          {product.is_new && (
            <span className="rounded-full border border-white/70 bg-white/85 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-ink)] backdrop-blur sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">
              {t("newBadge")}
            </span>
          )}
          {product.is_hit && (
            <span className="rounded-full border border-white/20 bg-black/80 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">
              {t("hitBadge")}
            </span>
          )}
        </div>

        {product.image ? (
          <ProductCardImage
            key={product.image}
            src={product.image}
            alt={localizedProduct.name}
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

      <div className="space-y-3 p-3.5 sm:space-y-5 sm:p-6">
        <div>
          <p className="mb-2 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b9958c] sm:mb-3 sm:text-[11px] sm:tracking-[0.22em]">
            {product.brand || theme.label}
          </p>
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[var(--brand-ink)] sm:min-h-14 sm:text-lg sm:leading-7">
            {localizedProduct.name}
          </h3>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--brand-ink)] sm:text-lg">
              {price || t("priceOnRequest")}
            </p>
            {oldPrice && product.old_price !== product.price && (
              <p className="mt-1 truncate text-xs font-semibold text-[#b9958c] line-through sm:text-sm">
                {oldPrice}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-[var(--brand-ink)] px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(33,31,30,0.18)] transition duration-300 group-hover:scale-105 group-hover:bg-[#EEA391] sm:px-4 sm:text-sm">
            {t("addToCart")}
          </span>
        </div>
      </div>
    </Link>
  );
}
