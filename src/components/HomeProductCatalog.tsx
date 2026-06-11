"use client";

import Link from "next/link";
import { useState } from "react";
import { getLocalizedProduct } from "@/lib/localized-data";
import { CatalogProduct } from "@/lib/products";

type HomeProductCatalogProps = {
  newProducts: CatalogProduct[];
  allProducts: CatalogProduct[];
};

function formatPrice(price: number | null) {
  if (price === null) return "Narx ko'rsatilmagan";

  return new Intl.NumberFormat("uz-UZ").format(price) + " so'm";
}

function ProductCard({ product }: { product: CatalogProduct }) {
  const localizedProduct = getLocalizedProduct(product, "uz");

  return (
    <Link
      href={`/product/${product.slug || product.id}`}
      className="bg-white rounded-[30px] overflow-hidden shadow-sm hover:shadow-xl transition duration-300"
    >
      <div className="relative bg-[#F7F5FA] h-[280px]">
        {product.is_new && (
          <span className="absolute top-4 left-4 bg-[#EEA391] text-white text-xs px-3 py-1 rounded-full">
            NEW
          </span>
        )}

        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={localizedProduct.name}
            className="w-full h-full object-contain p-8"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl font-extrabold tracking-[8px] text-[#EEA391]">
            MIO
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-[#2D2D2D] mb-2 line-clamp-2">
          {localizedProduct.name}
        </h3>

        <p className="text-sm text-gray-500 mb-3">
          {product.brand || "MIO Beauty"}
        </p>

        <div className="flex items-center justify-between">
          <p className="font-bold text-lg">
            {formatPrice(product.price)}
          </p>

          <span className="bg-[#EEA391] text-white px-4 py-2 rounded-full text-sm">
            Savatga
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomeProductCatalog({
  newProducts,
  allProducts,
}: HomeProductCatalogProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-4xl font-bold text-[#2D2D2D]">
          Yangi mahsulotlar
        </h2>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="border border-[#EEA391] text-[#EEA391] px-6 py-3 rounded-full hover:bg-[#EEA391] hover:text-white transition"
        >
          {expanded ? "Yopish" : "Barchasini ko'rish"}
        </button>
      </div>

      {newProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
          {newProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-[30px] bg-white p-10 text-center shadow-sm">
          <h3 className="text-2xl font-bold text-[#2D2D2D]">
            Yangi mahsulotlar topilmadi
          </h3>
          <p className="mt-3 text-gray-500">
            Hozircha yangi mahsulotlar qo&apos;shilmagan.
          </p>
        </div>
      )}

      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
          expanded ? "grid-rows-[1fr] mt-12" : "grid-rows-[0fr] mt-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="text-3xl font-bold text-[#2D2D2D]">
              Barcha mahsulotlar
            </h3>
            <span className="text-sm font-semibold text-[#EEA391]">
              {allProducts.length} ta mahsulot
            </span>
          </div>

          {allProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
              {allProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-[30px] bg-white p-10 text-center shadow-sm">
              <h3 className="text-2xl font-bold text-[#2D2D2D]">
                Mahsulotlar topilmadi
              </h3>
              <p className="mt-3 text-gray-500">
                Hozircha faol mahsulotlar mavjud emas.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
