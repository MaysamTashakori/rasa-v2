// data.js — وضعیت جهانی، ابزارها، روتر، ناوبری، مودال‌ها
const R2 = {
  S: { me: null, net: null, pricing: null, quizMeta: null },
  fa(n){ return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); },
  esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  price(n){ return n === 0 ? 'رایگان' : this.fa(n.toLocaleString('en-US').replace(/,/g, '٬')) + ' تومان'; },
  date(iso){ try { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium' }).format(new Date(iso)); } catch { return ''; } },
  async api(path, body){
    const r = await fetch('/api/' + path, body ? {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    } : undefined);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'خطا'), { status: r.status });
    return j;
  },
  ev(name, extra = {}){ fetch('/api/ev', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, ...extra }) }).catch(() => {}); },
  go(path){ history.pushState({}, '', path); route(); scrollTo({ top: 0 }); },
};

// ---------- توست و مودال ----------
function toast(msg, kind = ''){
  let t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('on'));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 400); }, 3200);
}
function modal(html){
  closeModal();
  const ov = document.createElement('div');
  ov.id = 'ov'; ov.className = 'ov';
  ov.innerHTML = `<div class="modal card">${html}</div>`;
  ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
}
function closeModal(){
  const ov = document.getElementById('ov');
  if (ov) ov.remove();
  document.body.style.overflow = '';
}

// ---------- مودال ورود ----------
function authModal(after){
  modal(`
    <h3 class="t-h3">ورود یا ساخت حساب</h3>
    <p class="dim">با موبایل یا ایمیل؛ برای ثبت سفرها و مهرها لازم است.</p>
    <form id="af" class="form">
      <input id="a-login" placeholder="موبایل (۰۹…) یا ایمیل" autocomplete="username" required>
      <input id="a-pass" type="password" placeholder="رمز (دست‌کم ۶ نویسه)" autocomplete="current-password" required minlength="6">
      <button class="btn btn-hi" type="submit">ورود / ساخت حساب</button>
      <p id="a-err" class="err"></p>
    </form>`);
  document.getElementById('af').onsubmit = async (e) => {
    e.preventDefault();
    const login = document.getElementById('a-login').value.trim();
    const pass = document.getElementById('a-pass').value;
    const err = document.getElementById('a-err');
    try {
      let j;
      try { j = await R2.api('login', { login, pass }); }
      catch (e1) { if (e1.status !== 401) throw e1; j = await R2.api('register', { login, pass }); }
      await loadMe();
      closeModal();
      toast('خوش آمدی 🚇');
      after && after();
    } catch (e2) { err.textContent = e2.message; }
  };
}

async function loadMe(){
  try { R2.S.me = await R2.api('me'); } catch { R2.S.me = null; }
  renderNav();
}
async function loadNet(){
  if (R2.S.net) return R2.S.net;
  R2.S.net = await R2.api('network');
  return R2.S.net;
}
async function loadPricing(){
  if (R2.S.pricing) return R2.S.pricing;
  R2.S.pricing = await R2.api('pricing');
  return R2.S.pricing;
}

// ---------- ناوبری ----------
function renderNav(){
  const me = R2.S.me;
  document.getElementById('nav').innerHTML = `
    <div class="nav-in">
      <a class="brand" href="/" data-go>
        <svg viewBox="0 0 36 36" width="34" height="34" aria-hidden="true">
          <circle cx="18" cy="18" r="16.5" fill="none" stroke="var(--ink)" stroke-width="3"/>
          <path d="M7 24 L18 9 L29 24" fill="none" stroke="var(--ink)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="18" cy="9" r="4.6" fill="var(--hi)" stroke="var(--ink)" stroke-width="2.4"/>
        </svg>
        <b>رسا</b><span class="brand-sub">متروی دانش</span>
      </a>
      <nav class="nav-links">
        <a href="/map" data-go>نقشه</a>
        <a href="/quiz" data-go>آزمونک</a>
        <a href="/pricing" data-go>کارتِ رسا</a>
        <a href="/guide" data-go>راهنما</a>
      </nav>
      <div class="nav-side">
        ${me ? `<a class="btn btn-ghost" href="/me" data-go>${R2.esc(me.user.name)}</a>` : `<button class="btn btn-dark" id="nav-login">ورود</button>`}
      </div>
    </div>`;
  const lg = document.getElementById('nav-login');
  if (lg) lg.onclick = () => authModal();
}

