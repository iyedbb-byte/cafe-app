export async function onRequestGet(context) {
  const env = context.env;
  try {
    const cafe = (await env.DB.prepare('SELECT * FROM cafes LIMIT 1').all()).results[0] || {};
    const categories = (await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order').all()).results;
    const products = (await env.DB.prepare('SELECT * FROM products ORDER BY sort_order').all()).results;
    const day = (off=0)=>{const d=new Date();d.setDate(d.getDate()+off);return d.toISOString().slice(0,10);};
    const availability = (await env.DB.prepare('SELECT * FROM daily_availability WHERE day IN (?,?)').bind(day(-1),day()).all()).results;
    const admins = await env.DB.prepare('SELECT COUNT(*) c FROM admins').first();
    let brand = {}; try { brand = JSON.parse(cafe.branding || '{}'); } catch {}
    return new Response(JSON.stringify({
      cafe: { slug: cafe.slug, name: cafe.name, tagline: cafe.tagline || '', hours: cafe.hours || '', address: cafe.address || '', branding: brand },
      categories, products, availability,
      lastChange: cafe.last_change || 0,
      adminExists: (admins.c > 0)
    }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}