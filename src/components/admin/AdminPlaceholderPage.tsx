type AdminPlaceholderPageProps = {
  title: string;
  description: string;
  eyebrow?: string;
};

export default function AdminPlaceholderPage({
  title,
  description,
  eyebrow = "MIO Beauty admin",
}: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white bg-white shadow-sm">
        <div className="bg-[#292423] px-6 py-8 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#EEA391]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            {description}
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <div className="rounded-3xl border border-[#f0e4df] bg-[#fff8f5] p-6">
            <p className="text-sm font-bold text-[#a85343]">
              Раздел готов к подключению
            </p>
            <p className="mt-2 text-sm leading-6 text-[#766965]">
              Интерфейс подготовлен. Рабочие данные и действия будут добавлены
              отдельным этапом.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
