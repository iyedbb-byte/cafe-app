export async function onRequestPost(context) {
  try {
    const { id, data } = await context.request.json();
    if (id) {
      await context.env.DB.prepare('UPDATE products SET name=?,description=?,price=?,emoji=?,image=?,active=?,category_id=? WHERE id=?')
        .bind(data.name, data.desc, data.price, data.emoji, data.image, data.active ? 1 : 0, data.catId, id).run();
    } else {
      const nid = 'p-' + crypto.randomUUID();
      const mx = await context.env.DB.prepare('SELECT MAX(sort_order) o FROM products').first();
      await context.env.DB.prepare('INSERT INTO products(id,category_id,name,description,price,emoji,image,active,sort_order) VALUES(?,?,?,?,?,?,?,?,?)')
        .bind(nid, data.catId, data.name, data.desc, data.price, data.emoji, data.image, data.active ? 1 : 0, (mx.o || 0) + 1).run();
    }
    await context.env.DB.prepare('UPDATE cafes SET last_change=?').bind(Date.now()).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e) { return new Response(e.message, { status: 400 }); }
}