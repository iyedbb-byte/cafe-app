async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function onRequestPost(context) {
  try {
    const c = await context.env.DB.prepare('SELECT COUNT(*) c FROM admins').first();
    if (c.c > 0) return new Response('already exists', { status: 403 });
    const b = await context.request.json();
    if (!b.email || !b.password || b.password.length < 6) return new Response('invalid', { status: 400 });
    await context.env.DB.prepare('INSERT INTO admins(email,pass_hash,name) VALUES(?,?,?)').bind(b.email.toLowerCase(), await sha256('cafe-azur::' + b.password), b.name || '').run();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e) { return new Response(e.message, { status: 400 }); }
}