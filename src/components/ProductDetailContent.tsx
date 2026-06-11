"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import LuxuryFooter from "@/components/LuxuryFooter";
import ProductCard from "@/components/ProductCard";
import SiteHeader from "@/components/SiteHeader";
import { BrandTheme, getBrandTheme } from "@/lib/brand";
import { NavigationCategory } from "@/lib/categories";
import { useCommerce } from "@/lib/commerce";
import { useLanguage } from "@/lib/language";
import { getLocalizedProduct } from "@/lib/localized-data";
import {
  CatalogProduct,
  ProductDetail,
  ProductReview,
} from "@/lib/products";

type ProductDetailContentProps = {
  product: ProductDetail | null;
  images: string[];
  relatedProducts: CatalogProduct[];
  reviews: ProductReview[];
  categories: NavigationCategory[];
};

type ProductTab = "description" | "usage" | "ingredients" | "reviews";

function formatPrice(price: number | null, language: "ru" | "uz") {
  if (price === null) return null;

  return (
    new Intl.NumberFormat(language === "ru" ? "ru-RU" : "uz-UZ").format(
      price
    ) + (language === "ru" ? " sum" : " so'm")
  );
}

function ProductStatus({ product }: { product: ProductDetail }) {
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
  reviews,
  categories,
}: ProductDetailContentProps) {
  const { language, t } = useLanguage();
  const { addToCart, isFavorite, toggleFavorite } = useCommerce();
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
  const favorite = product ? isFavorite(product.id) : false;

  const tabs = useMemo(() => {
    if (!product) return [];

    return [
      {
        id: "description" as const,
        label: t("productDescription"),
        content:
          localizedProduct?.description || t("productDescriptionEmpty"),
      },
      {
        id: "usage" as const,
        label: t("productUsage"),
        content:
          language === "uz"
            ? product.usage_uz || product.usage_ru || t("productUsageEmpty")
            : product.usage_ru || product.usage_uz || t("productUsageEmpty"),
      },
      {
        id: "ingredients" as const,
        label: t("productIngredients"),
        content:
          language === "uz"
            ? product.ingredients_uz ||
              product.ingredients_ru ||
              t("productIngredientsEmpty")
            : product.ingredients_ru ||
              product.ingredients_uz ||
              t("productIngredientsEmpty"),
      },
      {
        id: "reviews" as const,
        label: t("reviews"),
        content: "",
      },
    ];
  }, [language, localizedProduct?.description, product, t]);

  if (!product || !localizedProduct) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <SiteHeader categories={categories} />
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-20">
          <div className="rounded-[24px] bg-white p-6 text-center shadow-[0_20px_80px_rgba(45,45,45,0.08)] sm:rounded-[34px] sm:p-10">
            <h1 className="text-2xl font-semibold text-[var(--brand-ink)] sm:text-3xl">
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

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-6 pt-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-16">
        <div>
          <div
            className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[24px] border border-[#f1d4cc] shadow-[0_18px_60px_rgba(238,163,145,0.14)] sm:rounded-[34px] sm:shadow-[0_24px_90px_rgba(238,163,145,0.16)]"
            style={{ background: theme.surface }}
          >
            {selectedImage ? (
              <>
                <div
                  className={`absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,0.06),rgba(255,255,255,0.5),rgba(255,255,255,0.06))] transition-opacity duration-500 ${
                    selectedImageLoaded ? "opacity-0" : "animate-pulse opacity-100"
                  }`}
                />
                <div className="absolute inset-5 sm:inset-8 md:inset-14">
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
                className="text-4xl font-extrabold tracking-[0.28em] sm:text-5xl sm:tracking-[0.35em]"
                style={{ color: theme.primary }}
              >
                MIO
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-5 sm:gap-3 [&::-webkit-scrollbar]:hidden">
              {images.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => {
                    if (image === selectedImage) return;
                    setSelectedImage(image);
                    setSelectedImageLoaded(Boolean(loadedThumbnails[image]));
                  }}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border bg-white transition hover:border-[#EEA391] sm:h-auto sm:w-auto sm:aspect-square ${
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

        <div className="flex flex-col justify-center rounded-[24px] bg-white/85 p-5 shadow-[0_16px_55px_rgba(45,45,45,0.06)] backdrop-blur sm:rounded-[34px] md:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#B96C5C] sm:text-xs sm:tracking-[0.28em]">
            {category?.name || product.brand || "MIO Beauty"}
          </p>
          <h1 className="mt-3 text-2xl font-semibold leading-tight text-[var(--brand-ink)] sm:mt-4 sm:text-5xl">
            {localizedProduct.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6">
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

          <div className="mt-5 flex flex-wrap items-end gap-3 sm:mt-8 sm:gap-4">
            <p className="text-2xl font-bold text-[#B96C5C] sm:text-3xl">
              {price || t("priceOnRequest")}
            </p>
            {oldPrice && (
              <p className="pb-1 text-base font-semibold text-[var(--brand-muted)] line-through sm:text-xl">
                {oldPrice}
              </p>
            )}
          </div>

          {specs.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-7 sm:gap-3">
              {specs.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#f1d4cc] bg-[#fff8f6] px-3 py-3 sm:px-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B96C5C]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--brand-ink)] sm:text-sm">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 hidden gap-3 sm:grid sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              onClick={() => addToCart(product)}
              className="rounded-full bg-[#EEA391] px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-lg shadow-[#EEA391]/25 transition hover:-translate-y-0.5 hover:bg-[#df8f7c]"
            >
              {t("addToCart")}
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              className="rounded-full border border-[#EEA391]/50 bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#B96C5C] transition hover:border-[#EEA391] hover:bg-[#fff1ed]"
            >
              {favorite ? t("removeFavorite") : t("addFavorite")}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="rounded-[22px] border border-[#f1d4cc] bg-white p-4 shadow-[0_18px_70px_rgba(238,163,145,0.09)] sm:rounded-[28px] md:p-8">
          <div className="flex gap-2 overflow-x-auto border-b border-black/5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition sm:px-5 ${
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

          {activeTab === "reviews" ? (
            <div className="mt-5 space-y-3 sm:mt-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-[#f1d4cc] bg-[#fff8f6] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--brand-ink)]">
                        {review.customer_name || "MIO customer"}
                      </p>
                      <p className="text-sm font-bold text-[#B96C5C]">
                        {review.rating || 5}/5
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
                      {review.comment}
                    </p>
                    <p className="mt-2 text-xs text-[var(--brand-muted)]">
                      {new Date(review.created_at).toLocaleDateString(
                        language === "ru" ? "ru-RU" : "uz-UZ"
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--brand-muted)]">
                  {t("reviewsEmpty")}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-[var(--brand-muted)] sm:mt-6 sm:text-base sm:leading-8">
              {tabs.find((tab) => tab.id === activeTab)?.content}
            </p>
          )}
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 sm:py-16">
          <div className="mb-5 flex items-end justify-between gap-4 sm:mb-10">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#B96C5C] sm:text-xs sm:tracking-[0.28em]">
                {t("relatedProducts")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--brand-ink)] sm:text-3xl">
                {t("relatedProducts")}
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-7 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                theme={getBrandTheme(`${item.brand || ""} ${category?.name || ""}`)}
                compact
              />
            ))}
          </div>
        </section>
      )}

      <LuxuryFooter categories={categories} />
      <div className="fixed inset-x-0 bottom-[4.6rem] z-40 border-t border-[#f3d2c8] bg-white/95 px-4 py-3 shadow-[0_-14px_35px_rgba(180,118,103,0.12)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#B96C5C]">
              {price || t("priceOnRequest")}
            </p>
            <p className="truncate text-xs text-[var(--brand-muted)]">
              {localizedProduct.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => addToCart(product)}
            className="h-12 rounded-full bg-[#EEA391] px-5 text-sm font-semibold text-white shadow-lg shadow-[#EEA391]/20"
          >
            {t("addToCart")}
          </button>
        </div>
      </div>
    </main>
  );
}
