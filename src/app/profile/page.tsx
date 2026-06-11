import Link from "next/link";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getActiveNavigationCategories } from "@/lib/categories";

export default async function ProfilePage() {
  const categories = await getActiveNavigationCategories();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-4xl font-semibold text-[var(--brand-ink)]">
          Профиль
        </h1>
        <p className="mt-4 text-[var(--brand-muted)]">
          Личный кабинет будет подключен позже.
        </p>
        <Link
          href="/catalog/products"
          className="mt-8 inline-flex rounded-full bg-[var(--brand-ink)] px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white"
        >
          Каталог
        </Link>
      </section>
      <LuxuryFooter categories={categories} />
    </main>
  );
}
