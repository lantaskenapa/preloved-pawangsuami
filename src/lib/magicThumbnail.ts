/**
 * Magic Thumbnail AI - Smart Transparent Background Remover
 * Automatically isolates products from their background into clean, transparent PNGs.
 * Uses a 2-stage process:
 * 1. Background Diagnosis: Analyzes perimeter clusters, gradient contours, and subject core.
 * 2. Non-Extreme Precision Cutout: Removes only genuine background without eroding product edges.
 */

export interface MagicThumbnailResult {
  success: boolean;
  transparentImageUrl?: string;
  error?: string;
  method?: 'gemini' | 'client-engine';
}

interface ColorCluster {
  r: number;
  g: number;
  b: number;
  variance: number;
  weight: number;
}

/**
 * Phase 1: Diagnose Background Characteristics
 * Samples outer perimeter in 8 distinct zones to identify background colors and lighting gradients.
 */
function diagnoseBackgroundClusters(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { clusters: ColorCluster[]; safeThreshold: number } {
  // Sample 8 zones along the perimeter
  // 0: Top-Left, 1: Top-Center, 2: Top-Right
  // 3: Left-Center, 4: Right-Center
  // 5: Bottom-Left, 6: Bottom-Center, 7: Bottom-Right
  const zones: { r: number[]; g: number[]; b: number[] }[] = Array.from({ length: 8 }, () => ({
    r: [],
    g: [],
    b: [],
  }));

  const borderDepth = Math.max(3, Math.floor(Math.min(width, height) * 0.04));

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const isTop = y < borderDepth;
      const isBottom = y >= height - borderDepth;
      const isLeft = x < borderDepth;
      const isRight = x >= width - borderDepth;

      if (!isTop && !isBottom && !isLeft && !isRight) continue;

      let zoneIdx = -1;
      if (isTop && isLeft) zoneIdx = 0;
      else if (isTop && isRight) zoneIdx = 2;
      else if (isTop) zoneIdx = 1;
      else if (isBottom && isLeft) zoneIdx = 5;
      else if (isBottom && isRight) zoneIdx = 7;
      else if (isBottom) zoneIdx = 6;
      else if (isLeft) zoneIdx = 3;
      else if (isRight) zoneIdx = 4;

      if (zoneIdx >= 0) {
        const idx = (y * width + x) * 4;
        zones[zoneIdx].r.push(data[idx]);
        zones[zoneIdx].g.push(data[idx + 1]);
        zones[zoneIdx].b.push(data[idx + 2]);
      }
    }
  }

  const clusters: ColorCluster[] = [];

  for (let z = 0; z < zones.length; z++) {
    const rArr = zones[z].r;
    const gArr = zones[z].g;
    const bArr = zones[z].b;
    if (rArr.length === 0) continue;

    const count = rArr.length;
    const meanR = rArr.reduce((a, b) => a + b, 0) / count;
    const meanG = gArr.reduce((a, b) => a + b, 0) / count;
    const meanB = bArr.reduce((a, b) => a + b, 0) / count;

    // Variance calculation
    let varSum = 0;
    for (let i = 0; i < count; i++) {
      const dr = rArr[i] - meanR;
      const dg = gArr[i] - meanG;
      const db = bArr[i] - meanB;
      varSum += Math.sqrt(dr * dr + dg * dg + db * db);
    }
    const variance = varSum / count;

    // Merge with existing cluster if very similar
    const existing = clusters.find((c) => {
      const dr = c.r - meanR;
      const dg = c.g - meanG;
      const db = c.b - meanB;
      return Math.sqrt(dr * dr + dg * dg + db * db) < 18;
    });

    if (existing) {
      existing.r = (existing.r * existing.weight + meanR * count) / (existing.weight + count);
      existing.g = (existing.g * existing.weight + meanG * count) / (existing.weight + count);
      existing.b = (existing.b * existing.weight + meanB * count) / (existing.weight + count);
      existing.weight += count;
    } else {
      clusters.push({
        r: meanR,
        g: meanG,
        b: meanB,
        variance,
        weight: count,
      });
    }
  }

  // Safe conservative threshold: prevents extreme eating into the product
  // Lower threshold = conservative & non-destructive
  let avgVar = clusters.reduce((sum, c) => sum + c.variance, 0) / (clusters.length || 1);
  const safeThreshold = Math.min(28, Math.max(16, Math.round(avgVar * 1.5 + 14)));

  return { clusters, safeThreshold };
}

