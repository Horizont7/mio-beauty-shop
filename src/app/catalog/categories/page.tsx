import Image from "next/image";
import Link from "next/link";
import LuxuryFooter from "@/components/LuxuryFooter";
import SiteHeader from "@/components/SiteHeader";
import { getBrandTheme } from "@/lib/brand";
import { getActiveNavigationCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function CatalogCategoriesPage() {
  const categories = await getActiveNavigationCategories();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader categories={categories} />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b97667]">
            MIO Beauty
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-[var(--brand-ink)] sm:text-6xl">
            Категории
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--brand-muted)]">
            Активные направления и бренды, которые обновляются из Supabase.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const theme = getBrandTheme(`${category.name} ${category.slug}`);

            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group overflow-hidden rounded-[24px] border border-white/80 bg-white/90 shadow-[0_20px_60px_rgba(112,72,61,0.1)] transition duration-300 hover:-translate-y-1"
              >
                <div
                  className="relative aspect-[1.15/1] overflow-hidden"
                  style={{ background: theme.surface }}
                >
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="flex h-full items-center justify-center text-3xl font-black tracking-[0.22em]"
                      style={{ color: theme.primary }}
                    >
                      MIO
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-xl font-semibold text-[var(--brand-ink)]">
                    {category.name_ru || category.name_uz || category.name}
                  </h2>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b97667]">
                    Смотреть
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <LuxuryFooter categories={categories} />
    </main>
  );
}
