/**
 * Magic Thumbnail AI - 100% Remove.bg API Background Removal
 * Official API: https://www.remove.bg/api
 *
 * Uses native FormData + fetch with zero external npm dependencies.
 * Zero-fallback policy: Always uses Remove.bg or returns explicit diagnostic errors.
 */

export interface MagicThumbnailResult {
  success: boolean;
  transparentImageUrl?: string;
  error?: string;
  creditsCharged?: number;
  method?: 'removebg';
}

/**
 * Retrieves the stored Remove.bg API Key from localStorage or settings cache.
 */
export function getStoredRemoveBgApiKey(): string {
  if (typeof window === 'undefined') return '';

  // 1. Direct key from localStorage (requested key: psp_removebg_api_key)
  const directKey = localStorage.getItem('psp_removebg_api_key');
  if (directKey && directKey.trim()) {
    return directKey.trim();
  }

  // 2. Settings JSON stored by app
  try {
    const rawSettings = localStorage.getItem('psp_settings_v1');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed?.removebg_api_key && typeof parsed.removebg_api_key === 'string' && parsed.removebg_api_key.trim()) {
        return parsed.removebg_api_key.trim();
      }
    }
  } catch {
    // Ignore JSON parse errors
  }

  return '';
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
function parseRemoveBgError(status: number, data: any): string {
  let detailMsg = '';
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const firstErr = data.errors[0];
    detailMsg = firstErr.detail || firstErr.title || '';
  }

  if (status === 401 || detailMsg.toLowerCase().includes('api key') || detailMsg.toLowerCase().includes('auth')) {
    return 'API Key Remove.bg tidak valid atau salah. Silakan periksa kembali di menu "Pengaturan Toko & DB".';
  }

  if (status === 402 || detailMsg.toLowerCase().includes('credits') || detailMsg.toLowerCase().includes('insufficient')) {
    return 'Kredit akun Remove.bg Anda telah habis (402 Insufficient Credits). Silakan top up kredit atau gunakan akun Remove.bg lain.';
  }

  if (status === 429 || detailMsg.toLowerCase().includes('rate limit')) {
    return 'Batas frekuensi panggilan Remove.bg terlampaui (429 Rate Limit). Silakan tunggu sebentar dan coba lagi.';
  }

  if (detailMsg) {
    return `Remove.bg Error (${status}): ${detailMsg}`;
  }

  return `Gagal memproses gambar dengan Remove.bg (Status HTTP ${status}).`;
}

/**
 * Direct call to Remove.bg API (POST https://api.remove.bg/v1.0/removebg)
 * Native implementation using fetch + FormData.
 */
async function callRemoveBgDirectly(imageDataUrl: string, apiKey: string): Promise<MagicThumbnailResult> {
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
    const errorText = parseRemoveBgError(res.status, errData);

    return {
      success: false,
      error: errorText,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal menghubungi server Remove.bg: ${err?.message || 'Pastikan koneksi internet aktif'}`,
    };
  }
}

/**
 * Executes Magic Thumbnail 100% using Remove.bg API.
 * Strict zero-fallback policy: Never falls back to canvas or Gemini Image.
 */
export async function executeMagicThumbnail(
  imageDataUrl: string,
  explicitApiKey?: string
): Promise<MagicThumbnailResult> {
  if (!imageDataUrl) {
    return {
      success: false,
      error: 'Data gambar produk tidak ditemukan.',
    };
  }

  // 1. Determine active Remove.bg API Key
  let activeApiKey = (explicitApiKey || getStoredRemoveBgApiKey()).trim();

  // If no API key is set in localStorage or settings, check if server has REMOVEBG_API_KEY
  if (!activeApiKey) {
    try {
      const serverCheck = await fetch('/api/removebg-config');
      if (serverCheck.ok) {
        const configData = await serverCheck.json();
        if (configData?.configured && configData?.apiKey) {
          activeApiKey = configData.apiKey;
        }
      }
    } catch {
      // Ignored
    }
  }

  // If still empty, return clear error immediately as required
  if (!activeApiKey) {
    return {
      success: false,
      error: 'API Key Remove.bg belum diisi. Silakan masukkan API Key di menu "Pengaturan Toko & DB" terlebih dahulu.',
    };
  }

  // 2. Call Remove.bg API directly via native fetch + FormData
  // If browser direct call encounters an issue, proxy via /api/magic-thumbnail
  try {
    const directResult = await callRemoveBgDirectly(imageDataUrl, activeApiKey);
    if (directResult.success) {
      return directResult;
    }

    // If it was an official API error (like 401 invalid key or 402 no credits), return it immediately without proxying
    if (directResult.error && (directResult.error.includes('401') || directResult.error.includes('402') || directResult.error.includes('Key'))) {
      return directResult;
    }

    // Try server proxy endpoint if available
    const proxyRes = await fetch('/api/magic-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageDataUrl,
        apiKey: activeApiKey,
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success && data.transparentImageUrl) {
        return {
          success: true,
          transparentImageUrl: data.transparentImageUrl,
          method: 'removebg',
        };
      }
    }

    return directResult;
  } catch (err: any) {
    return {
      success: false,
      error: `Kendala Remove.bg: ${err?.message || 'Gagal memproses gambar'}`,
    };
  }
}
