import { supabase } from "@/lib/supabase";

export type NavigationCategory = {
  id: number;
  name: string;
  name_ru: string | null;
  name_uz: string | null;
  slug: string;
  image: string | null;
};

export type Category = {
  id: number;
  name: string;
  name_ru: string | null;
  name_uz: string | null;
  slug: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export async function getActiveNavigationCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,name_ru,name_uz,slug,image")
    .eq("active", true)
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []) as NavigationCategory[];
}

export async function getCategoryBySlug(slug: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,name_ru,name_uz,slug,description,seo_title,seo_description")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Category | null;
}
