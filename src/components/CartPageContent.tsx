"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/language";
import { useCommerce } from "@/lib/commerce";
import { getLocalizedProduct } from "@/lib/localized-data";

function formatPrice(price: number, language: "ru" | "uz") {
  return (
    new Intl.NumberFormat(language === "ru" ? "ru-RU" : "uz-UZ").format(
      price
    ) + (language === "ru" ? " сум" : " so'm")
  );
}

export default function CartPageContent() {
  const { language, t } = useLanguage();
  const {
    cartItems,
    cartTotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCommerce();

  return (
    <section className="mx-auto max-w-4xl px-4 pb-36 pt-6 sm:px-6 sm:py-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b97667] sm:text-xs">
            MIO Beauty
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--brand-ink)] sm:text-5xl">
            {t("cart")}
          </h1>
        </div>
        {cartItems.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="rounded-full border border-[#f0c7bc] px-4 py-2 text-xs font-semibold text-[#B96C5C]"
          >
            {t("clearCart")}
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="rounded-[24px] border border-[#f3d2c8] bg-white p-6 shadow-[0_18px_55px_rgba(180,118,103,0.1)]">
          <h2 className="text-xl font-semibold text-[var(--brand-ink)]">
            {t("emptyCart")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">
            {t("emptyCartText")}
          </p>
          <Link
            href="/catalog/products"
            className="mt-5 inline-flex h-12 items-center rounded-full bg-[var(--brand-ink)] px-6 text-sm font-semibold text-white"
          >
            {t("shopCatalog")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cartItems.map((item) => {
            const name = getLocalizedProduct(item, language).name;
            const lineTotal = (item.price || 0) * item.quantity;

            return (
              <div
                key={item.id}
                className="grid grid-cols-[84px_1fr] gap-3 rounded-[22px] border border-[#f3d2c8] bg-white p-3 shadow-sm"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#fff8f6]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={name}
                      fill
                      sizes="84px"
                      className="object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-black tracking-[0.18em] text-[#b97667]">
                      MIO
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-sm font-semibold text-[var(--brand-ink)]">
                    {name}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]">
                    SKU: {item.sku || "-"}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#B96C5C]">
                        {formatPrice(lineTotal, language)}
                      </p>
                      <p className="text-xs text-[var(--brand-muted)]">
                        {formatPrice(item.price || 0, language)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(item.id)}
                        className="h-9 w-9 rounded-full border border-[#f0c7bc] font-bold"
                      >
                        -
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => increaseQuantity(item.id)}
                        className="h-9 w-9 rounded-full bg-[#EEA391] font-bold text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="mt-2 text-xs font-semibold text-red-600"
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cartItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-[4.6rem] z-40 border-t border-[#f3d2c8] bg-white/95 px-4 py-3 shadow-[0_-14px_35px_rgba(180,118,103,0.12)] backdrop-blur md:bottom-0">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--brand-ink)]">
                {formatPrice(cartTotal, language)}
              </p>
              <p className="text-xs text-[var(--brand-muted)]">
                {cartItems.length} {t("products")}
              </p>
            </div>
            <Link
              href="/checkout"
              className="flex h-12 items-center rounded-full bg-[#EEA391] px-5 text-sm font-semibold text-white shadow-lg shadow-[#EEA391]/20"
            >
              {t("checkout")}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
