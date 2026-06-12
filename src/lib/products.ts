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
const legacyProductDetailSelect =
  "id,slug,name_ru,name_uz,description_ru,description_uz,seo_title_ru,seo_title_uz,seo_description_ru,seo_description_uz,brand,image,price,old_price,category_id,stock,sku,barcode,weight,volume,is_new,is_hit,active";

export function getProductPathSegment(
  product: Pick<CatalogProduct, "id" | "slug" | "sku">
) {
  return encodeURIComponent(String(product.sku || product.slug || product.id));
}

function uniqueImages(images: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      images.filter(
        (image): image is string => {
          if (!image) return false;

          return (
            image.startsWith("https://") ||
            image.startsWith("http://") ||
            image.startsWith("/")
          );
        }
      )
    )
  );
}

function withProductDetailFallback(product: Record<string, unknown>) {
  return {
    usage_ru: null,
    usage_uz: null,
    ingredients_ru: null,
    ingredients_uz: null,
    ...product,
  } as ProductDetail;
}

function isMissingOptionalProductColumn(error: { message?: string } | null) {
  const message = error?.message || "";

  return (
    message.includes("usage_ru") ||
    message.includes("usage_uz") ||
    message.includes("ingredients_ru") ||
    message.includes("ingredients_uz")
  );
}

async function findActiveProductByField(field: "slug" | "sku" | "id", value: string | number) {
  const result = await supabase
    .from("products")
    .select(productDetailSelect)
    .eq(field, value)
    .eq("active", true)
    .maybeSingle();

  if (!result.error) {
    return result.data ? withProductDetailFallback(result.data) : null;
  }

  if (!isMissingOptionalProductColumn(result.error)) {
    throw result.error;
  }

  const fallback = await supabase
    .from("products")
    .select(legacyProductDetailSelect)
    .eq(field, value)
    .eq("active", true)
    .maybeSingle();

  if (fallback.error) {
    throw fallback.error;
  }

  return fallback.data ? withProductDetailFallback(fallback.data) : null;
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
  const param = decodeURIComponent(slug).trim();

  for (const query of [
    { field: "slug", value: param },
    { field: "sku", value: param },
  ] as const) {
    try {
      const product = await findActiveProductByField(query.field, query.value);

      if (product) {
        return product;
      }
    } catch (error) {
      console.error("PRODUCT_PAGE_ERROR", {
        param,
        query: `products.${query.field}`,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
  }

  const id = Number.parseInt(param, 10);
  if (Number.isNaN(id)) {
    return null;
  }

  try {
    return await findActiveProductByField("id", id);
  } catch (error) {
    console.error("PRODUCT_PAGE_ERROR", {
      param,
      query: "products.id",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getProductImages(product: ProductDetail | null) {
  if (!product) return [];

  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", product.id);

  if (error) {
    console.error("PRODUCT_PAGE_ERROR", {
      param: product.id,
      query: "product_images.product_id",
      error: error.message,
    });
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
    console.error("PRODUCT_PAGE_ERROR", {
      param: productId,
      query: "related_products",
      error: error.message,
    });
    return [];
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
    console.error("PRODUCT_PAGE_ERROR", {
      param: productId,
      query: "reviews.product_id",
      error: error.message,
    });
    return [];
  }

  return (data || []) as ProductReview[];
}
