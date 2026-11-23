// Floating topic icons for the home page hero. One for each area the roadmaps cover.
// Simple line glyphs (not brand logos), each with a label, drifting gently.
// Decorative only: hidden from screen readers, ignore the pointer, and stop moving
// for people who prefer reduced motion.

const G = {
  db: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  bolt: '<path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/>',
  server: '<rect x="4" y="3.5" width="16" height="7" rx="2"/><rect x="4" y="13.5" width="16" height="7" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h4M12 17h4"/>',
  nodes: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M10.8 7.2 6.3 15.8M13.2 7.2l4.5 8.6M7.5 18h9"/>',
  tree: '<circle cx="12" cy="4.5" r="2"/><circle cx="6.5" cy="12" r="2"/><circle cx="17.5" cy="12" r="2"/><circle cx="4" cy="19.5" r="2"/><circle cx="9" cy="19.5" r="2"/><path d="M10.9 6.2 7.6 10.3M13.1 6.2l3.3 4.1M5.8 13.9 4.6 17.6M7.2 13.9l1.2 3.7"/>',
  stream: '<path d="M3 7h12M3 12h15M3 17h10"/><path d="m15 4 3 3-3 3M18 9l3 3-3 3M13 14l3 3-3 3"/>',
  branch: '<circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="8" r="2.2"/><path d="M6 7.2v9.6M18 10.2c0 4-4 4.8-10.2 6.6"/>',
  cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 18.5z"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.5 3.8 5.5 3.8 9s-1.2 6.5-3.8 9c-2.6-2.5-3.8-5.5-3.8-9S9.4 5.5 12 3z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/><circle cx="12" cy="12" r="2.2"/>',
  atom: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>',
  sigma: '<path d="M17.5 5H6.5l6 7-6 7h11"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8 20.5h8M9.5 17h5v3.5h-5z"/>',
};

// x / y place each chip as a percentage of the hero on wide screens; mx / my on phones.
// depth sets how much it follows the mouse; dur / delay vary the drift so they never sync.
const CHIPS = [
  { g: 'db', label: 'DBMS', color: '#0f766e', x: 58, y: 8, mx: 2, my: 8, depth: 1.2, dur: 7.5, delay: 0 },
  { g: 'bolt', label: 'Redis', color: '#dc2626', x: 76, y: 4, mx: 36, my: 8, depth: 2, dur: 6.4, delay: -1.2 },
  { g: 'server', label: 'Backend', color: '#2563eb', x: 90, y: 22, mx: 28, my: 60, depth: 1.4, dur: 8.2, delay: -3 },
  { g: 'nodes', label: 'System design', color: '#7c3aed', x: 66, y: 30, mx: 4, my: 34, depth: 2.4, dur: 9, delay: -2.1 },
  { g: 'tree', label: 'DSA', color: '#c2410c', x: 84, y: 46, mx: 2, my: 60, depth: 1, dur: 7, delay: -4.2 },
  { g: 'stream', label: 'Kafka', color: '#0369a1', x: 60, y: 56, mx: 26, my: 86, depth: 1.8, dur: 8.6, delay: -1.6 },
  { g: 'branch', label: 'Git', color: '#ea580c', x: 94, y: 66, mx: 74, my: 34, depth: 1.3, dur: 6.8, delay: -5 },
  { g: 'cloud', label: 'AWS', color: '#0891b2', x: 74, y: 76, mx: 64, my: 60, depth: 2.2, dur: 9.4, delay: -2.8 },
  { g: 'chip', label: 'OS', color: '#4d7c0f', x: 54, y: 84, mx: 4, my: 86, depth: 1.6, dur: 7.8, delay: -3.6 },
  { g: 'globe', label: 'Networks', color: '#0d9488', x: 88, y: 88, mx: 56, my: 86, depth: 1.1, dur: 8.8, delay: -0.6 },
  { g: 'code', label: 'POTD', color: '#ca8a04', x: 70, y: 18, mx: 48, my: 34, depth: 2.6, dur: 6.2, delay: -4.6 },
  { g: 'trophy', label: 'Contests', color: '#b45309', x: 96, y: 4, mx: 66, my: 8, depth: 1.5, dur: 7.2, delay: -2.4 },
  { g: 'spark', label: 'ML', color: '#be185d', x: 80, y: 60, mx: 0, my: 0, depth: 2, dur: 8, delay: -1 },
  { g: 'atom', label: 'React', color: '#0284c7', x: 64, y: 44, mx: 0, my: 0, depth: 1.2, dur: 9.2, delay: -3.3 },
  { g: 'table', label: 'SQL', color: '#15803d', x: 92, y: 36, mx: 0, my: 0, depth: 1.7, dur: 7.4, delay: -5.4 },
  { g: 'sigma', label: 'Aptitude', color: '#9333ea', x: 56, y: 70, mx: 0, my: 0, depth: 2.1, dur: 8.4, delay: -2 },
];

// x above is laid out for the right-hand side of the hero (54–96%); the field itself now
// only covers that column, so map x into it and keep a margin so chips never spill out.
const fieldX = (x) => (10 + ((x - 54) / 42) * 80).toFixed(1);

export function floatField() {
  return `<div class="float-field" aria-hidden="true">${CHIPS.map((c, i) => `
    <span class="float-chip${c.mx || c.my ? '' : ' wide-only'}" style="--x:${fieldX(c.x)}%;--y:${c.y}%;--mx:${c.mx}%;--my:${c.my}%;--depth:${c.depth};--dur:${c.dur}s;--delay:${c.delay}s;--c:${c.color};--i:${i}">
      <span class="float-inner"><svg viewBox="0 0 24 24">${G[c.g]}</svg><span>${c.label}</span></span>
    </span>`).join('')}
  </div>`;
}

// The chips lean towards the pointer a little, each by its own depth.
export function bindParallax(hero) {
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(hover: none)').matches) return;
  let frame = 0;
  hero.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      hero.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
  });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--px', '0');
    hero.style.setProperty('--py', '0');
  });
}
