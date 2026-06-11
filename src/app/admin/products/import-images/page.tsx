"use client";

import Link from "next/link";
import { DragEvent, useMemo, useState } from "react";
import {
  formatFileSize,
  getImageImportSku,
  isSupportedImportImage,
  optimizeImageForUpload,
} from "@/lib/image-optimization";
import { supabase } from "@/lib/supabase";

type ProductMatch = {
  id: number;
  sku: string | null;
  name_uz: string | null;
  name_ru: string | null;
  image: string | null;
};

type ImportStatus =
  | "queued"
  | "matched"
  | "not-matched"
  | "uploading"
  | "uploaded"
  | "failed";

type ImportItem = {
  id: string;
  file: File;
  sku: string;
  status: ImportStatus;
  progress: number;
  message: string;
  product?: ProductMatch;
  originalSize?: number;
  optimizedSize?: number;
  dimensions?: string;
};

const acceptedTypes = ".png,.jpg,.jpeg,.webp";

function getPublicImageUrl(path: string) {
  const { data } = supabase.storage.from("products").getPublicUrl(path);

  return data.publicUrl;
}

function itemLabel(item: ImportItem) {
  return item.product?.name_uz || item.product?.name_ru || item.sku || item.file.name;
}

export default function ProductImageImportPage() {
  const [items, setItems] = useState<ImportItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState("");

  const summary = useMemo(
    () => ({
      total: items.length,
      matched: items.filter((item) => item.status === "matched" || item.status === "uploaded").length,
      notMatched: items.filter((item) => item.status === "not-matched").length,
      uploaded: items.filter((item) => item.status === "uploaded").length,
      failed: items.filter((item) => item.status === "failed").length,
    }),
    [items]
  );
  const overallProgress = summary.total
    ? Math.round(
        items.reduce((total, item) => total + item.progress, 0) / summary.total
      )
    : 0;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }

  function updateItem(id: string, patch: Partial<ImportItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const validFiles = files.filter(isSupportedImportImage);
    const skipped = files.length - validFiles.length;

    if (skipped > 0) {
      showToast(`${skipped} unsupported file(s) skipped. Use PNG, JPG, JPEG or WEBP.`);
    }

    const nextItems = validFiles.map<ImportItem>((file) => {
      const sku = getImageImportSku(file);

      return {
        id: crypto.randomUUID(),
        file,
        sku,
        status: "queued",
        progress: 0,
        message: sku ? "Waiting for SKU match." : "No SKU found in filename.",
      };
    });

    if (nextItems.length === 0) return;

    setItems((current) => [...nextItems, ...current]);
    await matchProducts(nextItems);
  }

  async function matchProducts(nextItems: ImportItem[]) {
    const skus = Array.from(
      new Set(nextItems.map((item) => item.sku).filter(Boolean))
    );

    if (skus.length === 0) {
      setItems((current) =>
        current.map((item) =>
          nextItems.some((nextItem) => nextItem.id === item.id)
            ? {
                ...item,
                status: "not-matched",
                progress: 100,
                message: "File name must start with SKU, for example 10001.webp.",
              }
            : item
        )
      );
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("id,sku,name_uz,name_ru,image")
      .in("sku", skus);

    if (error) {
      showToast(error.message);
      setItems((current) =>
        current.map((item) =>
          nextItems.some((nextItem) => nextItem.id === item.id)
            ? { ...item, status: "failed", progress: 100, message: error.message }
            : item
        )
      );
      return;
    }

    const productsBySku = new Map(
      ((data || []) as ProductMatch[]).map((product) => [product.sku || "", product])
    );

    setItems((current) =>
      current.map((item) => {
        if (!nextItems.some((nextItem) => nextItem.id === item.id)) return item;

        const product = productsBySku.get(item.sku);
        if (!product) {
          return {
            ...item,
            status: "not-matched",
            progress: 100,
            message: `No product found for SKU ${item.sku || "-"}.`,
          };
        }

        return {
          ...item,
          product,
          status: "matched",
          progress: 10,
          message: `Matched to ${product.name_uz || product.name_ru || product.sku}.`,
        };
      })
    );
  }

  async function importImages() {
    const uploadableItems = items.filter(
      (item) => item.product && (item.status === "matched" || item.status === "failed")
    );

    if (uploadableItems.length === 0) {
      showToast("No matched images ready to upload.");
      return;
    }

    setRunning(true);

    for (const item of uploadableItems) {
      updateItem(item.id, {
        status: "uploading",
        progress: 20,
        message: "Optimizing image to WebP...",
      });

      try {
        const optimized = await optimizeImageForUpload(item.file, {
          maxSize: 1000,
          quality: 0.85,
        });
        const filePath = `product-images/${item.sku}-${crypto.randomUUID()}.webp`;

        updateItem(item.id, {
          progress: 55,
          originalSize: optimized.originalSize,
          optimizedSize: optimized.optimizedSize,
          dimensions: `${optimized.width} x ${optimized.height}`,
          message: "Uploading optimized image to Supabase Storage...",
        });

        const { error: uploadError } = await supabase.storage
          .from("products")
          .upload(filePath, optimized.file, {
            cacheControl: "31536000",
            contentType: "image/webp",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const publicUrl = getPublicImageUrl(filePath);
        updateItem(item.id, {
          progress: 80,
          message: "Updating product image URL...",
        });

        const { error: updateError } = await supabase
          .from("products")
          .update({ image: publicUrl })
          .eq("id", item.product?.id);

        if (updateError) throw updateError;

        updateItem(item.id, {
          status: "uploaded",
          progress: 100,
          message: "Uploaded and assigned successfully.",
        });
      } catch (error) {
        updateItem(item.id, {
          status: "failed",
          progress: 100,
          message:
            error instanceof Error
              ? error.message
              : "Image upload failed.",
        });
      }
    }

    setRunning(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    void addFiles(event.dataTransfer.files);
  }

  function clearFinished() {
    setItems((current) =>
      current.filter(
        (item) => item.status !== "uploaded" && item.status !== "not-matched"
      )
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-5 top-5 z-50 rounded-2xl bg-gray-950 px-5 py-4 text-sm font-semibold text-white shadow-2xl">
          {toast}
        </div>
      )}

      <section className="rounded-[28px] border border-white bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B96C5C]">
              Products / Import Images
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">
              SKU image import
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              Upload product files named by SKU, for example 10001.png. Images
              are converted to WebP, resized to max 1000 x 1000, uploaded to
              Supabase Storage, then assigned to the matching product.
            </p>
          </div>
          <Link
            href="/admin/products"
            className="rounded-full border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
          >
            Back to products
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          ["Total", summary.total],
          ["Matched", summary.matched],
          ["Not matched", summary.notMatched],
          ["Uploaded", summary.uploaded],
          ["Failed", summary.failed],
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

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-[30px] border-2 border-dashed bg-white p-8 text-center shadow-sm transition ${
          dragActive
            ? "border-[#EEA391] bg-[#fff8f6]"
            : "border-gray-200 hover:border-[#EEA391]"
        }`}
      >
        <span className="rounded-full bg-[#EEA391]/15 px-5 py-2 text-sm font-bold text-[#B96C5C]">
          Drag & drop product images
        </span>
        <h2 className="mt-5 text-2xl font-bold text-gray-950">
          Drop SKU-named images here
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
          Supported formats: PNG, JPG, JPEG, WEBP. Files are processed in the
          browser before upload to reduce storage size and storefront load time.
        </p>
        <input
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.currentTarget.value = "";
          }}
          className="sr-only"
        />
      </label>

      <section className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-gray-950">
                Overall progress
              </p>
              <p className="text-sm font-bold text-[#B96C5C]">
                {overallProgress}%
              </p>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#EEA391] transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={clearFinished}
              disabled={running || items.length === 0}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 transition hover:border-[#EEA391] hover:text-[#B96C5C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear finished
            </button>
            <button
              type="button"
              onClick={() => void importImages()}
              disabled={running || items.length === 0}
              className="rounded-xl bg-[#EEA391] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#EEA391]/25 transition hover:bg-[#df8f7c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? "Uploading..." : "Upload matched images"}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-950">Import queue</h2>
          <p className="text-sm text-gray-500">
            Files are matched once by SKU, then uploaded in sequence for
            predictable progress and error reporting.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[#fff8f6] text-xs uppercase tracking-[0.14em] text-gray-500">
              <tr>
                <th className="px-5 py-4 text-left">File</th>
                <th className="px-5 py-4 text-left">SKU</th>
                <th className="px-5 py-4 text-left">Product</th>
                <th className="px-5 py-4 text-left">Optimization</th>
                <th className="px-5 py-4 text-left">Status</th>
                <th className="px-5 py-4 text-left">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-950">
                        {item.file.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatFileSize(item.file.size)}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-700">
                      {item.sku || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {item.product ? itemLabel(item) : "-"}
                      </p>
                      {item.product?.image && (
                        <p className="mt-1 text-xs text-gray-500">
                          Existing image will be replaced.
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600">
                      {item.optimizedSize ? (
                        <>
                          <p>{item.dimensions}</p>
                          <p>
                            {formatFileSize(item.originalSize || 0)} to{" "}
                            {formatFileSize(item.optimizedSize)}
                          </p>
                        </>
                      ) : (
                        "Waiting"
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.status === "uploaded"
                            ? "bg-emerald-50 text-emerald-700"
                            : item.status === "failed" ||
                                item.status === "not-matched"
                              ? "bg-red-50 text-red-700"
                              : item.status === "uploading"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.status}
                      </span>
                      <p className="mt-2 max-w-xs text-xs text-gray-500">
                        {item.message}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-2 w-40 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-[#EEA391] transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs font-bold text-gray-500">
                        {item.progress}%
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <p className="text-lg font-bold text-gray-950">
                      No images queued
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      Upload files like 10001.png to start matching by SKU.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#f1d4cc] bg-[#fff8f6] p-5 text-sm text-[#7a4b40]">
        <h2 className="font-bold text-[#4b2d27]">Banner/image standards</h2>
        <p className="mt-2">
          Product images are optimized to WebP, max 1000 x 1000, quality 85.
          Desktop hero banners should be 1920 x 700 or 1920 x 800 WebP under
          300 KB. Mobile banners should be 1080 x 1350 WebP under 250 KB.
        </p>
      </section>
    </div>
  );
}
