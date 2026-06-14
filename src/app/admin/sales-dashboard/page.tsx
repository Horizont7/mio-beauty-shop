export default function AdminSalesDashboardPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white bg-white shadow-sm">
        <div className="bg-[#292423] px-6 py-8 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#EEA391]">
            MIO Beauty admin
          </p>
          <h1 className="mt-3 text-3xl font-bold">Дашборд по продажам</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            Единый экран для ключевых показателей продаж и динамики заказов.
          </p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          {["Выручка", "Заказы", "Средний чек"].map((label) => (
            <div key={label} className="rounded-3xl border border-[#f0e4df] bg-[#fff8f5] p-5">
              <p className="text-sm font-semibold text-[#766965]">{label}</p>
              <p className="mt-3 text-2xl font-bold text-[#302827]">Скоро</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
