// admin.mjs — مرکز فرمان حداقلی: آمار زنده، کاربران، سفارش‌ها
export async function overview(ctx){
  const { db } = ctx;
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  const day = new Date(Date.now() - 864e5).toISOString();
  const week = new Date(Date.now() - 7 * 864e5).toISOString();
  const users = one('SELECT COUNT(*) c FROM users').c;
  const travelsToday = one('SELECT COUNT(*) c FROM travels WHERE at>?', day).c;
  const travels7 = one('SELECT COUNT(*) c FROM travels WHERE at>?', week).c;
  const stamps = one('SELECT COUNT(*) c FROM stamps WHERE stamped=1').c;
  const cards = one("SELECT COUNT(*) c FROM rcards WHERE status='paid' AND exp_d > datetime('now')").c;
  const revenue = one("SELECT COALESCE(SUM(amount),0) c FROM rcards WHERE status='paid'").c;
  const top = db.prepare(
    'SELECT station, COUNT(*) c, ROUND(AVG(pct)) avgp FROM travels GROUP BY station ORDER BY c DESC LIMIT 8'
  ).all();
  const series = db.prepare(
    `SELECT substr(at,1,10) d, COUNT(*) c FROM travels WHERE at>? GROUP BY d ORDER BY d`
  ).all(week);
  const recent = db.prepare(
    'SELECT u.login, t.station, t.pct, t.at FROM travels t JOIN users u ON u.id=t.uid ORDER BY t.id DESC LIMIT 10'
  ).all();
  return { users, travelsToday, travels7, stamps, cards, revenue, top, series, recent };
}

export async function usersList(ctx){
  const { db } = ctx;
  const rows = db.prepare(`
    SELECT u.id, u.login, u.name, u.created,
      (SELECT COUNT(*) FROM travels t WHERE t.uid=u.id) travels,
      (SELECT COUNT(*) FROM stamps s WHERE s.uid=u.id AND s.stamped=1) stamps,
      (SELECT exp_d FROM rcards r WHERE r.uid=u.id AND r.status='paid' AND r.exp_d>datetime('now') ORDER BY r.exp_d DESC LIMIT 1) card_exp
    FROM users u ORDER BY u.id DESC LIMIT 100
  `).all();
  return { users: rows };
}
