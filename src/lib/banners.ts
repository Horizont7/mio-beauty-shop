import { supabase } from "@/lib/supabase";

export type Banner = {
  id: number;
  title: string;
  title_ru: string | null;
  title_uz: string | null;
  subtitle: string | null;
  subtitle_ru: string | null;
  subtitle_uz: string | null;
  button_text: string | null;
  button_text_ru: string | null;
  button_text_uz: string | null;
  image: string | null;
  mobile_image: string | null;
  link: string | null;
  sort_order: number | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export async function getActiveBanners() {
  const { data, error } = await supabase
    .from("banners")
    .select(
      "id,title,title_ru,title_uz,subtitle,subtitle_ru,subtitle_uz,button_text,button_text_ru,button_text_uz,image,mobile_image,link,sort_order,active"
    )
    .eq("active", true)
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []) as Banner[];
}
