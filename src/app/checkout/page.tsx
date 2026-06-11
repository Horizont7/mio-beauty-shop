import CheckoutPageContent from "@/components/CheckoutPageContent";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getActiveNavigationCategories } from "@/lib/categories";

export default async function CheckoutPage() {
  const categories = await getActiveNavigationCategories();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <CheckoutPageContent />
      <LuxuryFooter categories={categories} />
    </main>
  );
}
