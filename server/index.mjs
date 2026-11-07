// index.mjs — رسا ۲: سرور صفر-وابستگی (Node ≥ 22.5 · node:sqlite)
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open, loadNetwork, loadPricing, loadQuiz, loadCard, stationIndex } from './db.mjs';
import * as A from './auth.mjs';
import * as B from './bots.mjs';
import * as P from './pay.mjs';
import * as ADM from './admin.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');
const WEB_DIR = process.env.WEB_DIR || join(ROOT, 'dist', 'site');
const db = open(DATA_DIR);
const NET = loadNetwork();
const IDX = stationIndex(NET);
const pricing = loadPricing();
const QUIZ = loadQuiz();

const nowISO = () => new Date().toISOString();
const state = (pct) => (pct >= 80 ? 'ok' : pct >= 40 ? 'mid' : 'next');
const fa = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

const TABLE = {};
const R = (method, path, fn) => { TABLE[`${method} ${path}`] = fn; };

// ---------- کمکی ----------
const userCtx = (req, body = {}) => ({
  db, req, body, pricing,
  user: A.auth(db, req),
  stationTitle: (id) => IDX.get(id)?.st.title || id,
});

// ---------- سلامت و محتوا ----------
R('GET', '/api/health', () => ({ ok: true, name: 'rasa-2', time: nowISO() }));

R('GET', '/api/network', (ctx) => {
  const my = {};
  let card = { active: false };
  if (ctx.user) {
    for (const r of db.prepare('SELECT station, pct, stamped FROM stamps WHERE uid=?').all(ctx.user.id))
      my[r.station] = { pct: r.pct, stamped: !!r.stamped };
    card = P.cardState(db, ctx.user.id);
  }
  const stats = {
    travelers: db.prepare('SELECT COUNT(DISTINCT uid) c FROM travels').get().c,
    travels: db.prepare('SELECT COUNT(*) c FROM travels').get().c,
    stamps: db.prepare('SELECT COUNT(*) c FROM stamps WHERE stamped=1').get().c,
    stations: IDX.size,
  };
  return { meta: NET.meta, lines: NET.lines, my, card, stats };
});

// ---------- ایستگاه و گارد محتوا (قانون ۱: بدون کارتِ واقعی، پولی نه) ----------
R('GET', '/api/station/:id', (ctx, q, params) => {
  const e = IDX.get(params.id);
  if (!e) return [{ error: 'ایستگاه ناشناخته.' }, {}, 404];
  const cardFile = e.st.card ? loadCard(e.st.id) : null;
  const bank = QUIZ.filter(it => it.st === e.st.id).slice(0, 8);
  const active = ctx.user ? P.cardState(db, ctx.user.id).active : false;
  const entitled = e.st.free || active;
  const steps = cardFile && entitled ? cardFile.steps : null;
  return {
    station: e.st, line: { id: e.line.id, title: e.line.title, color: e.line.color, grade: e.line.grade },
    mins: cardFile?.mins || 8,
    card: {
      exists: !!cardFile,
      locked: cardFile && !entitled ? 'برای کارتِ تعاملی این ایستگاه، «کارتِ رسا» لازم است؛ سفر پایه با بانک سؤال همیشه باز است.' : null,
    },
    bank, steps,
  };
});

// ---------- سفر (جلسهٔ ۱۵ دقیقه‌ای) ----------
R('POST', '/api/travel', (ctx) => {
  const { station, mode = 'card', score, total, secs = 0 } = ctx.body || {};
  if (!ctx.user) return [{ error: 'برای ثبت سفر و مهر، وارد شوید.' }, {}, 401];
  const e = IDX.get(station);
  if (!e) return [{ error: 'ایستگاه ناشناخته.' }, {}, 400];
  const tot = Math.max(1, Math.min(100, Number(total) | 0));
  const sc = Math.max(0, Math.min(tot, Number(score) | 0));
  const pct = Math.round(sc / tot * 100);
  const at = nowISO();
  const ins = db.prepare(
    'INSERT INTO travels(uid, station, mode, score, total, pct, secs, at) VALUES(?,?,?,?,?,?,?,?)'
  ).run(ctx.user.id, station, mode === 'bank' ? 'bank' : 'card', sc, tot, pct, secs | 0, at);
  const prev = db.prepare('SELECT best, stamped FROM stamps WHERE uid=? AND station=?').get(ctx.user.id, station);
  db.prepare(`
    INSERT INTO stamps(uid, station, pct, best, stamped, at) VALUES(?,?,?,?,?,?)
    ON CONFLICT(uid, station) DO UPDATE SET
      pct=excluded.pct, best=MAX(best, excluded.best),
      stamped=MAX(stamped, excluded.stamped), at=excluded.at
  `).run(ctx.user.id, station, pct, Math.max(pct, prev?.best || 0), pct >= 80 ? 1 : 0, at);
  const newlyStamped = pct >= 80 && !prev?.stamped;
  db.prepare('INSERT INTO events(name, uid, station, src, at) VALUES(?,?,?,?,?)')
    .run('travel_done', ctx.user.id, station, mode, at);
  B.enqueue(ctx, ctx.user.id,
    newlyStamped ? `🎉 مهرِ بلدی زده شد: <b>${e.st.title}</b> (${fa(pct)}٪)\nایستگاه بعدی منتظر است.`
                 : `🚇 سفر به «${e.st.title}»: ${fa(pct)}٪ ${state(pct) === 'ok' ? '✅' : state(pct) === 'mid' ? '🟡' : '🔴'}`,
    `trav|${ins.lastInsertRowid}`);
  return { pct, state: state(pct), newlyStamped, stamped: pct >= 80 || !!prev?.stamped };
});

