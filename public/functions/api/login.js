async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const a = await context.env.DB.prepare('SELECT pass_hash FROM admins WHERE email=?').bind((body.email||'').toLowerCase()).first();
    const hash = await sha256('cafe-azur::' + (body.password || ''));
    if (!a || a.pass_hash !== hash) return new Response('unauthorized', { status: 401 });
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expiry = Date.now() + 24 * 3600000;
    await context.env.DB.prepare('INSERT INTO sessions(token,email,expiry) VALUES(?,?,?)').bind(token, body.email.toLowerCase(), expiry).run();
    return new Response(JSON.stringify({ token }), { headers: { 'content-type': 'application/json' } });
  } catch (e) { return new Response(e.message, { status: 400 }); }
}