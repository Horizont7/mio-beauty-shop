"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ExcelJS from "exceljs";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Category = {
  id: number;
  name: string;
  slug: string | null;
};

type Product = {
  id: number;
  slug: string | null;
  name_ru: string | null;
  name_uz: string | null;
  brand: string | null;
  image: string | null;
  price: number | null;
  old_price: number | null;
  category_id: number | null;
  description_ru: string | null;
  description_uz: string | null;
  usage_ru: string | null;
  usage_uz: string | null;
  ingredients_ru: string | null;
  ingredients_uz: string | null;
  stock: number | null;
  sku: string | null;
  barcode: string | null;
  weight: string | null;
  volume: string | null;
  sort_order: number | null;
  seo_title_ru: string | null;
  seo_title_uz: string | null;
  seo_description_ru: string | null;
  seo_description_uz: string | null;
  is_new: boolean;
  is_hit: boolean;
  active: boolean;
};

type ImportMessage = {
  row: number;
  message: string;
};

type ImportSummary = {
  totalRows: number;
  updatedRows: number;
  createdRows: number;
  skippedRows: number;
  errors: ImportMessage[];
};

type ToastMessage = {
  type: "success" | "error";
  text: string;
};

type ProductForm = {
  nameRu: string;
  nameUz: string;
  brand: string;
  image: string;
  price: string;
  oldPrice: string;
  categoryId: string;
  descriptionRu: string;
  descriptionUz: string;
  usageRu: string;
  usageUz: string;
  ingredientsRu: string;
  ingredientsUz: string;
  stock: string;
  sku: string;
  barcode: string;
  weight: string;
  volume: string;
  sortOrder: string;
  seoTitleRu: string;
  seoTitleUz: string;
  seoDescriptionRu: string;
  seoDescriptionUz: string;
  isNew: boolean;
  isHit: boolean;
};

const categoryNames = [
  "MIO BEAUTY",
  "SHINESKIN",
  "MIO BABY",
  "MIO HOME",
  "AKSIYALAR",
];

const initialForm: ProductForm = {
  nameRu: "",
  nameUz: "",
  brand: "",
  image: "",
  price: "",
  oldPrice: "",
  categoryId: "",
  descriptionRu: "",
  descriptionUz: "",
  usageRu: "",
  usageUz: "",
  ingredientsRu: "",
  ingredientsUz: "",
  stock: "0",
  sku: "",
  barcode: "",
  weight: "",
  volume: "",
  sortOrder: "0",
  seoTitleRu: "",
  seoTitleUz: "",
  seoDescriptionRu: "",
  seoDescriptionUz: "",
  isNew: false,
  isHit: false,
};

type ExportColumn = {
  key: string;
  header: string;
  width: number;
  wrap?: boolean;
};

const exportColumns: readonly ExportColumn[] = [
  { key: "id", header: "id", width: 10 },
  { key: "sku", header: "sku", width: 18 },
  { key: "slug", header: "slug", width: 28 },
  { key: "category", header: "category", width: 18 },
  { key: "name_ru", header: "name_ru", width: 34 },
  { key: "name_uz", header: "name_uz", width: 34 },
  { key: "description_ru", header: "description_ru", width: 55, wrap: true },
  { key: "description_uz", header: "description_uz", width: 55, wrap: true },
  { key: "seo_title_ru", header: "seo_title_ru", width: 38 },
  { key: "seo_title_uz", header: "seo_title_uz", width: 38 },
  {
    key: "seo_description_ru",
    header: "seo_description_ru",
    width: 55,
    wrap: true,
  },
  {
    key: "seo_description_uz",
    header: "seo_description_uz",
    width: 55,
    wrap: true,
  },
  { key: "price", header: "price", width: 12 },
  { key: "old_price", header: "old_price", width: 12 },
  { key: "stock", header: "stock", width: 10 },
  { key: "active", header: "active", width: 10 },
  { key: "is_new", header: "is_new", width: 10 },
  { key: "is_hit", header: "is_hit", width: 10 },
];

const importUpdateFields = [
  "name_ru",
  "name_uz",
  "description_ru",
  "description_uz",
  "seo_title_ru",
  "seo_title_uz",
  "seo_description_ru",
  "seo_description_uz",
  "price",
  "old_price",
  "stock",
  "active",
  "is_new",
  "is_hit",
] as const;

type ImportUpdateField = (typeof importUpdateFields)[number];

type ProductImportPayload = Partial<
  Record<ImportUpdateField | "slug" | "category_id" | "sku", unknown>
