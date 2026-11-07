// pages.js — نقشهٔ من، سفر (جلسه‌رانر)، آزمونک، تعرفه، پروفایل، راهنما، حقوقی

// ============================================================
// نقشهٔ من
// ============================================================
async function mapPage(){
  const net = await loadNet();
  const me = R2.S.me;
  const main = document.getElementById('main');
  let route5 = null;
  if (me) { try { route5 = await R2.api('route'); } catch {} }

  main.innerHTML = `
  <section class="sec wrap">
    <div class="map-page-head">
      <div>
        <div class="t-eyebrow">MY MAP · نقشهٔ من</div>
        <h1 class="t-h2">نقشهٔ ${me ? R2.esc(me.user.name) : 'شما'}</h1>
        <p class="dim">${me ? 'ایستگاه‌های سبز، مهر خورده‌اند؛ زرد در تمرین؛ قرمز گام بعدی.' : 'وارد شوید تا حالت ایستگاه‌هایتان روی نقشه بیفتد.'}</p>
      </div>
      ${me ? '' : '<button class="btn btn-dark" id="mp-login">ورود / ساخت حساب</button>'}
    </div>
    <div class="map-layout">
      <div class="map-card card">
        <div class="map-card-top"><b>نقشهٔ شبکه</b><span class="dim">کشیدن = جابه‌جایی · چرخ = بزرگ‌نمایی</span></div>
        <div class="map-box map-box-lg" id="the-map"></div>
        <div class="legend">
          <span><i class="lg-dot" style="background:var(--ok)"></i> بلد</span>
          <span><i class="lg-dot" style="background:var(--mid)"></i> در تمرین</span>
          <span><i class="lg-dot" style="background:var(--next)"></i> گام بعدی</span>
          <span><i class="lg-ring"></i> رایگان</span>
        </div>
      </div>
      <aside class="map-side">
        ${me ? `
        <div class="card pad rv">
          <h3 class="t-h3">وضعیت کارت</h3>
          ${me.card.active
            ? `<p class="ok-line">✅ کارتِ ${me.card.plan === 'year' ? 'سالانه' : 'ماهانه'} فعال است تا ${R2.date(me.card.exp)}</p>
               <a class="btn btn-ghost" href="/pricing" data-go>تمدید ←</a>`
            : `<p class="dim">کارتِ رسا ندارید؛ سفرِ پایه همه‌جا باز است.</p>
               <a class="btn btn-dark" href="/pricing" data-go>خرید کارت ←</a>`}
        </div>
        <div class="card pad rv">
          <h3 class="t-h3">پوشش خطوط</h3>
          ${(route5 ? '' : '')}
          ${net.lines.map(L => {
            const done = L.stations.filter(s => (net.my[s.id] || {}).stamped).length;
            const pct = Math.round(done / L.stations.length * 100);
            return `<div class="line-cov">
              <span class="line-chip" style="--c:${L.color}"><i></i>${L.title}</span>
              <div class="cov-bar"><i style="width:${pct}%;background:${L.color}"></i></div>
              <b class="t-num">${R2.fa(done)}÷${R2.fa(L.stations.length)}</b>
            </div>`;
          }).join('')}
        </div>
        <div class="card pad rv">
          <h3 class="t-h3">🧭 مسیرِ این هفته</h3>
          ${route5 ? `<ol class="route-list">${route5.route.map(r => `
            <li><a href="/j/${r.id}" data-go><b style="color:${r.color}">${r.lineTitle}</b> — ${r.title}<small class="dim">${r.reason}</small></a></li>`).join('')}
          </ol>` : '<p class="dim">برای چیدن مسیر، اول چند سفر ثبت کنید.</p>'}
        </div>` : `
        <div class="card pad rv">
          <h3 class="t-h3">مسافر شوید</h3>
          <p class="dim">حساب رایگان بسازید تا مهرها ثبت شوند، مسیریاب مسیرِ هفته را بچیند و نامهٔ جمعه برای خانواده برود.</p>
          <button class="btn btn-dark" id="mp-login2">شروع رایگان</button>
        </div>`}
      </aside>
    </div>
  </section>`;

  new MetroMap(document.getElementById('the-map'), {
    network: net, my: net.my || {},
    onStation: (s) => R2.go('/j/' + s.id),
  });
  const lg = id => { const b = document.getElementById(id); if (b) b.onclick = () => authModal(); };
  lg('mp-login'); lg('mp-login2');
  R2.ev('map_open');
  bindReveal();
}

