export async function onRequestPost(context) {
  try {
    const b = await context.request.json();
    const cur = (await context.env.DB.prepare('SELECT * FROM cafes LIMIT 1').first()) || {};
    const brand = b.branding ? JSON.stringify(b.branding) : cur.branding || '{}';
    await context.env.DB.prepare('UPDATE cafes SET name=?,tagline=?,hours=?,address=?,branding=?,last_change=?')
      .bind(b.name ?? cur.name, b.tagline ?? cur.tagline, b.hours ?? cur.hours, b.address ?? cur.address, brand, Date.now()).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e) { return new Response(e.message, { status: 400 }); }
}