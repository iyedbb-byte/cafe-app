# Cafe Azur - Cloudflare Worker + D1 Menu Application

## Overview
Cafe Azur is a digital café menu application built with **Cloudflare Workers** and **D1** database. It serves as a modern menu system for cafés, with multilingual support (FR/AR/EN), product card sizing, supplements, and admin controls.

The app is deployed at: **https://menu-app.the-one-coffee-lounge.workers.dev**

## Core Architecture

### 1. Frontend (SPA)
- **Single HTML file**: `public/index.html` (≈1000 lines)
- **No build step**: Runs entirely in the browser
- **Vanilla JS**: No frameworks (React/Vue/Angular)
- **CSS-only styling**: Custom properties, responsive design
- **Server-side rendering**: Zero — all rendering happens client-side

### 2. Backend (Worker)
- **Cloudflare Worker**: `src/index.js` (196 lines)
- **D1 Database**: `cafe-azur-db` (SQLite-compatible)
- **REST API**: `/api/*` endpoints for all operations
- **Bindings**: `ASSETS`, `DB`, `MOTEUR` (mode flag)

### 3. Data Flow
```
Client → Worker (/api/menu) → D1 → Client
Client → Worker (/api/product) → D1 → Client
Client → Worker (/api/upload) → D1 (files table) → Client
Client → Worker (/api/login) → D1 → Session
```

## Component Structure

### Client-Side Components (in `index.html`)

| Component | Purpose |
|-----------|---------|
| `brand()` | Returns branding object (logo, colors, fonts, socials) |
| `visibleMenu()` | Returns `{cat, items, sups}` structure per category |
| `cardHtml(p, ci, i, cls)` | Renders product card HTML |
| `fitDescs()` | Auto-shrinks description font to fit box |
| `updateCartBar()` | Updates order cart display |
| `renderCustomer()` | Renders customer menu with categories, supplements, cart |
| `renderAdminRoute()` | Renders admin dashboard |

### Key Data Structures

```javascript
// Menu structure from API
{
  cafe: {slug, name, tagline, hours, address, branding},
  categories: [{id, emoji, name_fr, name_ar, name_en, sort_order}],
  products: [{id, catId, name, desc, price, emoji, image, active, supplement, sort_order}],
  availability: [{day, product_id, available}],
  adminExists: boolean,
  meta: {lastChange}
}

// Cart state (localStorage)
cart = {product_id: quantity, ...}
```

### Cart System
- **LocalStorage-based**: `cafeazur-cart` key
- **Persistent across sessions**: Yes
- **Operations**: add item (+), remove item (-), delete item (✕), clear all
- **Visual**: Yellow top bar with item count and total price

## Technical Stack

### 1. Cloudflare Workers
- **Entry point**: `src/index.js` fetched at `/.well-known/worker` or root
- **Routing**: `apiRoutes` object maps paths to handlers
- **Middleware**: Auth guard, content-type handling, CORS
- **File serving**: `env.ASSETS` for static files, `/files/` from D1

### 2. D1 Database (`cafe-azur-db`)
**Tables** (9 tables):
- `cafes` - café metadata + branding JSON
- `categories` - product categories (emoji, multilingual names)
- `products` - menu items (name, price, emoji, image, supplement flag, sort_order)
- `daily_availability` - per-day product availability
- `admins` - admin users (email, hash, name)
- `sessions` - login sessions (token, email, expiry)
- `files` - uploaded images (key, content_type, b64 data)

### 3. Styling System
- **CSS custom properties**: `--ink`, `--bg-soft`, `--line`, etc.
- **Responsive breakpoints**: 600px, 1000px
- **Card sizes**: `lg` (large), `md` (medium), `sm` (small) - togglable by admin
- **Theme**: FR/AR/EN with Orbitron font

## Key Features

### 1. Multilingual Support
- **3 languages**: French (FR), Arabic (AR - RTL), English (EN)
- **Automatic detection**: Based on browser or manual switch
- **All text**: Translatable via `t('key')` calls in 3 language dicts

### 2. Product Card System
- **3 sizes**: Large (lg), Medium (md), Small (sm) - admin selectable
- **Description handling**: Auto-shrinks to fit, or expands to show full text
- **Justified text**: `text-align: justify; hyphens: auto`
- **Hover effects**: Scale zoom (105% on hover, 97% for others)
- **Supplements row**: Smaller cards under each category