// ============================================================
// سفر — جلسه‌رانر
// ============================================================
const JR = { st: null, data: null, mode: 'card', i: 0, score: 0, total: 0, t0: 0, seq: [], lock: false };

function jrNorm(s){
  return String(s ?? '')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[٫,\s]/g, m => m === '٫' ? '.' : '')
    .replace(/[−–—ـ]/g, '-')
    .replace(/(\d)-$/g, '-$1')
    .trim();
}

async function journeyPage(stId){
  const main = document.getElementById('main');
  let d;
  try { d = await R2.api('station/' + stId); } catch { return R2.go('/map'); }
  JR.st = d.station; JR.data = d; JR.i = 0; JR.score = 0; JR.total = 0; JR.t0 = Date.now();
  JR.mode = d.steps ? 'card' : 'bank';

  const lineOf = d.line;
  main.innerHTML = `
  <section class="sec wrap">
    <a href="/map" data-go class="dim back">→ نقشه</a>
    <div class="jr-head">
      <span class="line-chip" style="--c:${lineOf.color}"><i></i>${lineOf.title}</span>
      <h1 class="t-h2">ایستگاه ${R2.fa(d.station.n)} · ${R2.esc(d.station.title)}</h1>
      <p class="dim">${R2.fa(JR.data.mins)} دقیقه · ${d.steps ? 'سفرِ کامل (کارت تعاملی)' : d.card.exists ? 'سفرِ پایه (بانک سؤال) — کارتِ تعاملی با «کارتِ رسا»' : 'سفرِ پایه (بانک سؤال)'}</p>
      ${d.card.locked ? `<div class="lock-note">${d.card.locked}</div>` : ''}
    </div>
    <div class="jr-progress"><i id="jr-bar"></i></div>
    <div class="card pad jr-stage" id="jr-stage"></div>
    <div class="jr-actions" id="jr-actions"></div>
  </section>`;
  R2.ev('station_open', { station: stId });
  jrStep();
}

function jrSteps(){
  if (JR.mode === 'card' && JR.data.steps) return JR.data.steps;
  return JR.data.bank.map(q => ({ t: 'ask', ...q }));
}
function jrCountTotal(){
  JR.total = jrSteps().reduce((n, s) =>
    n + (s.t === 'ask' || s.t === 'input' || s.t === 'order' ? 1 : s.t === 'match' ? s.pairs.length : 0), 0);
}
function jrBar(){
  const steps = jrSteps();
  document.getElementById('jr-bar').style.width = Math.round((JR.i / steps.length) * 100) + '%';
}

