// ══════════ Worker Cloudflare : API + Auth + Images(D1) ══════════
const day = (off=0)=>{const d=new Date();d.setDate(d.getDate()+off);return d.toISOString().slice(0,10);};
const now = ()=>Date.now();
const json = (o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const txt  = (m,s=400)=>new Response(m,{status:s});
const MAX_IMG = 1.5*1024*1024;
export default {
  async fetch(req,env,ctx){
    const url=new URL(req.url), p=url.pathname, m=req.method;
    // ✅ هذه السطور يجب أن تكون في بداية الـ fetch
    if(p.startsWith('/files/')){
    }
    if(!p.startsWith('/api/')) return env.ASSETS.fetch(req);
    const ep=p.slice(5);
// ── تحويل base64 ↔ ثنائي ──
function bufToB64(buf){const b=new Uint8Array(buf);let s='';for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s);}
function b64ToBuf(b64){const s=atob(b64);const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;}

async function sha256(text){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
const hashPw = pw=>sha256('cafe-azur::'+pw);
const newToken = ()=>crypto.randomUUID()+crypto.randomUUID();

async function auth(req,db){
  const h=req.headers.get('Authorization')||'';
  const tok=h.replace(/^Bearer\s+/i,'');
  if(!tok) return null;
  const s=await db.prepare('SELECT email,expiry FROM sessions WHERE token=?').bind(tok).first();
  if(!s||s.expiry<now()) return null;
  return s.email;
}
function touch(db){return db.prepare('UPDATE cafes SET last_change=?').bind(now()).run();}

export default {
  async fetch(req,env,ctx){
    const url=new URL(req.url), p=url.pathname, m=req.method;

    // ── عرض الصور من D1 : /files/... ──
    if(p.startsWith('/files/')){
      const key=decodeURIComponent(p.slice(7));
      const row=await env.DB.prepare('SELECT content_type,data FROM files WHERE key=?').bind(key).first();
      if(!row) return txt('not found',404);
      return new Response(b64ToBuf(row.data),{headers:{'content-type':row.content_type||'application/octet-stream','cache-control':'public,max-age=86400'}});
    }
    if(!p.startsWith('/api/')) return env.ASSETS.fetch(req);
    const ep=p.slice(5);

    // ── Menu public ──
    if(ep==='menu'&&m==='GET'){
      const cafe=(await env.DB.prepare('SELECT * FROM cafes LIMIT 1').all()).results[0]||{};
      const categories=(await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order').all()).results;
      const products=(await env.DB.prepare('SELECT * FROM products ORDER BY sort_order').all()).results;
      const availability=(await env.DB.prepare('SELECT * FROM daily_availability WHERE day IN (?,?)').bind(day(-1),day()).all()).results;
      const admins=await env.DB.prepare('SELECT COUNT(*) c FROM admins').first();
      let brand={};try{brand=JSON.parse(cafe.branding||'{}');}catch{}
      return json({cafe:{slug:cafe.slug,name:cafe.name,tagline:cafe.tagline,hours:cafe.hours,address:cafe.address,branding:brand},
        categories,products,availability,lastChange:cafe.last_change||0,adminExists:(admins.c>0)});
    }

    // ── Bootstrap premier admin (une seule fois) ──
    if(ep==='first-admin'&&m==='POST'){
      const c=await env.DB.prepare('SELECT COUNT(*) c FROM admins').first();
      if(c.c>0) return txt('already exists',403);
      const b=await req.json();
      if(!b.email||!b.password||b.password.length<6) return txt('invalid');
      await env.DB.prepare('INSERT INTO admins(email,pass_hash,name) VALUES(?,?,?)').bind(b.email.toLowerCase(),await hashPw(b.password),b.name||'').run();
      return json({ok:true});
    }

    // ── Login ──
    if(ep==='login'&&m==='POST'){
      const b=await req.json();
      const a=await env.DB.prepare('SELECT pass_hash FROM admins WHERE email=?').bind((b.email||'').toLowerCase()).first();
      if(!a||a.pass_hash!==await hashPw(b.password||'')) return txt('unauthorized',401);
      const token=newToken(), exp=now()+24*3600e3;
      await env.DB.prepare('INSERT INTO sessions(token,email,expiry) VALUES(?,?,?)').bind(token,b.email.toLowerCase(),exp).run();
      return json({token});
    }

    // ── Tout le reste exige un jeton ──
    const who=await auth(req,env.DB);
    if(!who) return txt('unauthorized',401);

    if(ep==='toggle'&&m==='POST'){const b=await req.json();
      await env.DB.prepare('INSERT INTO daily_availability(product_id,day,available) VALUES(?,?,?) ON CONFLICT(product_id,day) DO UPDATE SET available=excluded.available')
        .bind(b.pid,day(),b.val?1:0).run(); await touch(env.DB); return json({ok:true});}

    if(ep==='toggle-many'&&m==='POST'){const b=await req.json();
      for(const id of b.ids) await env.DB.prepare('INSERT INTO daily_availability(product_id,day,available) VALUES(?,?,?) ON CONFLICT(product_id,day) DO UPDATE SET available=excluded.available').bind(id,day(),b.val?1:0).run();
      await touch(env.DB); return json({ok:true});}

    if(ep==='product'&&m==='POST'){const {id,data}=await req.json();
      if(id) await env.DB.prepare('UPDATE products SET name=?,description=?,price=?,emoji=?,image=?,active=?,category_id=? WHERE id=?')
        .bind(data.name,data.desc,data.price,data.emoji,data.image,data.active?1:0,data.catId,id).run();
      else{const nid='p-'+crypto.randomUUID();
        const mx=await env.DB.prepare('SELECT MAX(sort_order) o FROM products').first();
        await env.DB.prepare('INSERT INTO products(id,category_id,name,description,price,emoji,image,active,sort_order) VALUES(?,?,?,?,?,?,?,?,?)')
          .bind(nid,data.catId,data.name,data.desc,data.price,data.emoji,data.image,data.active?1:0,(mx.o||0)+1).run();}
      await touch(env.DB); return json({ok:true});}

    if(ep==='product-delete'&&m==='POST'){const {id}=await req.json();
      await env.DB.prepare('DELETE FROM daily_availability WHERE product_id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
      await touch(env.DB); return json({ok:true});}

    if(ep==='category'&&m==='POST'){const b=await req.json();
      if(b.action==='add'){const nid='c-'+crypto.randomUUID();
        await env.DB.prepare('INSERT INTO categories(id,emoji,name_fr,sort_order) VALUES(?,?,?,?)').bind(nid,'✨','Nouvelle catégorie',b.order||0).run();}
      else if(b.action==='update') await env.DB.prepare('UPDATE categories SET emoji=?,name_fr=? WHERE id=?').bind(b.emoji,b.name_fr,b.id).run();
      else if(b.action==='delete') await env.DB.prepare('DELETE FROM categories WHERE id=?').bind(b.id).run();
      else if(b.action==='move') await env.DB.prepare('UPDATE categories SET sort_order=? WHERE id=?').bind(b.order,b.id).run();
      await touch(env.DB); return json({ok:true});}

    if(ep==='cafe'&&m==='POST'){const b=await req.json();
      const cur=(await env.DB.prepare('SELECT * FROM cafes LIMIT 1').first())||{};
      const brand=b.branding?JSON.stringify(b.branding):cur.branding||'{}';
      await env.DB.prepare('UPDATE cafes SET name=?,tagline=?,hours=?,address=?,branding=?,last_change=?')
        .bind(b.name??cur.name,b.tagline??cur.tagline,b.hours??cur.hours,b.address??cur.address,brand,now()).run();
      return json({ok:true});}

    // ── رفع الصور إلى D1 (بدل R2) ──
    if(ep==='upload'&&m==='POST'){
      const fd=await req.formData();const f=fd.get('file');
      if(!f||!f.size) return txt('no file');
      if(f.size>MAX_IMG) return txt('image too large (max 1.5 MB)',413);
      const ext=(f.name||'img').split('.').pop().toLowerCase();
      const key='assets/'+crypto.randomUUID()+'.'+ext;
      const b64=bufToB64(await f.arrayBuffer());
      await env.DB.prepare('INSERT INTO files(key,content_type,data) VALUES(?,?,?)').bind(key,f.type,b64).run();
      return json({url:url.origin+'/files/'+key});}

    return txt('not found',404);
  }
};