"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Banner } from "@/lib/banners";
import { BrandTheme, getBrandTheme } from "@/lib/brand";
import { NavigationCategory } from "@/lib/categories";
import { useLanguage } from "@/lib/language";
import { getLocalizedBanner, getLocalizedProduct } from "@/lib/localized-data";
import { CatalogProduct } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

type HomePageContentProps = {
  banners: Banner[];
  categories: NavigationCategory[];
  products: CatalogProduct[];
};

const productsPerPage = 16;

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
}: HomePageContentProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("featured");
  const themeByCategoryId = useMemo(
    () => getThemeByCategoryId(categories),
    [categories]
  );
  const displayBrands = categories.length
    ? categories
    : [
        { id: -1, name: "MIO BEAUTY", name_ru: null, name_uz: null, slug: "mio-beauty" },
        { id: -2, name: "SHINESKIN", name_ru: null, name_uz: null, slug: "shineskin" },
        { id: -3, name: "MIO BABY", name_ru: null, name_uz: null, slug: "mio-baby" },
        { id: -4, name: "MIO HOME", name_ru: null, name_uz: null, slug: "mio-home" },
      ];
  const { language, t } = useLanguage();

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
  const localizedBanner = getLocalizedBanner(currentBanner, language);
  const heroTheme = getBrandTheme(
    `${localizedBanner?.title || ""} ${currentBanner?.link || ""}`
  );
  const heroStyle = {
    "--hero-primary": heroTheme.primary,
    "--hero-surface": heroTheme.surface,
  } as CSSProperties;

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
      <section
        className="relative overflow-hidden bg-[#fbf7f4]"
        style={heroStyle}
      >
        <div className="mx-auto grid min-h-[680px] max-w-7xl items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_1.05fr]">
          <div className="relative z-20 max-w-xl">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.32em] text-[var(--hero-primary)]">
              {t("platformHeroEyebrow")}
            </p>
            <h1 className="text-5xl font-semibold leading-[0.95] text-[var(--brand-ink)] sm:text-7xl">
              {localizedBanner?.title || "MIO Beauty"}
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-[var(--brand-muted)]">
              {localizedBanner?.subtitle || t("platformHeroFallback")}
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href={currentBanner?.link || "#new-arrivals"}
                className="rounded-full px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-lg transition hover:-translate-y-0.5"
                style={{ background: "var(--hero-primary)" }}
              >
                {localizedBanner?.buttonText || t("discover")}
              </Link>
              <button
                type="button"
                onClick={openCatalog}
                className="rounded-full border border-black/10 bg-white px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-ink)] transition hover:border-[var(--hero-primary)]"
              >
                {t("shopCatalog")}
              </button>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                ["4", t("brands")],
                [String(products.length), t("products")],
                ["B2B", t("b2bReady")],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-3xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur"
                >
                  <p className="text-2xl font-semibold text-[var(--brand-ink)]">
                    {value}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative h-[520px] overflow-hidden rounded-[44px] shadow-[0_35px_100px_rgba(45,45,45,0.16)]">
            {currentBanner?.image ? (
              <picture>
                {currentBanner.mobile_image && (
                  <source
                    media="(max-width: 767px)"
                    srcSet={currentBanner.mobile_image}
                  />
                )}
                <img
                  src={currentBanner.image}
                  alt={localizedBanner?.title || currentBanner.title}
                  className="h-full w-full object-cover transition duration-700"
                />
              </picture>
            ) : (
              <div className="h-full w-full bg-[var(--brand-mio-beauty-surface)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/10" />
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

      <PlatformOverview />
      <BrandUniverse categories={displayBrands} />
      <MarketplaceGateway
        products={products}
        newCount={newProducts.length}
        hitCount={hitProducts.length}
        categories={categories}
        onOpenCatalog={openCatalog}
      />
      <ProductSection
        id="new-arrivals"
        label={t("newArrivals")}
        title={t("newArrivalsTitle")}
        products={newProducts.slice(0, 4)}
        getTheme={themeForProduct}
        action={openCatalog}
      />
      <ProductSection
        label={t("bestSellers")}
        title={t("bestSellersTitle")}
        products={hitProducts.slice(0, 4)}
        getTheme={themeForProduct}
        tone="dark"
        action={openCatalog}
      />
      <BrandStory />
      <Reviews />
      <Newsletter />
    </>
  );
}

