"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Banner = {
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

type BannerForm = {
  title: string;
  titleRu: string;
  titleUz: string;
  subtitle: string;
  subtitleRu: string;
  subtitleUz: string;
  buttonText: string;
  buttonTextRu: string;
  buttonTextUz: string;
  image: string;
  mobileImage: string;
  link: string;
  sortOrder: string;
};

const initialForm: BannerForm = {
  title: "",
  titleRu: "",
  titleUz: "",
  subtitle: "",
  subtitleRu: "",
  subtitleUz: "",
  buttonText: "",
  buttonTextRu: "",
  buttonTextUz: "",
  image: "",
  mobileImage: "",
  link: "",
  sortOrder: "0",
};

function getPublicImageUrl(path: string) {
  const { data } = supabase.storage
    .from("banners")
    .getPublicUrl(path);

  return data.publicUrl;
}

function getStoragePathFromImageUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const marker = "/banners/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(
      url.pathname.slice(markerIndex + marker.length)
    );
  } catch {
    return imageUrl.split("/").pop() || null;
  }
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState<BannerForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState("");
  const [mobilePreview, setMobilePreview] = useState("");

  useEffect(() => {
    loadBanners();
  }, []);

  async function loadBanners() {
    setPageLoading(true);

      const { data, error } = await supabase
        .from("banners")
        .select(
          "id,title,title_ru,title_uz,subtitle,subtitle_ru,subtitle_uz,button_text,button_text_ru,button_text_uz,image,mobile_image,link,sort_order,active,created_at,updated_at"
        )
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      setPageLoading(false);
      return;
    }

    setBanners((data || []) as Banner[]);
    setPageLoading(false);
  }

  function updateForm(field: keyof BannerForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function revokeBlob(url: string) {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }

  function resetForm() {
    revokeBlob(desktopPreview);
    revokeBlob(mobilePreview);
    setForm(initialForm);
    setEditingId(null);
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview("");
    setMobilePreview("");
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
    type: "desktop" | "mobile"
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Faqat rasm faylini yuklang");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (type === "desktop") {
      revokeBlob(desktopPreview);
      setDesktopFile(file);
      setDesktopPreview(previewUrl);
    } else {
      revokeBlob(mobilePreview);
      setMobileFile(file);
      setMobilePreview(previewUrl);
    }
  }

  async function replaceImage(
    file: File | null,
    currentUrl: string | null,
    folder: "desktop" | "mobile"
  ) {
    if (!file) return currentUrl;

    const oldPath = getStoragePathFromImageUrl(currentUrl);

    if (oldPath) {
      const { error } = await supabase.storage
        .from("banners")
        .remove([oldPath]);

      if (error) {
        console.error(
          folder === "desktop"
            ? "Desktop upload error:"
            : "Mobile upload error:",
          error
        );
        throw new Error(error.message);
      }
    }

    const extension = file.name.split(".").pop() || "jpg";
    const filePath = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("banners")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error(
        folder === "desktop"
          ? "Desktop upload error:"
          : "Mobile upload error:",
        error
      );
      throw new Error(error.message);
    }

    return getPublicImageUrl(filePath);
  }

  async function saveBanner() {
    if (
      !form.title.trim() &&
      !form.titleRu.trim() &&
      !form.titleUz.trim()
    ) {
      alert("Banner nomini kiriting");
      return;
    }

    setLoading(true);

    try {
      const currentBanner = banners.find(
        (banner) => banner.id === editingId
      );
      const sortOrder = Number.parseInt(form.sortOrder, 10);
      const image = await replaceImage(
        desktopFile,
        currentBanner?.image || form.image || null,
        "desktop"
      );
      const mobileImage = await replaceImage(
        mobileFile,
        currentBanner?.mobile_image || form.mobileImage || null,
        "mobile"
      );
      const payload = {
        title:
          form.title.trim() ||
          form.titleRu.trim() ||
          form.titleUz.trim(),
        title_ru: form.titleRu.trim() || null,
        title_uz: form.titleUz.trim() || null,
        subtitle:
          form.subtitle.trim() || form.subtitleRu.trim() || null,
        subtitle_ru: form.subtitleRu.trim() || null,
        subtitle_uz: form.subtitleUz.trim() || null,
        button_text:
          form.buttonText.trim() || form.buttonTextRu.trim() || null,
        button_text_ru: form.buttonTextRu.trim() || null,
        button_text_uz: form.buttonTextUz.trim() || null,
        image,
        mobile_image: mobileImage,
        link: form.link.trim() || null,
        sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
      };

      const { error } = editingId
        ? await supabase
            .from("banners")
            .update(payload)
            .eq("id", editingId)
        : await supabase.from("banners").insert([
            {
              ...payload,
              active: true,
            },
          ]);

      if (error) {
        console.error("Banner insert error:", error);
        alert(error.message);
        setLoading(false);
        return;
      }

      resetForm();
      await loadBanners();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Banner rasmini yuklashda xatolik yuz berdi"
      );
    } finally {
      setLoading(false);
    }
  }

  function editBanner(banner: Banner) {
    revokeBlob(desktopPreview);
    revokeBlob(mobilePreview);
    setEditingId(banner.id);
    setForm({
      title: banner.title || "",
      titleRu: banner.title_ru || "",
      titleUz: banner.title_uz || "",
      subtitle: banner.subtitle || "",
      subtitleRu: banner.subtitle_ru || "",
      subtitleUz: banner.subtitle_uz || "",
      buttonText: banner.button_text || "",
      buttonTextRu: banner.button_text_ru || "",
      buttonTextUz: banner.button_text_uz || "",
      image: banner.image || "",
      mobileImage: banner.mobile_image || "",
      link: banner.link || "",
      sortOrder: String(banner.sort_order ?? 0),
    });
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview(banner.image || "");
    setMobilePreview(banner.mobile_image || "");
  }

  async function deleteBanner(id: number) {
    const confirmDelete = window.confirm(
      "Bannerni o'chirishni tasdiqlaysizmi?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("banners")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadBanners();
  }

  async function toggleBanner(id: number, current: boolean) {
    const { error } = await supabase
      .from("banners")
      .update({ active: !current })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadBanners();
  }

  const activeCount = useMemo(
    () => banners.filter((banner) => banner.active).length,
    [banners]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#EEA391]">
            MIO Beauty admin
          </p>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Bannerlar
          </h1>
        </div>

        <div className="rounded-full bg-[#EEA391]/15 px-4 py-2 text-sm font-semibold text-[#B96C5C]">
          {activeCount} ta aktiv banner
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-[#EEA391]/25 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Bannerni tahrirlash" : "Yangi banner"}
            </h2>
            <p className="text-sm text-gray-500">
              Desktop va mobile rasmlarni existing banners jadvaliga saqlang.
            </p>
          </div>

          <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Title
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  updateForm("title", event.target.value)
                }
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Russian title
                  </span>
                  <input
                    type="text"
                    value={form.titleRu}
                    onChange={(event) =>
                      updateForm("titleRu", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Uzbek title
                  </span>
                  <input
                    type="text"
                    value={form.titleUz}
                    onChange={(event) =>
                      updateForm("titleUz", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Subtitle
              </span>
              <textarea
                value={form.subtitle}
                onChange={(event) =>
                  updateForm("subtitle", event.target.value)
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Russian subtitle
                  </span>
                  <textarea
                    value={form.subtitleRu}
                    onChange={(event) =>
                      updateForm("subtitleRu", event.target.value)
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Uzbek subtitle
                  </span>
                  <textarea
                    value={form.subtitleUz}
                    onChange={(event) =>
                      updateForm("subtitleUz", event.target.value)
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Button Text
              </span>
              <input
                type="text"
                value={form.buttonText}
                onChange={(event) =>
                  updateForm("buttonText", event.target.value)
                }
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Russian button text
                  </span>
                  <input
                    type="text"
                    value={form.buttonTextRu}
                    onChange={(event) =>
                      updateForm("buttonTextRu", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Uzbek button text
                  </span>
                  <input
                    type="text"
                    value={form.buttonTextUz}
                    onChange={(event) =>
                      updateForm("buttonTextUz", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                  />
                </label>
              </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ImageInput
                label="Desktop image"
                preview={desktopPreview}
                onChange={(event) =>
                  handleImageChange(event, "desktop")
                }
              />
              <ImageInput
                label="Mobile image"
                preview={mobilePreview}
                onChange={(event) =>
                  handleImageChange(event, "mobile")
                }
              />
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Link
              </span>
              <input
                type="text"
                value={form.link}
                onChange={(event) =>
                  updateForm("link", event.target.value)
                }
                placeholder="/category/mio-beauty"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Sort order
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={saveBanner}
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

        <section className="grid gap-5 md:grid-cols-2">
          {pageLoading ? (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm md:col-span-2">
              Yuklanmoqda...
            </div>
          ) : banners.length > 0 ? (
            banners.map((banner) => (
              <div
                key={banner.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="h-48 bg-[#EEA391]/10">
                  {banner.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#B96C5C]">
                      Desktop rasm yo&apos;q
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {banner.title}
                      </h3>
                      {banner.subtitle && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                          {banner.subtitle}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        Sort: {banner.sort_order ?? 0}
                      </p>
                    </div>

                    {banner.active ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                        Aktiv
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                        Nofaol
                      </span>
                    )}
                  </div>

                  <p className="truncate text-sm text-gray-500">
                    {banner.link ? banner.link : <>Link yo&apos;q</>}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => editBanner(banner)}
                      className="rounded-lg bg-[#EEA391] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#df8f7c]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        toggleBanner(banner.id, banner.active)
                      }
                      className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
                    >
                      {banner.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBanner(banner.id)}
                      className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm md:col-span-2">
              Bannerlar topilmadi
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ImageInput({
  label,
  preview,
  onChange,
}: {
  label: string;
  preview: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      <div className="mb-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#EEA391]/60 bg-[#EEA391]/10">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-4 text-center text-sm text-[#B96C5C]">
            Rasm tanlanmagan
          </span>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#EEA391] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
    </label>
  );
}
