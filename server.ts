import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(express.json({ limit: '10mb' }));

  const configPath = path.resolve(__dirname, 'src/supabaseConfig.json');
  const envPath = path.resolve(__dirname, '.env');

  // API to fetch permanent Supabase config
  app.get('/api/supabase-config', (_req, res) => {
    try {
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return res.json(parsed);
      }
      return res.json({
        url: process.env.VITE_SUPABASE_URL || '',
        anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal membaca konfigurasi' });
    }
  });

  // API to permanently save Supabase config on server disk
  app.post('/api/supabase-config', (req, res) => {
    try {
      const { url, anonKey } = req.body;
      const cleanUrl = (url || '').trim();
      const cleanKey = (anonKey || '').trim();

      const configData = {
        url: cleanUrl,
        anonKey: cleanKey,
        savedAt: new Date().toISOString(),
      };

      // 1. Write to src/supabaseConfig.json (bundled directly into frontend)
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf-8');

      // 2. Write to .env file for environment persistence
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }

      const lines = envContent.split('\n').filter((l) => !l.startsWith('VITE_SUPABASE_URL=') && !l.startsWith('VITE_SUPABASE_ANON_KEY='));
      lines.push(`VITE_SUPABASE_URL=${cleanUrl}`);
      lines.push(`VITE_SUPABASE_ANON_KEY=${cleanKey}`);
      fs.writeFileSync(envPath, lines.join('\n').trim() + '\n', 'utf-8');

      // Also set in current process.env
      process.env.VITE_SUPABASE_URL = cleanUrl;
      process.env.VITE_SUPABASE_ANON_KEY = cleanKey;

      console.log(`[Supabase Config] Saved permanently: URL=${cleanUrl}`);
      return res.json({ success: true, message: 'Konfigurasi Supabase berhasil disimpan permanen ke server!' });
    } catch (err: any) {
      console.error('[Supabase Config Error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan ke server' });
    }
  });

  // API to fetch permanent Gemini config
  app.get('/api/gemini-config', (_req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || '';
      return res.json({
        configured: !!apiKey,
        apiKey: apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : '',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // API to test a Gemini API Key
  app.post('/api/gemini/test-key', async (req, res) => {
    try {
      const { apiKey } = req.body;
      const effectiveKey = (apiKey || process.env.GEMINI_API_KEY || '').trim();
      if (!effectiveKey) {
        return res.status(400).json({ success: false, message: 'API Key Gemini belum diisi' });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey: effectiveKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      // Ultra-fast model metadata lookup (validates key permissions in ~200ms without token stream lag)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Koneksi ke Gemini timeout (8 detik). Silakan coba lagi.')), 8000)
      );

      const modelInfo = (await Promise.race([
        ai.models.get({ model: 'gemini-3.8-flash' }),
        timeoutPromise,
      ])) as any;

      if (modelInfo && (modelInfo.name || modelInfo.displayName)) {
        return res.json({
          success: true,
          message: `API Key Gemini valid & aktif! Terhubung ke model ${modelInfo.displayName || 'Gemini 3.8 Flash'}.`,
        });
      }

      return res.json({ success: true, message: 'API Key Gemini valid & siap digunakan!' });
    } catch (err: any) {
      let rawMsg = err?.message || 'API Key tidak valid atau tidak dapat diakses';
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed?.error?.message) {
          rawMsg = parsed.error.message;
        }
      } catch {
        // Not a JSON string error
      }

      console.warn('[Gemini Test-Key Failed]:', rawMsg);
      return res.status(400).json({ success: false, message: rawMsg });
    }
  });

  // API to save Gemini config permanently on server
  app.post('/api/gemini-config', (req, res) => {
    try {
      const { apiKey } = req.body;
      const cleanKey = (apiKey || '').trim();
      if (!cleanKey) {
        return res.status(400).json({ success: false, message: 'API Key tidak boleh kosong' });
      }

      // Write to .env
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      const lines = envContent.split('\n').filter((l) => !l.startsWith('GEMINI_API_KEY='));
      lines.push(`GEMINI_API_KEY=${cleanKey}`);
      fs.writeFileSync(envPath, lines.join('\n').trim() + '\n', 'utf-8');

      process.env.GEMINI_API_KEY = cleanKey;
      console.log('[Gemini Config] Saved permanently to server');
      return res.json({ success: true, message: 'API Key Gemini berhasil disimpan paten ke server!' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan key ke server' });
    }
  });

  // API for Magic Thumbnail (Hapus background)
  app.post('/api/magic-thumbnail', async (req, res) => {
    try {
      const { image, apiKey } = req.body;
      if (!image) {
        return res.status(400).json({ success: false, error: 'Gambar tidak ditemukan' });
      }

      const effectiveKey = (apiKey || process.env.GEMINI_API_KEY || '').trim();
      if (!effectiveKey) {
        return res.status(400).json({
          success: false,
          error: 'API Key Gemini belum diatur. Silakan masukkan API Key Gemini Anda di menu "Pengaturan Toko & DB" terlebih dahulu.',
        });
      }

      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({
          apiKey: effectiveKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        let base64Data = image;
        let mimeType = 'image/png';
        const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType,
                },
              },
              {
                text: 'Precisely isolate and segment the main preloved product in this image (e.g. clothing, footwear, gadget, gaming hardware, console, accessory, collectibles) preserving all physical contours, edges, and details. Remove 100% of the surrounding background, room, floor, table, and casting shadows. The result must be exclusively a transparent PNG alpha cutout of the product with no background at all, optimized for e-commerce catalog display.',
              },
            ],
          },
        });

        if (response?.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              const outMime = part.inlineData.mimeType || 'image/png';
              return res.json({
                success: true,
                transparentImageUrl: `data:${outMime};base64,${part.inlineData.data}`,
                method: 'gemini',
              });
            }
          }
        }

        const textOutput = response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join(' ') || '';
        return res.status(400).json({
          success: false,
          error: textOutput || 'Model Gemini tidak menghasilkan gambar transparan. Pastikan produk terlihat jelas dan coba lagi.',
        });
      } catch (geminiErr: any) {
        console.error('[Gemini Magic Thumbnail Error]:', geminiErr);
        let errorMsg = geminiErr?.message || 'Gagal memproses gambar dengan Gemini AI.';
        try {
          const parsed = JSON.parse(errorMsg);
          if (parsed?.error?.message) {
            errorMsg = parsed.error.message;
          }
        } catch {
          // not JSON
        }

        if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid')) {
          errorMsg = 'API Key Gemini tidak valid atau dinonaktifkan. Periksa kembali di Pengaturan Toko & DB.';
        } else if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('Quota exceeded') || errorMsg.includes('429')) {
          errorMsg = 'Kuota API Key Gemini telah habis (429 Resource Exhausted). Silakan cek billing atau ganti API Key.';
        } else if (errorMsg.includes('PERMISSION_DENIED')) {
          errorMsg = 'Akses ditolak (Permission Denied). Pastikan model Gemini Image diizinkan pada project API Key Anda.';
        }

        return res.status(400).json({
          success: false,
          error: `Gemini API Error: ${errorMsg}`,
        });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Gagal memproses Magic Thumbnail pada server' });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Running at http://0.0.0.0:${port}`);
  });
}

startServer();
