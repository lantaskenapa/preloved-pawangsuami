export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { image, apiKey } = req.body || {};
    if (!image) {
      return res.status(400).json({ success: false, error: 'Gambar tidak ditemukan' });
    }

    const effectiveKey = (apiKey || process.env.GEMINI_API_KEY || '').trim();
    if (!effectiveKey) {
      return res.status(400).json({
        success: false,
        error: 'API Key Gemini belum diatur. Silakan masukkan di menu Pengaturan Toko & DB.',
      });
    }

    let base64Data = image;
    let mimeType = 'image/png';
    const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    const prompt = 'Precisely isolate and segment the main preloved product in this image (e.g. clothing, footwear, gadget, gaming hardware, console, accessory, collectibles) preserving all physical contours, edges, and details. Remove 100% of the surrounding background, room, floor, table, and casting shadows. The result must be exclusively a transparent PNG alpha cutout of the product with no background at all, optimized for e-commerce catalog display.';

    const models = ['gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image', 'gemini-3.1-flash-image'];
    let lastError = '';

    for (const model of models) {
      try {
        const googleRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(effectiveKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inlineData: { mimeType, data: base64Data } },
                    { text: prompt },
                  ],
                },
              ],
            }),
          }
        );

        const data = await googleRes.json();
        if (googleRes.ok && data) {
          const parts = data?.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              const outMime = part.inlineData.mimeType || 'image/png';
              return res.status(200).json({
                success: true,
                transparentImageUrl: `data:${outMime};base64,${part.inlineData.data}`,
                method: 'gemini',
              });
            }
          }
        }

        if (data?.error) {
          const code = data.error.code;
          const msg = data.error.message || '';
          if (code === 429 || msg.includes('Quota exceeded') || msg.includes('limit: 0') || msg.includes('free_tier')) {
            lastError = 'Kuota model Image Gemini tidak mencukupi atau akun free tier belum mengaktifkan billing Pay-as-you-go di Google AI Studio (Model Image membutuhkan billing aktif).';
          } else if (msg.includes('API_KEY_INVALID') || msg.includes('not valid')) {
            lastError = 'API Key Gemini tidak valid. Silakan periksa kembali di Pengaturan Toko & DB.';
          } else {
            lastError = msg;
          }
        }
      } catch (e: any) {
        lastError = e?.message || 'Gagal menghubungi Gemini API';
      }
    }

    return res.status(400).json({
      success: false,
      error: `Gemini Error: ${lastError}`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
}
