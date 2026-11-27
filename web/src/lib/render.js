// Small, dependency-free renderers for the cheat sheet, project and mindmap pages.
// Everything is escaped before any markup is added, so page bodies can't inject HTML.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- inline Markdown ----------

export function inline(src) {
  const codes = [];
  let s = String(src).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, p, u) => `${p}<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[i])}</code>`);
}

// ---------- block Markdown ----------

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const indentOf = (s) => s.replace(/\t/g, '  ').match(/^ */)[0].length;

function listHtml(lines) {
  // lines: [{ indent, ordered, text }]
  let html = '';
  const stack = [];
  for (const l of lines) {
    while (stack.length && l.indent < stack.at(-1).indent) html += `</li></${stack.pop().tag}>`;
    const top = stack.at(-1);
    if (!top || l.indent > top.indent) {
      const tag = l.ordered ? 'ol' : 'ul';
      stack.push({ indent: l.indent, tag });
      html += `<${tag}><li>`;
    } else {
      html += '</li><li>';
    }
    const task = l.text.match(/^\[([ xX])\]\s+(.*)$/);
    html += task
      ? `<span class="task ${task[1] === ' ' ? '' : 'checked'}" aria-hidden="true"></span>${inline(task[2])}`
      : inline(l.text);
  }
  while (stack.length) html += `</li></${stack.pop().tag}>`;
  return html;
}

// Splits a table row on "|", keeping escaped "\|" (e.g. inside `NX\|XX`) as a literal pipe.
const cells = (row) => row.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

