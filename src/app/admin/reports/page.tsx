export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white bg-white shadow-sm">
        <div className="bg-[#292423] px-6 py-8 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#EEA391]">
            MIO Beauty admin
          </p>
          <h1 className="mt-3 text-3xl font-bold">Отчёты</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            Раздел для операционных, финансовых и складских отчётов.
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <div className="rounded-3xl border border-[#f0e4df] bg-[#fff8f5] p-6">
            <p className="text-sm font-bold text-[#a85343]">Раздел готов к подключению</p>
            <p className="mt-2 text-sm leading-6 text-[#766965]">
              Здесь будут доступны отчёты MIO Beauty после подключения источников данных.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
