/**
 * Utility for high-performance, client-side media compression and permanent Base64 encoding.
 * Ensures media files (like phone camera photos) never expire or disappear after page refresh.
 */

export interface ProcessedMedia {
  dataUrl: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  mimeType: string;
  fileName: string;
}

/**
 * Compresses an image file to a maximum dimension while maintaining aspect ratio,
 * then returns a permanent Base64 Data URL.
 */
export async function compressAndEncodeMedia(
  file: File,
  maxDimension: number = 1920,
  quality: number = 0.82
): Promise<ProcessedMedia> {
  const isImage = file.type.startsWith('image/') && !file.type.includes('svg');

  if (!isImage) {
    // For non-images (PDFs, HTML, etc.), convert directly to base64 Data URL
    const dataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl,
      sizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
      fileName: file.name,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read media file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        // Fallback to raw data url if canvas image decoding fails
        resolve({
          dataUrl: reader.result as string,
          sizeBytes: file.size,
          mimeType: file.type,
          fileName: file.name,
        });
      };
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect ratio scaling
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: reader.result as string,
            width,
            height,
            sizeBytes: file.size,
            mimeType: file.type,
            fileName: file.name,
          });
          return;
        }

        // Draw with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Determine best output format
        const outputMime = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(outputMime, quality);

        // Calculate approximate size in bytes from base64
        const head = compressedDataUrl.indexOf(',') + 1;
        const approxSize = Math.round((compressedDataUrl.length - head) * 0.75);

        resolve({
          dataUrl: compressedDataUrl,
          width,
          height,
          sizeBytes: approxSize,
          mimeType: outputMime,
          fileName: file.name,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file as Data URL'));
    reader.readAsDataURL(file);
  });
}
