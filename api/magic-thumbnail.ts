export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { image, apiKey } = req.body || {};
    if (!image) {
      return res.status(400).json({ success: false, error: 'Gambar tidak ditemukan' });
    }

    const effectiveKey = (apiKey || process.env.REMOVEBG_API_KEY || '').trim();
    if (!effectiveKey) {
      return res.status(400).json({
        success: false,
        error: 'API Key Remove.bg belum diisi. Silakan masukkan di menu Pengaturan Toko & DB.',
      });
    }

    let base64Clean = image;
    const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) {
      base64Clean = match[2];
    }

    const formData = new FormData();
    formData.append('size', 'auto');
    formData.append('image_file_b64', base64Clean);

    const rbgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': effectiveKey,
      },
      body: formData,
    });

    if (rbgResponse.ok) {
      const arrayBuffer = await rbgResponse.arrayBuffer();
      const base64Out = Buffer.from(arrayBuffer).toString('base64');
      return res.status(200).json({
        success: true,
        transparentImageUrl: `data:image/png;base64,${base64Out}`,
        method: 'removebg',
      });
    }

    const errJson = await rbgResponse.json().catch(() => null);
    let errorMsg = 'Gagal memproses gambar dengan Remove.bg';
    if (errJson?.errors?.[0]?.detail || errJson?.errors?.[0]?.title) {
      errorMsg = errJson.errors[0].detail || errJson.errors[0].title;
    }

    if (rbgResponse.status === 401) {
      errorMsg = 'API Key Remove.bg tidak valid atau salah. Silakan periksa kembali di Pengaturan Toko & DB.';
    } else if (rbgResponse.status === 402) {
      errorMsg = 'Kredit akun Remove.bg Anda telah habis (402 Insufficient Credits). Silakan top up akun Anda.';
    } else if (rbgResponse.status === 429) {
      errorMsg = 'Batas panggilan Remove.bg terlampaui (429 Rate Limit). Silakan coba beberapa saat lagi.';
    }

    return res.status(rbgResponse.status).json({
      success: false,
      error: errorMsg,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
}
