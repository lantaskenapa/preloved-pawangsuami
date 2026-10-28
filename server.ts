import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Tes koneksi API Gemini. Jawab hanya: OK',
      });

      if (response && response.text) {
        return res.json({ success: true, message: 'API Key Gemini valid & siap digunakan!' });
      }
      return res.status(500).json({ success: false, message: 'Tidak menerima respon dari Gemini' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'API Key tidak valid' });
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
          error: 'API Key Gemini belum diatur. Silakan masukkan di menu Pengaturan Toko & DB.',
        });
      }

      // Attempt Gemini image model editing if available
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
                text: 'Isolate the main preloved product subject, remove the entire background making it a completely transparent cutout PNG, keeping the product crisp and clean for an e-commerce catalog card.',
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
      } catch (geminiErr: any) {
        console.warn('[Gemini Magic Thumbnail warning]:', geminiErr?.message || geminiErr);
      }

      // Fallback signal for client-side canvas transparent cutout
      return res.json({
        success: false,
        fallback: true,
        message: 'Beralih ke mesin pemotongan transparan presisi...',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Gagal memproses Magic Thumbnail' });
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
