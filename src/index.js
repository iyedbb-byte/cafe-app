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
      const sess = await env.DB.prepare('SELECT * FROM sessions WHERE token=?').bind(token).first();
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
  const body = await request.json();
  const email = (body.email || '').toLowerCase();
  const hash = await sha256('cafe-azur::' + (body.password || ''));
  
  // First check for SYSTEM_ADMIN (cafe_id='system')
  let a = await env.DB.prepare('SELECT * FROM admins WHERE email=? AND role=?')
    .bind(email, 'SYSTEM_ADMIN').first();
  
  if (a) {
    if (a.pass_hash !== hash) return new Response('unauthorized', { status: 401 });
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expiry = Date.now() + 24 * 3600000;
    await env.DB.prepare('INSERT INTO sessions(token,email,expiry,cafe_id) VALUES(?,?,?,?)')
      .bind(token, email, expiry, 'system').run();
    return json({ token, role: 'SYSTEM_ADMIN', cafe_id: 'system' });
  }
  
  // Then check for regular shop admin
  const cafeSlug = await resolveTenant(request, env);
  a = await env.DB.prepare('SELECT * FROM admins WHERE email=? AND cafe_id=?')
    .bind(email, cafeSlug).first();
  
  if (a && a.pass_hash === hash) {
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expiry = Date.now() + 24 * 3600000;
    await env.DB.prepare('INSERT INTO sessions(token,email,expiry,cafe_id) VALUES(?,?,?,?)')
      .bind(token, email, expiry, cafeSlug).run();
    return json({ token, role: a.role || 'SHOP_ADMIN', cafe_id: cafeSlug });
  }
  
  return new Response('unauthorized', { status: 401 });
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

async function handleSystemCafeList(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return new Response('unauthorized', { status: 401 });
  const sess = await env.DB.prepare('SELECT role FROM sessions WHERE token=?').bind(token).first();
  if (!sess || sess.role !== 'SYSTEM_ADMIN') return new Response('forbidden', { status: 403 });

  const cafes = await env.DB.prepare('SELECT slug,name,tagline,hours,address,plan,status,last_change FROM cafes ORDER BY last_change DESC').all();
  return json({ cafes: cafes.results });
}

async function handleSystemCafeCreate(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return new Response('unauthorized', { status: 401 });
  const sess = await env.DB.prepare('SELECT role FROM sessions WHERE token=?').bind(token).first();
  if (!sess || sess.role !== 'SYSTEM_ADMIN') return new Response('forbidden', { status: 403 });

  const b = await request.json();
  const slug = (b.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!slug) return new Response('slug required', { status: 400 });
  const exists = await env.DB.prepare('SELECT 1 FROM cafes WHERE slug=?').bind(slug).first();
  if (exists) return new Response('slug exists', { status: 409 });

  const plan = b.plan || 'PLAN_BASIC';
  const passHash = await sha256('cafe-azur::' + (b.password || 'admin123'));
  const cafeId = slug;

  await env.DB.prepare('INSERT INTO cafes(slug,name,tagline,hours,address,branding,plan,status,last_change) VALUES(?,?,?,?,?,?,?,?,?)')
    .bind(slug, b.name, b.tagline || '', b.hours || '', b.address || '', '{}', plan, 'active', Date.now()).run();

  await env.DB.prepare('INSERT INTO admins(email,pass_hash,name,role,cafe_id) VALUES(?,?,?,?,?)')
    .bind(b.email.toLowerCase(), passHash, b.adminName || '', 'SHOP_ADMIN', slug).run();

  // Seed default categories for new cafe
  const defaultCats = [
    ['c-cafe','☕',1,'Café','قهوة','Coffee'],
    ['c-bois','🥤',2,'Boissons','مشروبات','Drinks'],
    ['c-jus','🍹',3,'Jus & Cocktails','عصائر','Juices'],
    ['c-pdj','🥐',4,'Petit Déjeuner','فطور','Breakfast'],
    ['c-des','🍰',5,'Desserts','حلويات','Desserts'],
    ['c-sna','🍕',6,'Snacks','مأكولات','Snacks'],
  ];
  for (const [id,emoji,order,fr,ar,en] of defaultCats) {
    await env.DB.prepare('INSERT INTO categories(id,emoji,name_fr,name_ar,name_en,sort_order,cafe_id) VALUES(?,?,?,?,?,?,?)')
      .bind(id, emoji, fr, ar, en, order, slug).run();
  }

  return json({ ok: true, slug });
}

async function handleSystemCafeUpdate(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return new Response('unauthorized', { status: 401 });
  const sess = await env.DB.prepare('SELECT role FROM sessions WHERE token=?').bind(token).first();
  if (!sess || sess.role !== 'SYSTEM_ADMIN') return new Response('forbidden', { status: 403 });

  const b = await request.json();
  await env.DB.prepare('UPDATE cafes SET name=?,tagline=?,hours=?,address=?,plan=?,status=? WHERE slug=?')
    .bind(b.name, b.tagline, b.hours, b.address, b.plan, b.status, b.slug).run();
  return json({ ok: true });
}

async function handleSystemCafeDelete(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return new Response('unauthorized', { status: 401 });
  const sess = await env.DB.prepare('SELECT role FROM sessions WHERE token=?').bind(token).first();
  if (!sess || sess.role !== 'SYSTEM_ADMIN') return new Response('forbidden', { status: 403 });

  const b = await request.json();
  // Delete all related data
  await env.DB.prepare('DELETE FROM products WHERE cafe_id=?').bind(b.slug).run();
  await env.DB.prepare('DELETE FROM categories WHERE cafe_id=?').bind(b.slug).run();
  await env.DB.prepare('DELETE FROM daily_availability WHERE cafe_id=?').bind(b.slug).run();
  await env.DB.prepare('DELETE FROM admins WHERE cafe_id=?').bind(b.slug).run();
  await env.DB.prepare('DELETE FROM sessions WHERE cafe_id=?').bind(b.slug).run();
  await env.DB.prepare('DELETE FROM files WHERE cafe_id=?').bind(b.slug).run();
  await env.DB.prepare('DELETE FROM cafes WHERE slug=?').bind(b.slug).run();
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
  'GET /api/system/cafes': handleSystemCafeList,
  'POST /api/system/cafe-create': handleSystemCafeCreate,
  'POST /api/system/cafe-update': handleSystemCafeUpdate,
  'POST /api/system/cafe-delete': handleSystemCafeDelete,
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