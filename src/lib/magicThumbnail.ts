/**
 * Magic Thumbnail AI - Client-side @imgly/background-removal (v1.7.0)
 * with onnxruntime-web (v1.21.0) and Auto-Center on Square Canvas.
 * Fallback to Remove.bg API with multi-key failover when configured.
 */

export interface MagicThumbnailResult {
  success: boolean;
  transparentImageUrl?: string;
  error?: string;
  creditsCharged?: number;
  keyIndex?: number;
  totalKeys?: number;
  method?: 'imgly' | 'removebg';
}

/**
 * Retrieves the stored list of Remove.bg API Keys from localStorage or settings.
 */
export function getStoredRemoveBgApiKeys(): string[] {
  if (typeof window === 'undefined') return [];

  const keys: string[] = [];

  // 1. Array in localStorage: psp_removebg_api_keys
  try {
    const rawKeys = localStorage.getItem('psp_removebg_api_keys');
    if (rawKeys) {
      const parsed = JSON.parse(rawKeys);
      if (Array.isArray(parsed)) {
        for (const k of parsed) {
          if (typeof k === 'string' && k.trim()) {
            keys.push(k.trim());
          }
        }
      }
    }
  } catch {
    // Ignore JSON parse errors
  }

  // 2. Single or comma/newline-separated key in psp_removebg_api_key
  const singleKey = localStorage.getItem('psp_removebg_api_key');
  if (singleKey && singleKey.trim()) {
    const parts = singleKey.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (!keys.includes(part)) {
        keys.push(part);
      }
    }
  }

  // 3. App Settings JSON cache
  try {
    const rawSettings = localStorage.getItem('psp_settings_v1');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (Array.isArray(parsed?.removebg_api_keys)) {
        for (const k of parsed.removebg_api_keys) {
          if (typeof k === 'string' && k.trim() && !keys.includes(k.trim())) {
            keys.push(k.trim());
          }
        }
      }
      if (parsed?.removebg_api_key && typeof parsed.removebg_api_key === 'string' && parsed.removebg_api_key.trim()) {
        const parts = parsed.removebg_api_key.split(/[\n,;]+/).map((s: string) => s.trim()).filter(Boolean);
        for (const part of parts) {
          if (!keys.includes(part)) {
            keys.push(part);
          }
        }
      }
    }
  } catch {
    // Ignore parse error
  }

  return keys;
}

/**
 * Save array of Remove.bg API keys to localStorage
 */
export function saveStoredRemoveBgApiKeys(keys: string[]): void {
  if (typeof window === 'undefined') return;
  const cleanList = keys.map((k) => k.trim()).filter(Boolean);
  localStorage.setItem('psp_removebg_api_keys', JSON.stringify(cleanList));
  localStorage.setItem('psp_removebg_api_key', cleanList[0] || '');
}

/**
 * Retrieves the preferred Magic Thumbnail engine ('imgly' or 'removebg').
 * Defaults to 'imgly' (client-side free AI).
 */
export function getStoredMagicThumbnailEngine(): 'imgly' | 'removebg' {
  if (typeof window === 'undefined') return 'imgly';

  const stored = localStorage.getItem('psp_magic_thumbnail_engine');
  if (stored === 'removebg' || stored === 'imgly') return stored;

  try {
    const rawSettings = localStorage.getItem('psp_settings_v1');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed?.magic_thumbnail_engine === 'removebg' || parsed?.magic_thumbnail_engine === 'imgly') {
        return parsed.magic_thumbnail_engine;
      }
    }
  } catch {
    // Ignore JSON error
  }

  return 'imgly';
}

/**
 * Save preferred Magic Thumbnail engine to localStorage
 */
export function saveStoredMagicThumbnailEngine(engine: 'imgly' | 'removebg'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('psp_magic_thumbnail_engine', engine);
}

/**
 * Convert base64 data URL to native binary Blob
 */
