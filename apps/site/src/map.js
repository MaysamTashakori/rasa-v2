// map.js — نقشه‌کش مترویِ رسا (SVG، اُکتولینئار، پن/زوم، حالت‌های مهر)
// استفاده: new MetroMap(el, {network, my, onStation, compact})

(function(){
const FA = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

// مسیر با گوشه‌های گرد در رأس‌های میانی (شعاع r)
function roundedPath(pts, r){
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++){
    const p = pts[i], a = pts[i-1], b = pts[i+1];
    const la = Math.hypot(p.x-a.x, p.y-a.y), lb = Math.hypot(b.x-p.x, b.y-p.y);
    const r1 = Math.min(r, la/2, lb/2);
    const ax = p.x + (a.x-p.x) * (r1/la), ay = p.y + (a.y-p.y) * (r1/la);
    const bx = p.x + (b.x-p.x) * (r1/lb), by = p.y + (b.y-p.y) * (r1/lb);
    d += ` L ${ax} ${ay} Q ${p.x} ${p.y} ${bx} ${by}`;
  }
  const e = pts[pts.length-1];
  d += ` L ${e.x} ${e.y}`;
  return d;
}

class MetroMap{
  constructor(el, opts){
    this.el = el; this.opts = opts || {};
    this.net = opts.network;
    this.my = opts.my || {};
    this.scale = 1; this.tx = 0; this.ty = 0;
    this.render();
    this.bindPan();
    if (opts.autoFit !== false) this.fit();
  }

  render(){
    const [, , w, h] = this.net.meta.viewBox;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('dir', 'ltr');
    svg.style.cssText = 'width:100%;height:100%;touch-action:none;cursor:grab;user-select:none';

    const vp = document.createElementNS(NS, 'g');
    // زمینهٔ کاغذی خیلی ظریف (خط‌کشی)
    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('x',0); bg.setAttribute('y',0);
    bg.setAttribute('width',w); bg.setAttribute('height',h);
    bg.setAttribute('fill','var(--paper)');
    vp.appendChild(bg);
    const grid = document.createElementNS(NS, 'g');
    grid.setAttribute('opacity','.5');
    for (let x = 0; x <= w; x += 40){
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1',x); l.setAttribute('y1',0); l.setAttribute('x2',x); l.setAttribute('y2',h);
      l.setAttribute('stroke','var(--line)'); l.setAttribute('stroke-width','.5');
      grid.appendChild(l);
    }
    for (let y = 0; y <= h; y += 40){
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1',0); l.setAttribute('y1',y); l.setAttribute('x2',w); l.setAttribute('y2',y);
      l.setAttribute('stroke','var(--line)'); l.setAttribute('stroke-width','.5');
      grid.appendChild(l);
    }
    vp.appendChild(grid);

    // خط‌ها
    for (const L of this.net.lines){
      const pts = L.stations.map(s => ({ x: s.x, y: s.y }));
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', roundedPath(pts, 26));
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', L.color);
      p.setAttribute('stroke-width', '11');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('opacity', '.92');
      vp.appendChild(p);
      // نشان ترمینال‌ها (دو سر خط)
      for (const s of [L.stations[0], L.stations[L.stations.length-1]]){
        const g = document.createElementNS(NS, 'g');
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', s.x); t.setAttribute('y', s.y - 30);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-size', '15'); t.setAttribute('font-weight', '700');
        t.setAttribute('font-family', 'inherit');
        t.setAttribute('fill', L.color);
        t.setAttribute('stroke', 'var(--paper)'); t.setAttribute('stroke-width', '4');
        t.setAttribute('paint-order', 'stroke');
        t.textContent = L.title;
        g.appendChild(t); vp.appendChild(g);
      }
    }

    // ایستگاه‌ها
    for (const L of this.net.lines){
      for (const s of L.stations){
        const st = this.my[s.id];
        const state = st ? (st.pct >= 80 ? 'ok' : st.pct >= 40 ? 'mid' : 'next') : null;
        const g = document.createElementNS(NS, 'g');
        g.classList.add('mm-st');
        g.dataset.id = s.id;
        g.style.cursor = 'pointer';

        const halo = document.createElementNS(NS, 'circle');
        halo.setAttribute('cx', s.x); halo.setAttribute('cy', s.y); halo.setAttribute('r', 21);
        halo.setAttribute('fill', 'transparent');
        g.appendChild(halo); // ناحیهٔ کلیک بزرگ‌تر

        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', s.x); c.setAttribute('cy', s.y);
        c.setAttribute('r', 13);
        c.setAttribute('fill', state === 'ok' ? 'var(--ok)' : state === 'mid' ? 'var(--mid-soft)' : 'var(--card)');
        c.setAttribute('stroke', state === 'next' ? 'var(--next)' : L.color);
        c.setAttribute('stroke-width', '5');
        g.appendChild(c);

        if (state === 'ok'){ // تیکِ مهر
          const tick = document.createElementNS(NS, 'path');
          tick.setAttribute('d', `M ${s.x-6} ${s.y} l 4.5 4.5 l 8 -9`);
          tick.setAttribute('stroke', '#fff'); tick.setAttribute('stroke-width', '3.5');
          tick.setAttribute('fill', 'none'); tick.setAttribute('stroke-linecap', 'round');
          tick.setAttribute('stroke-linejoin', 'round');
          g.appendChild(tick);
        }
        if (s.free && !state){ // حلقهٔ «رایگان»
          const ring = document.createElementNS(NS, 'circle');
          ring.setAttribute('cx', s.x); ring.setAttribute('cy', s.y); ring.setAttribute('r', 19);
          ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', 'var(--hi)');
          ring.setAttribute('stroke-width', '2.5');
          ring.setAttribute('stroke-dasharray', '4 5');
          g.appendChild(ring);
        }

        // برچسب
        const t = document.createElementNS(NS, 'text');
        const dx = s.lbl === 'r' ? 22 : s.lbl === 'l' ? -22 : 0;
        const dy = s.lbl === 't' ? -26 : s.lbl === 'b' ? 34 : 5;
        let anchor = 'middle', lx = s.x + dx;
        if (!dx) { // نگذار برچسب ایستگاه‌های لبه از کادر بزند
          if (s.x > w - 110) { anchor = 'end'; lx = s.x - 22; }
          else if (s.x < 110) { anchor = 'start'; lx = s.x + 22; }
        }
        t.setAttribute('x', lx); t.setAttribute('y', s.y + dy);
        t.setAttribute('text-anchor', anchor);
        t.setAttribute('font-size', '14.5'); t.setAttribute('font-weight', '700');
        t.setAttribute('font-family', 'inherit');
        t.setAttribute('fill', 'var(--ink)');
        t.setAttribute('stroke', 'var(--paper)'); t.setAttribute('stroke-width', '3.5');
        t.setAttribute('paint-order', 'stroke');
        t.textContent = `${FA(s.n)} · ${s.title}`;
        g.appendChild(t);

        const go = (ev) => {
          if (this._dragged) return; // بعد از پن، کلیک حساب نشود
          ev.stopPropagation(); this.opts.onStation && this.opts.onStation(s, L);
        };
        g.addEventListener('click', go);
        vp.appendChild(g);
      }
    }

    svg.appendChild(vp);
    this.el.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:100%;height:100%';
    wrap.appendChild(svg);
    // دکمه‌های زوم
    const zoom = (f) => { this.setScale(this.scale * f); };
    const btns = document.createElement('div');
    btns.className = 'mm-zoom';
    btns.innerHTML = `<button data-z="in" aria-label="بزرگ‌نمایی">+</button><button data-z="out" aria-label="کوچک‌نمایی">−</button>`;
    btns.querySelector('[data-z=in]').onclick = () => zoom(1.25);
    btns.querySelector('[data-z=out]').onclick = () => zoom(1/1.25);
    wrap.appendChild(btns);
    this.el.appendChild(wrap);
    this.svg = svg; this.vp = vp;
    this.applyT();
  }

  applyT(){
    if (this.vp) this.vp.setAttribute('transform', `translate(${this.tx} ${this.ty}) scale(${this.scale})`);
  }
  setScale(s){
    const [, , w, h] = this.net.meta.viewBox;
    const ns = Math.max(.6, Math.min(3, s));
    // زوم به مرکز دید فعلی
    const cx = (w/2 - this.tx) / this.scale, cy = (h/2 - this.ty) / this.scale;
    this.scale = ns;
    this.tx = w/2 - cx * ns; this.ty = h/2 - cy * ns;
    this.applyT();
  }
  fit(){ this.scale = 1; this.tx = 0; this.ty = 0; this.applyT(); }

  bindPan(){
    let down = null, moved = false;
    this.el.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, tx: this.tx, ty: this.ty, moved: false };
      this.el.style.cursor = 'grabbing';
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
      const r = this.svg.getBoundingClientRect();
      const k = this.net.meta.viewBox[2] / r.width;
      this.tx = down.tx + dx * k; this.ty = down.ty + dy * k;
      this.applyT();
    });
    window.addEventListener('pointerup', () => {
      if (down && down.moved) { this._dragged = true; setTimeout(() => { this._dragged = false; }, 60); }
      down = null; this.el.style.cursor = 'grab';
    });
    this.el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.setScale(this.scale * (e.deltaY < 0 ? 1.12 : 1/1.12));
    }, { passive: false });
  }

  refresh(my){ this.my = my || {}; this.render(); this.bindPan(); this.applyT(); }
}

window.MetroMap = MetroMap;
})();