export function markdown(md) {
  const lines = String(md ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  let para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t.startsWith('```')) {
      flush();
      const lang = t.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      i++;
      out.push(`<pre${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${esc(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (!t) { flush(); i++; continue; }

    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      const level = Math.min(h[1].length + 1, 5);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(t)) { flush(); out.push('<hr>'); i++; continue; }

    if (t.startsWith('|') && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      flush();
      const head = cells(t);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      out.push(`<div class="md-table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${
        rows.map((r) => `<tr>${head.map((_, k) => `<td>${inline(r[k] ?? '')}</td>`).join('')}</tr>`).join('')
      }</tbody></table></div>`);
      continue;
    }

    if (t.startsWith('>')) {
      flush();
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) quote.push(lines[i++].trim().replace(/^>\s?/, ''));
      out.push(`<blockquote>${markdown(quote.join('\n'))}</blockquote>`);
      continue;
    }

    if (LIST.test(line)) {
      flush();
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST);
        if (m) {
          items.push({ indent: indentOf(m[1]), ordered: /\d/.test(m[2]), text: m[3] });
        } else if (lines[i].trim() && indentOf(lines[i]) > 0 && items.length) {
          items.at(-1).text += ' ' + lines[i].trim(); // wrapped continuation line
        } else break;
        i++;
      }
      out.push(listHtml(items));
      continue;
    }

    para.push(t);
    i++;
  }
  flush();
  return out.join('\n');
}

// Plain text for search and summaries.
export const plain = (md) => String(md ?? '').replace(/[`*_>#|[\]()~-]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- mindmap ----------

// Turns an outline into a tree. Accepts "- item" lists (indent = depth) and "#" headings.
export function outline(md, rootTitle) {
  const root = { text: rootTitle, children: [] };
  const stack = [{ depth: -1, node: root }];
  let headingDepth = 0;
  for (const raw of String(md ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('```')) continue;
    let depth;
    let text;
    const h = raw.trim().match(/^(#{1,6})\s+(.*)$/);
    const li = raw.match(LIST);
    if (h) {
      depth = h[1].length - 1;
      text = h[2];
      headingDepth = depth + 1;
    } else if (li) {
      depth = headingDepth + Math.floor(indentOf(li[1]) / 2);
      text = li[3];
    } else {
      depth = headingDepth;
      text = raw.trim();
    }
    text = text.replace(/^\[[ xX]\]\s+/, '');
    while (stack.length > 1 && stack.at(-1).depth >= depth) stack.pop();
    const node = { text, children: [] };
    stack.at(-1).node.children.push(node);
    stack.push({ depth, node });
  }
  return root;
}

export const BRANCH_COLORS = ['#0f766e', '#2563eb', '#c2410c', '#7c3aed', '#be185d', '#4d7c0f', '#b45309', '#0369a1'];
let measureCtx;
export function textWidth(s, size, weight) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  measureCtx.font = `${weight} ${size}px Inter, ui-sans-serif, system-ui, sans-serif`;
  return measureCtx.measureText(s).width;
}
const MAX_LABEL = 46;
export const label = (s) => {
  const clean = String(s).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`]/g, '');
  return clean.length > MAX_LABEL ? clean.slice(0, MAX_LABEL - 1) + '…' : clean;
};

// Lays the tree out left and right of a central root, like a hand-drawn mind map.
export function mindmapSvg(tree) {
  const ROW = 34;
  const GAP_X = 44;
  const PAD = 24;
  const size = (d) => (d === 0 ? 16 : d === 1 ? 14 : 13);
  const weight = (d) => (d <= 1 ? 600 : 400);

  const prep = (n, d) => {
    n.depth = d;
    n.label = label(n.text);
    n.w = Math.ceil(textWidth(n.label, size(d), weight(d))) + (d === 0 ? 36 : d === 1 ? 26 : 14);
    n.children.forEach((c) => prep(c, d + 1));
    n.leaves = n.children.length ? n.children.reduce((a, c) => a + c.leaves, 0) : 1;
  };
  prep(tree, 0);

  // Split top-level branches into two sides with roughly equal height.
  const right = [];
  const left = [];
  const total = tree.children.reduce((a, c) => a + c.leaves, 0);
  let acc = 0;
  tree.children.forEach((c, k) => {
    c.color = BRANCH_COLORS[k % BRANCH_COLORS.length];
    (acc < total / 2 || tree.children.length < 3 ? right : left).push(c);
    acc += c.leaves;
  });

  // Column widths per depth on each side.
  const colW = { 1: [], [-1]: [] };
  const widths = (n, side) => {
    if (n.depth > 0) colW[side][n.depth] = Math.max(colW[side][n.depth] || 0, n.w);
    n.children.forEach((c) => widths(c, side));
  };
  right.forEach((c) => widths(c, 1));
  left.forEach((c) => widths(c, -1));
  const offset = (side, d) => {
    let x = tree.w / 2 + GAP_X;
    for (let k = 1; k < d; k++) x += (colW[side][k] || 0) + GAP_X;
    return x;
  };

  const place = (nodes, side) => {
    let y = 0;
    const walk = (n, color) => {
      n.side = side;
      n.color = color;
      const x0 = offset(side, n.depth);
      n.x = side === 1 ? x0 : -x0 - n.w; // left edge
      if (!n.children.length) {
        n.y = y + ROW / 2;
        y += ROW;
      } else {
        n.children.forEach((c) => walk(c, color));
        n.y = (n.children[0].y + n.children.at(-1).y) / 2;
      }
    };
    nodes.forEach((n, k) => {
      if (k) y += 10; // breathing room between branches
      walk(n, n.color);
    });
    return y;
  };
  const hR = place(right, 1);
  const hL = place(left, -1);
  const height = Math.max(hR, hL, ROW);
  // Centre both sides vertically.
  const shift = (nodes, h) => {
    const dy = (height - h) / 2;
    const walk = (n) => { n.y += dy; n.children.forEach(walk); };
    nodes.forEach(walk);
  };
  shift(right, hR);
  shift(left, hL);
  tree.x = -tree.w / 2;
  tree.y = height / 2;

  const all = [];
  const collect = (n) => { all.push(n); n.children.forEach(collect); };
  collect(tree);
  const minX = Math.min(...all.map((n) => n.x)) - PAD;
  const maxX = Math.max(...all.map((n) => n.x + n.w)) + PAD;
  const W = Math.ceil(maxX - minX);
  const H = Math.ceil(height + PAD * 2);
  const X = (x) => (x - minX).toFixed(1);
  const Y = (y) => (y + PAD).toFixed(1);

  const edges = [];
  const nodes = [];
  const anchorY = (n) => (n.depth >= 2 ? n.y + 11 : n.y); // leaves connect at their underline
  for (const n of all) {
    for (const c of n.children) {
      const fromX = c.side === 1 ? n.x + n.w : n.x;
      const toX = c.side === 1 ? c.x : c.x + c.w;
      const mid = (fromX + toX) / 2;
      const y1 = anchorY(n);
      const y2 = anchorY(c);
      edges.push(`<path d="M${X(fromX)},${Y(y1)} C${X(mid)},${Y(y1)} ${X(mid)},${Y(y2)} ${X(toX)},${Y(y2)}" stroke="${c.color}" stroke-width="${c.depth === 1 ? 2.5 : 1.5}" fill="none" stroke-linecap="round"/>`);
    }
    const title = n.label !== n.text ? `<title>${esc(n.text)}</title>` : '';
    if (n.depth === 0) {
      nodes.push(`<g class="mm-root">${title}<rect x="${X(n.x)}" y="${Y(n.y - 22)}" width="${n.w}" height="44" rx="12"/><text x="${X(n.x + n.w / 2)}" y="${Y(n.y)}" text-anchor="middle" dominant-baseline="central">${esc(n.label)}</text></g>`);
    } else if (n.depth === 1) {
      nodes.push(`<g class="mm-branch">${title}<rect x="${X(n.x)}" y="${Y(n.y - 15)}" width="${n.w}" height="30" rx="8" stroke="${n.color}"/><text x="${X(n.x + n.w / 2)}" y="${Y(n.y)}" text-anchor="middle" dominant-baseline="central" fill="${n.color}">${esc(n.label)}</text></g>`);
    } else {
      const tx = n.side === 1 ? n.x + 7 : n.x + n.w - 7;
      nodes.push(`<g class="mm-leaf">${title}<line x1="${X(n.x)}" x2="${X(n.x + n.w)}" y1="${Y(n.y + 11)}" y2="${Y(n.y + 11)}" stroke="${n.color}" stroke-width="1.5" stroke-opacity="0.45"/><text x="${X(tx)}" y="${Y(n.y + 1)}" text-anchor="${n.side === 1 ? 'start' : 'end'}" dominant-baseline="central">${esc(n.label)}</text></g>`);
    }
  }
  return `<svg class="mindmap" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Mind map: ${esc(tree.text)}" xmlns="http://www.w3.org/2000/svg">${edges.join('')}${nodes.join('')}</svg>`;
}
