/**
 * Magic Thumbnail AI - 100% Remove.bg API with Multi-Key Quota Failover
 * Official API: https://www.remove.bg/api
 *
 * When an API key runs out of quota (HTTP 402 / 429), the engine automatically
 * fails over to Key #2, Key #3, etc. seamlessly.
 */

export interface MagicThumbnailResult {
  success: boolean;
  transparentImageUrl?: string;
  error?: string;
  creditsCharged?: number;
  keyIndex?: number;
  totalKeys?: number;
  method?: 'removebg';
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
 * Convert base64 data URL to native binary Blob
 */
function dataURLtoBlob(dataurl: string): Blob {
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
 * Executes Magic Thumbnail with automatic multi-key failover.
 * If key #1 runs out of quota or is invalid, automatically fails over to key #2, #3, etc.
 */
export async function executeMagicThumbnail(
  imageDataUrl: string,
  explicitKeys?: string | string[]
): Promise<MagicThumbnailResult> {
  if (!imageDataUrl) {
    return {
      success: false,
      error: 'Data gambar produk tidak ditemukan.',
    };
  }

  // 1. Gather all available keys
  let keys: string[] = [];
  if (explicitKeys) {
    keys = (Array.isArray(explicitKeys) ? explicitKeys : [explicitKeys]).map((k) => k.trim()).filter(Boolean);
  }
  if (keys.length === 0) {
    keys = getStoredRemoveBgApiKeys();
  }

  // If still empty, check server .env backup
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

  if (keys.length === 0) {
    return {
      success: false,
      error: 'API Key Remove.bg belum diisi. Silakan masukkan minimal 1 API Key di menu "Pengaturan Toko & DB" terlebih dahulu.',
    };
  }

  // 2. Multi-Key Failover Loop
  const errorLogs: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyPreview = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 3)}` : `Key #${i + 1}`;

    const result = await callRemoveBgWithKey(imageDataUrl, key);

    if (result.success && result.transparentImageUrl) {
      return {
        ...result,
        keyIndex: i,
        totalKeys: keys.length,
      };
    }

    // Log failure and try next key if quota exceeded or auth failed
    const failReason = result.error || 'Gagal memproses';
    errorLogs.push(`Key #${i + 1} (${keyPreview}): ${failReason}`);

    // If there's another key available, continue to next
    if (i < keys.length - 1) {
      console.warn(`[Remove.bg Multi-Key] Key #${i + 1} gagal (${failReason}). Mengalihkan ke Key #${i + 2}...`);
    }
  }

  // All keys failed
  const isMultiple = keys.length > 1;
  const summaryMsg = isMultiple
    ? `Semua ${keys.length} API Key Remove.bg gagal atau kehabisan kuota:\n` + errorLogs.map((e) => `• ${e}`).join('\n')
    : `Remove.bg Gagal: ${errorLogs[0] || 'Periksa API Key atau sisa kredit Anda di Pengaturan Toko & DB.'}`;

  return {
    success: false,
    error: summaryMsg,
  };
}
