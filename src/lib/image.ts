/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compresses and downscales a base64 image string to keep doc sizes small
 * and prevent QuotaExceededError in localStorage or Firestore sizes limits.
 */
export function compressImage(
  base64Str: string,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    // Check if we are running in a browser environment
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = base64Str;

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Only resize if the dimensions exceed constraints
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str); // Fallback on browser failures
        return;
      }

      // Draw active image data with smooth scaling
      try {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Preserve transparency by saving as image/png if original was png, webp or gif
        let mimeType = 'image/jpeg';
        if (base64Str.startsWith('data:image/png') || base64Str.startsWith('data:image/gif') || base64Str.startsWith('data:image/webp') || base64Str.startsWith('data:image/svg+xml')) {
          mimeType = 'image/png';
        }

        const compressedBase64 = mimeType === 'image/jpeg' 
          ? canvas.toDataURL('image/jpeg', quality)
          : canvas.toDataURL('image/png');
        resolve(compressedBase64);
      } catch (err) {
        console.warn("Canvas image compression failed, fallback to original", err);
        resolve(base64Str);
      }
    };

    img.onerror = (err) => {
      console.warn("Image onload parsing error during compression step", err);
      resolve(base64Str);
    };
  });
}