/**
 * Phase 2: Compute Edge Contour & Subject Protection Map
 * Uses Sobel gradient magnitude to prevent flood fill from penetrating through product edges.
 */
function buildEdgeMagnitudeMap(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const edgeMap = new Uint8Array(width * height);

  // Compute Sobel gradient magnitude on luminance
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const getLum = (px: number, py: number) => {
        const i = (py * width + px) * 4;
        return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      };

      // Sobel X
      const gx =
        -1 * getLum(x - 1, y - 1) +
        1 * getLum(x + 1, y - 1) +
        -2 * getLum(x - 1, y) +
        2 * getLum(x + 1, y) +
        -1 * getLum(x - 1, y + 1) +
        1 * getLum(x + 1, y + 1);

      // Sobel Y
      const gy =
        -1 * getLum(x - 1, y - 1) -
        2 * getLum(x, y - 1) -
        1 * getLum(x + 1, y - 1) +
        1 * getLum(x - 1, y + 1) +
        2 * getLum(x, y + 1) +
        1 * getLum(x + 1, y + 1);

      const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy) / 4);
      edgeMap[y * width + x] = mag;
    }
  }

  return edgeMap;
}

/**
 * Removes background carefully using Diagnostic + Contour-Aware Execution.
 * Never cuts aggressively into product edges.
 */
