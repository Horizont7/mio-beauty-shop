import CategoryPageContent from "@/components/CategoryPageContent";
import {
  Category,
  getActiveNavigationCategories,
  getCategoryBySlug,
} from "@/lib/categories";
import {
  CategoryProduct,
  getActiveProductsByCategoryId,
} from "@/lib/products";

export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CategoryPage({
  params,
}: CategoryPageProps) {
  const { slug } = await params;
  const navCategories = await getActiveNavigationCategories();
  let category: Category | null = null;
  let products: CategoryProduct[] = [];
  let errorMessage = "";

  try {
    category = await getCategoryBySlug(slug);

    if (category) {
      products = await getActiveProductsByCategoryId(category.id);
    }
  } catch (error) {
    console.error(error);
    errorMessage =
      "Не удалось загрузить данные категории. Попробуйте позже.";
  }

  return (
    <CategoryPageContent
      navCategories={navCategories}
      category={category}
      products={products}
      errorMessage={errorMessage}
    />
  );
}
