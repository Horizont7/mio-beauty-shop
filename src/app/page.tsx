import HomePageContent from "@/components/HomePageContent";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getActiveBanners } from "@/lib/banners";
import { getActiveNavigationCategories } from "@/lib/categories";
import { getActiveCatalogProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [categories, products, banners] = await Promise.all([
    getActiveNavigationCategories(),
    getActiveCatalogProducts(),
    getActiveBanners(),
  ]);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <HomePageContent
        banners={banners}
        categories={categories}
        products={products}
      />
      <LuxuryFooter categories={categories} />
    </main>
  );
}
