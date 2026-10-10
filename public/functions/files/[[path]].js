function b64ToBuf(b64) { const s = atob(b64); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
export async function onRequestGet(context) {
  try {
    const path = context.params.path;
    const key = Array.isArray(path) ? path.join('/') : path;
    const row = await context.env.DB.prepare('SELECT content_type,data FROM files WHERE key=?').bind(key).first();
    if (!row) return new Response('not found', { status: 404 });
    return new Response(b64ToBuf(row.data), { headers: { 'content-type': row.content_type || 'application/octet-stream', 'cache-control': 'public,max-age=86400' } });
  } catch (e) { return new Response(e.message, { status: 500 }); }
}