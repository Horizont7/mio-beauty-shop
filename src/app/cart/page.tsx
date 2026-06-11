import Link from "next/link";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getActiveNavigationCategories } from "@/lib/categories";

export default async function CartPage() {
  const categories = await getActiveNavigationCategories();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <section className="mx-auto max-w-3xl px-4 pb-36 pt-6 sm:px-6 sm:py-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b97667] sm:text-xs">
          MIO Beauty
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--brand-ink)] sm:text-5xl">
          Корзина
        </h1>

        <div className="mt-6 rounded-[24px] border border-[#f3d2c8] bg-white p-5 shadow-[0_18px_55px_rgba(180,118,103,0.1)]">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#ffe7de] text-xl font-black tracking-[0.18em] text-[#b97667]">
            MIO
          </div>
          <h2 className="mt-5 text-xl font-semibold text-[var(--brand-ink)]">
            Корзина скоро будет подключена
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">
            Мы подготовили мобильный сценарий корзины. На следующем этапе сюда
            подключатся товары, количество, промокоды и оформление заказа.
          </p>
          <Link
            href="/catalog/products"
            className="mt-5 inline-flex h-12 items-center rounded-full bg-[var(--brand-ink)] px-6 text-sm font-semibold text-white"
          >
            Перейти в каталог
          </Link>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-[4.6rem] z-40 border-t border-[#f3d2c8] bg-white/95 px-4 py-3 shadow-[0_-14px_35px_rgba(180,118,103,0.12)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--brand-ink)]">0 сум</p>
            <p className="text-xs text-[var(--brand-muted)]">0 товаров</p>
          </div>
          <Link
            href="/checkout"
            className="flex h-12 items-center rounded-full bg-[#EEA391] px-5 text-sm font-semibold text-white shadow-lg shadow-[#EEA391]/20"
          >
            Оформить
          </Link>
        </div>
      </div>
      <LuxuryFooter categories={categories} />
    </main>
  );
}
