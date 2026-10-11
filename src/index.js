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

async function handleMenu(env) {
  const cafe = (await env.DB.prepare('SELECT * FROM cafes LIMIT 1').all()).results[0] || {};
  const categories = (await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order').all()).results;
  const products = (await env.DB.prepare('SELECT * FROM products ORDER BY sort_order').all()).results;
  const availability = (await env.DB.prepare('SELECT * FROM daily_availability WHERE day IN (?,?)').bind(day(-1), day()).all()).results;
  const admins = await env.DB.prepare('SELECT COUNT(*) c FROM admins').first();
  let brand = {};
  try { brand = JSON.parse(cafe.branding || '{}'); } catch {}
  return json({
    cafe: { slug: cafe.slug, name: cafe.name, tagline: cafe.tagline || '', hours: cafe.hours || '', address: cafe.address || '', branding: brand },
    categories,
    products,
    availability,
    lastChange: cafe.last_change || 0,
    adminExists: admins.c > 0,
  });
}

async function handleLogin(request, env) {
  const body = await request.json();
  const a = await env.DB.prepare('SELECT pass_hash FROM admins WHERE email=?').bind((body.email || '').toLowerCase()).first();
  const hash = await sha256('cafe-azur::' + (body.password || ''));
  if (!a || a.pass_hash !== hash) return new Response('unauthorized', { status: 401 });
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiry = Date.now() + 24 * 3600000;
  await env.DB.prepare('INSERT INTO sessions(token,email,expiry) VALUES(?,?,?)').bind(token, body.email.toLowerCase(), expiry).run();
  return json({ token });
}

async function handleCafe(request, env) {
  const b = await request.json();
  const cur = (await env.DB.prepare('SELECT * FROM cafes LIMIT 1').first()) || {};
  const brand = b.branding ? JSON.stringify(b.branding) : cur.branding || '{}';
  await env.DB.prepare('UPDATE cafes SET name=?,tagline=?,hours=?,address=?,branding=?,last_change=?')
    .bind(b.name ?? cur.name, b.tagline ?? cur.tagline, b.hours ?? cur.hours, b.address ?? cur.address, brand, Date.now()).run();
  return json({ ok: true });
}

async function handleCategory(request, env) {
  const b = await request.json();
  if (b.action === 'add') {
    const nid = 'c-' + crypto.randomUUID();
    await env.DB.prepare('INSERT INTO categories(id,emoji,name_fr,sort_order) VALUES(?,?,?,?)').bind(nid, '✨', 'Nouvelle catégorie', b.order || 0).run();
  } else if (b.action === 'update') {
    await env.DB.prepare('UPDATE categories SET emoji=?,name_fr=? WHERE id=?').bind(b.emoji, b.name_fr, b.id).run();
  } else if (b.action === 'delete') {
    await env.DB.prepare('DELETE FROM categories WHERE id=?').bind(b.id).run();
  } else if (b.action === 'move') {
    await env.DB.prepare('UPDATE categories SET sort_order=? WHERE id=?').bind(b.order, b.id).run();
  }
  await env.DB.prepare('UPDATE cafes SET last_change=?').bind(Date.now()).run();
  return json({ ok: true });
}

async function handleProduct(request, env) {
  const { id, data } = await request.json();
  if (id) {
    await env.DB.prepare('UPDATE products SET name=?,description=?,price=?,emoji=?,image=?,active=?,category_id=? WHERE id=?')
      .bind(data.name, data.desc, data.price, data.emoji, data.image, data.active ? 1 : 0, data.catId, id).run();
  } else {
    const nid = 'p-' + crypto.randomUUID();
    const mx = await env.DB.prepare('SELECT MAX(sort_order) o FROM products').first();
    await env.DB.prepare('INSERT INTO products(id,category_id,name,description,price,emoji,image,active,sort_order) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(nid, data.catId, data.name, data.desc, data.price, data.emoji, data.image, data.active ? 1 : 0, (mx.o || 0) + 1).run();
  }
  await env.DB.prepare('UPDATE cafes SET last_change=?').bind(Date.now()).run();
  return json({ ok: true });
}

async function handleProductDelete(request, env) {
  const { id } = await request.json();
  await env.DB.prepare('DELETE FROM daily_availability WHERE product_id=?').bind(id).run();
  await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
  await env.DB.prepare('UPDATE cafes SET last_change=?').bind(Date.now()).run();
  return json({ ok: true });
}

async function handleToggle(request, env) {
  const b = await request.json();
  await env.DB.prepare('INSERT INTO daily_availability(product_id,day,available) VALUES(?,?,?) ON CONFLICT(product_id,day) DO UPDATE SET available=excluded.available')
    .bind(b.pid, day(), b.val ? 1 : 0).run();
  await env.DB.prepare('UPDATE cafes SET last_change=?').bind(Date.now()).run();
  return json({ ok: true });
}

async function handleToggleMany(request, env) {
  const b = await request.json();
  for (const id of b.ids) {
    await env.DB.prepare('INSERT INTO daily_availability(product_id,day,available) VALUES(?,?,?) ON CONFLICT(product_id,day) DO UPDATE SET available=excluded.available')
      .bind(id, day(), b.val ? 1 : 0).run();
  }
  await env.DB.prepare('UPDATE cafes SET last_change=?').bind(Date.now()).run();
  return json({ ok: true });
}

async function handleFirstAdmin(request, env) {
  const c = await env.DB.prepare('SELECT COUNT(*) c FROM admins').first();
  if (c.c > 0) return new Response('already exists', { status: 403 });
  const b = await request.json();
  if (!b.email || !b.password || b.password.length < 6) return new Response('invalid', { status: 400 });
  await env.DB.prepare('INSERT INTO admins(email,pass_hash,name) VALUES(?,?,?)')
    .bind(b.email.toLowerCase(), await sha256('cafe-azur::' + b.password), b.name || '').run();
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
  const fd = await request.formData();
  const f = fd.get('file');
  if (!f || !f.size) return new Response('no file', { status: 400 });
  if (f.size > 1.5 * 1024 * 1024) return new Response('too large', { status: 413 });
  const ext = (f.name || 'img').split('.').pop().toLowerCase();
  const key = 'assets/' + crypto.randomUUID() + '.' + ext;
  const b64 = bufToB64(await f.arrayBuffer());
  await env.DB.prepare('INSERT INTO files(key,content_type,data) VALUES(?,?,?)').bind(key, f.type, b64).run();
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
  'GET /api/menu': (request, env) => handleMenu(env),
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

    const handler = apiRoutes[request.method + ' ' + path];
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
