import { supabase } from "@/lib/supabase";

export type VideoHighlight = {
  id: number;
  title: string;
  title_ru: string | null;
  title_uz: string | null;
  cover_image: string | null;
  video_url: string | null;
  sort_order: number | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

const videoHighlightSelect =
  "id,title,title_ru,title_uz,cover_image,video_url,sort_order,active,created_at,updated_at";

function isMissingVideoTableError(error: { code?: string; message?: string; details?: string }) {
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();

  return (
    error.code === "PGRST205" ||
    message.includes("video_highlights") &&
      (message.includes("schema cache") || message.includes("could not find"))
  );
}

export async function getActiveVideoHighlights() {
  const { data, error } = await supabase
    .from("video_highlights")
    .select(videoHighlightSelect)
    .eq("active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: false });

  if (error) {
    if (!isMissingVideoTableError(error)) {
      console.error("[video_highlights] failed to load", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

    return [];
  }

  return (data || []) as VideoHighlight[];
}
