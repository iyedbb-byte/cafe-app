export async function onRequestPost(context) {
  try {
    const b = await context.request.json();
    if (b.action === 'add') {
      const nid = 'c-' + crypto.randomUUID();
      await context.env.DB.prepare('INSERT INTO categories(id,emoji,name_fr,sort_order) VALUES(?,?,?,?)').bind(nid, '✨', 'Nouvelle catégorie', b.order || 0).run();
    } else if (b.action === 'update') {
      await context.env.DB.prepare('UPDATE categories SET emoji=?,name_fr=? WHERE id=?').bind(b.emoji, b.name_fr, b.id).run();
    } else if (b.action === 'delete') {
      await context.env.DB.prepare('DELETE FROM categories WHERE id=?').bind(b.id).run();
    } else if (b.action === 'move') {
      await context.env.DB.prepare('UPDATE categories SET sort_order=? WHERE id=?').bind(b.order, b.id).run();
    }
    await context.env.DB.prepare('UPDATE cafes SET last_change=?').bind(Date.now()).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e) { return new Response(e.message, { status: 400 }); }
}