function jrStep(){
  const steps = jrSteps();
  jrCountTotal(); jrBar();
  const stage = document.getElementById('jr-stage');
  const acts = document.getElementById('jr-actions');
  acts.innerHTML = '';
  if (JR.i >= steps.length) return jrEnd();

  const s = steps[JR.i];
  stage.innerHTML = `<div class="jr-meta dim t-num">گام ${R2.fa(JR.i + 1)} از ${R2.fa(steps.length)}</div>`;

  if (s.t === 'say'){
    stage.insertAdjacentHTML('beforeend', `
      <h3 class="t-h3">${R2.esc(s.h)}</h3>
      <p class="jr-body">${R2.esc(s.b)}</p>
      ${s.ex && s.ex.length ? `<div class="ex-box">${s.ex.map(e => `<code>${R2.esc(e)}</code>`).join('')}</div>` : ''}`);
    acts.innerHTML = `<button class="btn btn-dark" id="jr-next">فهمیدم ←</button>`;
    document.getElementById('jr-next').onclick = () => { JR.i++; jrStep(); };
  }

  if (s.t === 'ask'){
    stage.insertAdjacentHTML('beforeend', `
      <h3 class="t-h3 jr-q">${R2.esc(s.q)}</h3>
      <div class="opts" id="jr-opts">${s.opts.map((o, i) => `<button class="opt" data-i="${i}">${R2.esc(o)}</button>`).join('')}</div>
      <div class="fb" id="jr-fb"></div>`);
    document.querySelectorAll('#jr-opts .opt').forEach(b => b.onclick = () => {
      if (JR.lock) return; JR.lock = true;
      const ok = Number(b.dataset.i) === s.a;
      if (ok) JR.score++;
      b.classList.add(ok ? 'ok' : 'bad');
      if (!ok) document.querySelector(`#jr-opts .opt[data-i="${s.a}"]`).classList.add('ok');
      document.getElementById('jr-fb').innerHTML = `
        <div class="fb-card ${ok ? 'fb-ok' : 'fb-bad'}"><b>${ok ? '✅ درست' : '❌ نه دقیقاً'}</b>${s.why ? ' — ' + R2.esc(s.why) : ''}</div>
        <button class="btn btn-dark" id="jr-next">ادامه ←</button>`;
      document.getElementById('jr-next').onclick = () => { JR.lock = false; JR.i++; jrStep(); };
    });
  }

  if (s.t === 'input'){
    stage.insertAdjacentHTML('beforeend', `
      <h3 class="t-h3 jr-q">${R2.esc(s.q)}</h3>
      <div class="in-row">
        <input id="jr-in" placeholder="پاسخ…" autocomplete="off">
        <button class="btn btn-dark" id="jr-ok">بررسی</button>
      </div>
      <div class="fb" id="jr-fb"></div>`);
    const inp = document.getElementById('jr-in');
    inp.focus();
    const check = () => {
      if (JR.lock) return; 
      const ok = jrNorm(inp.value) === jrNorm(s.a);
      if (!ok && jrNorm(inp.value) === '') return;
      JR.lock = true;
      if (ok) JR.score++;
      inp.classList.add(ok ? 'in-ok' : 'in-bad');
      document.getElementById('jr-fb').innerHTML = `
        <div class="fb-card ${ok ? 'fb-ok' : 'fb-bad'}"><b>${ok ? '✅ درست' : '❌ پاسخ درست: ' + R2.esc(s.a)}</b>${s.why ? ' — ' + R2.esc(s.why) : ''}</div>
        <button class="btn btn-dark" id="jr-next">ادامه ←</button>`;
      document.getElementById('jr-next').onclick = () => { JR.lock = false; JR.i++; jrStep(); };
    };
    document.getElementById('jr-ok').onclick = check;
    inp.onkeydown = e => { if (e.key === 'Enter') check(); };
  }

  if (s.t === 'order'){
    JR.seq = [];
    const items = [...s.items].sort(() => Math.random() - .5);
    stage.insertAdjacentHTML('beforeend', `
      <h3 class="t-h3 jr-q">${R2.esc(s.q)}</h3>
      <div class="order-slots" id="jr-slots"></div>
      <div class="order-pool" id="jr-pool">${items.map(x => `<button class="opt chip">${R2.esc(x)}</button>`).join('')}</div>
      <div class="fb" id="jr-fb"></div>`);
    const draw = () => {
      document.getElementById('jr-slots').innerHTML = JR.seq.length
        ? JR.seq.map(x => `<span class="chip on">${R2.esc(x)}</span>`).join('') + (JR.seq.length < s.a.length ? '<span class="chip ghost">…</span>' : '')
        : '<span class="dim">به ترتیب بزنید…</span>';
    };
    draw();
    document.querySelectorAll('#jr-pool .chip').forEach(b => b.onclick = () => {
      if (JR.lock || b.disabled) return;
      b.disabled = true; b.classList.add('used');
      JR.seq.push(b.textContent);
      draw();
      if (JR.seq.length === s.a.length) {
        JR.lock = true;
        const ok = JR.seq.join('¦') === s.a.join('¦');
        if (ok) JR.score++;
        document.getElementById('jr-fb').innerHTML = `
          <div class="fb-card ${ok ? 'fb-ok' : 'fb-bad'}"><b>${ok ? '✅ ترتیب درست' : '❌ ترتیب درست: ' + s.a.map(R2.esc).join(' ← ')}</b>${s.why ? ' — ' + R2.esc(s.why) : ''}</div>
          <button class="btn btn-dark" id="jr-next">ادامه ←</button>`;
        document.getElementById('jr-next').onclick = () => { JR.lock = false; JR.i++; jrStep(); };
      }
    });
  }

  if (s.t === 'match'){
    const L = s.pairs.map(p => p[0]), Rr = [...s.pairs.map(p => p[1])].sort(() => Math.random() - .5);
    let sel = null, correct = 0, done = 0;
    stage.insertAdjacentHTML('beforeend', `
      <h3 class="t-h3 jr-q">${R2.esc(s.q)}</h3>
      <div class="match-grid">
        <div class="match-col" id="mc-l">${L.map((x, i) => `<button class="opt chip" data-l="${i}">${R2.esc(x)}</button>`).join('')}</div>
        <div class="match-col" id="mc-r">${Rr.map(x => `<button class="opt chip" data-r="${R2.esc(x)}">${R2.esc(x)}</button>`).join('')}</div>
      </div>
      <div class="fb" id="jr-fb"></div>`);
    document.querySelectorAll('#mc-l .chip').forEach(b => b.onclick = () => {
      if (b.disabled) return;
      document.querySelectorAll('#mc-l .chip').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); sel = b;
    });
    document.querySelectorAll('#mc-r .chip').forEach(b => b.onclick = () => {
      if (!sel || b.disabled || JR.lock) return;
      const i = Number(sel.dataset.l), want = s.pairs[i][1];
      const ok = b.textContent === want;
      if (ok) { correct++; sel.disabled = true; sel.classList.remove('sel'); sel.classList.add('ok'); sel = null; b.disabled = true; b.classList.add('ok'); }
      else { b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 700); }
      const leftDone = document.querySelectorAll('#mc-l .chip:disabled').length === s.pairs.length;
      if (leftDone && !JR.lock) {
        JR.lock = true;
        JR.score += correct;
        document.querySelectorAll('#mc-l .chip:not(.ok), #mc-r .chip:not(.ok)').forEach(x => x.classList.add('bad'));
        document.getElementById('jr-fb').innerHTML = `
          <div class="fb-card ${correct === s.pairs.length ? 'fb-ok' : 'fb-bad'}"><b>${correct === s.pairs.length ? '✅ همه درست' : `❌ ${R2.fa(correct)} از ${R2.fa(s.pairs.length)} درست`}</b></div>
          <button class="btn btn-dark" id="jr-next">ادامه ←</button>`;
        document.getElementById('jr-next').onclick = () => { JR.lock = false; JR.i++; jrStep(); };
      }
    });
  }
}

