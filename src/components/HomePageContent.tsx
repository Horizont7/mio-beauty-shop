"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Banner } from "@/lib/banners";
import { BrandTheme, getBrandTheme } from "@/lib/brand";
import { NavigationCategory } from "@/lib/categories";
import { useLanguage } from "@/lib/language";
import {
  getLocalizedCategory,
  getLocalizedProduct,
} from "@/lib/localized-data";
import { CatalogProduct } from "@/lib/products";
import { supabase } from "@/lib/supabase";
import { VideoHighlight } from "@/lib/video-highlights";
import ProductCard from "@/components/ProductCard";
import VideoHighlightsSection from "@/components/VideoHighlightsSection";

type HomePageContentProps = {
  banners: Banner[];
  categories: NavigationCategory[];
  products: CatalogProduct[];
  videoHighlights: VideoHighlight[];
};

const productsPerPage = 16;

type HeroStats = {
  brands: number | null;
  products: number | null;
};

function getThemeByCategoryId(categories: NavigationCategory[]) {
  return categories.reduce<Record<number, BrandTheme>>(
    (result, category) => ({
      ...result,
      [category.id]: getBrandTheme(`${category.name} ${category.slug}`),
    }),
    {}
  );
}

export default function HomePageContent({
  banners,
  categories,
  products,
  videoHighlights,
}: HomePageContentProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("featured");
  const [heroStats, setHeroStats] = useState<HeroStats>({
    brands: null,
    products: null,
  });
  const themeByCategoryId = useMemo(
    () => getThemeByCategoryId(categories),
    [categories]
  );
  const displayBrands = categories.length
    ? categories
    : [
        {
          id: -1,
          name: "MIO BEAUTY",
          name_ru: null,
          name_uz: null,
          slug: "mio-beauty",
          image: null,
        },
        {
          id: -2,
          name: "SHINESKIN",
          name_ru: null,
          name_uz: null,
          slug: "shineskin",
          image: null,
        },
        {
          id: -3,
          name: "MIO BABY",
          name_ru: null,
          name_uz: null,
          slug: "mio-baby",
          image: null,
        },
        {
          id: -4,
          name: "MIO HOME",
          name_ru: null,
          name_uz: null,
          slug: "mio-home",
          image: null,
        },
      ];
  const { language, t } = useLanguage();

  useEffect(() => {
    let active = true;

    async function loadHeroStats() {
      const [categoriesResult, productsResult] = await Promise.all([
        supabase
          .from("categories")
          .select("id", { count: "exact", head: true })
          .eq("active", true),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("active", true),
      ]);

      if (!active) return;

      setHeroStats({
        brands: categoriesResult.count ?? categories.length,
        products: productsResult.count ?? products.length,
      });
    }

    loadHeroStats();

    const channel = supabase
      .channel("homepage-hero-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        loadHeroStats
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        loadHeroStats
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [categories.length, products.length]);

  useEffect(() => {
    if (banners.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setCurrentBannerIndex((current) =>
        current + 1 >= banners.length ? 0 : current + 1
      );
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [banners.length]);

  const currentBanner = banners[currentBannerIndex] || null;

  const newProducts = useMemo(
    () => products.filter((product) => product.is_new),
    [products]
  );
  const hitProducts = useMemo(
    () => products.filter((product) => product.is_hit),
    [products]
  );
  const orderedProducts = useMemo(() => {
    const used = new Set<number>();
    const groups = [
      products.filter((product) => product.is_new),
      products.filter((product) => product.is_hit),
      products,
    ];

    return groups.flatMap((group) =>
      group.filter((product) => {
        if (used.has(product.id)) return false;
        used.add(product.id);
        return true;
      })
    );
  }, [products]);
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = orderedProducts.filter((product) => {
      const localizedProduct = getLocalizedProduct(product, language);
      const matchesCategory =
        !selectedCategoryId ||
        product.category_id === selectedCategoryId;
      const matchesSearch =
        !query ||
        localizedProduct.name.toLowerCase().includes(query) ||
        (product.brand || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });

    if (sortMode === "price-low") {
      return [...filtered].sort(
        (a, b) => (a.price || 0) - (b.price || 0)
      );
    }

    if (sortMode === "price-high") {
      return [...filtered].sort(
        (a, b) => (b.price || 0) - (a.price || 0)
      );
    }

    return filtered;
  }, [language, orderedProducts, search, selectedCategoryId, sortMode]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / productsPerPage)
  );
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  function themeForProduct(product: CatalogProduct) {
    return (
      themeByCategoryId[product.category_id || 0] ||
      getBrandTheme(product.brand)
    );
  }

  function selectCategory(categoryId: number | null) {
    setSelectedCategoryId(categoryId);
    setCurrentPage(1);
  }

  function openCatalog() {
    setCatalogOpen(true);
    setCurrentPage(1);
    setSelectedCategoryId(null);
    setSearch("");
  }

  if (catalogOpen) {
    return (
      <CatalogView
        categories={categories}
        filteredProducts={filteredProducts}
        paginatedProducts={paginatedProducts}
        currentPage={currentPage}
        totalPages={totalPages}
        selectedCategoryId={selectedCategoryId}
        search={search}
        sortMode={sortMode}
        onBack={() => setCatalogOpen(false)}
        onCategoryChange={selectCategory}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        onSortChange={(value) => {
          setSortMode(value);
          setCurrentPage(1);
        }}
        onPageChange={setCurrentPage}
        getTheme={themeForProduct}
      />
    );
  }

  return (
    <>
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#fffaf7_0%,#f7e8e2_48%,#ffffff_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,250,247,0)_45%,rgba(238,163,145,0.12))]" />
        <MobileQuickCategories
          categories={displayBrands}
          onPromotionsClick={openCatalog}
        />
        <div className="relative mx-auto grid min-h-[440px] max-w-7xl items-center gap-6 px-4 pb-7 pt-4 sm:px-6 lg:min-h-[720px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:py-20">
          <div className="relative z-20 max-w-xl">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b97667] sm:mb-6 sm:text-xs sm:tracking-[0.32em]">
              {t("platformHeroEyebrow")}
            </p>
            <h1 className="text-4xl font-semibold leading-[0.9] text-[var(--brand-ink)] sm:text-7xl lg:text-8xl">
              MIO BEAUTY
            </h1>
            <p className="mt-3 text-xl font-medium leading-tight text-[#b97667] sm:mt-6 sm:text-4xl">
              Go&apos;zallik bizdan boshlanadi
            </p>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--brand-muted)] sm:mt-7 sm:text-lg sm:leading-8">
              Premium beauty, baby and home care products for everyday
              life.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 sm:mt-9 sm:gap-4">
              <button
                type="button"
                onClick={openCatalog}
                className="rounded-full bg-[var(--brand-ink)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_18px_45px_rgba(33,31,30,0.18)] transition hover:-translate-y-0.5 hover:bg-[#EEA391] sm:px-8 sm:py-4 sm:text-sm sm:tracking-[0.16em]"
              >
                Browse Catalog
              </button>
              <Link
                href="#platform"
                className="rounded-full border border-[#d7b2a7] bg-white/80 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-ink)] shadow-sm transition hover:-translate-y-0.5 hover:border-[#EEA391] sm:px-8 sm:py-4 sm:text-sm sm:tracking-[0.16em]"
              >
                Learn More
              </Link>
            </div>
            <div className="mt-5 grid max-w-lg grid-cols-3 gap-2 sm:mt-10 sm:gap-3">
              <HeroStatCard
                href="/catalog/categories"
                value={heroStats.brands}
                label={t("brands")}
              />
              <HeroStatCard
                href="/catalog/products"
                value={heroStats.products}
                label={t("products")}
              />
              <HeroStatCard
                href="/b2b"
                value="B2B"
                label={t("b2bReady")}
              />
            </div>
          </div>

          <div className="relative h-[250px] overflow-hidden rounded-[26px] border border-white/60 bg-white/40 shadow-[0_24px_70px_rgba(112,72,61,0.16)] sm:h-[420px] sm:rounded-[44px] lg:h-[590px]">
            {currentBanner?.image || currentBanner?.mobile_image ? (
              <HeroBannerSlide
                key={`${currentBanner.id}-${currentBanner.image}-${currentBanner.mobile_image}`}
                banner={currentBanner}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f8e4de,#fffaf7)] text-3xl font-semibold tracking-[0.32em] text-[#b97667]">
                MIO
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
          </div>
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 gap-3">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setCurrentBannerIndex(index)}
                className={`h-2.5 rounded-full transition ${
                  index === currentBannerIndex
                    ? "w-10 bg-[var(--hero-primary)]"
                    : "w-2.5 bg-black/20"
                }`}
              />
            ))}
          </div>
        )}
      </section>

      <VideoHighlightsSection highlights={videoHighlights} />
      <ProductSection
        id="new-arrivals"
        label={t("beautyEdit")}
        title={t("newArrivals")}
        subtitle={t("newArrivalsTitle")}
        products={newProducts.slice(0, 4)}
        getTheme={themeForProduct}
        action={openCatalog}
        compact
      />
      <ProductSection
        label={t("featuredPriority")}
        title={t("bestSellers")}
        subtitle={t("bestSellersTitle")}
        products={hitProducts.slice(0, 4)}
        getTheme={themeForProduct}
        action={openCatalog}
        compact
      />
      <PlatformOverview />
      <BrandUniverse categories={displayBrands} />
      <BrandStory />
      <Newsletter />
      <div className="h-24 md:hidden" />
      <MobileBottomNavigation />
    </>
  );
}