// ---------- دفتر مهر ----------
R('GET', '/api/passport', (ctx) => {
  if (!ctx.user) return [{ error: 'وارد شوید.' }, {}, 401];
  const stamps = db.prepare('SELECT station, pct, best, stamped, at FROM stamps WHERE uid=? ORDER BY at DESC').all(ctx.user.id);
  const week = db.prepare('SELECT COUNT(*) c FROM travels WHERE uid=? AND at>?').get(ctx.user.id, new Date(Date.now() - 7 * 864e5).toISOString()).c;
  const perLine = {};
  for (const L of NET.lines) {
    const total = L.stations.length;
    const done = stamps.filter(s => s.stamped && L.stations.some(x => x.id === s.station)).length;
    perLine[L.id] = { total, done };
  }
  return { stamps, week, perLine };
});

// ---------- مسیریاب ----------
R('GET', '/api/route', (ctx) => {
  if (!ctx.user) return [{ error: 'وارد شوید.' }, {}, 401];
  const mine = db.prepare('SELECT station, pct FROM stamps WHERE uid=?').all(ctx.user.id);
  const pctOf = Object.fromEntries(mine.map(r => [r.station, r.pct]));
  const picks = [];
  for (const L of NET.lines) for (const s of L.stations) {
    const pct = pctOf[s.id];
    picks.push({ id: s.id, title: s.title, line: L.id, lineTitle: L.title, color: L.color, pct, n: s.n });
  }
  picks.sort((a, b) => (a.pct ?? -1) - (b.pct ?? -1) || a.n - b.n);
  return { route: picks.slice(0, 5).map(s => ({
    ...s,
    reason: s.pct == null ? 'هنوز سفری به این ایستگاه نزده‌ای — شروعش سبک است.'
      : s.pct < 40 ? 'گام بعدی‌ات همین‌جاست؛ نزدیکِ مهر.'
      : 'در حال تمرینی — یک سفر دیگر تا مهرِ بلدی.',
  })) };
});

// ---------- بانک سؤال ----------
R('GET', '/api/quiz', (ctx, q) => {
  let items = QUIZ;
  if (q.level) items = items.filter(i => i.level === q.level);
  if (q.subject && q.subject !== 'همه') items = items.filter(i => i.subject === q.subject);
  return { items: items.slice(0, 60), levels: [...new Set(QUIZ.map(i => i.level))] };
});
R('POST', '/api/quiz/attempt', (ctx) => {
  const { level = 'mote1', score, total } = ctx.body || {};
  if (!ctx.user) return { ok: true, guest: true };
  db.prepare('INSERT INTO events(name, uid, src, at) VALUES(?,?,?,?)').run('quiz_done', ctx.user.id, level, nowISO());
  B.enqueue(ctx, ctx.user.id, `📝 آزمونک ${level === 'dabestan' ? 'دبستان' : 'متوسطهٔ اول'}: ${fa(score)} از ${fa(total)}`, `qa|${ctx.user.id}|${Date.now()}`);
  return { ok: true };
});

