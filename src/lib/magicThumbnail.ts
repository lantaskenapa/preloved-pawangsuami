/**
 * Magic Thumbnail AI - Smart Transparent Background Remover
 * Automatically isolates products from their background into clean, transparent PNGs.
 */

export interface MagicThumbnailResult {
  success: boolean;
  transparentImageUrl?: string;
  error?: string;
  method?: 'gemini' | 'client-engine';
}

/**
 * Removes background using client-side Canvas analysis.
 * Analyzes borders/corners, determines background tone, and creates a soft-edged alpha mask.
 */
export async function removeBackgroundWithCanvas(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Canvas 2D context tidak tersedia');
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Sample background colors from the perimeter (corners + 4 borders)
        const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 40));
        let bgR = 0;
        let bgG = 0;
        let bgB = 0;
        let sampleCount = 0;

        // Sample top & bottom borders
        for (let x = 0; x < width; x += sampleStep) {
          // Top row
          let idx = (0 * width + x) * 4;
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
          sampleCount++;

          // Bottom row
          idx = ((height - 1) * width + x) * 4;
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
          sampleCount++;
        }

        // Sample left & right borders
        for (let y = 0; y < height; y += sampleStep) {
          // Left column
          let idx = (y * width + 0) * 4;
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
          sampleCount++;

          // Right column
          idx = (y * width + (width - 1)) * 4;
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
          sampleCount++;
        }

        const avgBgR = bgR / sampleCount;
        const avgBgG = bgG / sampleCount;
        const avgBgB = bgB / sampleCount;

        // Color distance threshold
        // Standard Euclidean distance threshold in RGB space
        const threshold = 38;
        const featherRange = 18;

        // Visited map for flood-fill from borders
        const totalPixels = width * height;
        const isBackground = new Uint8Array(totalPixels);
        const queue: number[] = [];

        // Push border pixels that match background color into queue
        const isColorMatch = (r: number, g: number, b: number) => {
          const dr = r - avgBgR;
          const dg = g - avgBgG;
          const db = b - avgBgB;
          return Math.sqrt(dr * dr + dg * dg + db * db) <= (threshold + featherRange);
        };

        // Seed border pixels
        for (let x = 0; x < width; x++) {
          const topIdx = 0 * width + x;
          const botIdx = (height - 1) * width + x;
          const topPx = topIdx * 4;
          const botPx = botIdx * 4;

          if (isColorMatch(data[topPx], data[topPx + 1], data[topPx + 2])) {
            isBackground[topIdx] = 1;
            queue.push(topIdx);
          }
          if (isColorMatch(data[botPx], data[botPx + 1], data[botPx + 2])) {
            isBackground[botIdx] = 1;
            queue.push(botIdx);
          }
        }

        for (let y = 0; y < height; y++) {
          const leftIdx = y * width + 0;
          const rightIdx = y * width + (width - 1);
          const leftPx = leftIdx * 4;
          const rightPx = rightIdx * 4;

          if (!isBackground[leftIdx] && isColorMatch(data[leftPx], data[leftPx + 1], data[leftPx + 2])) {
            isBackground[leftIdx] = 1;
            queue.push(leftIdx);
          }
          if (!isBackground[rightIdx] && isColorMatch(data[rightPx], data[rightPx + 1], data[rightPx + 2])) {
            isBackground[rightIdx] = 1;
            queue.push(rightIdx);
          }
        }

        // BFS Flood fill connected background pixels from edges inwards
        let head = 0;
        const maxFlood = totalPixels;

        while (head < queue.length && head < maxFlood) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);

          // 4-way neighbors
          const neighbors = [
            cy > 0 ? (cy - 1) * width + cx : -1,
            cy < height - 1 ? (cy + 1) * width + cx : -1,
            cx > 0 ? cy * width + (cx - 1) : -1,
            cx < width - 1 ? cy * width + (cx + 1) : -1,
          ];

          for (const n of neighbors) {
            if (n >= 0 && !isBackground[n]) {
              const npx = n * 4;
              const r = data[npx];
              const g = data[npx + 1];
              const b = data[npx + 2];
              const dr = r - avgBgR;
              const dg = g - avgBgG;
              const db = b - avgBgB;
              const dist = Math.sqrt(dr * dr + dg * dg + db * db);

              if (dist <= (threshold + featherRange)) {
                isBackground[n] = 1;
                queue.push(n);
              }
            }
          }
        }

        // Apply alpha transparency with soft anti-aliased edge falloff
        for (let i = 0; i < totalPixels; i++) {
          if (isBackground[i]) {
            const px = i * 4;
            const r = data[px];
            const g = data[px + 1];
            const b = data[px + 2];
            const dr = r - avgBgR;
            const dg = g - avgBgG;
            const db = b - avgBgB;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);

            if (dist <= threshold) {
              // 100% transparent
              data[px + 3] = 0;
            } else {
              // Soft edge feathering between threshold and threshold + featherRange
              const factor = (dist - threshold) / featherRange;
              data[px + 3] = Math.min(255, Math.max(0, Math.round(data[px + 3] * factor)));
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // Export as transparent PNG
        const transparentDataUrl = canvas.toDataURL('image/png', 0.95);
        resolve(transparentDataUrl);
      } catch (err: any) {
        reject(err);
      }
    };
    img.onerror = () => {
      reject(new Error('Gagal memuat gambar untuk proses Magic Thumbnail'));
    };
    img.src = imageDataUrl;
  });
}

/**
 * Executes Magic Thumbnail background removal using either server Gemini API or client engine.
 */
export async function executeMagicThumbnail(
  imageDataUrl: string,
  apiKey?: string
): Promise<MagicThumbnailResult> {
  // 1. Try server-side endpoint first (which uses Gemini or server processing)
  try {
    const res = await fetch('/api/magic-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageDataUrl,
        apiKey: apiKey || '',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.transparentImageUrl) {
        return {
          success: true,
          transparentImageUrl: data.transparentImageUrl,
          method: data.method || 'gemini',
        };
      }
    }
  } catch (err) {
    console.warn('Server magic-thumbnail endpoint warning, falling back to client engine:', err);
  }

  // 2. High-precision client-side canvas engine fallback
  try {
    const transparentDataUrl = await removeBackgroundWithCanvas(imageDataUrl);
    return {
      success: true,
      transparentImageUrl: transparentDataUrl,
      method: 'client-engine',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Gagal memproses Magic Thumbnail',
    };
  }
}
