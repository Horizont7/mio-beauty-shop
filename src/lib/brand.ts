export type BrandTheme = {
  key: string;
  label: string;
  primary: string;
  secondary: string;
  surface: string;
};

export const brandThemes = {
  mioBeauty: {
    key: "mio-beauty",
    label: "MIO BEAUTY",
    primary: "var(--brand-mio-beauty-primary)",
    secondary: "var(--brand-mio-beauty-secondary)",
    surface: "var(--brand-mio-beauty-surface)",
  },
  shineSkin: {
    key: "shineskin",
    label: "SHINESKIN",
    primary: "var(--brand-shineskin-primary)",
    secondary: "var(--brand-shineskin-secondary)",
    surface: "var(--brand-shineskin-surface)",
  },
  mioBaby: {
    key: "mio-baby",
    label: "MIO BABY",
    primary: "var(--brand-mio-baby-primary)",
    secondary: "var(--brand-mio-baby-secondary)",
    surface: "var(--brand-mio-baby-surface)",
  },
  mioHome: {
    key: "mio-home",
    label: "MIO HOME",
    primary: "var(--brand-mio-home-primary)",
    secondary: "var(--brand-mio-home-secondary)",
    surface: "var(--brand-mio-home-surface)",
  },
} satisfies Record<string, BrandTheme>;

const defaultTheme = brandThemes.mioBeauty;

export function getBrandTheme(value?: string | null) {
  const normalized = (value || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  if (normalized.includes("shine")) return brandThemes.shineSkin;
  if (normalized.includes("baby")) return brandThemes.mioBaby;
  if (normalized.includes("home")) return brandThemes.mioHome;
  if (normalized.includes("aksiya")) return brandThemes.mioBeauty;
  if (normalized.includes("mio")) return brandThemes.mioBeauty;

  return defaultTheme;
}
