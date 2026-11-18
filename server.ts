import 'dotenv/config';
import path from 'path';
import express from 'express';
import { createApiApp } from './server/api.js';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = createApiApp();

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kom Khoroch server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
