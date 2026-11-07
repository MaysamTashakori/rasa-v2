// db.mjs — شِما و دادهٔ اولیهٔ رسا ۲
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function open(dataDir){
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(join(dataDir, 'rasa2.db'));
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY, login TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL, pass TEXT NOT NULL, created TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions(
      token TEXT PRIMARY KEY, uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exp INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS roles(
      uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL, PRIMARY KEY(uid, role)
    );
    CREATE TABLE IF NOT EXISTS travels(
      id INTEGER PRIMARY KEY, uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      station TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'card',
      score INTEGER NOT NULL, total INTEGER NOT NULL, pct INTEGER NOT NULL,
      secs INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tv_station ON travels(uid, station);
    CREATE TABLE IF NOT EXISTS stamps(
      uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      station TEXT NOT NULL, pct INTEGER NOT NULL, best INTEGER NOT NULL,
      stamped INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL,
      PRIMARY KEY(uid, station)
    );
    CREATE TABLE IF NOT EXISTS rcards(
      id INTEGER PRIMARY KEY, uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      ref TEXT, at TEXT NOT NULL, from_d TEXT, exp_d TEXT
    );
    CREATE TABLE IF NOT EXISTS bot_links(
      uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL, chat TEXT NOT NULL, at TEXT NOT NULL,
      PRIMARY KEY(uid, kind)
    );
    CREATE TABLE IF NOT EXISTS link_codes(
      code TEXT PRIMARY KEY, uid INTEGER NOT NULL, exp INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outbox(
      id INTEGER PRIMARY KEY, kind TEXT NOT NULL, chat TEXT NOT NULL,
      text TEXT NOT NULL, tries INTEGER NOT NULL DEFAULT 0,
      sent INTEGER, err TEXT, at INTEGER NOT NULL, dedup TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS events(
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, uid INTEGER,
      station TEXT, src TEXT, at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ev_at ON events(at);
  `);
  return db;
}

// ---------- محتوای ثابت (خوانده‌شده از content/) ----------
const j = (p) => JSON.parse(readFileSync(join(ROOT, 'content', p), 'utf8'));

export function loadNetwork(){ return j('metro/lines.json'); }
export function loadPricing(){ return j('pricing.json'); }
export function loadQuiz(){
  const out = [];
  for (const f of ['dabestan', 'mote1']) {
    const b = j(`quiz/${f}.json`);
    for (const it of b.items) out.push({ ...it, level: b.level, levelTitle: b.title });
  }
  return out;
}
export function loadCard(st){
  const line = st.split('-')[0];
  const p = join(ROOT, 'content', 'metro', 'cards', line, `${st}.json`);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

// نقشهٔ ایستگاه‌ها: id → {line, station} برای اعتبارسنجی سریع
export function stationIndex(net){
  const idx = new Map();
  for (const L of net.lines)
    for (const s of L.stations) idx.set(s.id, { line: L, st: s });
  return idx;
}
