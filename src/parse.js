// Turns a flat list of tokens (headings, sub-headings, checklist items) into sections.
// Headings level 1-2 start a group; level 3+ or a bold-only line starts a sub-section,
// so "## Kafka" + "**Phase 1**" becomes the section "Kafka › Phase 1".
export function buildSections(tokens) {
  const sections = [];
  let group = null;
  let sub = null;
  let current = null;

  const sectionFor = (title) => {
    let s = sections.find((x) => x.title === title);
    if (!s) sections.push((s = { title, items: [] }));
    return s;
  };
  const currentName = () => (group && sub ? `${group} › ${sub}` : sub || group || 'General');

  for (const t of tokens) {
    if (!t.text) continue;
    if (t.type === 'heading') {
      if (t.level <= 2) { group = t.text; sub = null; } else sub = t.text;
      current = null;
    } else if (t.type === 'sub') {
      sub = t.text;
      current = null;
    } else if (t.type === 'item') {
      if (t.section) {
        sectionFor(group ? `${group} › ${t.section}` : t.section).items.push(t);
      } else {
        current ??= sectionFor(currentName());
        current.items.push(t);
      }
    }
  }
  return sections.filter((s) => s.items.length);
}

const LINK = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function cleanText(s) {
  return s
    .replace(LINK, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__|~~|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstUrl(s) {
  for (const m of s.matchAll(LINK)) if (/^https?:\/\//i.test(m[2])) return m[2];
  const bare = s.match(/https?:\/\/[^\s)]+/);
  return bare ? bare[0] : null;
}

export function parseMarkdown(md) {
  const tokens = [];
  let title = null;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      const text = cleanText(m[2]);
      if (m[1].length === 1 && !title && !tokens.length) { title = text; continue; }
      tokens.push({ type: 'heading', level: m[1].length, text });
    } else if ((m = line.match(/^(?:[-*+]|\d+[.)])\s+\[( |x|X)\]\s+(.*)$/))) {
      tokens.push({ type: 'item', text: cleanText(m[2]), url: firstUrl(m[2]), checked: m[1] !== ' ' });
    } else if ((m = line.match(/^(?:\*\*|__|<b>|<strong>)(.+?)(?:\*\*|__|<\/b>|<\/strong>):?$/))) {
      tokens.push({ type: 'sub', text: cleanText(m[1]).replace(/:$/, '') });
    }
  }
  return { title, sections: buildSections(tokens) };
}

export const countItems = (sections) => sections.reduce((n, s) => n + s.items.length, 0);
