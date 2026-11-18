import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  HttpError,
  checkHealth,
  getSubmissions,
  createSubmission,
  bulkUpsertSubmissions,
  updateSubmission,
  deleteSubmission,
  deleteMultipleSubmissions,
  getConfig,
  saveConfig,
} from './server/neonDb.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

function handleApiError(res: Response, err: unknown) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  const message = err instanceof Error ? err.message : "Serverda kutilmagan xatolik yuz berdi";
  console.error('API error:', err);
  return res.status(500).json({ error: message });
}

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const info = await checkHealth();
    res.json(info);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/submissions', async (_req: Request, res: Response) => {
  try {
    const rows = await getSubmissions();
    res.json(rows);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/submissions', async (req: Request, res: Response) => {
  try {
    const created = await createSubmission(req.body || {});
    res.status(201).json(created);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/submissions/bulk', async (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : Array.isArray(req.body) ? req.body : [];
    const result = await bulkUpsertSubmissions(items);
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/submissions/bulk-delete', async (req: Request, res: Response) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
    await deleteMultipleSubmissions(ids);
    res.json({ ok: true, deletedCount: ids.length });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.patch('/api/submissions/:id', async (req: Request, res: Response) => {
  try {
    const updated = await updateSubmission(String(req.params.id), req.body || {});
    res.json(updated);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.delete('/api/submissions/:id', async (req: Request, res: Response) => {
  try {
    await deleteSubmission(String(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/config', async (_req: Request, res: Response) => {
  try {
    const cfg = await getConfig();
    res.json(cfg);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.put('/api/config', async (req: Request, res: Response) => {
  try {
    const saved = await saveConfig(req.body || {});
    res.json(saved);
  } catch (err) {
    handleApiError(res, err);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
