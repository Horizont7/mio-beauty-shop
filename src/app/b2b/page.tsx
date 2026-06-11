import Link from "next/link";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getActiveNavigationCategories } from "@/lib/categories";

export default async function B2BPage() {
  const categories = await getActiveNavigationCategories();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <section className="mx-auto grid max-w-7xl items-center gap-6 px-4 pb-28 pt-6 sm:px-6 sm:py-12 lg:min-h-[560px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b97667] sm:text-xs sm:tracking-[0.3em]">
            B2B
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-[var(--brand-ink)] sm:mt-4 sm:text-7xl">
            Партнерство с MIO Beauty
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--brand-muted)] sm:mt-6 sm:text-lg sm:leading-8">
            Раздел для оптовых клиентов, магазинов и партнеров готовится.
            Скоро здесь появятся условия сотрудничества, каталог и форма заявки.
          </p>
          <Link
            href="/catalog/products"
            className="mt-6 inline-flex rounded-full bg-[var(--brand-ink)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-[#EEA391] sm:mt-8 sm:px-7 sm:text-sm sm:tracking-[0.16em]"
          >
            Каталог
          </Link>
        </div>
        <div className="min-h-[220px] rounded-[26px] border border-white/70 bg-[linear-gradient(135deg,#ffe7de,#fff7f2_55%,#fff)] shadow-[0_22px_70px_rgba(112,72,61,0.12)] sm:min-h-[340px] sm:rounded-[34px] sm:shadow-[0_28px_90px_rgba(112,72,61,0.14)]" />
      </section>
      <LuxuryFooter categories={categories} />
    </main>
  );
}
