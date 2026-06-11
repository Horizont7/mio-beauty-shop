import ProductCard from "@/components/ProductCard";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getBrandTheme } from "@/lib/brand";
import { getActiveNavigationCategories } from "@/lib/categories";
import { getActiveCatalogProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function CatalogProductsPage() {
  const [categories, products] = await Promise.all([
    getActiveNavigationCategories(),
    getActiveCatalogProducts(),
  ]);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b97667]">
            MIO Beauty
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-[var(--brand-ink)] sm:text-6xl">
            Каталог товаров
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--brand-muted)]">
            Все активные продукты MIO Beauty из Supabase.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-8 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              theme={getBrandTheme(product.brand)}
              compact
            />
          ))}
        </div>
      </section>
      <LuxuryFooter categories={categories} />
    </main>
  );
}
