// Interactive mind map.
//
// Click a branch to fold or unfold it, drag to pan, Ctrl/⌘ + scroll or pinch to zoom,
// search to find and reveal nodes, and hover to trace a node back to the centre.
// Nodes are keyed by their place in the outline, so folding animates instead of redrawing.
import { esc, label, textWidth, BRANCH_COLORS } from './render.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const firstUrl = (s) => {
  const m = String(s).match(/\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)]+)/);
  return m ? m[1] || m[2] : null;
};
const ICON = {
  plus: '<path d="M8 3v10M3 8h10"/>',
  minus: '<path d="M3 8h10"/>',
  fit: '<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>',
  expand: '<path d="M4 6l4-3.5L12 6M4 10l4 3.5 4-3.5"/>',
  collapse: '<path d="M4 3l4 3.5L12 3M4 13l4-3.5 4 3.5"/>',
  full: '<path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9"/>',
};
const button = (act, icon, title, text = '') =>
  `<button type="button" class="mmi-btn" data-mm="${act}" title="${title}" aria-label="${title}"><svg viewBox="0 0 16 16" aria-hidden="true">${ICON[icon]}</svg>${text ? `<span>${text}</span>` : ''}</button>`;

export function interactiveMindmap(host, tree, { storageKey } = {}) {
  const ROW = 34;
  const GAP_X = 44;
  const fontSize = (d) => (d === 0 ? 16 : d === 1 ? 14 : 13);
  const fontWeight = (d) => (d <= 1 ? 600 : 400);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MS = reduced ? 0 : 340;

  // ---- index the tree ----
  const nodes = [];
  const index = (n, id, depth, parent) => {
    Object.assign(n, { id, depth, parent, label: label(n.text), url: firstUrl(n.text) });
    n.w = Math.ceil(textWidth(n.label, fontSize(depth), fontWeight(depth))) + (depth === 0 ? 36 : depth === 1 ? 26 : 14) + (n.url && depth ? 18 : 0);
    nodes.push(n);
    n.children.forEach((c, i) => index(c, `${id}.${i}`, depth + 1, n));
  };
  index(tree, 'r', 0, null);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const descendants = (n) => n.children.reduce((a, c) => a + 1 + descendants(c), 0);

  // Sides and colours come from the full tree, so folding never moves a branch across.
  const fullLeaves = (n) => (n.children.length ? n.children.reduce((a, c) => a + fullLeaves(c), 0) : 1);
  const total = tree.children.reduce((a, c) => a + fullLeaves(c), 0);
  let acc = 0;
  tree.children.forEach((c, k) => {
    const side = acc < total / 2 || tree.children.length < 3 ? 1 : -1;
    acc += fullLeaves(c);
    const color = BRANCH_COLORS[k % BRANCH_COLORS.length];
    const paint = (n) => { n.side = side; n.color = color; n.children.forEach(paint); };
    paint(c);
  });
  tree.side = 0;

  // ---- folded state, remembered per map ----
  let collapsed = null;
  try { const saved = storageKey && JSON.parse(localStorage.getItem(storageKey) || 'null'); if (Array.isArray(saved)) collapsed = new Set(saved); } catch { /* storage unavailable */ }
  // Big maps start folded to their main branches.
  collapsed ??= new Set(nodes.length > 80 ? nodes.filter((n) => n.depth === 1 && n.children.length).map((n) => n.id) : []);
  for (const id of [...collapsed]) if (!byId.get(id)?.children.length) collapsed.delete(id);
  const save = () => { try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify([...collapsed])); } catch { /* storage unavailable */ } };

  // ---- markup ----
  host.innerHTML = `
    <div class="mmi" tabindex="-1">
      <div class="mmi-bar">
        <input type="search" class="mmi-search" placeholder="Search this map" aria-label="Search this map">
        <span class="mmi-count muted small" aria-live="polite"></span>
        <div class="mmi-tools">
          ${button('expand', 'expand', 'Expand all', 'Expand')}
          ${button('collapse', 'collapse', 'Collapse all', 'Collapse')}
          <span class="mmi-sep" aria-hidden="true"></span>
          ${button('out', 'minus', 'Zoom out')}
          ${button('in', 'plus', 'Zoom in')}
          ${button('fit', 'fit', 'Fit to screen')}
          ${button('full', 'full', 'Full screen')}
        </div>
      </div>
      <svg class="mmi-svg" role="tree" aria-label="Mind map: ${esc(tree.text)}">
        <g class="mmi-view"><g class="mmi-edges"></g><g class="mmi-nodes"></g></g>
      </svg>
      <p class="mmi-hint muted small">Click a branch to fold or unfold it · drag to move · Ctrl + scroll or pinch to zoom</p>
    </div>`;
  const wrap = host.querySelector('.mmi');
  const svg = host.querySelector('.mmi-svg');
  const viewG = host.querySelector('.mmi-view');
  const edgesG = host.querySelector('.mmi-edges');
  const nodesG = host.querySelector('.mmi-nodes');
  const search = host.querySelector('.mmi-search');
  const count = host.querySelector('.mmi-count');
  const fullBtn = host.querySelector('[data-mm="full"]');
  const nodeEls = new Map();
  const edgeEls = new Map();
  let hits = new Set();

  // ---- layout of the visible part ----
  const kidsOf = (n) => (collapsed.has(n.id) ? [] : n.children);
  function layout() {
    const visible = [];
    const walk = (n) => { visible.push(n); kidsOf(n).forEach(walk); };
    walk(tree);
    const colW = { 1: [], '-1': [] };
    for (const n of visible) if (n.depth) colW[n.side][n.depth] = Math.max(colW[n.side][n.depth] || 0, n.w);
    const offset = (side, d) => {
      let x = tree.w / 2 + GAP_X;
      for (let k = 1; k < d; k++) x += (colW[side][k] || 0) + GAP_X;
      return x;
    };
    const stack = (list, side) => {
      let y = 0;
      const go = (n) => {
        const x0 = offset(side, n.depth);
        n.x = side === 1 ? x0 : -x0 - n.w;
        const kids = kidsOf(n);
        if (!kids.length) { n.y = y + ROW / 2; y += ROW; } else { kids.forEach(go); n.y = (kids[0].y + kids.at(-1).y) / 2; }
      };
      list.forEach((n, k) => { if (k) y += 10; go(n); });
      return y;
    };
    const right = kidsOf(tree).filter((c) => c.side === 1);
    const left = kidsOf(tree).filter((c) => c.side === -1);
    const hR = stack(right, 1);
    const hL = stack(left, -1);
    const height = Math.max(hR, hL, ROW);
    const shift = (list, h) => {
      const dy = (height - h) / 2;
      const go = (n) => { n.y += dy; kidsOf(n).forEach(go); };
      list.forEach(go);
    };
    shift(right, hR);
    shift(left, hL);
    tree.x = -tree.w / 2;
    tree.y = height / 2;
    return visible;
  }

  // ---- drawing ----
  const anchorY = (n) => (n.depth >= 2 ? n.y + 11 : n.y);
  const outX = (p, side) => (side === 1 ? p.x + p.w : p.x);
  const f = (v) => v.toFixed(1);
  const edgePath = (p, c) => {
    const x1 = outX(p, c.side);
    const x2 = c.side === 1 ? c.x : c.x + c.w;
    const mid = (x1 + x2) / 2;
    const y1 = anchorY(p);
    const y2 = anchorY(c);
    return `M${f(x1)},${f(y1)} C${f(mid)},${f(y1)} ${f(mid)},${f(y2)} ${f(x2)},${f(y2)}`;
  };
  const dotPath = (x, y) => `M${f(x)},${f(y)} C${f(x)},${f(y)} ${f(x)},${f(y)} ${f(x)},${f(y)}`;
  const setD = (el, d) => { el.setAttribute('d', d); el.style.d = `path("${d}")`; };
  const moveTo = (el, x, y) => { el.style.transform = `translate(${f(x)}px, ${f(y)}px)`; };

  function nodeInner(n) {
    const folded = collapsed.has(n.id) && n.children.length > 0;
    const tip = `<title>${esc(n.text)}${n.children.length ? (folded ? ' · click to unfold' : ' · click to fold') : n.url ? ' · click to open the link' : ''}</title>`;
    if (n.depth === 0) {
      return `${tip}<rect x="0" y="-22" width="${n.w}" height="44" rx="12" class="mmi-root"/><text x="${n.w / 2}" y="0" text-anchor="middle" dominant-baseline="central" class="mmi-root-text">${esc(n.label)}</text>`;
    }
    const link = (x, y) => (n.url
      ? `<g class="mmi-link" data-url="${esc(n.url)}" transform="translate(${x} ${y})"><title>Open link</title><circle r="7"/><path d="M-2.5 2.5l5-5M-1.5-2.5h4v4"/></g>`
      : '');
    const badge = folded
      ? `<g class="mmi-badge" transform="translate(${n.side === 1 ? n.w + 14 : -14} ${n.depth >= 2 ? 11 : 0})"><circle r="11" fill="${n.color}"/><text text-anchor="middle" dominant-baseline="central">+${descendants(n)}</text></g>`
      : '';
    if (n.depth === 1) {
      const tx = n.url ? (n.w - 18) / 2 : n.w / 2;
      return `${tip}<rect x="0" y="-15" width="${n.w}" height="30" rx="8" stroke="${n.color}" class="mmi-branch"/><text x="${tx}" y="0" text-anchor="middle" dominant-baseline="central" fill="${n.color}" class="mmi-branch-text">${esc(n.label)}</text>${link(n.w - 14, 0)}${badge}`;
    }
    const right = n.side === 1;
    const tx = right ? 7 : n.w - 7;
    const linkX = right ? n.w - 10 : 10;
    return `${tip}<rect x="0" y="-13" width="${n.w}" height="28" rx="6" class="mmi-hitbox"/><line x1="0" x2="${n.w}" y1="11" y2="11" stroke="${n.color}" class="mmi-under"/><text x="${right ? tx : tx}" y="1" text-anchor="${right ? 'start' : 'end'}" dominant-baseline="central" class="mmi-leaf-text">${esc(n.label)}</text>${n.url ? link(right ? linkX : linkX, 1) : ''}${badge}`;
  }

  function render() {
    const visible = layout();
    const shown = new Set(visible.map((n) => n.id));
    const nearestShown = (n) => { let p = n.parent; while (p && !shown.has(p.id)) p = p.parent; return p || tree; };

    for (const n of visible) {
      let g = nodeEls.get(n.id);
      const fresh = !g;
      if (fresh) {
        g = document.createElementNS(SVG_NS, 'g');
        g.dataset.id = n.id;
        g.setAttribute('class', `mmi-node d${Math.min(n.depth, 2)}`);
        g.setAttribute('role', 'treeitem');
        g.setAttribute('aria-level', String(n.depth + 1));
        g.setAttribute('tabindex', '0');
        const from = n.parent || n;
        moveTo(g, from.x, from.y);
        g.style.opacity = '0';
        nodesG.appendChild(g);
        nodeEls.set(n.id, g);
      }
      g.innerHTML = nodeInner(n);
      g.setAttribute('aria-label', n.label);
      if (n.children.length) g.setAttribute('aria-expanded', String(!collapsed.has(n.id)));
      else g.removeAttribute('aria-expanded');
      g.classList.toggle('has-kids', n.children.length > 0);
      g.classList.toggle('hit', hits.has(n.id));
      if (fresh) g.getBoundingClientRect(); // so the move from the parent animates
      moveTo(g, n.x, n.y);
      g.style.opacity = '';

      if (n.parent) {
        let e = edgeEls.get(n.id);
        if (!e) {
          e = document.createElementNS(SVG_NS, 'path');
          e.setAttribute('class', `mmi-edge d${Math.min(n.depth, 2)}`);
          e.setAttribute('stroke', n.color);
          e.dataset.id = n.id;
          setD(e, dotPath(outX(n.parent, n.side), anchorY(n.parent)));
          e.style.opacity = '0';
          edgesG.appendChild(e);
          edgeEls.set(n.id, e);
          e.getBoundingClientRect();
        }
        setD(e, edgePath(n.parent, n));
        e.style.opacity = '';
      }
    }

    // Fold nodes that are no longer visible back into their nearest visible ancestor.
    for (const [id, g] of nodeEls) {
      if (shown.has(id)) continue;
      const n = byId.get(id);
      const to = nearestShown(n);
      moveTo(g, to.x, to.y);
      g.style.opacity = '0';
      nodeEls.delete(id);
      setTimeout(() => g.remove(), MS);
      const e = edgeEls.get(id);
      if (e) {
        setD(e, dotPath(outX(to, n.side), anchorY(to)));
        e.style.opacity = '0';
        edgeEls.delete(id);
        setTimeout(() => e.remove(), MS);
      }
    }
  }

  // ---- pan & zoom ----
  const view = { k: 1, x: 0, y: 0 };
  let fitted = true;
  const apply = (animate) => {
    viewG.classList.toggle('animate', Boolean(animate) && !reduced);
    viewG.style.transform = `translate(${f(view.x)}px, ${f(view.y)}px) scale(${view.k.toFixed(4)})`;
  };
  function fit(animate = true) {
    const shown = [...nodeEls.keys()].map((id) => byId.get(id));
    if (!shown.length || !svg.clientWidth) return;
    const minX = Math.min(...shown.map((n) => n.x)) - 34;
    const maxX = Math.max(...shown.map((n) => n.x + n.w)) + 34;
    const minY = Math.min(...shown.map((n) => n.y)) - 30;
    const maxY = Math.max(...shown.map((n) => n.y)) + 30;
    const W = svg.clientWidth;
    const H = svg.clientHeight;
    const k = Math.max(0.2, Math.min(W / (maxX - minX), H / (maxY - minY), 1.25));
    Object.assign(view, { k, x: (W - (maxX - minX) * k) / 2 - minX * k, y: (H - (maxY - minY) * k) / 2 - minY * k });
    fitted = true;
    apply(animate);
  }
  // On narrow screens a whole-map fit is too small to read, so start at a readable zoom
  // centred on the topic instead; Fit still shows everything.
  function initialView() {
    fit(false);
    const W = svg.clientWidth;
    if (W >= 560 || view.k >= 0.6) return;
    const k = 0.62;
    Object.assign(view, { k, x: W / 2 - (tree.x + tree.w / 2) * k, y: svg.clientHeight / 2 - tree.y * k });
    fitted = false;
    apply(false);
  }
  function zoomAt(factor, cx, cy, animate = false) {
    const k = Math.max(0.2, Math.min(3, view.k * factor));
    view.x = cx - (cx - view.x) * (k / view.k);
    view.y = cy - (cy - view.y) * (k / view.k);
    view.k = k;
    fitted = false;
    apply(animate);
  }

  svg.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return; // plain scrolling keeps scrolling the page
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  const pointers = new Map();
  let drag = null;
  svg.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { svg.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    if (pointers.size === 1) {
      drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false, target: e.target };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      drag = { pinch: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: view.k, moved: true };
    }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !drag) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && drag.pinch) {
      const [a, b] = [...pointers.values()];
      const r = svg.getBoundingClientRect();
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((drag.k * (dist / drag.pinch)) / view.k, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      return;
    }
    if (drag.pinch) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    svg.classList.add('panning');
    view.x = drag.vx + dx;
    view.y = drag.vy + dy;
    fitted = false;
    apply(false);
  });
  const release = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size) return;
    svg.classList.remove('panning');
    const d = drag;
    drag = null;
    if (!d || d.moved || e.type === 'pointercancel') return;
    const linkEl = d.target.closest?.('.mmi-link');
    if (linkEl) { window.open(linkEl.dataset.url, '_blank', 'noopener'); return; }
    const g = d.target.closest?.('.mmi-node');
    if (g) toggle(g.dataset.id);
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  // ---- folding ----
  function toggle(id) {
    const n = byId.get(id);
    if (!n) return;
    if (n.depth === 0) { fit(); return; }
    if (!n.children.length) { if (n.url) window.open(n.url, '_blank', 'noopener'); return; }
    if (collapsed.has(id)) collapsed.delete(id); else collapsed.add(id);
    save();
    render();
    if (fitted) setTimeout(() => fit(), 30);
  }
  svg.addEventListener('keydown', (e) => {
    const g = e.target.closest?.('.mmi-node');
    if (!g || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    toggle(g.dataset.id);
    nodeEls.get(g.dataset.id)?.focus();
  });

  // ---- hover: trace the path back to the centre ----
  const clearTrace = () => {
    svg.classList.remove('tracing');
    svg.querySelectorAll('.on').forEach((el) => el.classList.remove('on'));
  };
  svg.addEventListener('pointerover', (e) => {
    if (drag?.moved || e.pointerType === 'touch') return;
    const g = e.target.closest?.('.mmi-node');
    if (!g) return;
    clearTrace();
    for (let n = byId.get(g.dataset.id); n; n = n.parent) {
      nodeEls.get(n.id)?.classList.add('on');
      edgeEls.get(n.id)?.classList.add('on');
    }
    svg.classList.add('tracing');
  });
  svg.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget?.closest?.('.mmi-node')) clearTrace();
  });

  // ---- search ----
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    hits = new Set(q ? nodes.filter((n) => n.depth && n.text.toLowerCase().includes(q)).map((n) => n.id) : []);
    for (const id of hits) for (let p = byId.get(id).parent; p; p = p.parent) collapsed.delete(p.id);
    svg.classList.toggle('searching', Boolean(q));
    count.textContent = q ? (hits.size ? `${hits.size} ${hits.size === 1 ? 'match' : 'matches'}` : 'No matches') : '';
    render();
    setTimeout(() => fit(), 30);
  });

  // ---- toolbar ----
  const setFull = (on) => {
    wrap.classList.toggle('full', on);
    fullBtn.setAttribute('aria-pressed', String(on));
    fullBtn.title = on ? 'Exit full screen' : 'Full screen';
    fullBtn.setAttribute('aria-label', fullBtn.title);
    document.documentElement.classList.toggle('mmi-locked', on);
    if (on) wrap.focus();
    setTimeout(() => fit(false), 40);
  };
  host.querySelector('.mmi-bar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mm]');
    if (!b) return;
    const cx = svg.clientWidth / 2;
    const cy = svg.clientHeight / 2;
    switch (b.dataset.mm) {
      case 'in': zoomAt(1.25, cx, cy, true); break;
      case 'out': zoomAt(0.8, cx, cy, true); break;
      case 'fit': fit(); break;
      case 'expand':
        collapsed.clear();
        save(); render(); setTimeout(() => fit(), 30);
        break;
      case 'collapse':
        collapsed = new Set(nodes.filter((n) => n.depth === 1 && n.children.length).map((n) => n.id));
        save(); render(); setTimeout(() => fit(), 30);
        break;
      case 'full': setFull(!wrap.classList.contains('full')); break;
    }
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.classList.contains('full')) { setFull(false); fullBtn.focus(); }
  });

  // Keep the map fitted when its box changes size, unless you've moved it yourself.
  const ro = new ResizeObserver(() => {
    if (!svg.isConnected) { ro.disconnect(); document.documentElement.classList.remove('mmi-locked'); return; }
    if (fitted) fit(false);
  });
  ro.observe(svg);

  render();
  initialView();
  return { fit };
}
