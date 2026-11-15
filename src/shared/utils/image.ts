/** Longest side of a stored image, in pixels; enough for a cover on a large screen. */
const MAX_SIDE = 1600;
const QUALITY = 0.82;

/**
 * Scales an image file down to at most `MAX_SIDE` pixels on its longest side and
 * re-encodes it as WebP, so what gets stored is small whatever was picked.
 */
export async function resizeImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('image could not be encoded'))),
      'image/webp',
      QUALITY,
    ),
  );
}
