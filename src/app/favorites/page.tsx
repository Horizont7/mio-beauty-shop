import FavoritesPageContent from "@/components/FavoritesPageContent";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getActiveNavigationCategories } from "@/lib/categories";
import { getActiveCatalogProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const [categories, products] = await Promise.all([
    getActiveNavigationCategories(),
    getActiveCatalogProducts(),
  ]);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <FavoritesPageContent products={products} />
      <LuxuryFooter categories={categories} />
    </main>
  );
}
