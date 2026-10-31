CREATE TABLE IF NOT EXISTS cafes(
  slug TEXT PRIMARY KEY, name TEXT, tagline TEXT, hours TEXT,
  address TEXT, branding TEXT DEFAULT '{}', last_change INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS categories(
  id TEXT PRIMARY KEY, emoji TEXT, name_fr TEXT, name_ar TEXT, name_en TEXT, sort_order INTEGER DEFAULT 0, cafe_id TEXT DEFAULT 'the-one');
CREATE TABLE IF NOT EXISTS products(
  id TEXT PRIMARY KEY, category_id TEXT, name TEXT, description TEXT,
  price REAL DEFAULT 0, emoji TEXT, image TEXT, active INTEGER DEFAULT 1, supplement INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, cafe_id TEXT DEFAULT 'the-one');
CREATE TABLE IF NOT EXISTS daily_availability(
  product_id TEXT, day TEXT, available INTEGER DEFAULT 1, cafe_id TEXT DEFAULT 'the-one', PRIMARY KEY(product_id,day));
CREATE TABLE IF NOT EXISTS admins(email TEXT PRIMARY KEY, pass_hash TEXT, name TEXT, role TEXT DEFAULT 'SHOP_ADMIN', cafe_id TEXT DEFAULT 'the-one');
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, email TEXT, expiry INTEGER, cafe_id TEXT DEFAULT 'the-one');
CREATE TABLE IF NOT EXISTS files(key TEXT PRIMARY KEY, content_type TEXT, data TEXT);

INSERT OR IGNORE INTO cafes(slug,name,tagline,hours,address,branding)
  VALUES('the-one','Café Azur','Torréfaction & pâtisserie — La Marsa','07:00 – 23:00','12 rue de la Plage, La Marsa','{}');
INSERT OR IGNORE INTO categories(id,emoji,name_fr,name_ar,name_en,sort_order) VALUES
 ('c-cafe','☕','Café','قهوة','Coffee',1),('c-bois','🥤','Boissons','مشروبات','Drinks',2),
 ('c-jus','🍹','Jus & Cocktails','عصائر','Juices',3),('c-pdj','🥐','Petit Déjeuner','فطور','Breakfast',4),
 ('c-des','🍰','Desserts','حلويات','Desserts',5),('c-sna','🍕','Snacks','مأكولات','Snacks',6);
INSERT OR IGNORE INTO products(id,category_id,name,description,price,emoji,active,sort_order) VALUES
 ('p-esp','c-cafe','Espresso','Court et intense',1.8,'☕',1,1),
 ('p-creme','c-cafe','Café Crème','Lait et mousse',2.8,'🥛',1,2),
 ('p-capp','c-cafe','Cappuccino','Mousse de lait',3.5,'☕',1,3),
 ('p-coca','c-bois','Coca-Cola','Bien frais',2.5,'🥤',1,1),
 ('p-eau','c-bois','Eau Minérale','50 cl',1.2,'💧',1,2),
 ('p-jorange','c-jus','Jus d''Orange','Pressé minute',4.5,'🍊',1,1),
 ('p-crois','c-pdj','Croissant','Pur beurre',2.0,'🥐',1,1),
 ('p-cheese','c-des','Cheesecake','Fruits rouges',7.0,'🍰',1,1),
 ('p-pizza','c-sna','Pizza Maison','Mozzarella',8.5,'🍕',1,1);