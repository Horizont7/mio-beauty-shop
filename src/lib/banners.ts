import { supabase } from "@/lib/supabase";

export type Banner = {
  id: number;
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
    .select("id,image,mobile_image,link,sort_order,active")
    .eq("active", true)
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []) as Banner[];
}