async function jrEnd(){
  jrBar();
  const pct = JR.total ? Math.round(JR.score / JR.total * 100) : 0;
  const st = JR.st;
  const stage = document.getElementById('jr-stage');
  const line = JR.data.line;
  const net = R2.S.net || await loadNet();
  const L = net.lines.find(x => x.id === line.id);
  const next = L && L.stations.find(x => x.n === st.n + 1);
  const secs = Math.round((Date.now() - JR.t0) / 1000);

  const save = async () => {
    try {
      const r = await R2.api('travel', { station: st.id, mode: JR.mode, score: JR.score, total: JR.total, secs });
      R2.S.net = null; // نقشه دوباره از سرور بخواند
      return r;
    } catch (e) {
      if (e.status === 401) { authModal(save); return null; }
      toast(e.message, 'bad'); return null;
    }
  };

  const paint = (r) => {
    const newly = r && r.newlyStamped;
    const myPct = r ? r.pct : pct;
    stage.innerHTML = `
      <div class="jr-end ${newly ? 'won' : ''}">
        ${newly ? '<div class="stamp-anim">🏅</div>' : ''}
        <h2 class="t-h2">${newly ? 'مهرِ بلدی زده شد!' : 'سفر تمام شد'}</h2>
        <div class="jr-score t-num">${R2.fa(myPct)}٪</div>
        <p class="dim">${R2.fa(JR.score)} از ${R2.fa(JR.total)} گام درست · ${r ? 'در دفتر مهر ثبت شد' : 'برای ثبت مهر، حساب لازم است'}</p>
        <div class="hero-cta">
          ${next ? `<a class="btn btn-dark" href="/j/${next.id}" data-go>ایستگاه بعدی: ${R2.esc(next.title)} ←</a>` : ''}
          <a class="btn btn-ghost" href="/map" data-go>نقشه</a>
          ${r ? '' : '<button class="btn btn-hi" id="jr-save">ثبت مهر (ورود سریع)</button>'}
        </div>
      </div>`;
    const sv = document.getElementById('jr-save');
    if (sv) sv.onclick = async () => { sv.disabled = true; sv.textContent = '…'; const r2 = await save(); if (r2) paint(r2); else { sv.disabled = false; sv.textContent = 'ثبت مهر (ورود سریع)'; } };
  };

  if (R2.S.me) { const r = await save(); paint(r || { pct, newlyStamped: false }); }
  else paint(null);
}

// ============================================================
// آزمونک
// ============================================================
const QZ = { items: [], i: 0, score: 0, level: 'mote1', lock: false };

