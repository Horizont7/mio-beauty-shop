import type { MetadataRoute } from "next";
import { getProductPathSegment } from "@/lib/products";
import { supabase } from "@/lib/supabase";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://mio-beauty-shop.vercel.app";

function route(url: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${url}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: url === "/" ? 1 : 0.7,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productsResult, categoriesResult] = await Promise.all([
    supabase.from("products").select("id,slug,sku").eq("active", true),
    supabase.from("categories").select("slug").eq("active", true),
  ]);

  const productRoutes = (productsResult.data || []).map((product) =>
    route(`/product/${getProductPathSegment(product)}`)
  );
  const categoryRoutes = (categoriesResult.data || []).map((category) =>
    route(`/category/${category.slug}`)
  );

  return [route("/"), ...categoryRoutes, ...productRoutes];
}
