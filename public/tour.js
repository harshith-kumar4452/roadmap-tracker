// Quick guided tour: dims the page, spotlights one element per step, and explains it.
// Steps: { target: CSS selector | element | null (centred card), title, text }.
// Steps whose target isn't on the page (or is hidden) are skipped.

const KEY = 'rt:tour-done';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function tourSeen() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return true; } // no storage: don't nag
}
function markSeen() {
  try { localStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
}

const resolve = (t) => {
  if (!t) return null;
  const el = typeof t === 'string' ? document.querySelector(t) : t;
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return r.width && r.height && getComputedStyle(el).visibility !== 'hidden' ? el : undefined;
};

export function startTour(allSteps) {
  document.querySelector('.tour-layer')?.remove();
  const steps = allSteps.filter((s) => resolve(s.target) !== undefined);
  if (!steps.length) return;
  let i = 0;
  let target = null;
  const before = document.activeElement;

  const layer = document.createElement('div');
  layer.className = 'tour-layer';
  layer.innerHTML = `
    <div class="tour-dim" aria-hidden="true"><i data-p="t"></i><i data-p="b"></i><i data-p="l"></i><i data-p="r"></i></div>
    <div class="tour-spot" aria-hidden="true"></div>
    <div class="tour-pop" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text">
      <div class="tour-step"></div>
      <h2 id="tour-title" class="tour-title"></h2>
      <p id="tour-text" class="tour-text"></p>
      <div class="tour-foot">
        <div class="tour-dots" aria-hidden="true">${steps.map(() => '<i></i>').join('')}</div>
        <div class="tour-btns">
          <button type="button" class="btn ghost small" data-tour="skip">Skip</button>
          <button type="button" class="btn small" data-tour="back">Back</button>
          <button type="button" class="btn primary small" data-tour="next">Next</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(layer);
  document.documentElement.classList.add('touring');
  const spot = layer.querySelector('.tour-spot');
  // The page is dimmed by four plain panels around the target (top, bottom, left, right),
  // which every browser paints reliably. With no target, the top panel covers everything.
  const parts = Object.fromEntries([...layer.querySelectorAll('.tour-dim i')].map((el) => [el.dataset.p, el.style]));
  const cutout = (x, y, w, h, vw, vh) => {
    const px = (n) => `${Math.max(0, n)}px`;
    if (!w || !h) {
      Object.assign(parts.t, { left: '0px', top: '0px', width: px(vw), height: px(vh) });
      for (const k of ['b', 'l', 'r']) parts[k].height = '0px';
      return;
    }
    Object.assign(parts.t, { left: '0px', top: '0px', width: px(vw), height: px(y) });
    Object.assign(parts.b, { left: '0px', top: px(y + h), width: px(vw), height: px(vh - y - h) });
    Object.assign(parts.l, { left: '0px', top: px(y), width: px(x), height: px(h) });
    Object.assign(parts.r, { left: px(x + w), top: px(y), width: px(vw - x - w), height: px(h) });
  };
  const pop = layer.querySelector('.tour-pop');
  const back = layer.querySelector('[data-tour="back"]');
  const next = layer.querySelector('[data-tour="next"]');

  function position() {
    const M = 12;
    const vw = innerWidth;
    const vh = innerHeight;
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    if (!target) {
      layer.classList.add('centred');
      Object.assign(spot.style, { top: `${vh / 2}px`, left: `${vw / 2}px`, width: '0px', height: '0px' });
      cutout(0, 0, 0, 0, vw, vh);
      Object.assign(pop.style, { top: `${Math.max(M, (vh - ph) / 2)}px`, left: `${Math.max(M, (vw - pw) / 2)}px` });
      return;
    }
    layer.classList.remove('centred');
    const r = target.getBoundingClientRect();
    const pad = 8;
    const top = Math.max(4, r.top - pad);
    const bottom = Math.min(vh - 4, r.bottom + pad);
    const sx = Math.max(4, r.left - pad);
    const sw = Math.min(vw - 8 - sx + 4, r.width + pad * 2);
    const sh = Math.max(0, bottom - top);
    Object.assign(spot.style, { top: `${top}px`, left: `${sx}px`, width: `${sw}px`, height: `${sh}px` });
    cutout(sx, top, sw, sh, vw, vh);
    // Below the target if it fits, else above, else pinned to the bottom of the screen.
    let y = bottom + M;
    if (y + ph > vh - M) y = top - ph - M >= M ? top - ph - M : vh - ph - M;
    const x = Math.min(Math.max(M, r.left + r.width / 2 - pw / 2), vw - pw - M);
    Object.assign(pop.style, { top: `${Math.max(M, y)}px`, left: `${x}px` });
  }

  function show(n) {
    i = n;
    const s = steps[i];
    target = resolve(s.target) || null;
    layer.querySelector('.tour-step').textContent = `Step ${i + 1} of ${steps.length}`;
    layer.querySelector('.tour-title').innerHTML = escHtml(s.title);
    layer.querySelector('.tour-text').innerHTML = escHtml(s.text);
    layer.querySelectorAll('.tour-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    back.hidden = i === 0;
    next.textContent = i === steps.length - 1 ? 'Finish' : 'Next';
    pop.classList.remove('in');
    if (target) {
      const r = target.getBoundingClientRect();
      const off = r.top < 70 || r.bottom > innerHeight - 20;
      if (off) target.scrollIntoView({ block: r.height > innerHeight * 0.6 ? 'start' : 'center', behavior: reduced() ? 'auto' : 'smooth' });
      setTimeout(() => { position(); pop.classList.add('in'); next.focus(); }, off && !reduced() ? 420 : 30);
    } else {
      position();
      pop.classList.add('in');
      next.focus();
    }
  }

  function end() {
    if (!layer.isConnected || layer.classList.contains('out')) return;
    markSeen();
    removeEventListener('hashchange', end);
    removeEventListener('resize', onMove);
    removeEventListener('scroll', onMove, true);
    document.removeEventListener('keydown', onKey, true);
    document.documentElement.classList.remove('touring');
    layer.classList.add('out');
    setTimeout(() => layer.remove(), reduced() ? 0 : 200);
    before?.focus?.();
  }

  let frame = 0;
  const onMove = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(position); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); end(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); back.click(); }
    else if (e.key === 'Tab') {
      // Keep keyboard focus inside the card.
      const f = [...pop.querySelectorAll('button:not([hidden])')];
      const k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  };
  addEventListener('resize', onMove);
  addEventListener('scroll', onMove, true);
  document.addEventListener('keydown', onKey, true);
  // The tour explains the home page; leaving it (nav link, back button) ends the tour instead of
  // leaving the card on top of another page.
  addEventListener('hashchange', end);
  layer.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tour]');
    if (!b) return;
    if (b.dataset.tour === 'skip') end();
    else if (b.dataset.tour === 'back') show(Math.max(0, i - 1));
    else if (i === steps.length - 1) end();
    else show(i + 1);
  });

  show(0);
}
