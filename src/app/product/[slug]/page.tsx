import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailContent from "@/components/ProductDetailContent";
import { getActiveNavigationCategories } from "@/lib/categories";
import { getLocalizedProduct } from "@/lib/localized-data";
import {
  getActiveProductBySlug,
  getActiveReviewsByProductId,
  getProductImages,
  getRelatedProducts,
} from "@/lib/products";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getActiveProductBySlug(slug);

    if (!product) {
      return {
        title: "MIO Beauty",
      };
    }

    const localizedProduct = getLocalizedProduct(product, "ru");

    return {
      title: localizedProduct.seoTitle || localizedProduct.name,
      description:
        localizedProduct.seoDescription ||
        localizedProduct.description ||
        undefined,
      openGraph: {
        title: localizedProduct.seoTitle || localizedProduct.name,
        description:
          localizedProduct.seoDescription ||
          localizedProduct.description ||
          undefined,
        images: product.image ? [product.image] : undefined,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      title: "MIO Beauty",
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const categories = await getActiveNavigationCategories().catch((error) => {
    console.error("PRODUCT_PAGE_ERROR", {
      param: slug,
      query: "categories.navigation",
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  });
  const product = await getActiveProductBySlug(slug).catch((error) => {
    console.error("PRODUCT_PAGE_ERROR", {
      param: slug,
      query: "products.detail",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });

  if (!product) {
    notFound();
  }

  const [images, relatedProducts, reviews] = await Promise.all([
    getProductImages(product).catch((error) => {
      console.error("PRODUCT_PAGE_ERROR", {
        param: slug,
        query: "product_images",
        error: error instanceof Error ? error.message : String(error),
      });
      return product.image ? [product.image] : [];
    }),
    getRelatedProducts(product.category_id, product.id).catch((error) => {
      console.error("PRODUCT_PAGE_ERROR", {
        param: slug,
        query: "related_products",
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }),
    getActiveReviewsByProductId(product.id).catch((error) => {
      console.error("PRODUCT_PAGE_ERROR", {
        param: slug,
        query: "reviews",
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }),
  ]);

  return (
    <ProductDetailContent
      product={product}
      images={images}
      relatedProducts={relatedProducts}
      reviews={reviews}
      categories={categories}
    />
  );
}
