export async function onRequestPost(context) {
  try {
    const b = await context.request.json();
    const day = (off=0)=>{const d=new Date();d.setDate(d.getDate()+off);return d.toISOString().slice(0,10);};
    for (const id of b.ids) {
      await context.env.DB.prepare('INSERT INTO daily_availability(product_id,day,available) VALUES(?,?,?) ON CONFLICT(product_id,day) DO UPDATE SET available=excluded.available')
        .bind(id, day(), b.val ? 1 : 0).run();
    }
    await context.env.DB.prepare('UPDATE cafes SET last_change=?').bind(Date.now()).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e) { return new Response(e.message, { status: 400 }); }
}