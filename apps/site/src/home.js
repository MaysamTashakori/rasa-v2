// home.js — صفحهٔ اول: نقشهٔ زنده + سه درب + آیین سفر + نامهٔ جمعه + کارتِ رسا

async function homePage(){
  const net = await loadNet();
  const st = net.stats;
  const main = document.getElementById('main');

  main.innerHTML = `
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <div class="t-eyebrow">RASA METRO · متروی دانش</div>
        <h1 class="t-h1">درس، <span class="hl">ایستگاه‌به‌ایستگاه</span>.</h1>
        <p class="t-lead">رسا سالِ درسی را به یک نقشهٔ مترو تبدیل می‌کند: هر فصل یک <b>ایستگاه</b>،
        هر جلسه یک <b>سفرِ ۱۵ دقیقه‌ای</b>، و هر قبضی‌کردن یک <b>مهرِ بلدی</b>.
        جمعه‌ها هم نقشهٔ پیشرفت برای خانواده می‌رود — بچه سفر می‌کند، خانواده می‌بیند.</p>
        <div class="hero-cta">
          <button class="btn btn-dark btn-lg" id="h-map">باز کردن نقشه</button>
          <a class="btn btn-ghost btn-lg" href="/j/m8-1" data-go>سفرِ آزمایشی · رایگان ←</a>
        </div>
        <div class="hero-stats">
          <div class="hstat rv"><b data-cu="${st.travelers}">۰</b><span>مسافر</span></div>
          <div class="hstat rv"><b data-cu="${st.travels}">۰</b><span>سفر ثبت‌شده</span></div>
          <div class="hstat rv"><b data-cu="${st.stamps}">۰</b><span>مهرِ بلدی</span></div>
          <div class="hstat rv"><b data-cu="${st.stations}">۰</b><span>ایستگاه روی نقشه</span></div>
        </div>
        <div class="hero-lines">
          ${net.lines.map(L => `<span class="line-chip" style="--c:${L.color}"><i></i>${L.title} · ${R2.fa(L.stations.length)} ایستگاه</span>`).join('')}
        </div>
      </div>
      <div class="hero-map rv">
        <div class="map-card card">
          <div class="map-card-top">
            <b>نقشهٔ زندهٔ رسا</b>
            <span class="dim">روی ایستگاه بزنید — دو ایستگاهِ نخستِ هر خط، سفرش رایگان است</span>
          </div>
          <div class="map-box" id="hero-map"></div>
          <div class="legend">
            <span><i class="lg-dot" style="background:var(--ok)"></i> بلد (مهر شد)</span>
            <span><i class="lg-dot" style="background:var(--mid)"></i> در تمرین</span>
            <span><i class="lg-dot" style="background:var(--next)"></i> گام بعدی</span>
            <span><i class="lg-ring"></i> سفرِ رایگان</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="sec wrap">
    ${head('۰۱', 'THREE DOORS', 'سه درب، یک نقشه', 'هرکس از درِ خودش وارد می‌شود؛ همه به یک نقشه می‌رسند.')}
    <div class="doors">
      <div class="door card rv">
        <div class="door-ic">🎒</div>
        <h3 class="t-h3">دانش‌آموز</h3>
        <p>هر روز یک ایستگاه، ۱۵ دقیقه: مفهومِ کوتاه، چند تمرین، یک آزمونک. مهرها در دفترت جمع می‌شوند و نقشه‌ات سبز می‌شود.</p>
        <a class="btn btn-ghost" href="/map" data-go>نقشهٔ من ←</a>
      </div>
      <div class="door card rv">
        <div class="door-ic">👨‍👩‍👧</div>
        <h3 class="t-h3">والد</h3>
        <p>دیگر لازم نیست بپرسید «خواندی؟». جمعه‌ها نامهٔ رسا در بله یا تلگرام می‌آید: این هفته تا کجا رسید، کجا گیر کرده، گام بعدی کجاست.</p>
        <a class="btn btn-ghost" href="/guide" data-go>راهنمای والد ←</a>
      </div>
      <div class="door card rv">
        <div class="door-ic">🏫</div>
        <h3 class="t-h3">مدرسه و معلم</h3>
        <p>کارتِ سازمانی مدرسه (فاز بعد): کلاس‌ها روی نقشه، تکالیف ایستگاه‌به‌ایستگاه، گزارش هفتگی مدیر. فعلاً با ما تماس بگیرید.</p>
        <a class="btn btn-ghost" href="/pricing#school" data-go>کارتِ مدرسه ←</a>
      </div>
    </div>
  </section>

  <section class="sec wrap">
    ${head('۰۲', 'THE RIDE', 'یک سفر چطور است؟', 'سفرِ هر ایستگاه همیشه چهار ایستگاهِ کوچک دارد — ۱۵ دقیقه، نه بیشتر.')}
    <div class="ritual">
      <div class="rit rv"><b class="rit-n">۱</b><h4>مفهومِ کوتاه</h4><p>چند جملهٔ روشن با مثال؛ همان‌قدر که لازم است، نه بیشتر.</p></div>
      <div class="rit-arrow">←</div>
      <div class="rit rv"><b class="rit-n">۲</b><h4>تمرین</h4><p>چند گامِ تعاملی با پاسخِ فوری و «چرا؟» برای هر جواب.</p></div>
      <div class="rit-arrow">←</div>
      <div class="rit rv"><b class="rit-n">۳</b><h4>آزمونک</h4><p>کوتاه و بی‌استرس؛ همان چیزی که مهر را می‌سازد.</p></div>
      <div class="rit-arrow">←</div>
      <div class="rit rv"><b class="rit-n hi-n">۴</b><h4>مهر</h4><p>۸۰٪ و بالاتر = مهرِ بلدی؛ برای همیشه در دفتر مهر می‌ماند.</p></div>
    </div>
  </section>

  <section class="sec wrap">
    ${head('۰۳', 'FRIDAY LETTER', 'نامهٔ جمعه', 'هفته‌ای یک پیام برای خانواده — از دادهٔ واقعی، نه شعار.')}
    <div class="friday card rv">
      <div class="fri-msg">
        <div class="fri-head">🚇 نامهٔ جمعهٔ رسا — نمونه</div>
        <div class="fri-body">
          • سفرها: <b>۶ جلسه</b><br>
          • مهرهای جدید: <b>۲ 🎉</b><br>
          • بهترین: عددهای اول — <b>۱۰۰٪</b><br>
          • گام بعدی: جبر و معادله — <b>۴۵٪</b><br>
          <span class="dim">نقشهٔ کامل: rasa-prompt.ir/map</span>
        </div>
      </div>
      <div class="fri-side">
        <h3 class="t-h3">پیام‌رسان خودتان، خبر خودتان</h3>
        <p class="dim">حساب رسا را به <b>بله</b> یا <b>تلگرام</b> وصل می‌کنید؛ از آن پس نتیجهٔ هر سفر و نامهٔ جمعه، همان‌جا می‌رسد. ساعات ۲۱ تا ۷ هم سکوت کامل است.</p>
        <a class="btn btn-ghost" href="/me" data-go>وصل‌کردن پیام‌رسان ←</a>
      </div>
    </div>
  </section>

  <section class="sec wrap" id="pricing-teaser">
    ${head('۰۴', 'RASA CARD', 'کارتِ رسا', 'مثل کارتِ مترو: یک‌بار شارژ، سفرِ نامحدود. نقشه و سفرِ پایه همیشه رایگان است.')}
    <div class="plans" id="home-plans"></div>
  </section>

  <section class="cta-band">
    <div class="wrap cta-in rv">
      <h2 class="t-h2">اولین ایستگاه، <span class="hl">رایگان</span> است.</h2>
      <p class="t-lead">بدون کارت بانکی، بدون تعهد — فقط یک سفرِ ۱۵ دقیقه‌ای و مهرِ اول.</p>
      <a class="btn btn-dark btn-lg" href="/j/m8-1" data-go>شروع سفر ←</a>
    </div>
  </section>`;

  // نقشهٔ زندهٔ هیرو
  new MetroMap(document.getElementById('hero-map'), {
    network: net, my: net.my || {},
    onStation: (s) => R2.go('/j/' + s.id),
  });

  document.getElementById('h-map').onclick = () => R2.go('/map');

  // شمارندهٔ زنده (از دیتابیس واقعی)
  document.querySelectorAll('[data-cu]').forEach((el) => {
    const to = Number(el.dataset.cu) || 0;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - k, 3);
      el.textContent = R2.fa(Math.round(to * e));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // کارت‌های تعرفه (کوتاه)
  const P = await loadPricing();
  document.getElementById('home-plans').innerHTML = P.plans.map(pl => `
    <div class="plan card rv ${pl.id === 'month' ? 'plan-hi' : ''}">
      ${pl.id === 'month' ? '<span class="plan-tag">پیشنهاد رسا</span>' : ''}
      <h3 class="t-h3">${pl.title}</h3>
      <div class="plan-price">${R2.price(pl.price)} <small>${pl.id === 'free' ? pl.period : '／ ' + pl.period}</small></div>
      <ul>${pl.features.map(f => `<li>${f}</li>`).join('')}</ul>
      <a class="btn ${pl.id === 'free' ? 'btn-ghost' : 'btn-dark'}" href="/pricing" data-go>${pl.price === 0 ? 'شروع رایگان' : 'خرید کارت'}</a>
    </div>`).join('');

  R2.ev('home');
  bindReveal();
}
