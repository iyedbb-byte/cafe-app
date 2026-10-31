async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function day(off = 0) {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return d.toISOString().slice(0, 10);
}

async function resolveTenant(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.startsWith('/api/menu/')) {
    return path.split('/api/menu/')[1];
  }
  if (path === '/api/menu') {
    return url.searchParams.get('slug');
  }
  if (path.startsWith('/api/')) {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) {
      const sess = await env.DB.prepare('SELECT cafe_id FROM sessions WHERE token=?').bind(token).first();
      if (sess) return sess.cafe_id;
    }
  }
  const first = await env.DB.prepare('SELECT slug FROM cafes LIMIT 1').first();
  return first?.slug || 'the-one';
}

async function handleMenu(request, env) {
  const cafeSlug = await resolveTenant(request, env);
  const cafe = await env.DB.prepare('SELECT * FROM cafes WHERE slug=?').bind(cafeSlug).first();
  if (!cafe) return json({ error: 'cafe not found' }, 404);

  const categories = await env.DB.prepare('SELECT * FROM categories WHERE cafe_id=? ORDER BY sort_order').bind(cafeSlug).all();
  const products = await env.DB.prepare('SELECT * FROM products WHERE cafe_id=? ORDER BY sort_order').bind(cafeSlug).all();
  const availability = await env.DB.prepare('SELECT * FROM daily_availability WHERE cafe_id=? AND day IN (?,?)')
    .bind(cafeSlug, day(-1), day()).all();
  const admins = await env.DB.prepare('SELECT COUNT(*) c FROM admins WHERE cafe_id=?').bind(cafeSlug).first();
  let brand = {};
  try { brand = JSON.parse(cafe.branding || '{}'); } catch {}

  return json({
    cafe: { slug: cafe.slug, name: cafe.name, tagline: cafe.tagline || '', hours: cafe.hours || '', address: cafe.address || '', branding: brand, plan: cafe.plan || 'PLAN_BASIC' },
    categories: categories.results,
    products: products.results,
    availability: availability.results,
    lastChange: cafe.last_change || 0,
    adminExists: admins.c > 0,
  });
}

async function handleLogin(request, env) {
  const cafeSlug = await resolveTenant(request, env);
  const body = await request.json();
  const a = await env.DB.prepare('SELECT pass_hash FROM admins WHERE email=? AND cafe_id=?')
    .bind((body.email || '').toLowerCase(), cafeSlug).first();
  const hash = await sha256('cafe-azur::' + (body.password || ''));
  if (!a || a.pass_hash !== hash) return new Response('unauthorized', { status: 401 });
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiry = Date.now() + 24 * 3600000;
  await env.DB.prepare('INSERT INTO sessions(token,email,expiry,cafe_id) VALUES(?,?,?,?)')
    .bind(token, body.email.toLowerCase(), expiry, cafeSlug).run();
  return json({ token });
}

async function handleCafe(request, env) {
  const cafeSlug = await resolveTenant(request, env);
  const b = await request.json();
  const cur = await env.DB.prepare('SELECT * FROM cafes WHERE slug=?').bind(cafeSlug).first() || {};
  const brand = b.branding ? JSON.stringify(b.branding) : cur.branding || '{}';
  await env.DB.prepare('UPDATE cafes SET name=?,tagline=?,hours=?,address=?,branding=?,last_change=? WHERE slug=?')
    .bind(b.name ?? cur.name, b.tagline ?? cur.tagline, b.hours ?? cur.hours, b.address ?? cur.address, brand, Date.now(), cafeSlug).run();
  return json({ ok: true });
}

async function handleCategory(request, env) {
  const cafeSlug = await resolveTenant(request, env);
  const b = await request.json();
  if (b.action === 'add') {
    const nid = 'c-' + crypto.randomUUID();
    await env.DB.prepare('INSERT INTO categories(id,emoji,name_fr,name_ar,name_en,sort_order,cafe_id) VALUES(?,?,?,?,?,?,?)')
      .bind(nid, '✨', 'Nouvelle catégorie', '', '', b.order || 0, cafeSlug).run();
  } else if (b.action === 'update') {
    await env.DB.prepare('UPDATE categories SET emoji=?,name_fr=?,name_ar=?,name_en=?,sort_order=? WHERE id=? AND cafe_id=?')
      .bind(b.emoji, b.name_fr, b.name_ar, b.name_en, b.order, b.id, cafeSlug).run();
  } else if (b.action === 'delete') {
    await env.DB.prepare('DELETE FROM categories WHERE id=? AND cafe_id=?').bind(b.id, cafeSlug).run();
  } else if (b.action === 'move') {
    await env.DB.prepare('UPDATE categories SET sort_order=? WHERE id=? AND cafe_id=?').bind(b.order, b.id, cafeSlug).run();
  }
  await env.DB.prepare('UPDATE cafes SET last_change=? WHERE slug=?').bind(Date.now(), cafeSlug).run();
  return json({ ok: true });
}

