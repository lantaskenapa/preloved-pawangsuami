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
