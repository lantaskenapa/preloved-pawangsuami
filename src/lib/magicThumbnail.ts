/**
 * Magic Thumbnail AI - 100% Gemini Image Background Removal
 * Directly utilizes Gemini Vision/Image model via server proxy.
 * Strict zero-fallback policy: Always returns Gemini transparent PNG or clear diagnostic errors.
 */

export interface MagicThumbnailResult {
  success: boolean;
  transparentImageUrl?: string;
  error?: string;
  method?: 'gemini';
}

/**
 * Retrieves the stored Gemini API Key from localStorage or settings cache.
 */
export function getStoredGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';

  // 1. Direct key from Pengaturan Toko & DB
  const directKey = localStorage.getItem('psp_gemini_api_key');
  if (directKey && directKey.trim()) {
    return directKey.trim();
  }

  // 2. Settings JSON stored by app
  try {
    const rawSettings = localStorage.getItem('psp_settings_v1');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed?.gemini_api_key && typeof parsed.gemini_api_key === 'string' && parsed.gemini_api_key.trim()) {
        return parsed.gemini_api_key.trim();
      }
    }
  } catch {
    // Ignore JSON parse errors
  }

  return '';
}

/**
 * Executes Magic Thumbnail background removal exclusively using Gemini Image AI.
 * Strict policy: Never falls back to canvas flood-fill or client-engine.
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

  // 1. Determine active Gemini API Key
  const activeApiKey = (explicitApiKey || getStoredGeminiApiKey()).trim();

  // If no API key is set in localStorage/settings, notify the user immediately
  if (!activeApiKey) {
    // Check if server already has GEMINI_API_KEY env configured
    try {
      const serverCheck = await fetch('/api/gemini-config');
      if (serverCheck.ok) {
        const configData = await serverCheck.json();
        if (!configData.configured) {
          return {
            success: false,
            error: 'API Key Gemini belum diatur. Silakan masukkan API Key Gemini Anda di menu "Pengaturan Toko & DB" terlebih dahulu.',
          };
        }
      }
    } catch {
      return {
        success: false,
        error: 'API Key Gemini belum diatur. Silakan masukkan API Key Gemini Anda di menu "Pengaturan Toko & DB" terlebih dahulu.',
      };
    }
  }

  // 2. Send image to Gemini server endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout for high-res AI model processing

    const res = await fetch('/api/magic-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageDataUrl,
        apiKey: activeApiKey,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data.success && data.transparentImageUrl) {
        return {
          success: true,
          transparentImageUrl: data.transparentImageUrl,
          method: 'gemini',
        };
      } else {
        return {
          success: false,
          error: data.error || data.message || `Gagal memproses Magic Thumbnail (HTTP ${res.status})`,
        };
      }
    }

    const textErr = await res.text();
    return {
      success: false,
      error: textErr || `Server mengembalikan response tidak valid (HTTP ${res.status})`,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        success: false,
        error: 'Proses Gemini timeout (>35 detik). Pastikan koneksi internet stabil dan coba lagi.',
      };
    }

    return {
      success: false,
      error: `Gagal menghubungi server Gemini: ${err?.message || 'Pastikan server aktif'}`,
    };
  }
}
