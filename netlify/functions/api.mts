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
} from '../../server/neonDb.ts';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export default async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const rawPath = url.pathname
      .replace(/^\/\.netlify\/functions\/api/, '')
      .replace(/^\/api/, '') || '/';
    const method = req.method.toUpperCase();

    if (method === 'GET' && rawPath === '/health') {
      return jsonResponse(await checkHealth());
    }

    if (method === 'GET' && rawPath === '/submissions') {
      return jsonResponse(await getSubmissions());
    }

    if (method === 'POST' && rawPath === '/submissions') {
      const body = await req.json().catch(() => ({}));
      return jsonResponse(await createSubmission(body), 201);
    }

    if (method === 'POST' && rawPath === '/submissions/bulk') {
      const body = await req.json().catch(() => ({}));
      const items = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];
      return jsonResponse(await bulkUpsertSubmissions(items));
    }

    if (method === 'POST' && rawPath === '/submissions/bulk-delete') {
      const body = await req.json().catch(() => ({}));
      const ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
      await deleteMultipleSubmissions(ids);
      return jsonResponse({ ok: true, deletedCount: ids.length });
    }

    const subMatch = rawPath.match(/^\/submissions\/([^/]+)$/);
    if (subMatch) {
      const id = decodeURIComponent(subMatch[1]);
      if (method === 'PATCH') {
        const body = await req.json().catch(() => ({}));
        return jsonResponse(await updateSubmission(id, body));
      }
      if (method === 'DELETE') {
        await deleteSubmission(id);
        return jsonResponse({ ok: true });
      }
    }

    if (method === 'GET' && rawPath === '/config') {
      return jsonResponse(await getConfig());
    }

    if (method === 'PUT' && rawPath === '/config') {
      const body = await req.json().catch(() => ({}));
      return jsonResponse(await saveConfig(body));
    }

    return jsonResponse({ error: `Yo'nalish topilmadi: ${method} ${rawPath}` }, 404);
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: err.message }, err.status);
    }
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    console.error('Netlify API function error:', err);
    return jsonResponse({ error: message }, 500);
  }
};