>;

function parseNumber(value: string) {
  const numberValue = Number.parseFloat(value);

  return Number.isNaN(numberValue) ? null : numberValue;
}

function parseInteger(value: string) {
  const numberValue = Number.parseInt(value, 10);

  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const numberValue = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isNaN(numberValue) ? undefined : numberValue;
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const numberValue = Number.parseInt(trimmed, 10);
  return Number.isNaN(numberValue) ? undefined : numberValue;
}

function parseOptionalBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  if (["true", "1", "yes", "y", "ha", "да", "aktiv"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n", "yo'q", "нет", "nofaol"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function normalizeLookupValue(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function isMissingUsageIngredients(error: { message?: string } | null | undefined) {
  const message = error?.message || "";
  return (
    message.includes("usage_ru") ||
    message.includes("usage_uz") ||
    message.includes("ingredients_ru") ||
    message.includes("ingredients_uz")
  );
}

const productFullSelect =
  "id,slug,name_ru,name_uz,brand,image,price,old_price,category_id,description_ru,description_uz,usage_ru,usage_uz,ingredients_ru,ingredients_uz,stock,sku,barcode,weight,volume,sort_order,seo_title_ru,seo_title_uz,seo_description_ru,seo_description_uz,is_new,is_hit,active";

const productLimitedSelect =
  "id,slug,name_ru,name_uz,brand,image,price,old_price,category_id,description_ru,description_uz,stock,sku,barcode,weight,volume,sort_order,seo_title_ru,seo_title_uz,seo_description_ru,seo_description_uz,is_new,is_hit,active";

function generateSlug(value: string) {
  const fallback = `product-${Date.now()}`;
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function excelCellToString(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("result" in value) {
      return excelCellToString(value.result as ExcelJS.CellValue);
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((item) => ("text" in item ? item.text : ""))
        .join("");
    }
  }

  return String(value);
}

async function mapXlsxRows(file: File) {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) return [];

  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    headers[columnNumber] = excelCellToString(cell.value).trim();
  });

  const rows: Record<string, string>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const mappedRow = headers.reduce<Record<string, string>>(
      (result, header, index) => {
        if (header) {
          result[header] = excelCellToString(row.getCell(index).value).trim();
        }

        return result;
      },
      {}
    );

    if (Object.values(mappedRow).some(Boolean)) {
      rows.push(mappedRow);
    }
  });

  return rows;
}

function getPublicImageUrl(path: string) {
  const { data } = supabase.storage
    .from("products")
    .getPublicUrl(path);

  return data.publicUrl;
}

function getStoragePathFromImageUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const marker = "/products/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(
      url.pathname.slice(markerIndex + marker.length)
    );
  } catch {
    const fileName = imageUrl.split("/").pop();

    return fileName ? `product-images/${fileName}` : null;
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] =
    useState<ImportSummary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState("all");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [hasUsageIngredients, setHasUsageIngredients] = useState(true);
  const [repairingSchema, setRepairingSchema] = useState(false);
  const [schemaRepairSql, setSchemaRepairSql] = useState<string | null>(null);

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    setPageLoading(true);

    const [rawProductsResult, categoriesResult] = await Promise.all([
      supabase
        .from("products")
        .select(productFullSelect)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: false }),
      supabase
        .from("categories")
        .select("id,name,slug")
        .in("name", categoryNames)
        .order("sort_order", { ascending: true, nullsFirst: false }),
    ]);

    let finalProductsResult: typeof rawProductsResult = rawProductsResult;

    if (rawProductsResult.error && isMissingUsageIngredients(rawProductsResult.error)) {
      setHasUsageIngredients(false);
      const fallback = await supabase
        .from("products")
        .select(productLimitedSelect)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: false });
      finalProductsResult = fallback as typeof rawProductsResult;
      void repairSchema();
    } else {
      setHasUsageIngredients(true);
    }

    if (finalProductsResult.error) {
      console.error(finalProductsResult.error);
      showToast("error", finalProductsResult.error.message);
      setPageLoading(false);
      return;
    }

    if (categoriesResult.error) {
      console.error(categoriesResult.error);
      alert(categoriesResult.error.message);
      setPageLoading(false);
      return;
    }

    setProducts((finalProductsResult.data || []) as Product[]);
    setCategories((categoriesResult.data || []) as Category[]);
    setPageLoading(false);
  }

  async function repairSchema() {
    setRepairingSchema(true);
    setSchemaRepairSql(null);
    try {
      const resp = await fetch("/api/admin/apply-schema", { method: "POST" });
      if (!resp.ok) {
        setSchemaRepairSql(
          "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS usage_ru text;\n" +
          "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS usage_uz text;\n" +
          "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredients_ru text;\n" +
          "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredients_uz text;"
        );
        return;
      }
      const data = (await resp.json()) as { success: boolean; sql?: string };
      if (data.success) {
        window.location.reload();
      } else {
        setSchemaRepairSql(data.sql ?? null);
      }
    } catch {
      setSchemaRepairSql(
        "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS usage_ru text;\n" +
        "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS usage_uz text;\n" +
        "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredients_ru text;\n" +
        "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredients_uz text;"
      );
    } finally {
      setRepairingSchema(false);
    }
  }

  function updateForm(
    field: keyof ProductForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function showToast(type: ToastMessage["type"], text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  }

  function getProductDisplayName(product: Product) {
    return product.name_uz || product.name_ru || "-";
  }

  function resetForm() {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setForm(initialForm);
    setEditingId(null);
    setImageFile(null);
    setImagePreview("");
    setDrawerOpen(false);
  }

  function openCreateProduct() {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setForm(initialForm);
    setEditingId(null);
    setImageFile(null);
    setImagePreview("");
    setDrawerOpen(true);
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Faqat rasm faylini yuklang");
      return;
    }

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(oldImageUrl: string | null) {
    if (!imageFile) return form.image || null;

    const oldImagePath = getStoragePathFromImageUrl(oldImageUrl);

    if (oldImagePath) {
      const { error } = await supabase.storage
        .from("products")
        .remove([oldImagePath]);

      if (error) {
        throw new Error(error.message);
      }
    }

    const extension = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const filePath = `product-images/${fileName}`;

    const { error } = await supabase.storage
      .from("products")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    return getPublicImageUrl(filePath);
  }

  async function saveProduct() {
    if (!form.nameRu.trim() && !form.nameUz.trim()) {
      alert("Uzbek yoki Russian mahsulot nomini kiriting");
      return;
    }

    if (!form.categoryId) {
      alert("Kategoriya tanlang");
      return;
    }

    setLoading(true);

    try {
      const currentProduct = products.find(
        (product) => product.id === editingId
      );
      const imageUrl = await uploadImage(
        editingId && imageFile ? currentProduct?.image || null : null
      );
      const categoryId = Number.parseInt(form.categoryId, 10);
      const payload = {
        name_ru: form.nameRu.trim() || null,
        name_uz: form.nameUz.trim() || null,
        brand: form.brand.trim() || null,
        image: imageUrl,
        price: parseNumber(form.price),
        old_price: parseNumber(form.oldPrice),
        category_id: Number.isNaN(categoryId) ? null : categoryId,
        description_ru: form.descriptionRu.trim() || null,
        description_uz: form.descriptionUz.trim() || null,
        ...(hasUsageIngredients ? {
          usage_ru: form.usageRu.trim() || null,
          usage_uz: form.usageUz.trim() || null,
          ingredients_ru: form.ingredientsRu.trim() || null,
          ingredients_uz: form.ingredientsUz.trim() || null,
        } : {}),
        stock: parseInteger(form.stock),
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        weight: form.weight.trim() || null,
        volume: form.volume.trim() || null,
        sort_order: parseInteger(form.sortOrder),
        seo_title_ru: form.seoTitleRu.trim() || null,
        seo_title_uz: form.seoTitleUz.trim() || null,
        seo_description_ru: form.seoDescriptionRu.trim() || null,
        seo_description_uz: form.seoDescriptionUz.trim() || null,
        is_new: form.isNew,
        is_hit: form.isHit,
      };

      const { error } = editingId
        ? await supabase
            .from("products")
            .update(payload)
            .eq("id", editingId)
        : await supabase.from("products").insert([
            {
              ...payload,
              active: true,
            },
          ]);

      if (error) {
        alert(error.message);
        showToast("error", error.message);
        setLoading(false);
        return;
      }

      showToast(
        "success",
        editingId ? "Product updated successfully." : "Product added successfully."
      );
      resetForm();
      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Rasm yuklashda xatolik yuz berdi";
      alert(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  function editProduct(product: Product) {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setEditingId(product.id);
      setForm({
        nameRu: product.name_ru || "",
        nameUz: product.name_uz || "",
        brand: product.brand || "",
      image: product.image || "",
      price: product.price?.toString() || "",
      oldPrice: product.old_price?.toString() || "",
      categoryId: product.category_id?.toString() || "",
        descriptionRu: product.description_ru || "",
        descriptionUz: product.description_uz || "",
        usageRu: product.usage_ru || "",
        usageUz: product.usage_uz || "",
        ingredientsRu: product.ingredients_ru || "",
        ingredientsUz: product.ingredients_uz || "",
      stock: product.stock?.toString() || "0",
      sku: product.sku || "",
      barcode: product.barcode || "",
      weight: product.weight || "",
      volume: product.volume || "",
      sortOrder: product.sort_order?.toString() || "0",
        seoTitleRu: product.seo_title_ru || "",
        seoTitleUz: product.seo_title_uz || "",
        seoDescriptionRu: product.seo_description_ru || "",
        seoDescriptionUz: product.seo_description_uz || "",
      isNew: product.is_new,
      isHit: product.is_hit,
    });
    setImageFile(null);
    setImagePreview(product.image || "");
    setDrawerOpen(true);
  }

  async function deleteProduct(id: number) {
    const confirmDelete = window.confirm(
      "Mahsulotni o'chirishni tasdiqlaysizmi?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      showToast("error", error.message);
      return;
    }

    showToast("success", "Product deleted.");
    await loadPageData();
  }

  async function toggleProduct(id: number, current: boolean) {
    const { error } = await supabase
      .from("products")
      .update({
        active: !current,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      showToast("error", error.message);
      return;
    }

    showToast("success", !current ? "Product enabled." : "Product disabled.");
    await loadPageData();
  }

  async function exportProducts() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products translations", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const instructions = workbook.addWorksheet("Instructions");

    instructions.columns = [
      { key: "rule", header: "Import instructions", width: 95 },
    ];
    instructions.addRows([
      {
        rule: "SKU is the main product key.",
      },
      {
        rule: "To update a product, keep the same SKU.",
      },
      {
        rule: "To create a new product, add a new row with a unique SKU.",
      },
      {
        rule: "Do not change SKU unless you intentionally want to create a new product.",
      },
      {
        rule: "Empty cells will be ignored and will not delete existing data.",
      },
      {
        rule: "For new products, fill sku, category, name_ru or name_uz, and price.",
      },
      {
        rule: "Category can be matched by category name or category slug.",
      },
      {
        rule: "If id is filled but belongs to another SKU, import will show an error and skip that row.",
      },
    ]);
    instructions.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    instructions.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFB96C5C" },
    };
    instructions.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: "top", wrapText: true };
      });
    });

    worksheet.columns = exportColumns.map((column) => ({
      key: column.key,
      header: column.header,
      width: column.width,
    }));

    const rows = products.map((product) => ({
      id: product.id,
      sku: product.sku || "",
      slug: product.slug || "",
      category: categoryById[product.category_id || 0] || "",
      name_ru: product.name_ru || "",
      name_uz: product.name_uz || "",
      description_ru: product.description_ru || "",
      description_uz: product.description_uz || "",
      seo_title_ru: product.seo_title_ru || "",
      seo_title_uz: product.seo_title_uz || "",
      seo_description_ru: product.seo_description_ru || "",
      seo_description_uz: product.seo_description_uz || "",
      price: product.price ?? "",
      old_price: product.old_price ?? "",
      stock: product.stock ?? "",
      active: product.active,
      is_new: product.is_new,
      is_hit: product.is_hit,
    }));

    worksheet.addRows(rows);
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: exportColumns.length },
    };

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFB96C5C" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFD9B3AA" } },
      };
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.height = 36;
      }

      exportColumns.forEach((column, index) => {
        const cell = row.getCell(index + 1);
        const isReferenceColumn = column.key === "id";

        cell.alignment = {
          vertical: "top",
          horizontal: isReferenceColumn ? "center" : "left",
          wrapText: Boolean(column.wrap),
        };
        cell.fill = isReferenceColumn
          ? {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8F3F1" },
            }
          : cell.fill;
        cell.protection = { locked: false };

        if (column.key === "price" || column.key === "old_price") {
          cell.numFmt = "#,##0.00";
        }

        if (column.key === "stock") {
          cell.numFmt = "0";
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "mio-products-translations.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  function buildImportPayload(row: Record<string, string>) {
    const payload: ProductImportPayload = {};

    for (const field of importUpdateFields) {
      const value = row[field]?.trim();
      if (!value) continue;

      if (field === "price" || field === "old_price") {
        const parsed = parseOptionalNumber(value);
        if (parsed !== undefined) payload[field] = parsed;
        continue;
      }

      if (field === "stock") {
        const parsed = parseOptionalInteger(value);
        if (parsed !== undefined) payload[field] = parsed;
        continue;
      }

      if (field === "active" || field === "is_new" || field === "is_hit") {
        const parsed = parseOptionalBoolean(value);
        if (parsed !== undefined) payload[field] = parsed;
        continue;
      }

      payload[field] = value;
    }

    const slug = row.slug?.trim();
    if (slug) {
      payload.slug = slug;
    }

    return payload;
  }

  async function importProducts(file: File) {
    setImporting(true);
    setImportSummary(null);

    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        setImportSummary({
          totalRows: 0,
          updatedRows: 0,
          createdRows: 0,
          skippedRows: 0,
          errors: [
            {
              row: 0,
              message: "XLSX formatidagi faylni yuklang.",
            },
          ],
        });
        return;
      }

      const rows = await mapXlsxRows(file);
      const errors: ImportMessage[] = [];
      let updatedRows = 0;
      let createdRows = 0;
      let skippedRows = 0;
      const seenSkus = new Set<string>();

      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2;
        const id = parseOptionalInteger(row.id || "");
        const sku = row.sku?.trim();
        const normalizedSku = normalizeLookupValue(sku);

        if (!sku) {
          skippedRows += 1;
          errors.push({
            row: rowNumber,
            message: "SKU to'ldirilmagan.",
          });
          continue;
        }

        if (seenSkus.has(normalizedSku)) {
          skippedRows += 1;
          errors.push({
            row: rowNumber,
            message: "Bu SKU import faylida takrorlangan.",
          });
          continue;
        }

        seenSkus.add(normalizedSku);

        const productBySku = products.find(
          (item) => normalizeLookupValue(item.sku) === normalizedSku
        );
        const productById = id
          ? products.find((item) => item.id === id)
          : null;

        if (
          productById &&
          normalizeLookupValue(productById.sku) !== normalizedSku
        ) {
          skippedRows += 1;
          errors.push({
            row: rowNumber,
            message:
              "ID boshqa SKU mahsulotiga tegishli. Noto'g'ri mahsulot yangilanmadi.",
          });
          continue;
        }

        const payload = buildImportPayload(row);
        const category = row.category?.trim()
          ? categories.find((item) => {
              const categoryValue = normalizeLookupValue(row.category);
              return (
                normalizeLookupValue(item.name) === categoryValue ||
                normalizeLookupValue(item.slug) === categoryValue
              );
            })
          : null;

        if (row.category?.trim()) {
          if (!category) {
            skippedRows += 1;
            errors.push({
              row: rowNumber,
              message: "Kategoriya nomi yoki slug bo'yicha topilmadi.",
            });
            continue;
          }

          payload.category_id = category.id;
        }

        if (productBySku) {
          if (Object.keys(payload).length === 0) {
            skippedRows += 1;
            errors.push({
              row: rowNumber,
              message: "Yangilanadigan qiymatlar topilmadi.",
            });
            continue;
          }

          const { error } = await supabase
            .from("products")
            .update(payload)
            .eq("id", productBySku.id);

          if (error) {
            skippedRows += 1;
            errors.push({
              row: rowNumber,
              message: error.message,
            });
            continue;
          }

          updatedRows += 1;
          continue;
        }

        if (!category) {
          skippedRows += 1;
          errors.push({
            row: rowNumber,
            message: "Yangi mahsulot uchun category majburiy.",
          });
          continue;
        }

        const resolvedName = row.name_ru?.trim() || row.name_uz?.trim();
        const parsedPrice = parseOptionalNumber(row.price || "");

        if (!resolvedName) {
          skippedRows += 1;
          errors.push({
            row: rowNumber,
            message: "Yangi mahsulot uchun name_ru yoki name_uz kerak.",
          });
          continue;
        }

        if (parsedPrice === undefined) {
          skippedRows += 1;
          errors.push({
            row: rowNumber,
            message: "Yangi mahsulot uchun price majburiy.",
          });
          continue;
        }

        const createPayload: ProductImportPayload = {
          ...payload,
          sku,
          price: parsedPrice,
          category_id: category.id,
          slug: generateSlug(resolvedName),
        };

        const { error } = await supabase.from("products").insert([
          {
            ...createPayload,
            active:
              typeof createPayload.active === "boolean"
                ? createPayload.active
                : true,
          },
        ]);

        if (error) {
          skippedRows += 1;
          errors.push({
            row: rowNumber,
            message: error.message,
          });
          continue;
        }

        createdRows += 1;
      }

      setImportSummary({
        totalRows: rows.length,
        updatedRows,
        createdRows,
        skippedRows,
        errors,
      });
      showToast(
        errors.length ? "error" : "success",
        `Import finished: ${updatedRows} updated, ${createdRows} created.`
      );
      await loadPageData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Import jarayonida xatolik yuz berdi.";
      setImportSummary({
        totalRows: 0,
        updatedRows: 0,
        createdRows: 0,
        skippedRows: 0,
        errors: [
          {
            row: 0,
            message,
          },
        ],
      });
      showToast("error", message);
    } finally {
      setImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    void importProducts(file);
  }

  const categoryById = useMemo(() => {
    return categories.reduce<Record<number, string>>(
      (result, category) => ({
        ...result,
        [category.id]: category.name,
      }),
      {}
    );
  }, [categories]);

  const brandOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.brand?.trim())
            .filter((brand): brand is string => Boolean(brand))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const stats = useMemo(
    () => [
      {
        label: "Total products",
        value: products.length,
      },
      {
        label: "Active products",
        value: products.filter((product) => product.active).length,
      },
      {
        label: "Hit products",
        value: products.filter((product) => product.is_hit).length,
      },
      {
        label: "New products",
        value: products.filter((product) => product.is_new).length,
      },
      {
        label: "Out of stock",
        value: products.filter((product) => (product.stock ?? 0) <= 0)
          .length,
      },
    ],
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const query = search.toLowerCase();
        const matchesSearch =
          !query ||
          (product.name_uz || "").toLowerCase().includes(query) ||
          (product.name_ru || "").toLowerCase().includes(query) ||
          (product.sku || "").toLowerCase().includes(query) ||
          (product.barcode || "").toLowerCase().includes(query);
        const matchesCategory =
          categoryFilter === "all" ||
          product.category_id?.toString() === categoryFilter;
        const matchesBrand =
          brandFilter === "all" || product.brand === brandFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && product.active) ||
          (statusFilter === "inactive" && !product.active);
        const matchesBadge =
          badgeFilter === "all" ||
          (badgeFilter === "hit" && product.is_hit) ||
          (badgeFilter === "new" && product.is_new);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesBrand &&
          matchesStatus &&
          matchesBadge
        );
      }),
    [
      badgeFilter,
      brandFilter,
      categoryFilter,
      products,
      search,
      statusFilter,
    ]
  );

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20";
  const sectionTitleClass =
    "border-b border-gray-100 pb-3 text-sm font-bold uppercase tracking-[0.16em] text-gray-500";

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-2xl px-5 py-4 text-sm font-semibold shadow-2xl ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}

      {repairingSchema && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-700">
          Applying schema repair automatically…
        </div>
      )}

      {schemaRepairSql && !repairingSchema && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">
            Schema migration needed
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Open{" "}
            <strong>Supabase Dashboard → SQL Editor</strong>, paste the SQL
            below, and click <strong>Run</strong>. Products still load — usage
            and ingredients fields will be saved after the migration.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-amber-100 p-3 text-xs text-amber-900">
            {schemaRepairSql}
          </pre>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(schemaRepairSql)}
              className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-50"
            >
              Copy SQL
            </button>
            <button
              type="button"
              onClick={() => void repairSchema()}
              className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-50"
            >
              Retry auto-repair
            </button>
            <button
              type="button"
              onClick={() => setSchemaRepairSql(null)}
              className="rounded-xl border border-amber-200 px-4 py-2 text-xs text-amber-600 transition hover:bg-amber-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="rounded-[28px] border border-white bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B96C5C]">
              MIO Beauty admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">
              Products
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage product content, prices, stock, images and translation fields.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreateProduct}
              className="rounded-full bg-[#EEA391] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#EEA391]/25 transition hover:bg-[#df8f7c]"
            >
              + Add product
            </button>
            <Link
              href="/admin/products/import-images"
              className="rounded-full border border-[#EEA391]/40 bg-white px-5 py-3 text-sm font-bold text-[#B96C5C] transition hover:border-[#EEA391] hover:bg-[#EEA391]/10"
            >
              Import images
            </Link>
            <button
              type="button"
              onClick={() => void exportProducts()}
              className="rounded-full border border-[#EEA391]/40 bg-white px-5 py-3 text-sm font-bold text-[#B96C5C] transition hover:border-[#EEA391] hover:bg-[#EEA391]/10"
            >
              Export XLSX
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              className="rounded-full border border-gray-200 bg-gray-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? "Importing..." : "Import products"}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleImportChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-white bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-500">
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-bold text-gray-950">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {importSummary && (
        <div
          className={`rounded-2xl border p-4 text-sm shadow-sm ${
            importSummary.errors.length
              ? "border-yellow-200 bg-yellow-50 text-yellow-900"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          <p className="font-semibold">
            Import result: {importSummary.totalRows} total rows,{" "}
            {importSummary.updatedRows} updated,{" "}
            {importSummary.createdRows} created,{" "}
            {importSummary.skippedRows} skipped.
          </p>
          {importSummary.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="font-semibold">Rows with errors:</p>
              {importSummary.errors.slice(0, 10).map((error) => (
                <p key={`${error.row}-${error.message}`}>
                  Row {error.row}: {error.message}
                </p>
              ))}
              {importSummary.errors.length > 10 && (
                <p>
                  +{importSummary.errors.length - 10} more errors.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <section className="rounded-[28px] border border-white bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[1.4fr_repeat(4,minmax(150px,1fr))]">
          <input
            type="search"
            placeholder="Search by name, SKU or barcode..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClass}
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={brandFilter}
            onChange={(event) => setBrandFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">All brands</option>
            {brandOptions.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={badgeFilter}
            onChange={(event) => setBadgeFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">All labels</option>
            <option value="hit">Hit</option>
            <option value="new">New</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-950">Product list</h2>
            <p className="text-sm text-gray-500">
              Showing {filteredProducts.length} of {products.length} products
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="sticky top-0 z-10 bg-[#fff8f6] text-xs uppercase tracking-[0.14em] text-gray-500">
              <tr>
                <th className="px-5 py-4 text-left">Product</th>
                <th className="px-5 py-4 text-left">SKU</th>
                <th className="px-5 py-4 text-left">Category</th>
                <th className="px-5 py-4 text-left">Price</th>
                <th className="px-5 py-4 text-left">Stock</th>
                <th className="px-5 py-4 text-left">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {pageLoading ? (
                Array.from({ length: 6 }, (_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td colSpan={7} className="px-5 py-5">
                      <div className="h-12 rounded-2xl bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="align-middle transition hover:bg-[#fffaf8]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-[#fff8f6]">
                          {product.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image}
                              alt={getProductDisplayName(product)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold tracking-[0.2em] text-[#B96C5C]">
                              MIO
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-xs truncate font-bold text-gray-950">
                            {getProductDisplayName(product)}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {product.brand || "No brand"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {product.is_new && (
                              <span className="rounded-full bg-[#EEA391]/15 px-2.5 py-1 text-[11px] font-bold text-[#B96C5C]">
                                NEW
                              </span>
                            )}
                            {product.is_hit && (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                HIT
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-600">
                      {product.sku || "-"}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {categoryById[product.category_id || 0] || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-950">
                        {product.price ?? 0}
                      </p>
                      {product.old_price ? (
                        <p className="mt-1 text-xs text-gray-400 line-through">
                          {product.old_price}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          (product.stock ?? 0) > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {product.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          product.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {product.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => editProduct(product)}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toggleProduct(product.id, product.active)
                          }
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-950 hover:text-gray-950"
                        >
                          {product.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(product.id)}
                          className="rounded-xl border border-red-100 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <p className="text-lg font-bold text-gray-950">
                      {products.length === 0
                        ? "No products yet"
                        : "No products match your filters"}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      {products.length === 0
                        ? "Add the first product to start building the catalog."
                        : "Try changing search or filter values."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {drawerOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close product form"
            onClick={resetForm}
            className="absolute inset-0 bg-gray-950/35 backdrop-blur-sm"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B96C5C]">
                  Product editor
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950">
                  {editingId ? "Edit product" : "Add product"}
                </h2>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
              <section className="space-y-4">
                <h3 className={sectionTitleClass}>1. Basic information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Russian product name
                    </span>
                    <input
                      type="text"
                      value={form.nameRu}
                      onChange={(event) =>
                        updateForm("nameRu", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Uzbek product name
                    </span>
                    <input
                      type="text"
                      value={form.nameUz}
                      onChange={(event) =>
                        updateForm("nameUz", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Brand
                    </span>
                    <input
                      type="text"
                      value={form.brand}
                      onChange={(event) =>
                        updateForm("brand", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Category
                    </span>
                    <select
                      value={form.categoryId}
                      onChange={(event) =>
                        updateForm("categoryId", event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">Tanlang</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className={sectionTitleClass}>2. Image</h3>
                <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                  <div className="flex min-h-52 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#EEA391]/60 bg-[#fff8f6]">
                    {imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreview}
                        alt={form.nameRu || form.nameUz || "Mahsulot rasmi"}
                        className="h-full max-h-72 w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[#B96C5C]">
                        Rasm tanlanmagan
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#EEA391] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                    />
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          if (imagePreview.startsWith("blob:")) {
                            URL.revokeObjectURL(imagePreview);
                          }
                          setImageFile(null);
                          setImagePreview("");
                          updateForm("image", "");
                        }}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className={sectionTitleClass}>3. Price and stock</h3>
                <div className="grid gap-4 sm:grid-cols-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Price
                    </span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(event) =>
                        updateForm("price", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Old price
                    </span>
                    <input
                      type="number"
                      value={form.oldPrice}
                      onChange={(event) =>
                        updateForm("oldPrice", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Stock
                    </span>
                    <input
                      type="number"
                      value={form.stock}
                      onChange={(event) =>
                        updateForm("stock", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Sort
                    </span>
                    <input
                      type="number"
                      value={form.sortOrder}
                      onChange={(event) =>
                        updateForm("sortOrder", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className={sectionTitleClass}>4. SKU / barcode / weight / volume</h3>
                <div className="grid gap-4 sm:grid-cols-4">
                  {[
                    ["SKU", "sku"],
                    ["Barcode", "barcode"],
                    ["Weight", "weight"],
                    ["Volume", "volume"],
                  ].map(([label, field]) => (
                    <label key={field} className="block">
                      <span className="mb-1 block text-sm font-semibold text-gray-700">
                        {label}
                      </span>
                      <input
                        type="text"
                        value={form[field as keyof ProductForm] as string}
                        onChange={(event) =>
                          updateForm(
                            field as keyof ProductForm,
                            event.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className={sectionTitleClass}>5. RU/UZ descriptions</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Russian description
                    </span>
                    <textarea
                      value={form.descriptionRu}
                      onChange={(event) =>
                        updateForm("descriptionRu", event.target.value)
                      }
                      rows={5}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Uzbek description
                    </span>
                    <textarea
                      value={form.descriptionUz}
                      onChange={(event) =>
                        updateForm("descriptionUz", event.target.value)
                      }
                      rows={5}
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className={sectionTitleClass}>6. Usage and ingredients</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Usage RU", "usageRu"],
                    ["Usage UZ", "usageUz"],
                    ["Ingredients RU", "ingredientsRu"],
                    ["Ingredients UZ", "ingredientsUz"],
                  ].map(([label, field]) => (
                    <label key={field} className="block">
                      <span className="mb-1 block text-sm font-semibold text-gray-700">
                        {label}
                      </span>
                      <textarea
                        value={form[field as keyof ProductForm] as string}
                        onChange={(event) =>
                          updateForm(
                            field as keyof ProductForm,
                            event.target.value
                          )
                        }
                        rows={4}
                        className={inputClass}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className={sectionTitleClass}>7. RU/UZ SEO</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Russian SEO title
                    </span>
                    <input
                      type="text"
                      value={form.seoTitleRu}
                      onChange={(event) =>
                        updateForm("seoTitleRu", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Uzbek SEO title
                    </span>
                    <input
                      type="text"
                      value={form.seoTitleUz}
                      onChange={(event) =>
                        updateForm("seoTitleUz", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Russian SEO description
                    </span>
                    <textarea
                      value={form.seoDescriptionRu}
                      onChange={(event) =>
                        updateForm("seoDescriptionRu", event.target.value)
                      }
                      rows={3}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Uzbek SEO description
                    </span>
                    <textarea
                      value={form.seoDescriptionUz}
                      onChange={(event) =>
                        updateForm("seoDescriptionUz", event.target.value)
                      }
                      rows={3}
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className={sectionTitleClass}>7. Status flags</h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.isNew}
                      onChange={(event) =>
                        updateForm("isNew", event.target.checked)
                      }
                      className="h-4 w-4 accent-[#EEA391]"
                    />
                    New product
                  </label>
                  <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.isHit}
                      onChange={(event) =>
                        updateForm("isHit", event.target.checked)
                      }
                      className="h-4 w-4 accent-[#EEA391]"
                    />
                    Hit product
                  </label>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProduct}
                disabled={loading}
                className="rounded-xl bg-[#EEA391] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#EEA391]/25 transition hover:bg-[#df8f7c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Saving..."
                  : editingId
                    ? "Update product"
                    : "Create product"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
