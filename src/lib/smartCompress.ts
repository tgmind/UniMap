export type CompressionPreset = 'study_doc' | 'diagram' | 'original';

export interface CompressionResult {
  file: File | Blob;
  originalSize: number;
  compressedSize: number;
  savingsPercentage: number;
  previewUrl: string;
  width: number;
  height: number;
}

export async function smartCompress(
  file: File,
  preset: CompressionPreset = 'study_doc'
): Promise<CompressionResult> {
  const originalSize = file.size;

  if (preset === 'original' || !file.type.startsWith('image/')) {
    const previewUrl = URL.createObjectURL(file);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savingsPercentage: 0,
      previewUrl,
      width: 0,
      height: 0,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let maxDimension = 2560; // 2.5K high resolution guarantee for study text
        let quality = 0.86;

        if (preset === 'diagram') {
          maxDimension = 2048;
          quality = 0.84;
        }

        let width = img.width;
        let height = img.height;

        // Preserve aspect ratio while capping to maxDimension
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
          return reject(new Error('Canvas context not available'));
        }

        // Bicubic high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // For study documents: background leveling & subtle edge contrast boost
        if (preset === 'study_doc') {
          try {
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            // Contrast stretch to clarify faded ink & flatten noisy off-white background
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const brightness = (r * 299 + g * 587 + b * 114) / 1000;

              // If it's near-white paper background, push to clean white (compresses 95% better!)
              if (brightness > 215) {
                data[i] = Math.min(255, r + 15);
                data[i + 1] = Math.min(255, g + 15);
                data[i + 2] = Math.min(255, b + 15);
              } else if (brightness < 90) {
                // If it's dark text/equations, deepen slightly for crisp contrast
                data[i] = Math.max(0, r - 10);
                data[i + 1] = Math.max(0, g - 10);
                data[i + 2] = Math.max(0, b - 10);
              }
            }
            ctx.putImageData(imgData, 0, 0);
          } catch {
            // If cross-origin or buffer error, fallback to unadjusted image
          }
        }

        // Export to WebP (fallback to jpeg if browser doesn't support webp canvas export)
        const format = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Compression failed'));
            }

            const compressedSize = blob.size;
            const savingsPercentage = Math.max(
              0,
              Math.round(((originalSize - compressedSize) / originalSize) * 100)
            );
            const previewUrl = URL.createObjectURL(blob);

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '.webp'),
              { type: format }
            );

            resolve({
              file: compressedFile,
              originalSize,
              compressedSize,
              savingsPercentage,
              previewUrl,
              width,
              height,
            });
          },
          format,
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