async function quizPage(){
  const main = document.getElementById('main');
  main.innerHTML = `
  <section class="sec wrap">
    ${head('📝', 'QUIZ', 'آزمونکِ تند', 'ده سؤال تصادفی از بانکِ رسا — بدون ثبت‌نام هم کار می‌کند.')}
    <div class="qz-setup card pad">
      <div class="qz-levels">
        <button class="chip on" data-lv="mote1">متوسطهٔ اول</button>
        <button class="chip" data-lv="dabestan">دبستان</button>
      </div>
      <button class="btn btn-dark" id="qz-start">شروع آزمونک ←</button>
    </div>
    <div class="card pad jr-stage" id="qz-stage" hidden></div>
  </section>`;
  document.querySelectorAll('.qz-levels .chip').forEach(b => b.onclick = () => {
    document.querySelectorAll('.qz-levels .chip').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); QZ.level = b.dataset.lv;
  });
  document.getElementById('qz-start').onclick = startQuiz;
}

async function startQuiz(){
  const stage = document.getElementById('qz-stage');
  stage.hidden = false;
  stage.innerHTML = '<p class="dim">…</p>';
  const j = await R2.api('quiz?level=' + QZ.level);
  QZ.items = [...j.items].sort(() => Math.random() - .5).slice(0, 10);
  QZ.i = 0; QZ.score = 0;
  qzStep();
}
function qzStep(){
  const stage = document.getElementById('qz-stage');
  if (QZ.i >= QZ.items.length){
    const pct = Math.round(QZ.score / QZ.items.length * 100);
    R2.api('quiz/attempt', { level: QZ.level, score: QZ.score, total: QZ.items.length }).catch(() => {});
    stage.innerHTML = `
      <div class="jr-end">
        <h2 class="t-h2">${pct >= 80 ? 'عالی بود 🎉' : pct >= 40 ? 'خوب بود — ادامه بده' : 'تمرین لازم است'}</h2>
        <div class="jr-score t-num">${R2.fa(QZ.score)} از ${R2.fa(QZ.items.length)}</div>
        <div class="hero-cta"><button class="btn btn-dark" id="qz-again">یک دور دیگر</button></div>
      </div>`;
    document.getElementById('qz-again').onclick = startQuiz;
    return;
  }
  const q = QZ.items[QZ.i];
  QZ.lock = false;
  stage.innerHTML = `
    <div class="jr-meta dim t-num">سؤال ${R2.fa(QZ.i + 1)} از ${R2.fa(QZ.items.length)} · ${R2.esc(q.subject)}</div>
    <h3 class="t-h3 jr-q">${R2.esc(q.q)}</h3>
    <div class="opts" id="qz-opts">${q.opts.map((o, i) => `<button class="opt" data-i="${i}">${R2.esc(o)}</button>`).join('')}</div>
    <div class="fb" id="qz-fb"></div>`;
  document.querySelectorAll('#qz-opts .opt').forEach(b => b.onclick = () => {
    if (QZ.lock) return; QZ.lock = true;
    const ok = Number(b.dataset.i) === q.a;
    if (ok) QZ.score++;
    b.classList.add(ok ? 'ok' : 'bad');
    if (!ok) document.querySelector(`#qz-opts .opt[data-i="${q.a}"]`).classList.add('ok');
    document.getElementById('qz-fb').innerHTML = `
      <div class="fb-card ${ok ? 'fb-ok' : 'fb-bad'}">${q.why ? R2.esc(q.why) : ''}</div>
      <button class="btn btn-dark" id="qz-next">ادامه ←</button>`;
    document.getElementById('qz-next').onclick = () => { QZ.i++; qzStep(); };
  });
}

