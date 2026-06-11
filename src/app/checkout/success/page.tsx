"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language";

export default function CheckoutSuccessPage() {
  const orderNumber =
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("order") || "";
  const { language, t } = useLanguage();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="max-w-md rounded-[30px] bg-white p-7 text-center shadow-[0_24px_80px_rgba(180,118,103,0.12)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#ffe7de] text-xl font-black tracking-[0.18em] text-[#b97667]">
          MIO
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-[var(--brand-ink)]">
          {t("orderSuccessTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">
          {t("orderSuccessText")}
        </p>
        {orderNumber && (
          <p className="mt-4 rounded-2xl bg-[#fff8f6] p-4 text-sm font-bold text-[#B96C5C]">
            {language === "ru" ? "Номер заказа:" : "Buyurtma raqami:"}{" "}
            {orderNumber}
          </p>
        )}
        <Link
          href="/catalog/products"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-[var(--brand-ink)] px-6 text-sm font-semibold text-white"
        >
          {t("shopCatalog")}
        </Link>
      </div>
    </main>
  );
}
