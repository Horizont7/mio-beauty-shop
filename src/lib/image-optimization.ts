export type OptimizedImageResult = {
  file: File;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
};

type OptimizeImageOptions = {
  maxSize?: number;
  quality?: number;
};

const supportedImageTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export function isSupportedImportImage(file: File) {
  return supportedImageTypes.has(file.type.toLowerCase());
}

function getSkuFromFileName(fileName: string) {
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, "");
  const match = nameWithoutExtension.match(/[A-Za-z0-9_-]+/);

  return match?.[0] || "";
}

export function getImageImportSku(file: File) {
  return getSkuFromFileName(file.name).trim();
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function optimizeImageForUpload(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<OptimizedImageResult> {
  const maxSize = options.maxSize ?? 1000;
  const quality = options.quality ?? 0.85;
  const image = await loadImage(file);
  const ratio = Math.min(1, maxSize / image.naturalWidth, maxSize / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image optimizer is unavailable in this browser.");
  }

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });

  if (!blob) {
    throw new Error("Could not convert image to WebP.");
  }

  const sku = getImageImportSku(file);
  const optimizedFile = new File([blob], `${sku || "product"}-${crypto.randomUUID()}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    width,
    height,
    originalSize: file.size,
    optimizedSize: optimizedFile.size,
  };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
