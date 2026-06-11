import Link from "next/link";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getActiveNavigationCategories } from "@/lib/categories";

export default async function ProfilePage() {
  const categories = await getActiveNavigationCategories();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <section className="mx-auto max-w-3xl px-4 pb-28 pt-10 text-center sm:px-6 sm:py-16">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#ffe7de] text-xl font-black tracking-[0.18em] text-[#b97667]">
          MIO
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-[var(--brand-ink)] sm:text-4xl">
          Профиль
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)] sm:mt-4">
          Личный кабинет будет подключен позже.
        </p>
        <Link
          href="/catalog/products"
          className="mt-6 inline-flex rounded-full bg-[var(--brand-ink)] px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white sm:mt-8"
        >
          Каталог
        </Link>
      </section>
      <LuxuryFooter categories={categories} />
    </main>
  );
}