### 4. Admin Panel
- **Product management**: Add/edit/delete products with images
- **Category management**: Add/edit/delete categories
- **Appearance**: Theme colors, fonts, logo, card size
- **Social links**: Facebook, Instagram
- **Settings**: Café name, tagline, hours, address

### 5. Order System (Customer)
- **Cart bar**: Fixed at top, shows item count + total
- **Item actions**: Add from product page, adjust qty (±), remove (✕)
- **Persistence**: LocalStorage, survives page reload
- **Submit**: "Order Now" button (currently displays total, no backend order storage)

## Privacy & Security

### 1. Authentication
- **First admin**: Creates account via `/first-admin` endpoint
- **Login**: SHA-256 hashed passwords with salt `cafe-azur::`
- **Session**: JWT-like token stored in sessionStorage

### 2. Data Locality
- **All data stays on worker**: No external APIs
- **Images**: Base64-encoded in D1 `files` table (or external URLs)
- **No third-party trackers**: Pure self-hosted solution

### 3. Performance
- **Initial load**: ~10KB HTML + ~50KB JS
- **API responses**: ~1-5KB JSON
- **Cache**: `cache-control: public, max-age=86400` on static assets
- **No external dependencies**: Zero npm installs needed

## Deployment

### Prerequisites
1. Cloudflare account
2. D1 database created (`cafe-azur-db`)
3. Worker deployed with `wrangler`
4. Domain configured (e.g., `menu-app.the-one-coffee-lounge.workers.dev`)

### Wrangler Config (`wrangler.jsonc`)
```jsonc
{
  "name": "menu-app",
  "main": "src/index.js",
  "compatibility_date": "2026-10-11",
  "assets": {
    "directory": "./public/",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "cafe-azur-db",
      "database_id": "f931dfb8-2244-41fa-b446-f153add4abea"
    }
  ]
}
```

### Local Development
```bash
wrangler dev        # Start dev server
wrangler deploy     # Publish to production
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/menu` | GET | Fetch full menu with categories & products |
| `/api/product` | POST | Add/update product |
| `/api/product-delete` | POST | Delete product |
| `/api/login` | POST | Admin login |
| `/api/first-admin` | POST | Create first admin account |
| `/api/category` | POST | Category management |
| `/api/upload` | POST | Image upload (max 1.5MB, client-side compression) |
| `/api/toggle` | POST | Toggle product availability for date |
| `/api/toggle-many` | POST | Toggle multiple products |

## File Structure

```
/cafe-app/
├── README.md           # This documentation
├── BRIEF-MARKETING.md  # French marketing brief
├── package.json        # Dependencies (wrangler only)
├── wrangler.jsonc     # Worker config + D1 binding
├── public/
│   └── index.html     # Entire app (HTML + CSS + JS)
├── src/
│   └── index.js       # Worker backend (196 lines)
└── .gitignore
```

## Known Limitations

1. **Cart persistence**: LocalStorage only (lost if cleared)
2. **Max image size**: 1.5MB server limit; client-side compression recommended
3. **No backend order storage**: Cart is display-only (no DB write)
4. **Single tenant**: One café per database
5. **Offline mode**: Works fully offline after first load (cached assets)

## Future Enhancements (Roadmap)
- [ ] Backend order storage (D1 insert)
- [ ] PDF export of order
- [ ] QR code generation for table menus
- [ ] Multi-tenant support
- [ ] Push notifications for updates
- [ ] Analytics dashboard
- [ ] Offline caching strategy improvement

## Agent Communication Notes

When interacting with this system:

1. **All text is translatable**: Use `t('key')` pattern, 3 language dicts
2. **CSS is custom property based**: Changes via `--variable` values
3. **State is split**: Client (LocalStorage) + Server (D1) + Worker (MOTEUR.mode)
4. **Images are Base64**: In D1 `files` table, or external URLs
5. **Cart is temporary**: Not persisted to DB (intentional design choice)
6. **Auth salt is fixed**: `cafe-azur::` prefix in password hashing

## Quick Start for AI Agents

1. **Read `src/index.js`** to understand API handlers
2. **Read `public/index.html`** to understand UI rendering
3. **Check `wrangler.jsonc`** for D1 binding config
4. **Run `wrangler dev`** to test locally
5. **Use `/api/menu`** to fetch current menu state
6. **Modify `t()` dicts** for language changes
7. **Adjust CSS custom properties** for styling changes
8. **Run `wrangler deploy`** to publish changes
<tool_call>
