const DEFAULT_DIMENSION_STEPS = [2400, 2000, 1600, 1400, 1200, 1000] as const;
const DEFAULT_QUALITY_STEPS = [0.82, 0.74, 0.66, 0.55] as const;
const DEFAULT_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const DEFAULT_PREVIEW_DIMENSION = 480;
const DEFAULT_PREVIEW_QUALITY = 0.68;

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const SUPPORTED_EXTENSIONS = new Set(['heic', 'heif', 'jpeg', 'jpg', 'png', 'webp']);

export const IMAGE_PROCESSING_ERROR_MESSAGE =
  'This image is unusually large or unsupported. Try a screenshot or smaller export.';

export type ImageCompressionOptions = {
  dimensionSteps?: number[];
  maxDimension?: number;
  maxSizeBytes?: number;
  previewDimension?: number;
  previewQuality?: number;
  qualitySteps?: number[];
};

export type CompressedImageResult = {
  blob: Blob;
  file: File;
  height: number;
  mimeType: 'image/jpeg' | 'image/webp';
  previewDataUrl: string;
  sizeBytes: number;
  width: number;
};

type DecodedImage = {
  dispose: () => void;
  height: number;
  source: CanvasImageSource;
  width: number;
};

type EncodedImage = {
  blob: Blob;
  height: number;
  mimeType: CompressedImageResult['mimeType'];
  width: number;
};

export async function compressImageForApp(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<CompressedImageResult> {
  validateImageFile(file);

  const decoded = await decodeImage(file);

  try {
    const dimensionSteps = getDimensionSteps(
      decoded.width,
      decoded.height,
      options,
    );
    const qualitySteps = normalizeQualitySteps(
      options.qualitySteps ?? [...DEFAULT_QUALITY_STEPS],
    );
    const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
    const encoded = await findCompressedImage(
      decoded,
      dimensionSteps,
      qualitySteps,
      maxSizeBytes,
    );

    if (!encoded) {
      throw new Error(IMAGE_PROCESSING_ERROR_MESSAGE);
    }

    const previewDataUrl = await createPreviewDataUrl(
      decoded,
      options.previewDimension ?? DEFAULT_PREVIEW_DIMENSION,
      options.previewQuality ?? DEFAULT_PREVIEW_QUALITY,
      encoded.mimeType,
    );
    const outputName = getOutputName(file.name, encoded.mimeType);
    const compressedFile = new File([encoded.blob], outputName, {
      lastModified: Date.now(),
      type: encoded.mimeType,
    });

    return {
      blob: encoded.blob,
      file: compressedFile,
      height: encoded.height,
      mimeType: encoded.mimeType,
      previewDataUrl,
      sizeBytes: encoded.blob.size,
      width: encoded.width,
    };
  } catch (error) {
    if (error instanceof Error && error.message === IMAGE_PROCESSING_ERROR_MESSAGE) {
      throw error;
    }

    throw new Error(IMAGE_PROCESSING_ERROR_MESSAGE, { cause: error });
  } finally {
    decoded.dispose();
  }
}

async function findCompressedImage(
  decoded: DecodedImage,
  dimensionSteps: number[],
  qualitySteps: number[],
  maxSizeBytes: number,
) {
  let preferredMimeType: CompressedImageResult['mimeType'] = 'image/webp';

  for (const maxDimension of dimensionSteps) {
    await yieldToMainThread();
    const dimensions = fitWithinDimension(
      decoded.width,
      decoded.height,
      maxDimension,
    );
    const canvas = drawToCanvas(
      decoded.source,
      dimensions.width,
      dimensions.height,
    );

    for (const quality of qualitySteps) {
      let blob: Blob;

      try {
        blob = await encodeCanvas(canvas, preferredMimeType, quality);
      } catch {
        if (preferredMimeType !== 'image/webp') {
          continue;
        }

        preferredMimeType = 'image/jpeg';
        blob = await encodeCanvas(canvas, preferredMimeType, quality);
      }

      if (blob.size <= maxSizeBytes) {
        return {
          blob,
          height: dimensions.height,
          mimeType: preferredMimeType,
          width: dimensions.width,
        } satisfies EncodedImage;
      }

      await yieldToMainThread();
    }
  }

  return null;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  await yieldToMainThread();

  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      });

      return {
        dispose: () => bitmap.close(),
        height: bitmap.height,
        source: bitmap,
        width: bitmap.width,
      };
    } catch {
      // Safari can decode some camera formats through an image element even
      // when createImageBitmap does not support them.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);

    return {
      dispose: () => URL.revokeObjectURL(objectUrl),
      height: image.naturalHeight || image.height,
      source: image,
      width: image.naturalWidth || image.width,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function drawToCanvas(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is unavailable.');
  }

  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);

  return canvas;
}

async function createPreviewDataUrl(
  decoded: DecodedImage,
  maxDimension: number,
  quality: number,
  mimeType: CompressedImageResult['mimeType'],
) {
  const dimensions = fitWithinDimension(
    decoded.width,
    decoded.height,
    maxDimension,
  );
  const canvas = drawToCanvas(
    decoded.source,
    dimensions.width,
    dimensions.height,
  );
  const blob = await encodeCanvas(canvas, mimeType, quality);

  return blobToDataUrl(blob);
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mimeType: CompressedImageResult['mimeType'],
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size === 0 || blob.type !== mimeType) {
          reject(new Error(`The browser could not encode ${mimeType}.`));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(new Error('Could not prepare an image preview.')));
    reader.readAsDataURL(blob);
  });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Could not decode this image.')));
    image.src = url;
  });
}

function getDimensionSteps(
  width: number,
  height: number,
  options: ImageCompressionOptions,
) {
  const requestedMax = Math.max(
    1,
    Math.round(options.maxDimension ?? DEFAULT_DIMENSION_STEPS[0]),
  );
  const suppliedSteps = options.dimensionSteps ?? [...DEFAULT_DIMENSION_STEPS];
  const sourceLongestSide = Math.max(width, height);

  return [...new Set([requestedMax, ...suppliedSteps])]
    .map((value) => Math.max(1, Math.round(value)))
    .filter((value) => value <= requestedMax)
    .map((value) => Math.min(value, sourceLongestSide))
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((left, right) => right - left);
}

function normalizeQualitySteps(steps: number[]) {
  return [...new Set(steps)]
    .map((quality) => Math.min(1, Math.max(0.1, quality)))
    .sort((left, right) => right - left);
}

function fitWithinDimension(width: number, height: number, maxDimension: number) {
  const longestSide = Math.max(width, height);

  if (longestSide <= maxDimension) {
    return { height, width };
  }

  const scale = maxDimension / longestSide;

  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

function getOutputName(name: string, mimeType: CompressedImageResult['mimeType']) {
  const baseName = name.replace(/\.[^.]+$/, '') || 'mystic-lore-image';
  const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';

  return `${baseName}.${extension}`;
}

function validateImageFile(file: File) {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (!SUPPORTED_MIME_TYPES.has(mimeType) && !SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(IMAGE_PROCESSING_ERROR_MESSAGE);
  }
}

function yieldToMainThread() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}