function HeroStatCard({
  href,
  value,
  label,
  suffix = "",
}: {
  href: string;
  value: number | string | null;
  label: string;
  suffix?: string;
}) {
  return (
    <Link
      href={href}
      className="cursor-pointer rounded-[18px] border border-white/70 bg-white/75 p-3 shadow-[0_18px_50px_rgba(180,118,103,0.1)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-[#EEA391] hover:bg-white sm:rounded-[24px] sm:p-4"
    >
      {value === null ? (
        <div className="h-7 w-14 animate-pulse rounded-full bg-[#f3d5cc] sm:h-8" />
      ) : (
        <p className="text-xl font-semibold text-[var(--brand-ink)] sm:text-2xl">
          {value}
          {suffix}
        </p>
      )}
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)] sm:text-[11px] sm:tracking-[0.18em]">
        {label}
      </p>
    </Link>
  );
}

function MobileQuickCategories({
  categories,
  onPromotionsClick,
}: {
  categories: NavigationCategory[];
  onPromotionsClick: () => void;
}) {
  const { language, t } = useLanguage();
  const preferred = ["mio-beauty", "shineskin", "mio-baby", "mio-home"];
  const shortcuts = preferred
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter((category): category is NavigationCategory => Boolean(category));

  return (
    <div className="relative z-20 mx-auto max-w-7xl px-4 pt-4 lg:hidden">
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {shortcuts.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="flex min-w-[124px] snap-start items-center gap-3 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-[0_14px_35px_rgba(180,118,103,0.1)]"
          >
            <CategoryThumb category={category} />
            <span className="text-xs font-bold leading-4 text-[var(--brand-ink)]">
              {getLocalizedCategory(category, language)}
            </span>
          </Link>
        ))}
        <button
          type="button"
          onClick={onPromotionsClick}
          className="flex min-w-[124px] snap-start items-center gap-3 rounded-2xl border border-white/80 bg-white/85 p-3 text-left shadow-[0_14px_35px_rgba(180,118,103,0.1)]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ffe7de] text-sm font-black text-[#b97667]">
            %
          </span>
          <span className="text-xs font-bold leading-4 text-[var(--brand-ink)]">
            {t("promotions")}
          </span>
        </button>
      </div>
    </div>
  );
}

