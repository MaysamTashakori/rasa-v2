// auth.mjs — ثبت‌نام/ورود با موبایل یا ایمیل + رمز (scrypt) + نشست کوکی‌ای
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SESSION_DAYS = 60;

// ---------- نرمال‌سازی ----------
const FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';
export function toEnDigits(s){
  return String(s ?? '').replace(/[۰-۹٠-٩]/g, d => {
    const i = FA.indexOf(d); return i > -1 ? i : AR.indexOf(d);
  });
}
export function normLogin(raw){
  const s = toEnDigits(raw).trim();
  if (/^0?9\d{9}$/.test(s)) return s.startsWith('0') ? s : '0' + s;   // موبایل ایرانی
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return s.toLowerCase();   // ایمیل
  return null;
}

// ---------- رمز ----------
export function hashPass(pw){
  const salt = randomBytes(16).toString('hex');
  const h = scryptSync(pw, salt, 64).toString('hex');
  return `${salt}$${h}`;
}
export function checkPass(pw, stored){
  const [salt, h] = String(stored).split('$');
  if (!salt || !h) return false;
  const test = scryptSync(pw, salt, 64);
  return timingSafeEqual(test, Buffer.from(h, 'hex'));
}

// ---------- محدودسازی نرخ (حافظه‌ای) ----------
const buckets = new Map();
export function rate(key, max, windowMs){
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now); buckets.set(key, arr);
  return true;
}

// ---------- نشست ----------
export function startSession(db, uid){
  const token = randomBytes(32).toString('base64url');
  const exp = Date.now() + SESSION_DAYS * 864e5;
  db.prepare('INSERT INTO sessions(token, uid, exp) VALUES(?,?,?)').run(token, uid, exp);
  return { token, exp };
}
export function endSession(db, token){
  if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(token);
}
export function auth(db, req){
  const m = /(?:^|;\s*)rs=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return null;
  const row = db.prepare(
    'SELECT u.id, u.login, u.name, s.exp FROM sessions s JOIN users u ON u.id=s.uid WHERE s.token=?'
  ).get(m[1]);
  if (!row || row.exp < Date.now()) return null;
  return { id: row.id, login: row.login, name: row.name };
}
export function cookieHeader(token, req){
  const secure = /https/.test(String(req.headers['x-forwarded-proto'] || '')) ? ' Secure;' : '';
  return `rs=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400};${secure}`;
}
export const clearCookie = 'rs=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';

export function can(db, uid, role){
  return !!db.prepare('SELECT 1 FROM roles WHERE uid=? AND role=?').get(uid, role);
}