// ============================================================
// تعرفه
// ============================================================
async function pricingPage(){
  const P = await loadPricing();
  const main = document.getElementById('main');
  main.innerHTML = `
  <section class="sec wrap">
    ${head('🎫', 'RASA CARD', 'کارتِ رسا', 'مثل کارتِ مترو: شارژ یک‌باره، سفرِ نامحدود تا پایان اعتبار. تمدید روی اعتبار فعلی انباشته می‌شود.')}
    <div class="plans">${P.plans.map(pl => `
      <div class="plan card rv ${pl.id === 'month' ? 'plan-hi' : ''}">
        ${pl.id === 'month' ? '<span class="plan-tag">پیشنهاد رسا</span>' : ''}
        <h3 class="t-h3">${pl.title}</h3>
        <div class="plan-price">${R2.price(pl.price)}${pl.price ? ` <small>／ ${pl.period}</small>` : ` <small>／ ${pl.period}</small>`}</div>
        <ul>${pl.features.map(f => `<li>${f}</li>`).join('')}</ul>
        ${pl.price === 0
          ? '<a class="btn btn-ghost" href="/map" data-go>شروع رایگان</a>'
          : `<button class="btn btn-dark" data-buy="${pl.id}">خرید و شارژ</button>`}
      </div>`).join('')}
    </div>
    <div class="card pad school-box rv" id="school">
      <h3 class="t-h3">🏫 ${P.school.title}</h3>
      <p class="dim">${P.school.note} — <a href="mailto:${P.school.contact}">${P.school.contact}</a></p>
    </div>
    <p class="fine dim">پرداخت با زرین‌پال؛ قیمت‌ها به تومان. تا فعال‌شدن درگاهِ اصلی، سفارش‌ها ذخیره می‌شوند. سفرِ پایه و نقشه برای همه، همیشه رایگان است.</p>
  </section>`;
  document.querySelectorAll('[data-buy]').forEach(b => b.onclick = async () => {
    if (!R2.S.me) return authModal(() => b.click());
    R2.ev('pay_start', { station: b.dataset.buy });
    try {
      const r = await R2.api('card', { plan: b.dataset.buy });
      if (r.url) location.href = r.url;
    } catch (e) { toast(e.message, 'bad'); }
  });
  bindReveal();
}

// ============================================================
// پروفایل — دفتر مهر، کارت، ربات‌ها، نامهٔ جمعه
// ============================================================
async function mePage(){
  const main = document.getElementById('main');
  if (!R2.S.me) { authModal(() => mePage()); return; }
  const q = new URLSearchParams(location.search);
  if (q.get('pay') === 'ok') toast('✅ پرداخت موفق؛ کارت شارژ شد');
  if (q.get('pay') === 'fail') toast('پرداخت ناتمام ماند؛ دوباره تلاش کنید', 'bad');

  const [me, pass, fri, notify] = await Promise.all([
    R2.api('me'), R2.api('passport').catch(() => null), R2.api('friday').catch(() => null), R2.api('notify'),
  ]);
  R2.S.me = me;
  const net = await loadNet();

  main.innerHTML = `
  <section class="sec wrap">
    <div class="me-head">
      <div>
        <div class="t-eyebrow">PASSPORT · دفتر مهر</div>
        <h1 class="t-h2">${R2.esc(me.user.name)}</h1>
        <p class="dim">${R2.esc(me.user.login)}</p>
      </div>
      <div class="me-side">
        ${me.card.active
          ? `<div class="card pad me-card on"><b>🎫 کارتِ ${me.card.plan === 'year' ? 'سالانه' : 'ماهانه'}</b><span>تا ${R2.date(me.card.exp)}</span><a href="/pricing" data-go>تمدید</a></div>`
          : `<div class="card pad me-card"><b>بدون کارت</b><span>سفرِ پایه رایگان است</span><a href="/pricing" data-go>خرید کارت</a></div>`}
        <button class="btn btn-ghost" id="me-out">خروج</button>
      </div>
    </div>

    <div class="me-grid">
      <div class="card pad rv">
        <h3 class="t-h3">دفتر مهر — ${R2.fa(me.stamps)} مهر</h3>
        ${net.lines.map(L => {
          const mine = pass ? pass.stamps.filter(s => L.stations.some(x => x.id === s.station)) : [];
          return `<div class="pp-line">
            <span class="line-chip" style="--c:${L.color}"><i></i>${L.title}</span>
            <div class="pp-stamps">
              ${L.stations.map(s => {
                const m = mine.find(x => x.station === s.id);
                const cls = m ? (m.stamped ? 'st-ok' : m.pct >= 40 ? 'st-mid' : 'st-next') : 'st-new';
                return `<span class="pp-st ${cls}" title="${R2.esc(s.title)}">${R2.esc(s.title)}${m && m.stamped ? ' ✓' : m ? ' · ' + R2.fa(m.pct) + '٪' : ''}</span>`;
              }).join('')}
            </div>
          </div>`;
        }).join('')}
        ${me.founder ? '<a class="btn btn-ghost" href="/admin" data-go>مرکز فرمان ←</a>' : ''}
      </div>

      <div class="card pad rv">
        <h3 class="t-h3">📬 پیام‌رسان و نامهٔ جمعه</h3>
        <p class="dim">حساب را به بله یا تلگرام وصل کنید تا نتیجهٔ سفرها و نامهٔ جمعه برسد.</p>
        <div class="bot-row">
          ${['telegram', 'bale'].map(k => {
            const on = notify.enabled[k];
            const linked = notify.linked.find(l => l.kind === k);
            return `<div class="bot-card ${linked ? 'on' : ''}">
              <b>${k === 'telegram' ? 'تلگرام' : 'بله'}</b>
              ${linked ? '<span class="ok-line">وصل است ✅</span>' : on ? '<button class="btn btn-ghost btn-sm" data-link="' + k + '">دریافت کد پیوند</button>' : '<span class="dim">به‌زودی</span>'}
            </div>`;
          }).join('')}
        </div>
        <div id="link-code"></div>
        <h4 class="t-h3" style="margin-top:1.2rem">نامهٔ این هفته (نمایش زنده)</h4>
        <pre class="fri-prev">${R2.esc((fri?.text || '').replace(/<[^>]+>/g, ''))}</pre>
      </div>
    </div>
  </section>`;

  document.getElementById('me-out').onclick = async () => { await R2.api('logout'); R2.S.me = null; R2.S.net = null; renderNav(); R2.go('/'); };
  document.querySelectorAll('[data-link]').forEach(b => b.onclick = async () => {
    const r = await R2.api('notify/link');
    document.getElementById('link-code').innerHTML = `
      <div class="fb-card fb-ok">کد پیوند: <b class="t-num" style="font-size:1.2em">${R2.fa(r.code)}</b><br>
      در ${b.dataset.link === 'bale' ? 'بله' : 'تلگرام'} به ربات <b>${R2.esc((r.names[b.dataset.link] || 'رسا'))}</b> بروید و این کد را بفرستید (۱۵ دقیقه اعتبار دارد).</div>`;
  });
  bindReveal();
}

