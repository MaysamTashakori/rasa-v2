// build.mjs — تک‌فایل‌ساز سایت رسا ۲: فونت + CSS + JS درون‌گذری + سرویس‌ورکر نسخه‌دار
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(ROOT, 'apps/site/src');
const OUT = join(ROOT, 'dist/site');
mkdirSync(OUT, { recursive: true });

// ---------- فونت‌ها ----------
const FONT_FILES = [
  ['vazirmatn-arabic-400-normal.woff2', 'arabic'],
  ['vazirmatn-arabic-700-normal.woff2', 'arabic'],
  ['vazirmatn-arabic-900-normal.woff2', 'arabic'],
  ['vazirmatn-latin-400-normal.woff2', 'latin'],
  ['vazirmatn-latin-700-normal.woff2', 'latin'],
  ['vazirmatn-latin-900-normal.woff2', 'latin'],
];
const RANGES = {
  arabic: 'U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0898-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC',
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
};
const WEIGHT = f => f.includes('-400-') ? 400 : f.includes('-700-') ? 700 : 900;
const fontsCss = FONT_FILES.map(([f, sub]) => `
@font-face{
  font-family:'Vazirmatn'; font-style:normal; font-weight:${WEIGHT(f)}; font-display:swap;
  src:url(data:font/woff2;base64,${readFileSync(join(SRC, 'fonts', f)).toString('base64')}) format('woff2');
  unicode-range:${RANGES[sub]};
}`).join('\n');

// ---------- CSS و JS ----------
const css = readFileSync(join(SRC, 'tokens.css'), 'utf8') + '\n' + readFileSync(join(SRC, 'metro.css'), 'utf8');
const JS_ORDER = ['data.js', 'map.js', 'home.js', 'pages.js', 'admin.js', 'app.js'];
const js = JS_ORDER.map(f => `/* ===== ${f} ===== */\n` + readFileSync(join(SRC, f), 'utf8')).join('\n;\n');

// ---------- HTML ----------
let html = readFileSync(join(SRC, 'index.html'), 'utf8');
html = html.replace('/*FONTS*/', `<style>${fontsCss}</style>`)
  .replace('/*CSS*/', `<style>${css}</style>`)
  .replace('/*JS*/', `<script>${js.replace(/<\/script/g, '<\\/script')}<\/script>`);
writeFileSync(join(OUT, 'index.html'), html);

// ---------- سرویس‌ورکر نسخه‌دار ----------
const ver = Date.now().toString(36);
writeFileSync(join(OUT, 'sw.js'), `
const C='rasa2-${ver}';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['/'])));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('rasa2-')&&k!==C).map(k=>caches.delete(k)))))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.pathname.startsWith('/api/')) return;
  if(e.request.mode==='navigate')
    return e.respondWith(fetch(e.request).catch(()=>caches.match('/')));
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)));
});
`);

// ---------- مانیفست و ربات‌ها ----------
writeFileSync(join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: 'رسا — متروی دانش', short_name: 'رسا', lang: 'fa', dir: 'rtl',
  start_url: '/', display: 'standalone', background_color: '#F7F4ED', theme_color: '#F7F4ED',
  icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
}));
writeFileSync(join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
const siteUrl = process.env.SITE_URL || 'https://rasa-prompt.ir';
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['/', '/map', '/quiz', '/pricing', '/guide', '/about'].map(p => `  <url><loc>${siteUrl}${p}</loc></url>`).join('\n')}
</urlset>`);

// آیکن متروی رسا
writeFileSync(join(OUT, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="#F7F4ED"/>
<circle cx="32" cy="32" r="27" fill="none" stroke="#191714" stroke-width="5"/>
<path d="M13 42 L32 16 L51 42" fill="none" stroke="#191714" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="32" cy="16" r="8" fill="#FFE24B" stroke="#191714" stroke-width="4"/>
</svg>`);

console.log('✅ dist/site built:', html.length.toLocaleString(), 'bytes · sw ver', ver);