function renderFoot(){
  document.getElementById('foot').innerHTML = `
    <div class="foot-in">
      <div>
        <div class="brand-sm">🚇 رسا — متروی دانش</div>
        <p class="dim">درس، ایستگاه‌به‌ایستگاه. هر هفته، نقشهٔ پیشرفت برای خانواده.</p>
      </div>
      <div class="foot-cols">
        <div><b>مسافر</b><a href="/map" data-go>نقشهٔ من</a><a href="/quiz" data-go>آزمونک</a><a href="/me" data-go>دفتر مهر</a></div>
        <div><b>خانواده</b><a href="/guide" data-go>راهنمای والد</a><a href="/pricing" data-go>کارتِ رسا</a></div>
        <div><b>رسا</b><a href="/about" data-go>درباره</a><a href="/terms" data-go>قواعد</a><a href="/privacy" data-go>حریم خصوصی</a></div>
      </div>
    </div>
    <div class="foot-band">© ${R2.fa(1405)} رسا آموزش · rasa-prompt.ir</div>`;
}

// ---------- سرصفحهٔ سکشن ----------
function head(no, en, fa, sub){
  return `<div class="sec-head rv">
    <div class="t-eyebrow">${no} · ${en}</div>
    <h2 class="t-h2">${fa}</h2>
    ${sub ? `<p class="t-lead">${sub}</p>` : ''}
  </div>`;
}

// ---------- روتر ----------
const ROUTES = [
  [/^\/$/, () => homePage()],
  [/^\/map$/, () => mapPage()],
  [/^\/j\/([^/]+)$/, (m) => journeyPage(m[1])],
  [/^\/quiz$/, () => quizPage()],
  [/^\/pricing$/, () => pricingPage()],
  [/^\/me$/, () => mePage()],
  [/^\/guide$/, () => guidePage()],
  [/^\/about$/, () => legalPage('about')],
  [/^\/terms$/, () => legalPage('terms')],
  [/^\/privacy$/, () => legalPage('privacy')],
  [/^\/admin$/, () => adminPage()],
];
function route(){
  const p = location.pathname;
  for (const [re, fn] of ROUTES) {
    const m = re.exec(p);
    if (m) return fn(m);
  }
  document.getElementById('main').innerHTML = `
    <section class="wrap sec"><div class="empty">
      <div class="t-h2">ایستگاهی این‌جا نیست 🚏</div>
      <p>شاید آدرس را اشتباه آمده‌اید؛ <a href="/" data-go>به نقشه برگردید</a>.</p>
    </div></section>`;
}
window.addEventListener('popstate', route);
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-go]');
  if (a) { e.preventDefault(); R2.go(a.getAttribute('href')); }
});

// ---------- reveal (تنها کیت حرکت) ----------
function bindReveal(){
  const io = new IntersectionObserver((es) => {
    es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('on'); io.unobserve(x.target); } });
  }, { threshold: .12 });
  document.querySelectorAll('.rv:not(.on)').forEach((el, i) => {
    el.style.setProperty('--i', i % 8);
    // عناصر داخل دیدِ فعلی بی‌درنگ روشن می‌شوند (بدون اتکا به زمان‌بندی Observer)
    if (el.getBoundingClientRect().top < (window.innerHeight || 900)) el.classList.add('on');
    else io.observe(el);
  });
  // فال‌بک امن: اگر به هر دلیل Observer کار نکرد، پس از ۱.۶ ثانیه همه پیدا شوند
  setTimeout(() => document.querySelectorAll('.rv:not(.on)').forEach(el => el.classList.add('on')), 1600);
}
