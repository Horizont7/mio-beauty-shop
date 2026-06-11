import Link from "next/link";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getActiveNavigationCategories } from "@/lib/categories";

export default async function B2BPage() {
  const categories = await getActiveNavigationCategories();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <section className="mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b97667]">
            B2B
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight text-[var(--brand-ink)] sm:text-7xl">
            Партнерство с MIO Beauty
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--brand-muted)]">
            Раздел для оптовых клиентов, магазинов и партнеров готовится.
            Скоро здесь появятся условия сотрудничества, каталог и форма заявки.
          </p>
          <Link
            href="/catalog/products"
            className="mt-8 inline-flex rounded-full bg-[var(--brand-ink)] px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:bg-[#EEA391]"
          >
            Каталог
          </Link>
        </div>
        <div className="min-h-[340px] rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,#ffe7de,#fff7f2_55%,#fff)] shadow-[0_28px_90px_rgba(112,72,61,0.14)]" />
      </section>
      <LuxuryFooter categories={categories} />
    </main>
  );
}
