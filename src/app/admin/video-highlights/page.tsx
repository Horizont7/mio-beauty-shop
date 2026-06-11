"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { VideoHighlight } from "@/lib/video-highlights";

type HighlightForm = {
  title: string;
  titleRu: string;
  titleUz: string;
  sortOrder: string;
  coverImage: string;
  videoUrl: string;
};

type ToastMessage = {
  type: "success" | "error";
  text: string;
};

const coverBucket = "video-highlight-covers";
const videoBucket = "video-highlight-videos";
const initialForm: HighlightForm = {
  title: "",
  titleRu: "",
  titleUz: "",
  sortOrder: "0",
  coverImage: "",
  videoUrl: "",
};

function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}

function getStoragePathFromUrl(url: string | null, bucket: string) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = `/${bucket}/`;
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function revokeBlob(url: string) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function statusClass(active: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-700"
    : "bg-gray-100 text-gray-600";
}

export default function VideoHighlightsAdminPage() {
  const [highlights, setHighlights] = useState<VideoHighlight[]>([]);
  const [form, setForm] = useState<HighlightForm>(initialForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const activeCount = useMemo(
    () => highlights.filter((highlight) => highlight.active).length,
    [highlights]
  );

  const showToast = useCallback((type: ToastMessage["type"], text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadHighlights = useCallback(async () => {
    const { data, error } = await supabase
      .from("video_highlights")
      .select("id,title,title_ru,title_uz,cover_image,video_url,sort_order,active,created_at,updated_at")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: false });

    if (error) {
      showToast("error", error.message);
      setHighlights([]);
      setPageLoading(false);
      return;
    }

    setHighlights((data || []) as VideoHighlight[]);
    setPageLoading(false);
  }, [showToast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHighlights();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadHighlights]);

  function updateForm(field: keyof HighlightForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    revokeBlob(coverPreview);
    revokeBlob(videoPreview);
    setForm(initialForm);
    setCoverFile(null);
    setVideoFile(null);
    setCoverPreview("");
    setVideoPreview("");
    setEditingId(null);
    setDrawerOpen(false);
  }

  function openCreate() {
    resetForm();
    setDrawerOpen(true);
  }

  function openEdit(highlight: VideoHighlight) {
    revokeBlob(coverPreview);
    revokeBlob(videoPreview);
    setEditingId(highlight.id);
    setForm({
      title: highlight.title,
      titleRu: highlight.title_ru || "",
      titleUz: highlight.title_uz || "",
      sortOrder: String(highlight.sort_order ?? 0),
      coverImage: highlight.cover_image || "",
      videoUrl: highlight.video_url || "",
    });
    setCoverFile(null);
    setVideoFile(null);
    setCoverPreview(highlight.cover_image || "");
    setVideoPreview(highlight.video_url || "");
    setDrawerOpen(true);
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Upload an image file for the cover.");
      return;
    }

    revokeBlob(coverPreview);
    const preview = URL.createObjectURL(file);
    setCoverFile(file);
    setCoverPreview(preview);
  }

  function handleVideoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      showToast("error", "Upload a video file.");
      return;
    }

    revokeBlob(videoPreview);
    const preview = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreview(preview);
  }

  async function replaceFile({
    file,
    currentUrl,
    bucket,
    folder,
  }: {
    file: File | null;
    currentUrl: string | null;
    bucket: string;
    folder: string;
  }) {
    if (!file) return currentUrl;

    const oldPath = getStoragePathFromUrl(currentUrl, bucket);
    if (oldPath) {
      const { error } = await supabase.storage.from(bucket).remove([oldPath]);
      if (error) throw new Error(error.message);
    }

    const extension = file.name.split(".").pop() || "bin";
    const filePath = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

    if (error) throw new Error(error.message);

    return getPublicUrl(bucket, filePath);
  }

  async function saveHighlight() {
    if (!form.title.trim() && !form.titleRu.trim() && !form.titleUz.trim()) {
      showToast("error", "Title RU or UZ is required.");
      return;
    }

    setSaving(true);

    try {
      const currentHighlight = highlights.find((item) => item.id === editingId);
      const sortOrder = Number.parseInt(form.sortOrder, 10);
      const coverImage = await replaceFile({
        file: coverFile,
        currentUrl: currentHighlight?.cover_image || form.coverImage || null,
        bucket: coverBucket,
        folder: "covers",
      });
      const videoUrl = await replaceFile({
        file: videoFile,
        currentUrl: currentHighlight?.video_url || form.videoUrl || null,
        bucket: videoBucket,
        folder: "videos",
      });
      const payload = {
        title:
          form.title.trim() ||
          form.titleRu.trim() ||
          form.titleUz.trim(),
        title_ru: form.titleRu.trim() || null,
        title_uz: form.titleUz.trim() || null,
        cover_image: coverImage,
        video_url: videoUrl,
        sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
      };
      const result = editingId
        ? await supabase
            .from("video_highlights")
            .update(payload)
            .eq("id", editingId)
        : await supabase.from("video_highlights").insert([
            {
              ...payload,
              active: true,
            },
          ]);

      if (result.error) {
        throw new Error(result.error.message);
      }

      showToast("success", editingId ? "Highlight updated." : "Highlight created.");
      resetForm();
      await loadHighlights();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Could not save highlight."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleHighlight(highlight: VideoHighlight) {
    const { error } = await supabase
      .from("video_highlights")
      .update({ active: !highlight.active })
      .eq("id", highlight.id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", highlight.active ? "Highlight disabled." : "Highlight enabled.");
    await loadHighlights();
  }

  async function deleteHighlight(highlight: VideoHighlight) {
    if (!window.confirm("Delete this video highlight?")) return;

    const { error } = await supabase
      .from("video_highlights")
      .delete()
      .eq("id", highlight.id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    const pathsToDelete = [
      {
        bucket: coverBucket,
        path: getStoragePathFromUrl(highlight.cover_image, coverBucket),
      },
      {
        bucket: videoBucket,
        path: getStoragePathFromUrl(highlight.video_url, videoBucket),
      },
    ].filter((item): item is { bucket: string; path: string } => Boolean(item.path));

    await Promise.all(
      pathsToDelete.map((item) =>
        supabase.storage.from(item.bucket).remove([item.path])
      )
    );

    showToast("success", "Highlight deleted.");
    await loadHighlights();
  }

  async function moveHighlight(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    const current = highlights[index];
    const target = highlights[targetIndex];

    if (!current || !target) return;

    const currentOrder = current.sort_order ?? index;
    const targetOrder = target.sort_order ?? targetIndex;
    const [currentResult, targetResult] = await Promise.all([
      supabase
        .from("video_highlights")
        .update({ sort_order: targetOrder })
        .eq("id", current.id),
      supabase
        .from("video_highlights")
        .update({ sort_order: currentOrder })
        .eq("id", target.id),
    ]);

    if (currentResult.error || targetResult.error) {
      showToast(
        "error",
        currentResult.error?.message ||
          targetResult.error?.message ||
          "Could not reorder highlights."
      );
      return;
    }

    await loadHighlights();
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-2xl ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}

      <section className="rounded-[28px] border border-white bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B96C5C]">
              MIO Beauty admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">
              Video Blog / Highlights
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Manage Instagram-style highlight videos displayed below the homepage hero.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-[#EEA391] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#EEA391]/25 transition hover:bg-[#df8f7c]"
          >
            Create Highlight
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total", highlights.length],
          ["Active", activeCount],
          ["Inactive", highlights.length - activeCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[24px] border border-white bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-950">Highlights list</h2>
          <p className="text-sm text-gray-500">
            Reorder with up/down controls. Storefront loads only active items.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[#fff8f6] text-xs uppercase tracking-[0.14em] text-gray-500">
              <tr>
                <th className="px-5 py-4 text-left">Preview</th>
                <th className="px-5 py-4 text-left">Title</th>
                <th className="px-5 py-4 text-left">Sort</th>
                <th className="px-5 py-4 text-left">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageLoading ? (
                Array.from({ length: 4 }, (_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td colSpan={5} className="px-5 py-5">
                      <div className="h-16 rounded-2xl bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : highlights.length > 0 ? (
                highlights.map((highlight, index) => (
                  <tr key={highlight.id} className="align-middle hover:bg-[#fffaf8]">
                    <td className="px-5 py-4">
                      <div className="h-16 w-16 overflow-hidden rounded-full border bg-[#fff8f6]">
                        {highlight.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={highlight.cover_image}
                            alt={highlight.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#B96C5C]">
                            MIO
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-950">{highlight.title}</p>
                      <p className="mt-1 max-w-md truncate text-xs text-gray-500">
                        {highlight.video_url || "No video uploaded"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {highlight.sort_order ?? 0}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                          highlight.active
                        )}`}
                      >
                        {highlight.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void moveHighlight(index, -1)}
                          disabled={index === 0}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#EEA391] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveHighlight(index, 1)}
                          disabled={index === highlights.length - 1}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#EEA391] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(highlight)}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleHighlight(highlight)}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-950 hover:text-gray-950"
                        >
                          {highlight.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteHighlight(highlight)}
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
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <p className="text-lg font-bold text-gray-950">
                      No video highlights yet
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      Create the first highlight to show it below the homepage hero.
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
            aria-label="Close highlight form"
            onClick={resetForm}
            className="absolute inset-0 bg-gray-950/35 backdrop-blur-sm"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B96C5C]">
                  Video Highlight
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950">
                  {editingId ? "Edit highlight" : "Create highlight"}
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

            <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">
                  Fallback title
                </span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">
                    Russian title
                  </span>
                  <input
                    type="text"
                    value={form.titleRu}
                    onChange={(event) =>
                      updateForm("titleRu", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">
                    Uzbek title
                  </span>
                  <input
                    type="text"
                    value={form.titleUz}
                    onChange={(event) =>
                      updateForm("titleUz", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">
                  Sort order
                </span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => updateForm("sortOrder", event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                />
              </label>

              <section className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">
                    Cover image
                  </span>
                  <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-[#EEA391]/60 bg-[#fff8f6]">
                    {coverPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverPreview}
                        alt={form.title || "Cover preview"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[#B96C5C]">
                        Cover preview
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#EEA391] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">
                    Video file
                  </span>
                  <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-[#EEA391]/60 bg-[#fff8f6]">
                    {videoPreview ? (
                      <video
                        src={videoPreview}
                        controls
                        muted
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[#B96C5C]">
                        Video preview
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#EEA391] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </label>
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
                onClick={() => void saveHighlight()}
                disabled={saving}
                className="rounded-xl bg-[#EEA391] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#EEA391]/25 transition hover:bg-[#df8f7c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save highlight"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
