import HomePageContent from "@/components/HomePageContent";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getActiveBanners } from "@/lib/banners";
import { getActiveNavigationCategories } from "@/lib/categories";
import { getActiveCatalogProducts } from "@/lib/products";
import { getActiveVideoHighlights } from "@/lib/video-highlights";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [categories, products, banners, videoHighlights] = await Promise.all([
    getActiveNavigationCategories(),
    getActiveCatalogProducts(),
    getActiveBanners(),
    getActiveVideoHighlights(),
  ]);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <HomePageContent
        banners={banners}
        categories={categories}
        products={products}
        videoHighlights={videoHighlights}
      />
      <LuxuryFooter categories={categories} />
    </main>
  );
}
