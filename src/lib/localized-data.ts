import { Banner } from "@/lib/banners";
import { NavigationCategory } from "@/lib/categories";
import { Language } from "@/lib/translations";
import { VideoHighlight } from "@/lib/video-highlights";

export type LocalizedProductFields = {
  name_ru?: string | null;
  name_uz?: string | null;
  description_ru?: string | null;
  description_uz?: string | null;
  seo_title_ru?: string | null;
  seo_title_uz?: string | null;
  seo_description_ru?: string | null;
  seo_description_uz?: string | null;
};

export function getLocalizedProduct(
  product: LocalizedProductFields,
  language: Language
) {
  if (language === "uz") {
    return {
      name: product.name_uz || product.name_ru || "",
      description: product.description_uz || product.description_ru || null,
      seoTitle: product.seo_title_uz || product.seo_title_ru || null,
      seoDescription:
        product.seo_description_uz || product.seo_description_ru || null,
    };
  }

  return {
    name: product.name_ru || product.name_uz || "",
    description: product.description_ru || product.description_uz || null,
    seoTitle: product.seo_title_ru || product.seo_title_uz || null,
    seoDescription:
      product.seo_description_ru || product.seo_description_uz || null,
  };
}

export function getLocalizedBanner(
  banner: Banner | null,
  language: Language
) {
  if (!banner) return null;

  if (language === "uz") {
    return {
      title: banner.title_uz || banner.title,
      subtitle: banner.subtitle_uz || banner.subtitle || null,
      buttonText:
        banner.button_text_uz || banner.button_text || null,
    };
  }

  return {
    title: banner.title_ru || banner.title,
    subtitle: banner.subtitle_ru || banner.subtitle || null,
    buttonText:
      banner.button_text_ru || banner.button_text || null,
  };
}

export function getLocalizedCategory(
  category: Pick<NavigationCategory, "name" | "name_ru" | "name_uz">,
  language: Language
) {
  if (language === "uz") {
    return category.name_uz || category.name_ru || category.name;
  }

  return category.name_ru || category.name_uz || category.name;
}

export function getLocalizedVideoHighlight(
  highlight: Pick<VideoHighlight, "title" | "title_ru" | "title_uz">,
  language: Language
) {
  if (language === "uz") {
    return {
      title: highlight.title_uz || highlight.title_ru || highlight.title,
    };
  }

  return {
    title: highlight.title_ru || highlight.title_uz || highlight.title,
  };
}
