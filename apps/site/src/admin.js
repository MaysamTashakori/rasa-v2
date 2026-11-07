// admin.js — مرکز فرمان حداقلی (فقط بنیان‌گذار)
async function adminPage(){
  const main = document.getElementById('main');
  if (!R2.S.me || !R2.S.me.founder) {
    main.innerHTML = `<section class="sec wrap"><div class="empty">
      <div class="t-h2">ایستگاه ویژه 🚧</div><p>این بخش فقط برای بنیان‌گذار رساست.</p>
    </div></section>`;
    return;
  }
  const [ov, us] = await Promise.all([R2.api('admin/overview'), R2.api('admin/users')]);
  main.innerHTML = `
  <section class="sec wrap">
    ${head('🎛', 'COMMAND', 'مرکز فرمان', 'همهٔ عددها از دیتابیس زنده — بدون بزرگ‌نمایی.')}
    <div class="adm-grid">
      <div class="adm-k card pad rv"><span>مسافران</span><b class="t-num">${R2.fa(ov.users)}</b></div>
      <div class="adm-k card pad rv"><span>سفرهای ۲۴ ساعت</span><b class="t-num">${R2.fa(ov.travelsToday)}</b></div>
      <div class="adm-k card pad rv"><span>سفرهای هفته</span><b class="t-num">${R2.fa(ov.travels7)}</b></div>
      <div class="adm-k card pad rv"><span>مهرهای بلدی</span><b class="t-num">${R2.fa(ov.stamps)}</b></div>
      <div class="adm-k card pad rv"><span>کارت‌های فعال</span><b class="t-num">${R2.fa(ov.cards)}</b></div>
      <div class="adm-k card pad rv"><span>درآمد کل (تومان)</span><b class="t-num">${R2.fa(ov.revenue.toLocaleString('en-US').replace(/,/g, '٬'))}</b></div>
    </div>
    <div class="me-grid">
      <div class="card pad rv">
        <h3 class="t-h3">پررفت‌وآمدترین ایستگاه‌ها</h3>
        <table class="adm-tb"><thead><tr><th>ایستگاه</th><th>سفر</th><th>میانگین</th></tr></thead>
        <tbody>${ov.top.map(t => `<tr><td>${R2.esc(t.station)}</td><td class="t-num">${R2.fa(t.c)}</td><td class="t-num">${R2.fa(t.avgp ?? 0)}٪</td></tr>`).join('') || '<tr><td colspan="3" class="dim">هنوز سفری نیست</td></tr>'}</tbody></table>
      </div>
      <div class="card pad rv">
        <h3 class="t-h3">آخرین سفرها</h3>
        <table class="adm-tb"><thead><tr><th>مسافر</th><th>ایستگاه</th><th>٪</th></tr></thead>
        <tbody>${ov.recent.map(r => `<tr><td>${R2.esc(r.login)}</td><td>${R2.esc(r.station)}</td><td class="t-num">${R2.fa(r.pct)}</td></tr>`).join('') || '<tr><td colspan="3" class="dim">—</td></tr>'}</tbody></table>
      </div>
    </div>
    <div class="card pad rv">
      <h3 class="t-h3">مسافران (۱۰۰ نفر اخیر)</h3>
      <table class="adm-tb"><thead><tr><th>حساب</th><th>نام</th><th>سفرها</th><th>مهرها</th><th>کارت تا</th></tr></thead>
      <tbody>${us.users.map(u => `<tr><td>${R2.esc(u.login)}</td><td>${R2.esc(u.name)}</td><td class="t-num">${R2.fa(u.travels)}</td><td class="t-num">${R2.fa(u.stamps)}</td><td>${u.card_exp ? R2.date(u.card_exp) : '—'}</td></tr>`).join('')}</tbody></table>
    </div>
  </section>`;
  bindReveal();
}
