import Link from "next/link";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getActiveNavigationCategories } from "@/lib/categories";

export default async function CheckoutPage() {
  const categories = await getActiveNavigationCategories();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <section className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6 sm:py-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b97667] sm:text-xs">
          MIO Beauty
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--brand-ink)] sm:text-5xl">
          Оформление заказа
        </h1>

        <div className="mt-6 space-y-4 rounded-[24px] border border-[#f3d2c8] bg-white p-5 shadow-[0_18px_55px_rgba(180,118,103,0.1)]">
          {["Имя", "Телефон", "Адрес доставки"].map((label) => (
            <label key={label} className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                {label}
              </span>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-[#f0c7bc] px-4 text-sm outline-none focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/15"
                placeholder={label}
              />
            </label>
          ))}
          <p className="rounded-2xl bg-[#fff8f6] p-4 text-sm leading-6 text-[var(--brand-muted)]">
            Форма подготовлена для мобильного checkout. Подключение реальной
            корзины и отправки заказа будет следующим шагом.
          </p>
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-[4.6rem] z-40 border-t border-[#f3d2c8] bg-white/95 px-4 py-3 shadow-[0_-14px_35px_rgba(180,118,103,0.12)] backdrop-blur md:hidden">
        <Link
          href="/catalog/products"
          className="mx-auto flex h-12 max-w-md items-center justify-center rounded-full bg-[#EEA391] text-sm font-semibold text-white shadow-lg shadow-[#EEA391]/20"
        >
          Вернуться в каталог
        </Link>
      </div>
      <LuxuryFooter categories={categories} />
    </main>
  );
}