export function dataURLtoBlob(dataurl: string): Blob {
  const parts = dataurl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const binaryStr = atob(parts[1]);
  const len = binaryStr.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8arr[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Convert Blob to base64 data URL string
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Auto-centers a transparent product image in a square canvas.
 * 1. Loads image to HTMLImageElement
 * 2. Draws to canvas, reads ImageData
 * 3. Finds bounding box of pixels with alpha > 10 (minX, minY, maxX, maxY)
 * 4. If no object is found, returns original image
 * 5. Crops to bounding box + padding (4-8%)
 * 6. Creates a square canvas (1024x1024) with transparent background
 * 7. Scales object to fit (object-fit: contain), preserving aspect ratio
 * 8. Draws object in the center (horizontally & vertically)
 * 9. Exports to PNG data URL
 */
export async function autoCenterProductCanvas(
  transparentDataUrl: string,
  targetSize = 1024,
  paddingRatio = 0.06 // 6% padding
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return transparentDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;

        if (srcW === 0 || srcH === 0) {
          return resolve(transparentDataUrl);
        }

        // 1 & 2. Draw original image to temporary canvas to read pixel data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = srcW;
        tempCanvas.height = srcH;
        const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          return resolve(transparentDataUrl);
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, srcW, srcH);
        const data = imageData.data;

        let minX = srcW;
        let minY = srcH;
        let maxX = -1;
        let maxY = -1;

        // 3. Find bounding box of pixels with alpha > 10
        for (let y = 0; y < srcH; y++) {
          const rowOffset = y * srcW * 4;
          for (let x = 0; x < srcW; x++) {
            const alpha = data[rowOffset + x * 4 + 3];
            if (alpha > 10) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // 4. If no object is found, return original image as-is
        if (maxX < minX || maxY < minY) {
          return resolve(transparentDataUrl);
        }

        const bboxW = maxX - minX + 1;
        const bboxH = maxY - minY + 1;

        // 5. Crop to bounding box + padding (4-8%)
        const padX = Math.round(bboxW * paddingRatio);
        const padY = Math.round(bboxH * paddingRatio);

        const cropX = Math.max(0, minX - padX);
        const cropY = Math.max(0, minY - padY);
        const cropW = Math.min(srcW - cropX, maxX + 1 + padX - cropX);
        const cropH = Math.min(srcH - cropY, maxY + 1 + padY - cropY);

        if (cropW <= 0 || cropH <= 0) {
          return resolve(transparentDataUrl);
        }

        // 6. Create square output canvas (1024x1024), transparent background
        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetSize;
        outCanvas.height = targetSize;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) {
          return resolve(transparentDataUrl);
        }

        // Inner margin for safe breathing room inside the square
        const canvasMargin = Math.round(targetSize * paddingRatio);
        const maxDrawW = targetSize - canvasMargin * 2;
        const maxDrawH = targetSize - canvasMargin * 2;

        // 7. Scale object so it fits within canvas (object-fit: contain), preserve aspect ratio
        const scale = Math.min(maxDrawW / cropW, maxDrawH / cropH);
        const drawW = Math.round(cropW * scale);
        const drawH = Math.round(cropH * scale);

        // 8. Draw object in center of canvas (center horizontally & vertically)
        const drawX = Math.round((targetSize - drawW) / 2);
        const drawY = Math.round((targetSize - drawH) / 2);

        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';
        outCtx.drawImage(
          tempCanvas,
          cropX,
          cropY,
          cropW,
          cropH,
          drawX,
          drawY,
          drawW,
          drawH
        );

        // 9. Export to data URL PNG
        const centeredDataUrl = outCanvas.toDataURL('image/png');
        resolve(centeredDataUrl);
      } catch (err) {
        console.warn('[Magic Thumbnail] Auto-center error, returning cutout directly:', err);
        resolve(transparentDataUrl);
      }
    };

    img.onerror = (err) => {
      console.warn('[Magic Thumbnail] Image load error during auto-centering:', err);
      resolve(transparentDataUrl);
    };

    img.src = transparentDataUrl;
  });
}

/**
 * Removes background using client-side @imgly/background-removal (v1.7.0).
 * Configured with exact publicPath and cpu isnet_fp16 model settings.
 */