// ============================================================
// راهنما — زنده، با خودِ ویجت‌ها
// ============================================================
async function guidePage(){
  const net = await loadNet();
  document.getElementById('main').innerHTML = `
  <section class="sec wrap">
    ${head('❓', 'GUIDE', 'راهنمای رسا', 'همه‌چیز را همین‌جا، زنده نشان می‌دهیم — همین نقشهٔ واقعی است.')}
    <div class="guide-grid">
      <div class="card pad rv"><h3 class="t-h3">۱ · نقشه</h3><p>هر درس یک <span class="hl">خط</span> است و هر فصل یک <b>ایستگاه</b>. نقشه را بکشید و بزرگ کنید؛ روی هر ایستگاه بزنید تا سفرش شروع شود.</p><div class="guide-map" id="g-map"></div></div>
      <div class="card pad rv"><h3 class="t-h3">۲ · سفر</h3><p>سفرِ هر ایستگاه ۱۰ تا ۱۵ دقیقه است: مفهومِ کوتاه، تمرینِ تعاملی با «چرا؟»، و آزمونک. مثال واقعی از ایستگاه «عددهای اول»:</p>
        <div class="guide-demo">
          <div class="jr-meta dim">نمونهٔ گام تعاملی</div>
          <h4>عدد ۱۷ چه نوع عددی است؟</h4>
          <div class="opts"><span class="opt ok">۱۷</span><span class="opt">۹</span><span class="opt">۱۵</span><span class="opt">۲۱</span></div>
          <p class="dim">«چون فقط بر ۱ و خودش بخش‌پذیر است.»</p>
        </div>
        <a class="btn btn-dark" href="/j/m8-1" data-go>سفرِ واقعی را امتحان کن ←</a></div>
      <div class="card pad rv"><h3 class="t-h3">۳ · مهر</h3><p>۸۰٪ و بالاتر = <span class="stamp ok"><span class="dot"></span>مهرِ بلدی</span> — برای همیشه می‌ماند. ۴۰ تا ۸۰ = <span class="stamp mid"><span class="dot"></span>در تمرین</span>؛ زیر ۴۰ = <span class="stamp next"><span class="dot"></span>گام بعدی</span>. مهرها در «دفتر مهر» شما جمع می‌شوند.</p></div>
      <div class="card pad rv"><h3 class="t-h3">۴ · نامهٔ جمعه</h3><p>از پروفایل، حساب را به <b>بله</b> یا <b>تلگرام</b> وصل کنید. هر جمعه ساعت ۱۹ گزارش هفته می‌رسد: چند سفر، کدام مهرها، گام بعدی کجاست. شب‌ها (۲۱ تا ۷) هیچ پیامی نمی‌آید.</p><a class="btn btn-ghost" href="/me" data-go>وصل‌کردن پیام‌رسان ←</a></div>
    </div>
    <div class="faq rv">
      <h3 class="t-h3">پرسش‌های پرتکرار</h3>
      <details><summary>رایگان چیست دقیقاً؟</summary><p>کل نقشه، سفرِ پایهٔ (بانک سؤال) همهٔ ایستگاه‌ها، کارت کامل ایستگاه‌های رایگان‌شده و نامهٔ جمعه — همیشه رایگان.</p></details>
      <details><summary>«کارتِ رسا» چه چیزهایی را باز می‌کند؟</summary><p>کارت‌های تعاملیِ کامل همهٔ ایستگاه‌ها (همهٔ گام‌های مفهوم-تمرین)، کارنامهٔ تحلیلی و مسیریابِ پیشرفته. ماهانه یا سالانه؛ تمدید انباشته می‌شود.</p></details>
      <details><summary>چند فرزند می‌توانند استفاده کنند؟</summary><p>با کارتِ رسا تا ۳ مسافر از یک حساب؛ هرکدام نقشه و دفتر مهر خودش را می‌سازد (به‌زودی حساب جدا برای هر مسافر).</p></details>
      <details><summary>مهر که گرفته شد، می‌سوزد؟</summary><p>نه؛ مهرِ بلدی همیشگی است. اگر بعداً نمره پایین بیاید، حالت ایستگاه «در تمرین» می‌شود ولی مهرِ دفتر باقی می‌ماند.</p></details>
    </div>
  </section>`;
  new MetroMap(document.getElementById('g-map'), { network: net, my: {}, onStation: (s) => R2.go('/j/' + s.id) });
  bindReveal();
}

