// pay.mjs — خرید و تمدید «کارتِ رسا» (اشتراک) با زرین‌پال v4
// تومانِ صحیح در کل سیستم؛ ریال فقط در مرز درگاه. sandbox تا زمان تنظیم مرچنت واقعی.
const MERCHANT = process.env.ZARINPAL_MERCHANT || '';
const SANDBOX = process.env.ZARINPAL_SANDBOX === '1' || !MERCHANT;
const API = SANDBOX ? 'https://sandbox.zarinpal.com/pg/v4/payment'
                    : 'https://payment.zarinpal.com/pg/v4/payment';
const APP_URL = process.env.APP_URL || '';
const toRial = (t) => t * 10;

export function cardState(db, uid){
  const row = db.prepare(
    "SELECT plan, exp_d FROM rcards WHERE uid=? AND status='paid' AND exp_d > datetime('now') ORDER BY exp_d DESC LIMIT 1"
  ).get(uid);
  return row ? { active: true, plan: row.plan, exp: row.exp_d } : { active: false };
}

async function request(order, amount, oid){
  const r = await fetch(`${API}/request.json`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      merchant_id: MERCHANT || 'zarinpal',
      amount: toRial(amount),
      description: `کارتِ رسا — سفارش #${oid}`,
      callback_url: `${APP_URL}/api/pay/callback`,
      metadata: { order_id: oid },
    }),
  });
  return r.json().catch(() => ({}));
}

// POST /api/card {plan}
export async function buyCard(ctx){
  const { db, body, user } = ctx;
  if (!user) return [{ error: 'برای خرید کارت، اول وارد شوید.' }, {}, 401];
  const plan = body.plan;
  const P = ctx.pricing.plans.find(p => p.id === plan && p.price > 0);
  if (!P) return [{ error: 'تعرفهٔ ناشناخته.' }, {}, 400];
  const ins = db.prepare(
    'INSERT INTO rcards(uid, plan, amount, status, at) VALUES(?,?,?,?,?)'
  ).run(user.id, plan, P.price, 'pending', new Date().toISOString());
  const oid = Number(ins.lastInsertRowid);
  if (!MERCHANT)
    return [{ error: 'درگاه هنوز تنظیم نشده؛ سفارش ذخیره شد و بعداً قابل پرداخت است.', order: oid }, {}, 503];
  const j = await request(P, P.price, oid);
  if (j?.data?.code === 100 && j.data.authority) {
    db.prepare('UPDATE rcards SET ref=? WHERE id=?').run(j.data.authority, oid);
    return { url: `https://${SANDBOX ? 'sandbox.zarinpal.com' : 'www.zarinpal.com'}/pg/StartPay/${j.data.authority}` };
  }
  return [{ error: 'درگاه پاسخ نداد؛ دوباره تلاش کنید.' }, {}, 502];
}

// GET /api/pay/callback
export async function callback(ctx, q){
  const { db } = ctx;
  const back = (r) => [null, { location: `${APP_URL}/me?pay=${r}` }, 302];
  const order = db.prepare('SELECT * FROM rcards WHERE ref=?').get(q.Authority || '');
  if (!order) return back('fail');
  if (q.Status !== 'OK') { db.prepare("UPDATE rcards SET status='failed' WHERE id=?").run(order.id); return back('fail'); }
  const r = await fetch(`${API}/verify.json`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ merchant_id: MERCHANT || 'zarinpal', amount: toRial(order.amount), authority: q.Authority }),
  }).then(x => x.json()).catch(() => ({}));
  const code = r?.data?.code;
  if (code !== 100 && code !== 101) { db.prepare("UPDATE rcards SET status='failed' WHERE id=?").run(order.id); return back('fail'); }
  db.prepare("UPDATE rcards SET status='paid' WHERE id=?").run(order.id);
  // تمدیدِ انباشته: اگر کارت فعلی داریم، از تاریخ انقضای فعلی ادامه می‌دهیم
  const cur = cardState(db, order.uid);
  const base = cur.active ? new Date(cur.exp + 'Z') : new Date();
  const days = ctx.pricing.plans.find(p => p.id === order.plan)?.days || 30;
  const from = base.toISOString().slice(0, 10);
  const exp = new Date(base.getTime() + days * 864e5).toISOString().slice(0, 10);
  db.prepare('UPDATE rcards SET from_d=?, exp_d=? WHERE id=?').run(from, exp, order.id);
  return back('ok');
}