async function handleProduct(request, env) {
  const cafeSlug = await resolveTenant(request, env);
  const { id, data } = await request.json();
  if (id) {
    await env.DB.prepare('UPDATE products SET name=?,description=?,price=?,emoji=?,image=?,active=?,category_id=?,supplement=? WHERE id=? AND cafe_id=?')
      .bind(data.name, data.desc, data.price, data.emoji, data.image, data.active ? 1 : 0, data.catId, data.supplement ? 1 : 0, id, cafeSlug).run();
  } else {
    const nid = 'p-' + crypto.randomUUID();
    const mx = await env.DB.prepare('SELECT MAX(sort_order) o FROM products WHERE cafe_id=?').bind(cafeSlug).first();
    await env.DB.prepare('INSERT INTO products(id,category_id,name,description,price,emoji,image,active,supplement,sort_order,cafe_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
      .bind(nid, data.catId, data.name, data.desc, data.price, data.emoji, data.image, data.active ? 1 : 0, data.supplement ? 1 : 0, (mx.o || 0) + 1, cafeSlug).run();
  }
  await env.DB.prepare('UPDATE cafes SET last_change=? WHERE slug=?').bind(Date.now(), cafeSlug).run();
  return json({ ok: true });
}

async function handleProductDelete(request, env) {
  const cafeSlug = await resolveTenant(request, env);
  const { id } = await request.json();
  await env.DB.prepare('DELETE FROM daily_availability WHERE product_id=? AND cafe_id=?').bind(id, cafeSlug).run();
  await env.DB.prepare('DELETE FROM products WHERE id=? AND cafe_id=?').bind(id, cafeSlug).run();
  await env.DB.prepare('UPDATE cafes SET last_change=? WHERE slug=?').bind(Date.now(), cafeSlug).run();
  return json({ ok: true });
}

async function handleToggle(request, env) {
  const cafeSlug = await resolveTenant(request, env);
  const b = await request.json();
  await env.DB.prepare('INSERT INTO daily_availability(product_id,day,available,cafe_id) VALUES(?,?,?,?) ON CONFLICT(product_id,day) DO UPDATE SET available=excluded.available')
    .bind(b.pid, day(), b.val ? 1 : 0, cafeSlug).run();
  await env.DB.prepare('UPDATE cafes SET last_change=? WHERE slug=?').bind(Date.now(), cafeSlug).run();
  return json({ ok: true });
}

async function handleToggleMany(request, env) {
  const cafeSlug = await resolveTenant(request, env);
  const b = await request.json();
  for (const id of b.ids) {
    await env.DB.prepare('INSERT INTO daily_availability(product_id,day,available,cafe_id) VALUES(?,?,?,?) ON CONFLICT(product_id,day) DO UPDATE SET available=excluded.available')
      .bind(id, day(), b.val ? 1 : 0, cafeSlug).run();
  }
  await env.DB.prepare('UPDATE cafes SET last_change=? WHERE slug=?').bind(Date.now(), cafeSlug).run();
  return json({ ok: true });
}

async function handleFirstAdmin(request, env) {
  const cafeSlug = await resolveTenant(request, env);
  const c = await env.DB.prepare('SELECT COUNT(*) c FROM admins WHERE cafe_id=?').bind(cafeSlug).first();
  if (c.c > 0) return new Response('already exists', { status: 403 });
  const b = await request.json();
  if (!b.email || !b.password || b.password.length < 6) return new Response('invalid', { status: 400 });
  await env.DB.prepare('INSERT INTO admins(email,pass_hash,name,role,cafe_id) VALUES(?,?,?,?,?)')
    .bind(b.email.toLowerCase(), await sha256('cafe-azur::' + b.password), b.name || '', 'SHOP_ADMIN', cafeSlug).run();
  return json({ ok: true });
}

function bufToB64(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

function b64ToBuf(b64) {
  const s = atob(b64);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

async function handleUpload(request, env) {
  const cafeSlug = await resolveTenant(request, env);
  const fd = await request.formData();
  const f = fd.get('file');
  if (!f || !f.size) return new Response('no file', { status: 400 });
  if (f.size > 1.5 * 1024 * 1024) return new Response('too large', { status: 413 });
  const ext = (f.name || 'img').split('.').pop().toLowerCase();
  const key = 'assets/' + cafeSlug + '/' + crypto.randomUUID() + '.' + ext;
  const b64 = bufToB64(await f.arrayBuffer());
  await env.DB.prepare('INSERT INTO files(key,content_type,data,cafe_id) VALUES(?,?,?,?)').bind(key, f.type, b64, cafeSlug).run();
  const url = new URL(request.url);
  return json({ url: url.origin + '/files/' + key });
}

async function handleFile(path, env) {
  const row = await env.DB.prepare('SELECT content_type,data FROM files WHERE key=?').bind(path).first();
  if (!row) return new Response('not found', { status: 404 });
  return new Response(b64ToBuf(row.data), {
    headers: { 'content-type': row.content_type || 'application/octet-stream', 'cache-control': 'public,max-age=86400' },
  });
}

const apiRoutes = {
  'GET /api/menu': (request, env) => handleMenu(request, env),
  'POST /api/login': handleLogin,
  'POST /api/cafe': handleCafe,
  'POST /api/category': handleCategory,
  'POST /api/product': handleProduct,
  'POST /api/product-delete': handleProductDelete,
  'POST /api/toggle': handleToggle,
  'POST /api/toggle-many': handleToggleMany,
  'POST /api/first-admin': handleFirstAdmin,
  'POST /api/upload': handleUpload,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/files' || path.startsWith('/files/')) {
      try {
        return await handleFile(path.slice('/files/'.length), env);
      } catch (e) {
        return new Response(e.message, { status: 500 });
      }
    }

    const cleanPath = path.split('?')[0];
    const handler = apiRoutes[request.method + ' ' + cleanPath];
    if (handler) {
      try {
        return await handler(request, env);
      } catch (e) {
        return new Response(e.message, { status: 400 });
      }
    }

    return env.ASSETS.fetch(request);
  },
};