function BrandUniverse({
  categories,
}: {
  categories: NavigationCategory[];
}) {
  const { t } = useLanguage();

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
                {category.name}
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

function MarketplaceGateway({
  products,
  newCount,
  hitCount,
  categories,
  onOpenCatalog,
}: {
  products: CatalogProduct[];
  newCount: number;
  hitCount: number;
  categories: NavigationCategory[];
  onOpenCatalog: () => void;
}) {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[40px] bg-[#211f1e] p-8 text-white shadow-[0_30px_100px_rgba(45,45,45,0.16)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">
            {t("marketplaceCatalog")}
          </p>
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            {t("marketplaceCatalogTitle")}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              [products.length, t("activeProducts")],
              [newCount, t("newArrivals")],
              [hitCount, t("hitProducts")],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-3xl border border-white/10 bg-white/8 p-5"
              >
                <p className="text-3xl font-semibold">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/50">
                  {label}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onOpenCatalog}
            className="mt-9 rounded-full bg-white px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-ink)]"
          >
            {t("openMarketplaceCatalog")}
          </button>
        </div>

        <div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-[0_18px_70px_rgba(45,45,45,0.06)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-mio-beauty-primary)]">
            {t("fastDiscovery")}
          </p>
          <div className="mt-6 space-y-3">
            {categories.slice(0, 6).map((category) => {
              const theme = getBrandTheme(
                `${category.name} ${category.slug}`
              );

              return (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="flex items-center justify-between rounded-3xl border border-black/5 px-5 py-4 transition hover:-translate-y-0.5"
                  style={{ background: theme.surface }}
                >
                  <span className="font-semibold text-[var(--brand-ink)]">
                    {category.name}
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white"
                    style={{ background: theme.primary }}
                  >
                    {t("shop")}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductSection({
  id,
  label,
  title,
  products,
  getTheme,
  tone,
  action,
}: {
  id?: string;
  label: string;
  title: string;
  products: CatalogProduct[];
  getTheme: (product: CatalogProduct) => BrandTheme;
  tone?: "dark";
  action: () => void;
}) {
  const { t } = useLanguage();

  return (
    <section
      id={id}
      className={tone === "dark" ? "bg-[#211f1e] py-24" : "py-20"}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.32em] ${
                tone === "dark"
                  ? "text-white/50"
                  : "text-[var(--brand-mio-beauty-primary)]"
              }`}
            >
              {label}
            </p>
            <h2
              className={`mt-4 text-4xl font-semibold sm:text-5xl ${
                tone === "dark" ? "text-white" : "text-[var(--brand-ink)]"
              }`}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={action}
            className={`rounded-full px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] transition ${
              tone === "dark"
                ? "bg-white text-[var(--brand-ink)]"
                : "bg-[var(--brand-ink)] text-white"
            }`}
          >
            {t("viewAll")}
          </button>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                theme={getTheme(product)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[30px] bg-white/80 p-10 text-center text-[var(--brand-muted)]">
            {t("noCuratedProducts")}
          </div>
        )}
      </div>
    </section>
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
  const { t } = useLanguage();

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
              label={category.name}
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

function Reviews() {
  const { t } = useLanguage();
  const reviews = [t("review1"), t("review2"), t("review3")];

  return (
    <section className="bg-[#f8f3ef] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-mio-beauty-primary)]">
          {t("reviews")}
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {reviews.map((review) => (
            <blockquote
              key={review}
              className="rounded-[30px] bg-white p-8 text-lg leading-9 text-[var(--brand-ink)] shadow-sm"
            >
              &quot;{review}&quot;
            </blockquote>
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
