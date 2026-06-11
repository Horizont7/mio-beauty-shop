import { Metadata } from "next";
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
  const categories = await getActiveNavigationCategories();
  const product = await getActiveProductBySlug(slug);
  const images = await getProductImages(product);
  const relatedProducts = product
    ? await getRelatedProducts(product.category_id, product.id)
    : [];
  const reviews = product ? await getActiveReviewsByProductId(product.id) : [];

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