function CategoryThumb({ category }: { category: NavigationCategory }) {
  const theme = getBrandTheme(`${category.name} ${category.slug}`);

  if (category.image) {
    return (
      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white">
        <Image
          src={category.image}
          alt={category.name}
          fill
          sizes="44px"
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-black tracking-[0.16em]"
      style={{ background: theme.surface, color: theme.primary }}
    >
      MIO
    </span>
  );
}

function HeroBannerSlide({ banner }: { banner: Banner }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const desktopImage = banner.image || banner.mobile_image;
  const mobileImage = banner.mobile_image || banner.image;
  const imageContent = (
    <>
      <div
        className={`absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,0.05),rgba(255,255,255,0.34),rgba(255,255,255,0.05))] transition-opacity duration-500 ${
          imageLoaded ? "opacity-0" : "animate-pulse opacity-100"
        }`}
      />
      {mobileImage && (
        <Image
          src={mobileImage}
          alt="MIO Beauty banner"
          fill
          sizes="100vw"
          className={`object-cover transition duration-700 md:hidden ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          priority
          quality={82}
          onLoad={() => setImageLoaded(true)}
        />
      )}
      {desktopImage && (
        <Image
          src={desktopImage}
          alt="MIO Beauty banner"
          fill
          sizes="(min-width: 1024px) 52vw, 100vw"
          className={`hidden object-cover transition duration-700 md:block ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          priority
          quality={82}
          onLoad={() => setImageLoaded(true)}
        />
      )}
    </>
  );

  if (!banner.link) return imageContent;

  return (
    <Link href={banner.link} className="absolute inset-0 block">
      {imageContent}
    </Link>
  );
}

function BrandUniverse({
  categories,
}: {
  categories: NavigationCategory[];
}) {
  const { language, t } = useLanguage();

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-12 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-mio-beauty-primary)]">
          {t("brandUniverse")}
        </p>
        <h2 className="mt-4 text-4xl font-semibold text-[var(--brand-ink)] sm:text-5xl">
          {t("brandUniverseTitle")}
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => {
          const theme = getBrandTheme(
            `${category.name} ${category.slug}`
          );

          return (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group min-h-80 overflow-hidden rounded-[34px] border border-black/5 p-7 shadow-[0_20px_80px_rgba(45,45,45,0.06)] transition duration-500 hover:-translate-y-1"
              style={{ background: theme.surface }}
            >
              <div
                className="mb-14 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/70 text-xl font-extrabold tracking-[0.22em]"
                style={{ color: theme.primary }}
              >
                MIO
              </div>
              <h3
                className="text-3xl font-semibold"
                style={{ color: theme.primary }}
              >
                {getLocalizedCategory(category, language)}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[var(--brand-muted)]">
                {t("brandCardText")}
              </p>
              <span className="mt-8 inline-flex text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-ink)]">
                {t("discover")}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PlatformOverview() {
  const { t } = useLanguage();
  const platformPillars = [
    {
      title: t("platformPillar1Title"),
      text: t("platformPillar1Text"),
    },
    {
      title: t("platformPillar2Title"),
      text: t("platformPillar2Text"),
    },
    {
      title: t("platformPillar3Title"),
      text: t("platformPillar3Text"),
    },
  ];

  return (
    <section id="platform" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-mio-beauty-primary)]">
              {t("platformOverviewEyebrow")}
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-[var(--brand-ink)] sm:text-5xl">
              {t("platformOverviewTitle")}
            </h2>
          </div>
          <p className="text-lg leading-9 text-[var(--brand-muted)]">
            {t("platformOverviewText")}
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {platformPillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className="rounded-[32px] border border-black/5 p-7 shadow-[0_18px_70px_rgba(45,45,45,0.05)]"
              style={{
                background: [
                  "var(--brand-mio-beauty-surface)",
                  "var(--brand-shineskin-surface)",
                  "var(--brand-mio-baby-surface)",
                ][index],
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-muted)]">
                0{index + 1}
              </p>
              <h3 className="mt-10 text-2xl font-semibold text-[var(--brand-ink)]">
                {pillar.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[var(--brand-muted)]">
                {pillar.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductSection({
  id,
  label,
  title,
  subtitle,
  products,
  getTheme,
  action,
  compact = false,
}: {
  id?: string;
  label: string;
  title: string;
  subtitle: string;
  products: CatalogProduct[];
  getTheme: (product: CatalogProduct) => BrandTheme;
  action: () => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <section
      id={id}
      className="relative overflow-hidden bg-[linear-gradient(135deg,#fffaf7_0%,#f8ebe5_45%,#fff_100%)] py-10 sm:py-24"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,250,247,0)_42%,rgba(238,163,145,0.12))]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative mb-6 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b97667] sm:text-xs sm:tracking-[0.32em]">
              {label}
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-[var(--brand-ink)] sm:mt-4 sm:text-6xl">
              {title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--brand-muted)] sm:mt-5 sm:text-lg sm:leading-8">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={action}
            className="w-fit rounded-full border border-[#d7b2a7] bg-white/80 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-ink)] shadow-[0_16px_45px_rgba(180,118,103,0.16)] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-[#EEA391] hover:bg-[#EEA391] hover:text-white sm:px-7 sm:py-3 sm:text-sm sm:tracking-[0.16em]"
          >
            {t("viewAll")}
          </button>
        </div>

        {products.length > 0 ? (
          <div className="relative grid grid-cols-2 gap-3 sm:gap-8 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                theme={getTheme(product)}
                compact={compact}
              />
            ))}
          </div>
        ) : (
          <div className="relative rounded-[30px] border border-white/70 bg-white/80 p-10 text-center text-[var(--brand-muted)] shadow-[0_24px_70px_rgba(180,118,103,0.12)] backdrop-blur">
            {t("noCuratedProducts")}
          </div>
        )}
      </div>
    </section>
  );
}

