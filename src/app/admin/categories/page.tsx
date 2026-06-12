"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Category = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  image: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number | null;
};

type CategoryForm = {
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  sortOrder: string;
  imageUrl: string;
};

const initialForm: CategoryForm = {
  name: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  sortOrder: "0",
  imageUrl: "",
};

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getPublicImageUrl(path: string) {
  const { data } = supabase.storage
    .from("categories")
    .getPublicUrl(path);

  return data.publicUrl;
}

function getStoragePathFromImageUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const marker = "/categories/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(
      url.pathname.slice(markerIndex + marker.length)
    );
  } catch {
    const fileName = imageUrl.split("/").pop();

    return fileName ? `category-images/${fileName}` : null;
  }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setPageLoading(true);

    const { data, error } = await supabase
      .from("categories")
      .select(
        "id,name,slug,image,description,parent_id,sort_order,active,seo_title,seo_description"
      )
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      setLoadError(error.message);
      setPageLoading(false);
      return;
    }

    setCategories((data || []) as Category[]);
    setPageLoading(false);
  }

  function updateForm(
    field: keyof CategoryForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  }

  function resetForm() {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setForm(initialForm);
    setEditingId(null);
    setImageFile(null);
    setImagePreview("");
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Faqat rasm faylini yuklang");
      return;
    }

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(oldImageUrl: string | null) {
    if (!imageFile) return form.imageUrl || null;

    const oldImagePath = getStoragePathFromImageUrl(oldImageUrl);

    if (oldImagePath) {
      const { error } = await supabase.storage
        .from("categories")
        .remove([oldImagePath]);

      if (error) {
        throw new Error(error.message);
      }
    }

    const extension = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const filePath = `category-images/${fileName}`;

    const { error } = await supabase.storage
      .from("categories")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    return getPublicImageUrl(filePath);
  }

  async function saveCategory() {
    if (!form.name.trim()) {
      showToast("error", "Kategoriya nomini kiriting");
      return;
    }

    setLoading(true);

    try {
      const currentCategory = categories.find(
        (category) => category.id === editingId
      );
      const currentImageUrl = currentCategory?.image || null;
      const imageUrl = await uploadImage(
        editingId && imageFile ? currentImageUrl : null
      );
      const slug = createSlug(form.name);
      const sortOrder = Number.parseInt(form.sortOrder, 10);
      const payload = {
        name: form.name.trim(),
        slug,
        image: imageUrl,
        description: form.description.trim() || null,
        seo_title: form.seoTitle.trim() || null,
        seo_description: form.seoDescription.trim() || null,
        sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
      };

      const { error } = editingId
        ? await supabase
            .from("categories")
            .update(payload)
            .eq("id", editingId)
        : await supabase.from("categories").insert([
            {
              ...payload,
              active: true,
            },
          ]);

      if (error) {
        showToast("error", error.message);
        setLoading(false);
        return;
      }

      resetForm();
      await loadCategories();
    } catch (error) {
      showToast("error",
        error instanceof Error ? error.message : "Rasm yuklashda xatolik yuz berdi"
      );
    } finally {
      setLoading(false);
    }
  }

  function editCategory(category: Category) {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setEditingId(category.id);
    setForm({
      name: category.name || "",
      description: category.description || "",
      seoTitle: category.seo_title || "",
      seoDescription: category.seo_description || "",
      sortOrder: String(category.sort_order ?? 0),
      imageUrl: category.image || "",
    });
    setImageFile(null);
    setImagePreview(category.image || "");
  }

  async function deleteCategory(id: number) {
    const confirmDelete = window.confirm(
      "Kategoriyani o'chirishni tasdiqlaysizmi?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    await loadCategories();
  }

  async function toggleCategory(id: number, current: boolean) {
    const { error } = await supabase
      .from("categories")
      .update({
        active: !current,
      })
      .eq("id", id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    await loadCategories();
  }

  const filteredCategories = useMemo(
    () =>
      categories.filter((item) => {
        const query = search.toLowerCase();

        return (
          item.name.toLowerCase().includes(query) ||
          item.slug.toLowerCase().includes(query) ||
          (item.description || "").toLowerCase().includes(query)
        );
      }),
    [categories, search]
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed right-5 top-5 z-50 rounded-2xl px-5 py-4 text-sm font-semibold shadow-2xl ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.text}
        </div>
      )}

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <strong>Error loading categories:</strong> {loadError}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#EEA391]">
            MIO Beauty admin
          </p>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Kategoriyalar
          </h1>
        </div>

        <div className="rounded-full bg-[#EEA391]/15 px-4 py-2 text-sm font-semibold text-[#B96C5C]">
          {filteredCategories.length} ta kategoriya
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-[#EEA391]/25 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}
            </h2>
            <p className="text-sm text-gray-500">
              Rasm, tavsif va SEO ma&apos;lumotlarini bir joyda boshqaring.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Kategoriya nomi
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  updateForm("name", event.target.value)
                }
                placeholder="Masalan: Soch parvarishi"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Rasm
              </span>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex aspect-[4/3] min-h-36 flex-1 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#EEA391]/60 bg-[#EEA391]/10">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt={form.name || "Kategoriya rasmi"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-4 text-center text-sm text-[#B96C5C]">
                      Rasm tanlanmagan
                    </span>
                  )}
                </div>

                <div className="flex min-w-40 flex-col justify-between gap-3">
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
                        updateForm("imageUrl", "");
                      }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
                    >
                      Rasmni olib tashlash
                    </button>
                  )}
                </div>
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Tavsif
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                rows={4}
                placeholder="Kategoriya haqida qisqa ma'lumot"
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  SEO title
                </span>
                <input
                  type="text"
                  value={form.seoTitle}
                  onChange={(event) =>
                    updateForm("seoTitle", event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Tartib raqami
                </span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    updateForm("sortOrder", event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                SEO description
              </span>
              <textarea
                value={form.seoDescription}
                onChange={(event) =>
                  updateForm("seoDescription", event.target.value)
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={saveCategory}
                disabled={loading}
                className="rounded-xl bg-[#EEA391] px-5 py-3 font-semibold text-white transition hover:bg-[#df8f7c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Saqlanmoqda..."
                  : editingId
                    ? "Yangilash"
                    : "Qo'shish"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-600 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
                >
                  Bekor qilish
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
            <input
              type="text"
              placeholder="Kategoriya qidirish..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-[#EEA391]/10 text-sm text-gray-700">
                  <tr>
                    <th className="p-4 text-left">Rasm</th>
                    <th className="p-4 text-left">Nomi</th>
                    <th className="p-4 text-left">Slug</th>
                    <th className="p-4 text-left">Tartib</th>
                    <th className="p-4 text-left">Holati</th>
                    <th className="p-4 text-left">Amallar</th>
                  </tr>
                </thead>

                <tbody>
                  {pageLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-gray-500"
                      >
                        Yuklanmoqda...
                      </td>
                    </tr>
                  ) : filteredCategories.length > 0 ? (
                    filteredCategories.map((category) => (
                      <tr
                        key={category.id}
                        className="border-t border-gray-100 align-top"
                      >
                        <td className="p-4">
                          <div className="w-14 h-14 overflow-hidden rounded-lg border bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={category.image || ""}
                              alt={category.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>

                        <td className="max-w-64 p-4">
                          <p className="font-semibold text-gray-900">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                              {category.description}
                            </p>
                          )}
                        </td>

                        <td className="p-4 text-sm text-gray-600">
                          {category.slug}
                        </td>

                        <td className="p-4 text-sm font-medium text-gray-700">
                          {category.sort_order ?? 0}
                        </td>

                        <td className="p-4">
                          {category.active ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                              Aktiv
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                              Nofaol
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => editCategory(category)}
                              className="rounded-lg bg-[#EEA391] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#df8f7c]"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleCategory(
                                  category.id,
                                  category.active
                                )
                              }
                              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
                            >
                              {category.active ? "Disable" : "Enable"}
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteCategory(category.id)}
                              className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-gray-500"
                      >
                        Kategoriyalar topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