export async function removeBackgroundWithImgly(imageDataUrl: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('imgly background removal can only be run in client browser');
  }

  // 3. Dynamic import saja di client
  const mod = await import('@imgly/background-removal');
  const removeBackground = (mod as any).default || (mod as any).removeBackground || mod;

  if (typeof removeBackground !== 'function') {
    throw new Error('removeBackground function is not available in @imgly/background-removal');
  }

  // 5. Pastikan input ke removeBackground adalah data URL string atau Blob, bukan buffer Node
  const blobInput = dataURLtoBlob(imageDataUrl);

  // 2. Saat panggil removeBackground, set config
  const config = {
    debug: true,
    device: 'cpu' as const,
    model: 'isnet_fp16' as const,
    publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
    output: { format: 'image/png' as const, quality: 0.9 },
    proxyToWorker: false,
  };

  const outputBlob: Blob = await removeBackground(blobInput, config);
  const rawCutoutDataUrl = await blobToDataUrl(outputBlob);

  // Auto-center post-process on square canvas
  const centeredDataUrl = await autoCenterProductCanvas(rawCutoutDataUrl, 1024, 0.06);
  return centeredDataUrl;
}

/**
 * Parse Remove.bg API error responses into clear Indonesian error messages
 */
function parseRemoveBgError(status: number, data: any): { message: string; isQuota: boolean; isAuth: boolean } {
  let detailMsg = '';
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const firstErr = data.errors[0];
    detailMsg = firstErr.detail || firstErr.title || '';
  }

  const isAuth = status === 401 || detailMsg.toLowerCase().includes('api key') || detailMsg.toLowerCase().includes('auth');
  const isQuota = status === 402 || detailMsg.toLowerCase().includes('credits') || detailMsg.toLowerCase().includes('insufficient');
  const isRateLimit = status === 429 || detailMsg.toLowerCase().includes('rate limit');

  if (isAuth) {
    return {
      message: 'API Key tidak valid atau dinonaktifkan',
      isQuota: false,
      isAuth: true,
    };
  }

  if (isQuota) {
    return {
      message: 'Kredit akun habis (402 Insufficient Credits)',
      isQuota: true,
      isAuth: false,
    };
  }

  if (isRateLimit) {
    return {
      message: 'Batas frekuensi panggilan terlampaui (429 Rate Limit)',
      isQuota: true,
      isAuth: false,
    };
  }

  return {
    message: detailMsg || `Status HTTP ${status}`,
    isQuota: false,
    isAuth: false,
  };
}

/**
 * Direct call to Remove.bg API with a specific API key
 */
async function callRemoveBgWithKey(imageDataUrl: string, apiKey: string): Promise<MagicThumbnailResult & { isQuotaOrAuthError?: boolean }> {
  try {
    const blob = dataURLtoBlob(imageDataUrl);
    const formData = new FormData();
    formData.append('size', 'auto');
    formData.append('image_file', blob, 'image.png');

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const base64Str = arrayBufferToBase64(arrayBuffer);
      const credits = res.headers.get('X-Credits-Charged')
        ? parseFloat(res.headers.get('X-Credits-Charged') || '1')
        : 1;

      return {
        success: true,
        transparentImageUrl: `data:image/png;base64,${base64Str}`,
        creditsCharged: credits,
        method: 'removebg',
      };
    }

    const errData = await res.json().catch(() => null);
    const parsed = parseRemoveBgError(res.status, errData);

    return {
      success: false,
      error: parsed.message,
      isQuotaOrAuthError: parsed.isQuota || parsed.isAuth,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Gagal terhubung ke Remove.bg',
      isQuotaOrAuthError: false,
    };
  }
}

/**
 * Executes Magic Thumbnail:
 * - Can use client-side @imgly/background-removal (v1.7.0, free & unlimited)
 * - Or Remove.bg API (multi-key pool with automatic failover)
 * - Always applies auto-center & aspect-ratio fit to 1024x1024 square canvas
 */