export async function removeBackgroundWithCanvas(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

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
        const totalPixels = width * height;

        // 1. Stage 1: Diagnosa Karakteristik Background
        const { clusters, safeThreshold } = diagnoseBackgroundClusters(data, width, height);

        // 2. Stage 2: Peta Kontur & Siluet Tepi Produk
        const edgeMap = buildEdgeMagnitudeMap(data, width, height);

        // Subject Protected Core: Middle 55% box is shielded from accidental seed starts
        const coreXMin = Math.floor(width * 0.22);
        const coreXMax = Math.floor(width * 0.78);
        const coreYMin = Math.floor(height * 0.22);
        const coreYMax = Math.floor(height * 0.78);

        const isBackground = new Uint8Array(totalPixels);
        const queue: number[] = [];

        // Check if a pixel matches any diagnosed background cluster within safe threshold
        const isBgColor = (r: number, g: number, b: number, tolerance: number): boolean => {
          for (let i = 0; i < clusters.length; i++) {
            const dr = r - clusters[i].r;
            const dg = g - clusters[i].g;
            const db = b - clusters[i].b;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);
            if (dist <= tolerance) {
              return true;
            }
          }
          return false;
        };

        // Seed exclusively from outer image boundary pixels
        for (let x = 0; x < width; x++) {
          // Top row
          const topIdx = 0 * width + x;
          const topPx = topIdx * 4;
          if (isBgColor(data[topPx], data[topPx + 1], data[topPx + 2], safeThreshold + 6)) {
            isBackground[topIdx] = 1;
            queue.push(topIdx);
          }

          // Bottom row
          const botIdx = (height - 1) * width + x;
          const botPx = botIdx * 4;
          if (isBgColor(data[botPx], data[botPx + 1], data[botPx + 2], safeThreshold + 6)) {
            isBackground[botIdx] = 1;
            queue.push(botIdx);
          }
        }

        for (let y = 0; y < height; y++) {
          // Left column
          const leftIdx = y * width + 0;
          const leftPx = leftIdx * 4;
          if (!isBackground[leftIdx] && isBgColor(data[leftPx], data[leftPx + 1], data[leftPx + 2], safeThreshold + 6)) {
            isBackground[leftIdx] = 1;
            queue.push(leftIdx);
          }

          // Right column
          const rightIdx = y * width + (width - 1);
          const rightPx = rightIdx * 4;
          if (!isBackground[rightIdx] && isBgColor(data[rightPx], data[rightPx + 1], data[rightPx + 2], safeThreshold + 6)) {
            isBackground[rightIdx] = 1;
            queue.push(rightIdx);
          }
        }

        // 3. Stage 3: Contour-Restricted BFS Flood Fill
        // Stops strictly at strong gradient edges (edgeMap > 32) and respects safe color tolerance
        let head = 0;
        const edgeStopThreshold = 34;

        while (head < queue.length) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);

          // 4-directional expansion
          const neighbors = [
            cy > 0 ? (cy - 1) * width + cx : -1,
            cy < height - 1 ? (cy + 1) * width + cx : -1,
            cx > 0 ? cy * width + (cx - 1) : -1,
            cx < width - 1 ? cy * width + (cx + 1) : -1,
          ];

          for (let n = 0; n < neighbors.length; n++) {
            const nIdx = neighbors[n];
            if (nIdx < 0 || isBackground[nIdx]) continue;

            const nx = nIdx % width;
            const ny = Math.floor(nIdx / width);

            // If entering protected core and edge is encountered, stop
            const inCore = nx >= coreXMin && nx <= coreXMax && ny >= coreYMin && ny <= coreYMax;
            const edgeVal = edgeMap[nIdx];

            // Stop at physical product edges
            if (edgeVal >= edgeStopThreshold) {
              continue;
            }

            // Stricter threshold inside center core to guarantee product protection
            const effectiveTol = inCore ? safeThreshold * 0.75 : safeThreshold;

            const nPx = nIdx * 4;
            const r = data[nPx];
            const g = data[nPx + 1];
            const b = data[nPx + 2];

            if (isBgColor(r, g, b, effectiveTol)) {
              isBackground[nIdx] = 1;
              queue.push(nIdx);
            }
          }
        }

        // 4. Stage 4: Non-Extreme Alpha Cutout with Gentle Transition
        // Clear background pixels cleanly, preserving crisp anti-aliased product contours
        const featherRadius = 2; // subtle 2px boundary smoothing, avoiding aggressive erosion

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const px = idx * 4;

            if (isBackground[idx]) {
              // Check if pixel is adjacent to the preserved product (edge smoothing)
              let hasProductNeighbor = false;
              for (let dy = -featherRadius; dy <= featherRadius && !hasProductNeighbor; dy++) {
                for (let dx = -featherRadius; dx <= featherRadius; dx++) {
                  const ny = y + dy;
                  const nx = x + dx;
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    if (!isBackground[ny * width + nx]) {
                      hasProductNeighbor = true;
                      break;
                    }
                  }
                }
              }

              if (hasProductNeighbor) {
                // Soft anti-aliased edge falloff
                data[px + 3] = 40;
              } else {
                // Fully transparent background
                data[px + 3] = 0;
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // Export clean transparent PNG
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
 * Executes Magic Thumbnail background removal.
 * Tries server-side Gemini/vision processing first, then falls back seamlessly
 * to the intelligent client-side diagnosis engine.
 */
export async function executeMagicThumbnail(
  imageDataUrl: string,
  apiKey?: string
): Promise<MagicThumbnailResult> {
  // 1. Try server-side endpoint first (if Express server is active)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('/api/magic-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageDataUrl,
        apiKey: apiKey || '',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.transparentImageUrl) {
        return {
          success: true,
          transparentImageUrl: data.transparentImageUrl,
          method: data.method || 'gemini',
        };
      }
    }
  } catch {
    // Server endpoint timed out or unavailable (e.g. running on Vercel static deployment)
    // Seamlessly proceed to client diagnosis engine
  }

  // 2. Intelligent client-side diagnosis & contour-preserving background remover
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