function MobileBottomNavigation() {
  const { t } = useLanguage();
  const items = [
    { href: "/", label: t("home"), icon: "H" },
    { href: "/catalog/categories", label: t("catalog"), icon: "C" },
    { href: "/catalog/products", label: t("search"), icon: "S" },
    { href: "/cart", label: t("cart"), icon: "B" },
    { href: "/profile", label: t("profile"), icon: "P" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#f3cfc4] bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-18px_45px_rgba(180,118,103,0.14)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold text-[var(--brand-muted)] transition hover:bg-[#fff0eb] hover:text-[#b97667]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ffe7de] text-[11px] font-black text-[#b97667]">
              {item.icon}
            </span>
            <span>{item.label}</span>
            {item.href === "/cart" && (
              <span className="absolute right-4 top-1 hidden h-4 min-w-4 rounded-full bg-[#EEA391] px-1 text-[9px] leading-4 text-white" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function CatalogView({
  categories,
  filteredProducts,
  paginatedProducts,
  currentPage,
  totalPages,
  selectedCategoryId,
  search,
  sortMode,
  onBack,
  onCategoryChange,
  onSearchChange,
  onSortChange,
  onPageChange,
  getTheme,
}: {
  categories: NavigationCategory[];
  filteredProducts: CatalogProduct[];
  paginatedProducts: CatalogProduct[];
  currentPage: number;
  totalPages: number;
  selectedCategoryId: number | null;
  search: string;
  sortMode: string;
  onBack: () => void;
  onCategoryChange: (categoryId: number | null) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onPageChange: (page: number) => void;
  getTheme: (product: CatalogProduct) => BrandTheme;
}) {
  const { language, t } = useLanguage();

  return (
    <section className="mx-auto max-w-7xl px-6 py-14">
      <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-mio-beauty-primary)]">
            {t("luxuryCatalog")}
          </p>
          <h1 className="mt-3 text-5xl font-semibold text-[var(--brand-ink)]">
            {t("beautyEdit")}
          </h1>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="w-fit rounded-full border border-black/10 bg-white px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em]"
        >
          {t("backToHome")}
        </button>
      </div>

      <div className="mb-8 rounded-[30px] border border-black/5 bg-white p-4 shadow-[0_18px_60px_rgba(45,45,45,0.05)]">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("searchProducts")}
            className="h-12 rounded-full border border-black/10 px-5 outline-none transition focus:border-[var(--brand-mio-beauty-primary)]"
          />
          <select
            value={sortMode}
            onChange={(event) => onSortChange(event.target.value)}
            className="h-12 rounded-full border border-black/10 bg-white px-5 outline-none"
          >
            <option value="featured">{t("featuredPriority")}</option>
            <option value="price-low">{t("priceLow")}</option>
            <option value="price-high">{t("priceHigh")}</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterPill
            active={selectedCategoryId === null}
            label={t("all")}
            onClick={() => onCategoryChange(null)}
          />
          {categories.map((category) => (
            <FilterPill
              key={category.id}
              active={selectedCategoryId === category.id}
              label={getLocalizedCategory(category, language)}
              theme={getBrandTheme(`${category.name} ${category.slug}`)}
              onClick={() => onCategoryChange(category.id)}
            />
          ))}
        </div>
      </div>

      <p className="mb-6 text-sm text-[var(--brand-muted)]">
        {t("showing")} {paginatedProducts.length} /{" "}
        {filteredProducts.length} {t("products")}
      </p>
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            theme={getTheme(product)}
          />
        ))}
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {t("previous")}
        </button>
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index + 1}
            onClick={() => onPageChange(index + 1)}
            className={`h-10 w-10 rounded-full border text-sm font-semibold ${
              currentPage === index + 1
                ? "border-[var(--brand-mio-beauty-primary)] bg-[var(--brand-mio-beauty-primary)] text-white"
                : "border-black/10 bg-white"
            }`}
          >
            {index + 1}
          </button>
        ))}
        <button
          disabled={currentPage === totalPages}
          onClick={() =>
            onPageChange(Math.min(totalPages, currentPage + 1))
          }
          className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {t("next")}
        </button>
      </div>
    </section>
  );
}

