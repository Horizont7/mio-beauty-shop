"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import LuxuryFooter from "@/components/LuxuryFooter";
import ProductCard from "@/components/ProductCard";
import SiteHeader from "@/components/SiteHeader";
import { BrandTheme, getBrandTheme } from "@/lib/brand";
import { NavigationCategory } from "@/lib/categories";
import { useLanguage } from "@/lib/language";
import { getLocalizedProduct } from "@/lib/localized-data";
import { CatalogProduct, ProductDetail } from "@/lib/products";

type ProductDetailContentProps = {
  product: ProductDetail | null;
  images: string[];
  relatedProducts: CatalogProduct[];
  categories: NavigationCategory[];
};

type ProductTab = "description" | "usage" | "ingredients" | "reviews";

function formatPrice(price: number | null, language: "ru" | "uz") {
  if (price === null) return null;

  return (
    new Intl.NumberFormat(language === "ru" ? "ru-RU" : "uz-UZ").format(
      price
    ) + (language === "ru" ? " сум" : " so'm")
  );
}

function ProductStatus({
  product,
}: {
  product: ProductDetail;
}) {
  const { t } = useLanguage();
  const inStock = product.stock === null || product.stock > 0;

  return (
    <span
      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
        inStock
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700"
      }`}
    >
      {inStock ? t("inStock") : t("outOfStock")}
    </span>
  );
}

export default function ProductDetailContent({
  product,
  images,
  relatedProducts,
  categories,
}: ProductDetailContentProps) {
  const { language, t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState(images[0] || "");
  const [selectedImageLoaded, setSelectedImageLoaded] = useState(false);
  const [loadedThumbnails, setLoadedThumbnails] = useState<
    Record<string, boolean>
  >({});
  const [activeTab, setActiveTab] = useState<ProductTab>("description");

  const category = product
    ? categories.find((item) => item.id === product.category_id)
    : null;
  const theme: BrandTheme = getBrandTheme(
    `${product?.brand || ""} ${category?.name || ""}`
  );
  const localizedProduct = product
    ? getLocalizedProduct(product, language)
    : null;
  const price = product ? formatPrice(product.price, language) : null;
  const oldPrice = product
    ? formatPrice(product.old_price, language)
    : null;
  const specs = product
    ? [
        { label: "SKU", value: product.sku },
        { label: "Barcode", value: product.barcode },
        { label: "Volume", value: product.volume },
        { label: "Weight", value: product.weight },
      ].filter((item) => item.value)
    : [];

  const tabs = useMemo(
    () => [
      {
        id: "description" as const,
        label: t("productDescription"),
        content:
          localizedProduct?.description || t("productDescriptionEmpty"),
      },
      {
        id: "usage" as const,
        label: t("productUsage"),
        content: t("productUsageEmpty"),
      },
      {
        id: "ingredients" as const,
        label: language === "ru" ? "Состав" : "Tarkibi",
        content:
          language === "ru"
            ? "Информация о составе скоро будет добавлена."
            : "Tarkib haqida ma'lumot tez orada qo'shiladi.",
      },
      {
        id: "reviews" as const,
        label: language === "ru" ? "Отзывы" : "Sharhlar",
        content:
          language === "ru"
            ? "Отзывы покупателей скоро появятся."
            : "Xaridorlar sharhlari tez orada qo'shiladi.",
      },
    ],
    [language, localizedProduct?.description, t]
  );

  if (!product || !localizedProduct) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <SiteHeader categories={categories} />
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="rounded-[34px] bg-white p-10 text-center shadow-[0_20px_80px_rgba(45,45,45,0.08)]">
            <h1 className="text-3xl font-semibold text-[var(--brand-ink)]">
              {t("productNotFound")}
            </h1>
            <p className="mt-3 text-[var(--brand-muted)]">
              {t("productNotFoundMessage")}
            </p>
          </div>
        </section>
        <LuxuryFooter categories={categories} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div>
          <div
            className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[34px] border border-[#f1d4cc] shadow-[0_24px_90px_rgba(238,163,145,0.16)]"
            style={{ background: theme.surface }}
          >
            {selectedImage ? (
              <>
                <div
                  className={`absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,0.06),rgba(255,255,255,0.5),rgba(255,255,255,0.06))] transition-opacity duration-500 ${
                    selectedImageLoaded ? "opacity-0" : "animate-pulse opacity-100"
                  }`}
                />
                <div className="absolute inset-8 md:inset-14">
                  <Image
                    src={selectedImage}
                    alt={localizedProduct.name}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className={`object-contain transition-opacity duration-500 ${
                      selectedImageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    loading="lazy"
                    quality={80}
                    onLoad={() => setSelectedImageLoaded(true)}
                  />
                </div>
              </>
            ) : (
              <div
                className="text-5xl font-extrabold tracking-[0.35em]"
                style={{ color: theme.primary }}
              >
                MIO
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {images.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => {
                    if (image === selectedImage) return;

                    setSelectedImage(image);
                    setSelectedImageLoaded(Boolean(loadedThumbnails[image]));
                  }}
                  className={`relative aspect-square overflow-hidden rounded-2xl border bg-white transition hover:border-[#EEA391] ${
                    selectedImage === image
                      ? "border-[#EEA391]"
                      : "border-black/10"
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gray-100 transition-opacity duration-300 ${
                      loadedThumbnails[image] ? "opacity-0" : "animate-pulse opacity-100"
                    }`}
                  />
                  <Image
                    src={image}
                    alt={localizedProduct.name}
                    fill
                    sizes="96px"
                    className={`object-contain p-2 transition-opacity duration-300 ${
                      loadedThumbnails[image] ? "opacity-100" : "opacity-0"
                    }`}
                    loading="lazy"
                    quality={60}
                    onLoad={() =>
                      setLoadedThumbnails((current) => ({
                        ...current,
                        [image]: true,
                      }))
                    }
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center rounded-[34px] bg-white/80 p-6 shadow-[0_20px_80px_rgba(45,45,45,0.06)] backdrop-blur md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B96C5C]">
            {category?.name || product.brand || "MIO Beauty"}
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--brand-ink)] sm:text-5xl">
            {localizedProduct.name}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {product.is_new && (
              <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-ink)] shadow-sm">
                {t("newBadge")}
              </span>
            )}
            {product.is_hit && (
              <span className="rounded-full bg-[#211f1e] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                {t("hitBadge")}
              </span>
            )}
            <ProductStatus product={product} />
          </div>

          <div className="mt-8 flex flex-wrap items-end gap-4">
            <p className="text-3xl font-bold text-[#B96C5C]">
              {price || t("priceOnRequest")}
            </p>
            {oldPrice && (
              <p className="pb-1 text-xl font-semibold text-[var(--brand-muted)] line-through">
                {oldPrice}
              </p>
            )}
          </div>

          {specs.length > 0 && (
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {specs.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#f1d4cc] bg-[#fff8f6] px-4 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B96C5C]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--brand-ink)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              className="rounded-full bg-[#EEA391] px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-lg shadow-[#EEA391]/25 transition hover:-translate-y-0.5 hover:bg-[#df8f7c]"
            >
              {t("addToCart")}
            </button>
            <button
              type="button"
              aria-label={language === "ru" ? "В избранное" : "Sevimlilarga qo'shish"}
              className="rounded-full border border-[#EEA391]/50 bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#B96C5C] transition hover:border-[#EEA391] hover:bg-[#fff1ed]"
            >
              {language === "ru" ? "В избранное" : "Sevimli"}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-[28px] border border-[#f1d4cc] bg-white p-5 shadow-[0_18px_70px_rgba(238,163,145,0.09)] md:p-8">
          <div className="flex flex-wrap gap-2 border-b border-black/5 pb-5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "text-white"
                    : "bg-[#fff8f6] text-[var(--brand-ink)]"
                }`}
                style={{
                  background: activeTab === tab.id ? "#EEA391" : undefined,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="mt-6 whitespace-pre-line text-base leading-8 text-[var(--brand-muted)]">
            {tabs.find((tab) => tab.id === activeTab)?.content}
          </p>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B96C5C]">
              {t("relatedProducts")}
            </p>
              <h2 className="mt-2 text-3xl font-semibold text-[var(--brand-ink)]">
                {language === "ru" ? "Похожие продукты" : "O'xshash mahsulotlar"}
              </h2>
            </div>
          </div>
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                theme={getBrandTheme(`${item.brand || ""} ${category?.name || ""}`)}
              />
            ))}
          </div>
        </section>
      )}

      <LuxuryFooter categories={categories} />
    </main>
  );
}