// ============================================================
// درباره و حقوقی
// ============================================================
function legalPage(kind){
  const T = {
    about: { h: 'دربارهٔ رسا', b: `
      <p>رسا یک پلتفرم یادگیری خانوادگی است با یک استعارهٔ ساده: <b>درس مثل مترو</b>. هر فصل کتاب یک ایستگاه است، هر جلسهٔ ۱۵ دقیقه‌ای یک سفر، و تسلط روی هر مبحث یک مهر که برای همیشه می‌ماند.</p>
      <p>باور ما: یادگیریِ خوب «گامِ کوچکِ روزانه + دیده‌شدن توسط خانواده» است؛ نه دوره‌های طولانی و نه شعار. همهٔ آمار رسا از دادهٔ واقعی کاربران می‌آید و هیچ عددی ساختگی نیست.</p>
      <p>رسا مستقل است، بدون سرمایهٔ خارجی، و با احترام به حریم خصوصی کودکان ساخته می‌شود.</p>` },
    terms: { h: 'قواعد استفاده', b: `
      <p>۱) حساب با موبایل یا ایمیل ساخته می‌شود؛ مسئولیت نگه‌داری رمز با شماست.</p>
      <p>۲) اشتراک «کارتِ رسا» تا پایان اعتبار معتبر است و تمدید آن انباشته می‌شود.</p>
      <p>۳) محتوای رسا فقط برای استفادهٔ شخصی است؛ بازنشر تجاری ممنوع.</p>
      <p>۴) آمار پیشرفت فقط برای خود کاربر و پیام‌رسان‌هایِ پیوندشده ارسال می‌شود.</p>` },
    privacy: { h: 'حریم خصوصی', b: `
      <p>۱) فقط دو چیز ذخیره می‌کنیم: شناسهٔ ورود (موبایل/ایمیل) و ردّپای یادگیری (سفرها و مهرها).</p>
      <p>۲) دادهٔ کودکان در حد پیشرفت درسی است؛ هیچ محتوای شخصی جمع نمی‌شود.</p>
      <p>۳) پیام‌رسان فقط با کد پیوندی که خودتان می‌سازید وصل می‌شود و هر لحظه قابل قطع است.</p>
      <p>۴) داده‌ها روی سرور خودِ ما نگه داشته می‌شود و با هیچ طرف سومی به اشتراک گذاشته نمی‌شود.</p>` },
  }[kind];
  document.getElementById('main').innerHTML = `
  <section class="sec wrap narrow">
    <div class="t-eyebrow">LEGAL</div>
    <h1 class="t-h2">${T.h}</h1>
    <div class="card pad legal">${T.b}</div>
  </section>`;
}
