"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useCommerce } from "@/lib/commerce";
import { useLanguage } from "@/lib/language";
import { Language, TranslationKey } from "@/lib/translations";

type CheckoutForm = {
  customerName: string;
  phone: string;
  city: string;
  address: string;
  comment: string;
};

const initialForm: CheckoutForm = {
  customerName: "",
  phone: "",
  city: "",
  address: "",
  comment: "",
};

const checkoutFields: Array<[keyof CheckoutForm, TranslationKey, boolean]> = [
  ["customerName", "fullName", true],
  ["phone", "phone", true],
  ["city", "city", false],
  ["address", "address", true],
];

const checkoutErrorMessages: Record<
  string,
  Record<Language, string>
> = {
  database_error: {
    ru: "Не удалось сохранить заказ. Мы уже проверяем проблему, попробуйте еще раз.",
    uz: "Buyurtmani saqlab bo'lmadi. Muammoni tekshiryapmiz, qayta urinib ko'ring.",
  },
  empty_cart: {
    ru: "Корзина пуста. Добавьте товар перед оформлением.",
    uz: "Savat bo'sh. Rasmiylashtirishdan oldin mahsulot qo'shing.",
  },
  invalid_order_data: {
    ru: "Проверьте данные заказа и заполните обязательные поля.",
    uz: "Buyurtma ma'lumotlarini tekshiring va majburiy maydonlarni to'ldiring.",
  },
  product_not_found: {
    ru: "Один из товаров больше недоступен. Обновите корзину.",
    uz: "Mahsulotlardan biri hozir mavjud emas. Savatni yangilang.",
  },
  product_out_of_stock: {
    ru: "Один из товаров закончился или его недостаточно на складе.",
    uz: "Mahsulotlardan biri tugagan yoki omborda yetarli emas.",
  },
  server_config_error: {
    ru: "Оформление временно недоступно. Мы проверяем настройки сервера.",
    uz: "Rasmiylashtirish vaqtincha mavjud emas. Server sozlamalarini tekshiryapmiz.",
  },
};

function getCheckoutErrorMessage(
  code: string | undefined,
  fallback: string | undefined,
  language: Language,
  defaultMessage: string
) {
  if (code && checkoutErrorMessages[code]) {
    return checkoutErrorMessages[code][language];
  }

  return fallback || defaultMessage;
}

export default function CheckoutPageContent() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { cartItems, clearCart } = useCommerce();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateForm(field: keyof CheckoutForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (cartItems.length === 0) {
      setError(t("cartMustNotBeEmpty"));
      return;
    }

    if (!form.customerName.trim() || !form.phone.trim() || !form.address.trim()) {
      setError(t("requiredCheckoutFields"));
      return;
    }

    setLoading(true);

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        paymentMethod: "cash_on_delivery",
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      }),
    });

    const result = (await response.json()) as {
      orderNumber?: string;
      error?: string;
      errorCode?: string;
    };

    if (!response.ok || !result.orderNumber) {
      setError(
        getCheckoutErrorMessage(
          result.errorCode,
          result.error,
          language,
          t("checkoutFailed")
        )
      );
      setLoading(false);
      return;
    }

    clearCart();
    router.push(`/checkout/success?order=${encodeURIComponent(result.orderNumber)}`);
  }

  return (
    <section className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6 sm:py-16">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b97667] sm:text-xs">
        MIO Beauty
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--brand-ink)] sm:text-5xl">
        {t("checkout")}
      </h1>

      <form
        onSubmit={submitOrder}
        className="mt-6 space-y-4 rounded-[24px] border border-[#f3d2c8] bg-white p-5 shadow-[0_18px_55px_rgba(180,118,103,0.1)]"
      >
        {checkoutFields.map(([field, labelKey, required]) => (
          <label key={field} className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
              {t(labelKey)}
              {required ? " *" : ""}
            </span>
            <input
              value={form[field]}
              onChange={(event) => updateForm(field, event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-[#f0c7bc] px-4 text-sm outline-none focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/15"
              placeholder={t(labelKey)}
            />
          </label>
        ))}
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
            {t("comment")}
          </span>
          <textarea
            value={form.comment}
            onChange={(event) => updateForm("comment", event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-2xl border border-[#f0c7bc] px-4 py-3 text-sm outline-none focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/15"
          />
        </label>
        <div className="rounded-2xl bg-[#fff8f6] p-4 text-sm font-semibold text-[var(--brand-ink)]">
          {t("paymentMethod")}: {t("cashOnDelivery")}
        </div>
        {error && (
          <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-full bg-[#EEA391] text-sm font-semibold text-white shadow-lg shadow-[#EEA391]/20 disabled:opacity-60"
        >
          {loading ? t("placingOrder") : t("placeOrder")}
        </button>
      </form>
    </section>
  );
}
