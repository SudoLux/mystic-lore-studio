import type { LocalImageAsset } from '../types/studio';

const MAX_SOURCE_SIZE = 6 * 1024 * 1024;
const MAX_STORED_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export type ImageProcessingError = Error;

export async function createLocalImageAsset(file: File): Promise<LocalImageAsset> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be uploaded.');
  }

  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error('Image is too large. Please choose an image under 6 MB.');
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const { height, width } = getResizedDimensions(image.width, image.height);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('This browser could not prepare the image.');
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  let dataUrl = canvas.toDataURL(mimeType, mimeType === 'image/png' ? undefined : JPEG_QUALITY);

  if (estimateDataUrlBytes(dataUrl) > MAX_STORED_SIZE && mimeType !== 'image/jpeg') {
    dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  }

  if (estimateDataUrlBytes(dataUrl) > MAX_STORED_SIZE) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.68);
  }

  if (estimateDataUrlBytes(dataUrl) > MAX_STORED_SIZE) {
    throw new Error('Image could not be compressed under 2 MB for local storage.');
  }

  return {
    dataUrl,
    height,
    id: `image-${Date.now().toString(36)}`,
    mimeType: dataUrl.slice(5, dataUrl.indexOf(';')),
    name: file.name,
    objectFit: 'cover',
    overlayIntensity: 'auto',
    objectPositionX: 50,
    objectPositionY: 50,
    size: estimateDataUrlBytes(dataUrl),
    updatedAt: new Date().toISOString(),
    width,
    zoom: 1,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(new Error('Could not read this file.')));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Could not load this image.')));
    image.src = dataUrl;
  });
}

function getResizedDimensions(width: number, height: number) {
  const longestEdge = Math.max(width, height);

  if (longestEdge <= MAX_IMAGE_EDGE) {
    return { height, width };
  }

  const scale = MAX_IMAGE_EDGE / longestEdge;

  return {
    height: Math.round(height * scale),
    width: Math.round(width * scale),
  };
}

function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? '';

  return Math.round((base64.length * 3) / 4);
}
