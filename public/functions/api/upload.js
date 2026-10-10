function bufToB64(buf) { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
export async function onRequestPost(context) {
  try {
    const fd = await context.request.formData();
    const f = fd.get('file');
    if (!f || !f.size) return new Response('no file', { status: 400 });
    if (f.size > 1.5 * 1024 * 1024) return new Response('too large', { status: 413 });
    const ext = (f.name || 'img').split('.').pop().toLowerCase();
    const key = 'assets/' + crypto.randomUUID() + '.' + ext;
    const b64 = bufToB64(await f.arrayBuffer());
    await context.env.DB.prepare('INSERT INTO files(key,content_type,data) VALUES(?,?,?)').bind(key, f.type, b64).run();
    const url = new URL(context.request.url);
    return new Response(JSON.stringify({ url: url.origin + '/files/' + key }), { headers: { 'content-type': 'application/json' } });
  } catch (e) { return new Response(e.message, { status: 400 }); }
}