function FilterPill({
  label,
  active,
  theme = getBrandTheme(label),
  onClick,
}: {
  label: string;
  active: boolean;
  theme?: BrandTheme;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-5 py-2 text-sm font-semibold transition"
      style={{
        borderColor: theme.primary,
        background: active ? theme.primary : "white",
        color: active ? "white" : theme.primary,
      }}
    >
      {label}
    </button>
  );
}

function BrandStory() {
  const { t } = useLanguage();
  const values = [t("valueCare"), t("valueTrust"), t("valueRitual")];

  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-6 py-24 lg:grid-cols-2">
      <div className="min-h-[520px] rounded-[42px] bg-[linear-gradient(135deg,var(--brand-mio-beauty-surface),var(--brand-shineskin-surface))]" />
      <div className="flex flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-mio-beauty-primary)]">
          {t("brandStory")}
        </p>
        <h2 className="mt-4 text-5xl font-semibold leading-tight text-[var(--brand-ink)]">
          {t("brandStoryTitle")}
        </h2>
        <p className="mt-6 text-lg leading-9 text-[var(--brand-muted)]">
          {t("brandStoryText")}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {values.map((value) => (
            <div key={value} className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="font-semibold text-[var(--brand-ink)]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-7xl px-6 pb-10">
      <div className="rounded-[42px] bg-[var(--brand-mio-beauty-surface)] p-10 text-center md:p-16">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-mio-beauty-primary)]">
          {t("newsletter")}
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold text-[var(--brand-ink)]">
          {t("newsletterTitle")}
        </h2>
        <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 rounded-full bg-white p-2 shadow-sm sm:flex-row">
          <input
            type="email"
            placeholder={t("emailPlaceholder")}
            className="min-h-12 flex-1 rounded-full px-5 outline-none"
          />
          <button className="rounded-full bg-[var(--brand-ink)] px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white">
            {t("subscribe")}
          </button>
        </div>
      </div>
    </section>
  );
}
