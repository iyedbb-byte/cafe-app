export async function onRequestPost(context) {
  try {
    const { id } = await context.request.json();
    await context.env.DB.prepare('DELETE FROM daily_availability WHERE product_id=?').bind(id).run();
    await context.env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
    await context.env.DB.prepare('UPDATE cafes SET last_change=?').bind(Date.now()).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e) { return new Response(e.message, { status: 400 }); }
}