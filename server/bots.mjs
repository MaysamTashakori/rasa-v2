// bots.mjs — پیوند حساب، صف پیام (outbox)، اعلان سفر و نامهٔ جمعه
import { randomInt } from 'node:crypto';

const TG = { telegram: 'https://api.telegram.org', bale: 'https://tapi.bale.ai' };
const env = (k) => process.env[k] || '';
const enabled = () => ({
  telegram: !!env('TELEGRAM_BOT_TOKEN'),
  bale: !!env('BALE_BOT_TOKEN'),
});

const tehran = (opts) => {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', ...opts }).format(new Date());
  } catch { return null; }
};
const hourTehran = () => Number(tehran({ hour: '2-digit', hour12: false }) ?? '12');
const weekdayTehran = () => tehran({ weekday: 'short' }) ?? '';

// ---------- پیوند ----------
export function issueLinkCode(db, uid){
  const code = String(randomInt(100000, 999999));
  db.prepare('INSERT OR REPLACE INTO link_codes(code, uid, exp) VALUES(?,?,?)')
    .run(code, uid, Date.now() + 15 * 60000);
  return code;
}
export async function webhook(ctx, kind){
  const { db } = ctx;
  const upd = ctx.body || {};
  const msg = upd.message || {};
  const chat = msg.chat?.id;
  const text = String(msg.text || '').trim();
  if (!chat) return { ok: true };
  const m = /(?:^\/start\s+|^\s*)(\d{6})\s*$/.exec(text);
  if (m) {
    const row = db.prepare('SELECT uid FROM link_codes WHERE code=? AND exp>?').get(m[1], Date.now());
    if (row) {
      db.prepare('INSERT OR REPLACE INTO bot_links(uid, kind, chat, at) VALUES(?,?,?,?)')
        .run(row.uid, kind, String(chat), new Date().toISOString());
      db.prepare('DELETE FROM link_codes WHERE code=?').run(m[1]);
      const u = db.prepare('SELECT name FROM users WHERE id=?').get(row.uid);
      await send(ctx, kind, String(chat), `✅ حساب «${u?.name || 'رسا'}» به این گفت‌وگو وصل شد.\nاز این به بعد نتیجهٔ سفرها و نامهٔ جمعه همین‌جا می‌آید.`);
      return { ok: true };
    }
    return { ok: true };
  }
  if (text.startsWith('/start'))
    await send(ctx, kind, String(chat), '🚇 به رسا خوش آمدی!\nبرای وصل‌کردن حساب، کد ۶ رقمیِ «پیوند پیام‌رسان» را از پروفایل رسا همین‌جا بفرست.');
  return { ok: true };
}

// ---------- صف ----------
export function enqueue(ctx, uid, text, dedup){
  const { db } = ctx;
  for (const [kind, on] of Object.entries(enabled())) {
    if (!on) continue;
    const link = db.prepare('SELECT chat FROM bot_links WHERE uid=? AND kind=?').get(uid, kind);
    if (!link) continue;
    db.prepare('INSERT OR IGNORE INTO outbox(kind, chat, text, at, dedup) VALUES(?,?,?,?,?)')
      .run(kind, link.chat, text, Date.now(), dedup);
  }
}
async function send(ctx, kind, chat, text){
  const tok = env(kind === 'bale' ? 'BALE_BOT_TOKEN' : 'TELEGRAM_BOT_TOKEN');
  try {
    const r = await fetch(`${TG[kind]}/bot${tok}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML' }),
    });
    const j = await r.json().catch(() => ({}));
    return j.ok === true;
  } catch (e) { return false; }
}
export async function flush(ctx){
  const { db } = ctx;
  if (hourTehran() >= 21 || hourTehran() < 7) return;           // سکوت شبانه
  const rows = db.prepare('SELECT * FROM outbox WHERE sent IS NULL AND tries<5 ORDER BY id LIMIT 30').all();
  for (const r of rows) {
    const ok = await send(ctx, r.kind, r.chat, r.text);
    db.prepare('UPDATE outbox SET sent=?, tries=tries+1, err=? WHERE id=?')
      .run(ok ? Date.now() : null, ok ? null : 'send failed', r.id);
  }
}

// ---------- نامهٔ جمعه ----------
export function fridayText(ctx, uid){
  const { db } = ctx;
  const T = (id) => (ctx.stationTitle ? ctx.stationTitle(id) : id);
  const u = db.prepare('SELECT name FROM users WHERE id=?').get(uid);
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const rows = db.prepare(
    `SELECT station, pct, stamped FROM stamps WHERE uid=? AND at>? ORDER BY at DESC`
  ).all(uid, weekAgo);
  const travels = db.prepare('SELECT COUNT(*) c FROM travels WHERE uid=? AND at>?').get(uid, weekAgo).c;
  const newStamps = rows.filter(r => r.stamped).length;
  const best = [...rows].sort((a, b) => b.pct - a.pct)[0];
  const weak = [...rows].sort((a, b) => a.pct - b.pct)[0];
  const fa = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const L = `🚇 <b>نامهٔ جمعهٔ رسا</b>\n${u?.name || 'مسافر'} عزیز، گزارش این هفته:`;
  const B = [
    `• سفرها: ${fa(travels)} جلسه`,
    newStamps ? `• مهرهای جدید: ${fa(newStamps)} 🎉` : '• مهر جدیدی زده نشد — هفتهٔ بعد قشنگ‌تر!',
    best ? `• بهترین: ${T(best.station)} با ${fa(best.pct)}٪` : '• هنوز سفری ثبت نشده',
    weak && weak.pct < 80 ? `• گام بعدی: ${T(weak.station)} (${fa(weak.pct)}٪)` : '• همه‌چیز رو به راه است ✅',
    '', 'نقشهٔ کامل: rasa-prompt.ir/map',
  ];
  return `${L}\n${B.join('\n')}`;
}
export async function fridayRun(ctx){
  const { db } = ctx;
  if (weekdayTehran() !== 'Fri' || hourTehran() !== 19) return;
  const weekKey = Math.floor(Date.now() / (7 * 864e5));
  const users = db.prepare('SELECT DISTINCT uid FROM bot_links').all();
  for (const { uid } of users) {
    enqueue(ctx, uid, fridayText(ctx, uid), `fri|${uid}|${weekKey}`);
  }
}