export async function executeMagicThumbnail(
  imageDataUrl: string,
  preferredEngine?: 'imgly' | 'removebg',
  explicitKeys?: string | string[]
): Promise<MagicThumbnailResult> {
  if (!imageDataUrl) {
    return {
      success: false,
      error: 'Data gambar produk tidak ditemukan.',
    };
  }

  const engine = preferredEngine || getStoredMagicThumbnailEngine();

  // Helper to gather Remove.bg keys from localStorage or server .env
  const getKeys = async (): Promise<string[]> => {
    let keys: string[] = [];
    if (explicitKeys) {
      keys = (Array.isArray(explicitKeys) ? explicitKeys : [explicitKeys]).map((k) => k.trim()).filter(Boolean);
    }
    if (keys.length === 0) {
      keys = getStoredRemoveBgApiKeys();
    }
    if (keys.length === 0) {
      try {
        const serverCheck = await fetch('/api/removebg-config');
        if (serverCheck.ok) {
          const configData = await serverCheck.json();
          if (configData?.configured && configData?.apiKey) {
            keys.push(configData.apiKey);
          }
        }
      } catch {
        // Ignored
      }
    }
    return keys;
  };

  // 1. IF REMOVE.BG IS CHOSEN AS ENGINE
  if (engine === 'removebg') {
    const keys = await getKeys();
    if (keys.length === 0) {
      console.warn('[Magic Thumbnail] Mode Remove.bg aktif tetapi belum ada API key. Mengalihkan ke Imgly AI browser...');
      try {
        const centeredDataUrl = await removeBackgroundWithImgly(imageDataUrl);
        return {
          success: true,
          transparentImageUrl: centeredDataUrl,
          method: 'imgly',
        };
      } catch (err: any) {
        return {
          success: false,
          error: `API Key Remove.bg belum diisi di Pengaturan Toko & DB. Imgly browser error: ${err?.message || 'Error'}`,
        };
      }
    }

    const errorLogs: string[] = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const keyPreview = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 3)}` : `Key #${i + 1}`;
      const result = await callRemoveBgWithKey(imageDataUrl, key);

      if (result.success && result.transparentImageUrl) {
        const centeredResult = await autoCenterProductCanvas(result.transparentImageUrl, 1024, 0.06);
        return {
          ...result,
          transparentImageUrl: centeredResult,
          keyIndex: i,
          totalKeys: keys.length,
          method: 'removebg',
        };
      }

      const failReason = result.error || 'Gagal memproses';
      errorLogs.push(`Key #${i + 1} (${keyPreview}): ${failReason}`);

      if (i < keys.length - 1) {
        console.warn(`[Remove.bg Multi-Key] Key #${i + 1} gagal (${failReason}). Mengalihkan ke Key #${i + 2}...`);
      }
    }

    // All Remove.bg keys failed -> Failover to Imgly AI as safety net!
    console.warn('[Magic Thumbnail] Semua key Remove.bg gagal. Mencoba fallback ke Imgly AI browser...');
    try {
      const centeredDataUrl = await removeBackgroundWithImgly(imageDataUrl);
      return {
        success: true,
        transparentImageUrl: centeredDataUrl,
        method: 'imgly',
      };
    } catch {
      const isMultiple = keys.length > 1;
      const summaryMsg = isMultiple
        ? `Semua ${keys.length} API Key Remove.bg gagal:\n` + errorLogs.map((e) => `• ${e}`).join('\n')
        : `Remove.bg Gagal: ${errorLogs[0] || 'Periksa API Key atau sisa kredit Anda di Pengaturan Toko & DB.'}`;
      return {
        success: false,
        error: summaryMsg,
      };
    }
  }

  // 2. DEFAULT: IMGLY AI BROWSER ENGINE (GRATIS & TANPA API KEY)
  let imglyError: string | null = null;
  try {
    console.log('[Magic Thumbnail] Menjalankan AI background removal di browser (@imgly/background-removal)...');
    const centeredDataUrl = await removeBackgroundWithImgly(imageDataUrl);
    return {
      success: true,
      transparentImageUrl: centeredDataUrl,
      method: 'imgly',
    };
  } catch (err: any) {
    imglyError = err?.message || 'Gagal memproses background removal di browser';
    console.warn('[Magic Thumbnail] Client-side imgly failed, mengecek fallback Remove.bg:', imglyError);
  }

  // Fallback to Remove.bg if Imgly failed and keys exist
  const keys = await getKeys();
  if (keys.length > 0) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const result = await callRemoveBgWithKey(imageDataUrl, key);
      if (result.success && result.transparentImageUrl) {
        const centeredResult = await autoCenterProductCanvas(result.transparentImageUrl, 1024, 0.06);
        return {
          ...result,
          transparentImageUrl: centeredResult,
          keyIndex: i,
          totalKeys: keys.length,
          method: 'removebg',
        };
      }
    }
  }

  return {
    success: false,
    error: `Gagal memproses Magic Thumbnail: ${imglyError}`,
  };
}
