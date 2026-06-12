"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Banner = {
  id: number;
  image: string | null;
  mobile_image: string | null;
  link: string | null;
  sort_order: number | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

type BannerForm = {
  image: string;
  mobileImage: string;
  link: string;
  sortOrder: string;
};

const initialForm: BannerForm = {
  image: "",
  mobileImage: "",
  link: "",
  sortOrder: "0",
};

function getPublicImageUrl(path: string) {
  const { data } = supabase.storage.from("banners").getPublicUrl(path);

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
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
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
      .select("id,image,mobile_image,link,sort_order,active,created_at,updated_at")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: false });

    if (error) {
      showToast("error", error.message);
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

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
    type: "desktop" | "mobile"
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Faqat rasm faylini yuklang");
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
      throw new Error(error.message);
    }

    return getPublicImageUrl(filePath);
  }

  async function saveBanner() {
    if (!desktopFile && !form.image && !mobileFile && !form.mobileImage) {
      showToast("error", "Kamida bitta banner rasmini yuklang");
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
              title: "MIO Beauty banner",
              active: true,
            },
          ]);

      if (error) {
        showToast("error", error.message);
        setLoading(false);
        return;
      }

      resetForm();
      await loadBanners();
    } catch (error) {
      showToast(
        "error",
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
      showToast("error", error.message);
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
      showToast("error", error.message);
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
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 max-w-sm rounded-2xl px-5 py-4 text-sm font-medium text-white shadow-xl transition-all ${
            toast.type === "error" ? "bg-red-500" : "bg-green-500"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="rounded-[28px] border border-[#EEA391]/20 bg-[linear-gradient(135deg,#fffaf7,#ffffff)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B96C5C]">
              Hero slider
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-950 sm:text-3xl">
              Banner management
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Upload image-only hero slides. Text is now fixed on the
              homepage, so banners only control visuals and optional
              destinations.
            </p>
          </div>

          <div className="rounded-full bg-[#EEA391]/15 px-4 py-2 text-sm font-semibold text-[#B96C5C]">
            {activeCount} active / {banners.length} total
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-[28px] border border-[#EEA391]/20 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-950">
              {editingId ? "Edit banner" : "New banner"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Add a desktop image, optional mobile image, and destination
              link.
            </p>
          </div>

          <div className="space-y-5">
            <ImageInput
              label="Desktop image"
              hint="Recommended wide hero image"
              preview={desktopPreview}
              onChange={(event) => handleImageChange(event, "desktop")}
            />

            <ImageInput
              label="Mobile image"
              hint="Optional portrait crop for phones"
              preview={mobilePreview}
              onChange={(event) => handleImageChange(event, "mobile")}
            />

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
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
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
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={saveBanner}
                disabled={loading}
                className="rounded-2xl bg-[#EEA391] px-5 py-3 font-semibold text-white shadow-[0_14px_30px_rgba(238,163,145,0.28)] transition hover:bg-[#df8f7c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Saving..."
                  : editingId
                    ? "Update banner"
                    : "Create banner"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-gray-200 px-5 py-3 font-semibold text-gray-600 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="grid content-start gap-5 md:grid-cols-2">
          {pageLoading ? (
            <div className="rounded-[28px] bg-white p-8 text-center text-gray-500 shadow-sm md:col-span-2">
              Loading banners...
            </div>
          ) : banners.length > 0 ? (
            banners.map((banner) => (
              <BannerCard
                key={banner.id}
                banner={banner}
                onEdit={editBanner}
                onDelete={deleteBanner}
                onToggle={toggleBanner}
              />
            ))
          ) : (
            <div className="rounded-[28px] bg-white p-8 text-center text-gray-500 shadow-sm md:col-span-2">
              No banners found
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BannerCard({
  banner,
  onEdit,
  onDelete,
  onToggle,
}: {
  banner: Banner;
  onEdit: (banner: Banner) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, current: boolean) => void;
}) {
  const previewImage = banner.image || banner.mobile_image;

  return (
    <div className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm">
      <div className="relative aspect-[16/9] bg-[#EEA391]/10">
        {previewImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewImage}
            alt="Hero banner preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#B96C5C]">
            No image uploaded
          </div>
        )}
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
            Sort {banner.sort_order ?? 0}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
              banner.active
                ? "bg-green-100/90 text-green-700"
                : "bg-red-100/90 text-red-700"
            }`}
          >
            {banner.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 text-sm text-gray-500 sm:grid-cols-2">
          <ImageStatus label="Desktop" available={Boolean(banner.image)} />
          <ImageStatus
            label="Mobile"
            available={Boolean(banner.mobile_image)}
          />
        </div>

        <p className="truncate rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {banner.link || "No destination link"}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEdit(banner)}
            className="rounded-xl bg-[#EEA391] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#df8f7c]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onToggle(banner.id, banner.active)}
            className="rounded-xl bg-gray-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
          >
            {banner.active ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(banner.id)}
            className="rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageStatus({
  label,
  available,
}: {
  label: string;
  available: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold ${
          available ? "text-green-700" : "text-gray-400"
        }`}
      >
        {available ? "Uploaded" : "Missing"}
      </p>
    </div>
  );
}

function ImageInput({
  label,
  hint,
  preview,
  onChange,
}: {
  label: string;
  hint: string;
  preview: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      <span className="mb-2 block text-xs text-gray-400">{hint}</span>
      <div className="mb-3 flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#EEA391]/60 bg-[#EEA391]/10">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-4 text-center text-sm text-[#B96C5C]">
            No image selected
          </span>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={onChange}
        className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-[#EEA391] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
    </label>
  );
}
