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

  // API to fetch Remove.bg config
  app.get('/api/removebg-config', (_req, res) => {
    try {
      const apiKey = process.env.REMOVEBG_API_KEY || '';
      return res.json({
        configured: !!apiKey,
        apiKey: apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : '',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // API to test Remove.bg API Key
  app.post('/api/removebg/test-key', async (req, res) => {
    try {
      const { apiKey } = req.body;
      const effectiveKey = (apiKey || process.env.REMOVEBG_API_KEY || '').trim();
      if (!effectiveKey) {
        return res.status(400).json({ success: false, message: 'API Key Remove.bg belum diisi' });
      }

      const rbgRes = await fetch('https://api.remove.bg/v1.0/account', {
        headers: { 'X-Api-Key': effectiveKey },
      });

      const data = await rbgRes.json().catch(() => null);

      if (rbgRes.ok) {
        const totalCredits = data?.data?.attributes?.credits?.total ?? 'Tersedia';
        return res.json({
          success: true,
          message: `API Key Remove.bg valid & aktif! Total kredit: ${totalCredits}`,
          credits: data?.data?.attributes?.credits,
        });
      }

      const errDetail = data?.errors?.[0]?.detail || data?.errors?.[0]?.title || 'API Key tidak valid';
      return res.status(400).json({
        success: false,
        message: `Uji API Key Remove.bg gagal: ${errDetail}`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Gagal menghubungi server Remove.bg: ${err?.message || 'Koneksi error'}`,
      });
    }
  });

  // API to save Remove.bg config permanently on server (.env)
  app.post('/api/removebg-config', (req, res) => {
    try {
      const { apiKey } = req.body;
      const cleanKey = (apiKey || '').trim();

      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      const lines = envContent.split('\n').filter((l) => !l.startsWith('REMOVEBG_API_KEY='));
      if (cleanKey) {
        lines.push(`REMOVEBG_API_KEY=${cleanKey}`);
        process.env.REMOVEBG_API_KEY = cleanKey;
      } else {
        delete process.env.REMOVEBG_API_KEY;
      }
      fs.writeFileSync(envPath, lines.join('\n').trim() + '\n', 'utf-8');

      console.log('[Remove.bg Config] Saved permanently to server');
      return res.json({ success: true, message: 'API Key Remove.bg berhasil disimpan ke server!' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan key ke server' });
    }
  });

  // API for Magic Thumbnail (Hapus background menggunakan Remove.bg)
  app.post('/api/magic-thumbnail', async (req, res) => {
    try {
      const { image, apiKey } = req.body;
      if (!image) {
        return res.status(400).json({ success: false, error: 'Gambar tidak ditemukan' });
      }

      const effectiveKey = (apiKey || process.env.REMOVEBG_API_KEY || '').trim();
      if (!effectiveKey) {
        return res.status(400).json({
          success: false,
          error: 'API Key Remove.bg belum diisi. Silakan masukkan API Key di menu "Pengaturan Toko & DB" terlebih dahulu.',
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
        return res.json({
          success: true,
          transparentImageUrl: `data:image/png;base64,${base64Out}`,
          method: 'removebg',
        });
      }

      const errJson = await rbgResponse.json().catch(() => null);
      let errorMsg = 'Gagal memproses gambar';
      if (errJson?.errors?.[0]?.detail || errJson?.errors?.[0]?.title) {
        errorMsg = errJson.errors[0].detail || errJson.errors[0].title;
      }

      if (rbgResponse.status === 401) {
        errorMsg = 'API Key Remove.bg tidak valid atau salah. Silakan periksa kembali di Pengaturan Toko & DB.';
      } else if (rbgResponse.status === 402) {
        errorMsg = 'Kredit akun Remove.bg Anda telah habis (402 Insufficient Credits). Silakan top up kredit akun Anda.';
      } else if (rbgResponse.status === 429) {
        errorMsg = 'Batas frekuensi panggilan Remove.bg terlampaui (429 Rate Limit). Silakan tunggu sebentar.';
      }

      return res.status(rbgResponse.status).json({
        success: false,
        error: errorMsg,
      });
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
