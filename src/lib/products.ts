import { supabase } from "@/lib/supabase";

export type CategoryProduct = {
  id: number;
  slug: string | null;
  name_ru: string | null;
  name_uz: string | null;
  description_ru?: string | null;
  description_uz?: string | null;
  seo_title_ru?: string | null;
  seo_title_uz?: string | null;
  seo_description_ru?: string | null;
  seo_description_uz?: string | null;
  brand: string | null;
  image: string | null;
  price: number | null;
  old_price?: number | null;
  category_id: number | null;
  stock?: number | null;
  sku?: string | null;
  is_new: boolean;
  is_hit: boolean;
};

export type CatalogProduct = {
  id: number;
  slug: string | null;
  name_ru: string | null;
  name_uz: string | null;
  description_ru?: string | null;
  description_uz?: string | null;
  seo_title_ru?: string | null;
  seo_title_uz?: string | null;
  seo_description_ru?: string | null;
  seo_description_uz?: string | null;
  brand: string | null;
  image: string | null;
  price: number | null;
  old_price?: number | null;
  category_id: number | null;
  stock?: number | null;
  sku?: string | null;
  is_new: boolean;
  is_hit: boolean;
};

export type ProductDetail = CatalogProduct & {
  old_price: number | null;
  stock: number | null;
  sku: string | null;
  barcode: string | null;
  weight: string | null;
  volume: string | null;
  usage_ru: string | null;
  usage_uz: string | null;
  ingredients_ru: string | null;
  ingredients_uz: string | null;
  active: boolean;
};

export type ProductReview = {
  id: number;
  product_id: number;
  customer_name: string | null;
  rating: number | null;
  comment: string | null;
  active: boolean;
  created_at: string;
};

type ProductImageRow = {
  image?: string | null;
  image_url?: string | null;
  url?: string | null;
  path?: string | null;
};

const productDetailSelect =
  "id,slug,name_ru,name_uz,description_ru,description_uz,seo_title_ru,seo_title_uz,seo_description_ru,seo_description_uz,brand,image,price,old_price,category_id,stock,sku,barcode,weight,volume,usage_ru,usage_uz,ingredients_ru,ingredients_uz,is_new,is_hit,active";

function uniqueImages(images: Array<string | null | undefined>) {
  return Array.from(
    new Set(images.filter((image): image is string => Boolean(image)))
  );
}

export async function getActiveProductsByCategoryId(categoryId: number) {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,slug,name_ru,name_uz,description_ru,description_uz,seo_title_ru,seo_title_uz,seo_description_ru,seo_description_uz,brand,image,price,old_price,category_id,stock,sku,is_new,is_hit"
    )
    .eq("category_id", categoryId)
    .eq("active", true)
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as CategoryProduct[];
}

export async function getActiveProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select(productDetailSelect)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data as ProductDetail;
  }

  const id = Number.parseInt(slug, 10);
  if (Number.isNaN(id)) {
    return null;
  }

  const fallback = await supabase
    .from("products")
    .select(productDetailSelect)
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return fallback.data as ProductDetail | null;
}

export async function getProductImages(product: ProductDetail | null) {
  if (!product) return [];

  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", product.id);

  if (error) {
    return uniqueImages([product.image]);
  }

  const galleryImages = ((data || []) as ProductImageRow[]).map(
    (image) => image.image || image.image_url || image.url || image.path
  );

  return uniqueImages([product.image, ...galleryImages]);
}

export async function getRelatedProducts(
  categoryId: number | null,
  productId: number
) {
  if (!categoryId) return [];

  const { data, error } = await supabase
    .from("products")
    .select(
      "id,slug,name_ru,name_uz,description_ru,description_uz,seo_title_ru,seo_title_uz,seo_description_ru,seo_description_uz,brand,image,price,old_price,category_id,stock,sku,is_new,is_hit"
    )
    .eq("category_id", categoryId)
    .eq("active", true)
    .neq("id", productId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .limit(4);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as CatalogProduct[];
}

export async function getActiveCatalogProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,slug,name_ru,name_uz,description_ru,description_uz,seo_title_ru,seo_title_uz,seo_description_ru,seo_description_uz,brand,image,price,old_price,category_id,stock,sku,is_new,is_hit"
    )
    .eq("active", true)
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) {
    if (!error.message.includes("is_hit")) {
      throw new Error(error.message);
    }

    const fallback = await supabase
      .from("products")
      .select(
        "id,slug,name_ru,name_uz,description_ru,description_uz,seo_title_ru,seo_title_uz,seo_description_ru,seo_description_uz,brand,image,price,old_price,category_id,stock,sku,is_new"
      )
      .eq("active", true)
      .order("sort_order", { ascending: true, nullsFirst: false });

    if (fallback.error) {
      throw new Error(fallback.error.message);
    }

    return (fallback.data || []).map((product) => ({
      ...product,
      is_hit: false,
    })) as CatalogProduct[];
  }

  return (data || []) as CatalogProduct[];
}

export async function getActiveReviewsByProductId(productId: number) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data, error } = await supabase
    .from("reviews")
    .select("id,product_id,customer_name,rating,comment,active,created_at")
    .eq("product_id", productId)
    .eq("active", true)
    .gte("created_at", ninetyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes("reviews")) return [];
    throw new Error(error.message);
  }

  return (data || []) as ProductReview[];
}
