/**
 * Magic Thumbnail AI - 100% Gemini Image Background Removal
 * Directly utilizes Gemini Vision/Image models via server proxy or client-side direct REST API.
 * Strict zero-fallback policy: Always uses Gemini or returns clear diagnostic error messages.
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
 * Direct call to Google Gemini REST API.
 * Guarantees execution even on static hosts (Vercel, Netlify, GitHub Pages)
 * where the Express backend `/api/magic-thumbnail` is not running.
 */
async function callGeminiDirectly(imageDataUrl: string, apiKey: string): Promise<MagicThumbnailResult> {
  let base64Data = imageDataUrl;
  let mimeType = 'image/png';
  const match = imageDataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    base64Data = match[2];
  }

  const prompt =
    'Precisely isolate and segment the main preloved product in this image (e.g. clothing, footwear, gadget, gaming hardware, console, accessory, collectibles) preserving all physical contours, edges, and details. Remove 100% of the surrounding background, room, floor, table, and casting shadows. The result must be exclusively a transparent PNG alpha cutout of the product with no background at all, optimized for e-commerce catalog display.';

  const models = ['gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image', 'gemini-3.1-flash-image'];
  let lastError = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        lastError = `Google API mengembalikan HTTP status ${res.status}`;
        continue;
      }

      const data = await res.json();

      if (res.ok && data) {
        const parts = data?.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const outMime = part.inlineData.mimeType || 'image/png';
            return {
              success: true,
              transparentImageUrl: `data:${outMime};base64,${part.inlineData.data}`,
              method: 'gemini',
            };
          }
        }

        const textOutput = parts.map((p: any) => p.text).filter(Boolean).join(' ');
        if (textOutput) {
          return {
            success: false,
            error: textOutput,
          };
        }
      }

      if (data?.error) {
        const code = data.error.code;
        const msg = data.error.message || '';
        if (
          code === 429 ||
          msg.includes('Quota exceeded') ||
          msg.includes('limit: 0') ||
          msg.includes('free_tier') ||
          msg.includes('RESOURCE_EXHAUSTED')
        ) {
          lastError =
            'Model Image Gemini memerlukan akun dengan billing aktif (Pay-as-you-go di Google AI Studio / Google Cloud). Akun free tier memiliki kuota 0 untuk model image.';
        } else if (msg.includes('API_KEY_INVALID') || msg.includes('not valid')) {
          return {
            success: false,
            error: 'API Key Gemini tidak valid. Silakan periksa kembali API Key di menu "Pengaturan Toko & DB".',
          };
        } else if (msg.includes('PERMISSION_DENIED')) {
          lastError = 'Akses ditolak (Permission Denied). Pastikan model Gemini Image diizinkan pada project API Key Anda.';
        } else {
          lastError = msg;
        }
      }
    } catch (err: any) {
      lastError = err?.message || 'Gagal terhubung ke Google Gemini API';
    }
  }

  return {
    success: false,
    error: lastError || 'Gemini tidak dapat memproses gambar ini. Pastikan foto produk terlihat jelas.',
  };
}

/**
 * Executes Magic Thumbnail background removal exclusively using Gemini Image AI.
 * Strict policy: Never falls back to canvas flood-fill.
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

  // If no API key is configured anywhere, notify user immediately
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
      } else {
        return {
          success: false,
          error: 'API Key Gemini belum diatur. Silakan masukkan API Key Gemini Anda di menu "Pengaturan Toko & DB" terlebih dahulu.',
        };
      }
    } catch {
      return {
        success: false,
        error: 'API Key Gemini belum diatur. Silakan masukkan API Key Gemini Anda di menu "Pengaturan Toko & DB" terlebih dahulu.',
      };
    }
  }

  // 2. Try server endpoint first (if Express server or Vercel serverless function is reachable)
  let shouldCallDirect = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

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

    // If server returned 404 or HTML (e.g. Vercel static routing without serverless function)
    if (res.status === 404 || !contentType.includes('application/json')) {
      shouldCallDirect = true;
    } else {
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
  } catch {
    // Network or abort error on local endpoint -> fallback to direct Google Gemini API call
    shouldCallDirect = true;
  }

  // 3. If backend endpoint returned 404 (e.g. deployed on Vercel/Netlify static), call Gemini directly
  if (shouldCallDirect) {
    if (!activeApiKey) {
      return {
        success: false,
        error: 'API Key Gemini belum diatur. Silakan masukkan API Key Gemini Anda di menu "Pengaturan Toko & DB" terlebih dahulu.',
      };
    }
    return await callGeminiDirectly(imageDataUrl, activeApiKey);
  }

  return {
    success: false,
    error: 'Terjadi kendala saat memproses Magic Thumbnail.',
  };
}