// ---------- حساب ----------
R('POST', '/api/register', async (ctx) => {
  const { login, pass, name } = ctx.body || {};
  const L = A.normLogin(login || '');
  if (!L) return [{ error: 'موبایل (۰۹…) یا ایمیل درست وارد کنید.' }, {}, 400];
  if (!pass || String(pass).length < 6) return [{ error: 'رمز دست‌کم ۶ نویسه باشد.' }, {}, 400];
  if (!A.rate(`reg:${ctx.req.socket.remoteAddress}`, 8, 600000)) return [{ error: 'کمی صبر کنید و دوباره تلاش کنید.' }, {}, 429];
  if (db.prepare('SELECT 1 FROM users WHERE login=?').get(L)) return [{ error: 'این حساب قبلاً ساخته شده؛ وارد شوید.' }, {}, 409];
  const isFirst = db.prepare('SELECT COUNT(*) c FROM users').get().c === 0;
  const ins = db.prepare('INSERT INTO users(login, name, pass, created) VALUES(?,?,?,?)')
    .run(L, (name || 'مسافر رسا').slice(0, 40), A.hashPass(String(pass)), nowISO());
  const uid = Number(ins.lastInsertRowid);
  const founders = (process.env.FOUNDER_LOGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if ((process.env.FIRST_USER_FOUNDER === '1' && isFirst) || founders.includes(L))
    db.prepare('INSERT OR IGNORE INTO roles(uid, role) VALUES(?,?)').run(uid, 'founder');
  const { token } = A.startSession(db, uid);
  return [{ ok: true, user: { id: uid, name: name || 'مسافر رسا' } }, { 'set-cookie': A.cookieHeader(token, ctx.req) }];
});
R('POST', '/api/login', async (ctx) => {
  const { login, pass } = ctx.body || {};
  const L = A.normLogin(login || '');
  if (!L || !pass) return [{ error: 'موبایل/ایمیل و رمز را وارد کنید.' }, {}, 400];
  if (!A.rate(`lg:${L}`, 8, 600000)) return [{ error: 'چند بار اشتباه شد؛ کمی صبر کنید.' }, {}, 429];
  const u = db.prepare('SELECT * FROM users WHERE login=?').get(L);
  if (!u || !A.checkPass(String(pass), u.pass)) return [{ error: 'حساب یا رمز درست نیست.' }, {}, 401];
  const { token } = A.startSession(db, u.id);
  return [{ ok: true, user: { id: u.id, name: u.name } }, { 'set-cookie': A.cookieHeader(token, ctx.req) }];
});
R('POST', '/api/logout', (ctx) => {
  const m = /(?:^|;\s*)rs=([^;]+)/.exec(ctx.req.headers.cookie || '');
  A.endSession(db, m?.[1]);
  return [{ ok: true }, { 'set-cookie': A.clearCookie }];
});
R('GET', '/api/me', (ctx) => {
  if (!ctx.user) return [{ error: 'وارد نشده‌اید.' }, {}, 401];
  const card = P.cardState(db, ctx.user.id);
  const stamps = db.prepare('SELECT COUNT(*) c FROM stamps WHERE uid=? AND stamped=1').get(ctx.user.id).c;
  const travels = db.prepare('SELECT COUNT(*) c FROM travels WHERE uid=?').get(ctx.user.id).c;
  const founder = A.can(db, ctx.user.id, 'founder');
  return { user: ctx.user, card, stamps, travels, founder };
});

// ---------- ربات‌ها ----------
R('GET', '/api/notify', (ctx) => ({ enabled: B.enabled(), linked: ctx.user
  ? db.prepare('SELECT kind, at FROM bot_links WHERE uid=?').all(ctx.user.id) : [] }));
R('POST', '/api/notify/link', (ctx) => {
  if (!ctx.user) return [{ error: 'وارد شوید.' }, {}, 401];
  const code = B.issueLinkCode(db, ctx.user.id);
  const names = { telegram: process.env.TELEGRAM_BOT_NAME || 'ربات تلگرام رسا', bale: process.env.BALE_BOT_NAME || 'ربات بله رسا' };
  return { code, bots: B.enabled(), names };
});
R('POST', '/api/notify/unlink', (ctx) => {
  if (!ctx.user) return [{ error: 'وارد شوید.' }, {}, 401];
  db.prepare('DELETE FROM bot_links WHERE uid=? AND kind=?').run(ctx.user.id, ctx.body.kind);
  return { ok: true };
});
R('POST', '/api/bots/:kind', async (ctx, q, params) => {
  const sec = process.env.WEBHOOK_SECRET;
  if (sec && ctx.req.headers['x-hook-secret'] !== sec && q.s !== sec) return [{ error: 'نه.' }, {}, 403];
  if (!['telegram', 'bale'].includes(params.kind)) return [{ error: 'ناشناخته.' }, {}, 404];
  return B.webhook(ctx, params.kind);
});
R('GET', '/api/friday', (ctx) => {
  if (!ctx.user) return [{ error: 'وارد شوید.' }, {}, 401];
  return { text: B.fridayText(ctx, ctx.user.id) };
});

// ---------- خرید کارت ----------
R('GET', '/api/pricing', () => pricing);
R('POST', '/api/card', (ctx) => P.buyCard(ctx));
R('GET', '/api/pay/callback', (ctx, q) => P.callback(ctx, q));

// ---------- مرکز فرمان ----------
R('GET', '/api/admin/overview', (ctx) =>
  ctx.user && A.can(db, ctx.user.id, 'founder') ? ADM.overview(ctx) : [{ error: 'دسترسی ندارید.' }, {}, 403]);
R('GET', '/api/admin/users', (ctx) =>
  ctx.user && A.can(db, ctx.user.id, 'founder') ? ADM.usersList(ctx) : [{ error: 'دسترسی ندارید.' }, {}, 403]);

// ---------- تحلیل‌ها ----------
const EV_WHITELIST = ['home', 'map_open', 'station_open', 'travel_done', 'quiz_done', 'card_open', 'share', 'pay_start'];
R('POST', '/api/ev', (ctx) => {
  const { name, station, src } = ctx.body || {};
  if (EV_WHITELIST.includes(name))
    db.prepare('INSERT INTO events(name, uid, station, src, at) VALUES(?,?,?,?,?)')
      .run(name, ctx.user?.id || null, station || null, src || null, nowISO());
  return { ok: true };
});

// ---------- کامپایل مسیرها (بعد از ثبت همه) ----------
const routes = Object.entries(TABLE).map(([k, fn]) => {
  const [method, path] = k.split(' ');
  const paramKeys = [];
  const regex = new RegExp('^' + path.replace(/:[^/]+/g, m => { paramKeys.push(m.slice(1)); return '([^/]+)'; }) + '$');
  return { method, regex, paramKeys, fn };
});

// ---------- استاتیک ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
function serveStatic(req, res, path){
  let file = join(WEB_DIR, path === '/' ? 'index.html' : path);
  if (!file.startsWith(WEB_DIR) || !existsSync(file)) file = join(WEB_DIR, 'index.html'); // SPA fallback + گارد پیمایش
  if (!existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  const ext = extname(file);
  const noCache = ext === '.html' || path === '/sw.js';
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': noCache ? 'no-cache' : 'public, max-age=86400',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'SAMEORIGIN',
  });
  res.end(readFileSync(file));
}

// ---------- سرور ----------
const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const path = decodeURIComponent(u.pathname);
    if (!path.startsWith('/api/')) return serveStatic(req, res, path);
    const hit = routes.find(r => r.method === req.method && r.regex.test(path));
    if (!hit) { res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' }); return res.end('{"error":"مسیر ناشناخته"}'); }
    let body = {};
    if (req.method !== 'GET') {
      const raw = await new Promise(ok_ => { let d = ''; req.on('data', c => d += c); req.on('end', () => ok_(d)); });
      if (raw) {
        const ct = String(req.headers['content-type'] || '');
        if (!ct.includes('application/json')) { res.writeHead(415); return res.end('{"error":"json"}'); }
        body = JSON.parse(raw);
      }
    }
    const params = {};
    const m = path.match(hit.regex);
    hit.paramKeys.forEach((k, i) => { params[k] = m[i + 1]; });
    const ctx = userCtx(req, body);
    const out = await hit.fn(ctx, Object.fromEntries(u.searchParams), params);
    if (Array.isArray(out)) {
      const [b, headers = {}, status = 200] = out;
      if (headers.location) { res.writeHead(status, headers); return res.end(); }
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
      return res.end(JSON.stringify(b));
    }
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(out));
  } catch (e) {
    console.error('[rasa2]', req.url, e.message);
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'خطای سرور' }));
  }
});

setInterval(() => { B.flush(userCtx({ headers: {} })).catch(() => {}); B.fridayRun(userCtx({ headers: {} })).catch(() => {}); }, 5 * 60000);
setInterval(() => { db.prepare('DELETE FROM sessions WHERE exp<?').run(Date.now()); db.prepare('DELETE FROM link_codes WHERE exp<?').run(Date.now()); }, 3600000);

const PORT = Number(process.env.PORT || 8080);
server.listen(PORT, () => console.log(`🚇 rasā-2 on :${PORT}`));
