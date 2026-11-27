import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, InputAdornment, LinearProgress, Link, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Search from '@mui/icons-material/Search';
import OpenInNew from '@mui/icons-material/OpenInNew';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import SmartDisplayOutlined from '@mui/icons-material/SmartDisplayOutlined';
import TimelapseOutlined from '@mui/icons-material/TimelapseOutlined';
import StickyNote2Outlined from '@mui/icons-material/StickyNote2Outlined';
import Check from '@mui/icons-material/Check';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import UnfoldMore from '@mui/icons-material/UnfoldMore';
import UnfoldLess from '@mui/icons-material/UnfoldLess';
import { Loading, ErrorState, LoginRequired, pct, plural } from '../components/common.jsx';
import { Bar } from '../components/RoadmapCard.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useApi, useLocalStorage, useDebounced } from '../lib/hooks.js';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';
import { inline } from '../lib/render.js';
import {
  STATUS, LEVELS, nextLevel, safeUrl, itemLinks, groupSlots, slotKey, SITE_SHORT, SITE_COLORS, subTopicOf, answerOf, metaOf,
  isPracticeTitle, levelLabel, LEVEL_COLOR, ago,
} from '../lib/roadmaps.js';
import { DSA_PATTERNS } from '../data/dsaPatterns.js';

const readPref = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const writePref = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export default function Roadmap() {
  const { id } = useParams();
  const { ready, authenticated } = useAuth();
  const rm = useApi(`/roadmaps/${id}`, { skip: !authenticated });
  if (!ready) return <Loading />;
  if (!authenticated) return <LoginRequired what="this roadmap" />;
  if (rm.error) return <ErrorState error={rm.error} onRetry={rm.reload} />;
  if (!rm.data || rm.data.id !== id) return <Loading rows={6} />;
  return <RoadmapView key={id} initial={rm.data} reload={rm.reload} />;
}

function RoadmapView({ initial }) {
  const { admin } = useAuth();
  const notify = useNotify();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(initial);
  const [group, setGroup] = useLocalStorage(`rt:group:${doc.id}`, 'topic');
  const [filter, setFilter] = useLocalStorage('rt:filter', 'all');
  const [q, setQ] = useState('');
  const query = useDebounced(q.trim().toLowerCase(), 150);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [openMap, setOpenMap] = useState({});
  const practice = isPracticeTitle(doc.title);
  useEffect(() => { document.title = `${doc.title} · Learning hub`; return () => { document.title = 'Learning hub'; }; }, [doc.title]);

  const items = useMemo(() => doc.sections.flatMap((s) => s.items.map((i) => ({ ...i, sectionId: s.id, sectionTitle: s.title }))), [doc]);
  const next = items.find((i) => i.status !== 'done');

  const groups = useMemo(() => {
    if (group === 'topic') return doc.sections.map((s, n) => ({ key: `s:${s.id}`, title: s.title, step: n + 1, sectionId: s.id, items: items.filter((i) => i.sectionId === s.id) }));
    return [...LEVELS, ''].map((l) => ({ key: `l:${l || 'none'}`, title: l || 'No level', level: l, items: items.filter((i) => (i.level || '') === l) })).filter((g) => g.items.length);
  }, [doc, group, items]);

  const match = useCallback((i) => (filter === 'all' || (filter === 'todo' ? i.status !== 'done' : i.status === filter))
    && (!query || i.title.toLowerCase().includes(query) || (i.note || '').toLowerCase().includes(query) || i.sectionTitle.toLowerCase().includes(query)), [filter, query]);
  const filtering = filter !== 'all' || Boolean(query);

  // ---- mutations ----
  const setItem = (itemId, patch) => setDoc((d) => ({ ...d, sections: d.sections.map((s) => ({ ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) })) }));
  const refreshStatuses = async () => {
    try {
      const fresh = await api(`/roadmaps/${doc.id}`);
      const byId = new Map(fresh.sections.flatMap((s) => s.items).map((i) => [i.id, i]));
      setDoc((d) => ({ ...d, sections: d.sections.map((s) => ({ ...s, items: s.items.map((i) => { const f = byId.get(i.id); return f && (f.status !== i.status || f.doneAt !== i.doneAt) ? { ...i, status: f.status, doneAt: f.doneAt } : i; }) })) }));
    } catch { /* keep what we have */ }
  };
  const patchItem = useCallback(async (item, body, optimistic = body) => {
    setItem(item.id, optimistic);
    try {
      const saved = await api(`/items/${item.id}`, { method: 'PATCH', body });
      setItem(item.id, saved);
      if (body.status !== undefined) { changed('roadmaps'); refreshStatuses(); }
    } catch (e) {
      setItem(item.id, { status: item.status, level: item.level, note: item.note, doneAt: item.doneAt });
      notify(e.message, 'error');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const actions = useMemo(() => ({
    toggle: (i) => patchItem(i, { status: i.status === 'done' ? 'not_started' : 'done' }, { status: i.status === 'done' ? 'not_started' : 'done', doneAt: i.status === 'done' ? null : new Date().toISOString() }),
    cycle: (i) => { const s = STATUS[i.status]?.next || 'in_progress'; patchItem(i, { status: s }, { status: s, doneAt: s === 'done' ? new Date().toISOString() : null }); },
    level: (i) => patchItem(i, { level: nextLevel(i.level) }),
    note: (i, note) => patchItem(i, { note }),
    remove: (i) => setConfirm({ title: `Delete "${i.title}"?`, text: 'This topic and its progress are removed.', run: async () => { await api(`/items/${i.id}`, { method: 'DELETE' }); setDoc((d) => ({ ...d, sections: d.sections.map((s) => ({ ...s, items: s.items.filter((x) => x.id !== i.id) })) })); changed('roadmaps'); } }),
  }), [patchItem]);

  const addItem = async (sectionId, title, url) => {
    const it = await api(`/sections/${sectionId}/items`, { method: 'POST', body: { title, url: url || null } });
    setDoc((d) => ({ ...d, sections: d.sections.map((s) => (s.id === sectionId ? { ...s, items: [...s.items, it] } : s)) }));
    changed('roadmaps');
  };
  const renameSection = async (s, title) => {
    await api(`/sections/${s.id}`, { method: 'PATCH', body: { title } });
    setDoc((d) => ({ ...d, sections: d.sections.map((x) => (x.id === s.id ? { ...x, title } : x)) }));
  };
  const deleteSection = (s) => setConfirm({ title: `Delete the section "${s.title}"?`, text: `Its ${plural(s.items.length, 'topic')} and their progress are removed.`, run: async () => { await api(`/sections/${s.id}`, { method: 'DELETE' }); setDoc((d) => ({ ...d, sections: d.sections.filter((x) => x.id !== s.id) })); changed('roadmaps'); } });
  const addSection = async (title) => {
    const s = await api(`/roadmaps/${doc.id}/sections`, { method: 'POST', body: { title } });
    setDoc((d) => ({ ...d, sections: [...d.sections, { ...s, items: s.items || [] }] }));
  };
  const deleteRoadmap = () => setConfirm({ title: `Delete "${doc.title}"?`, text: 'The roadmap and all its progress are removed for good.', run: async () => { await api(`/roadmaps/${doc.id}`, { method: 'DELETE' }); changed('roadmaps'); navigate('/roadmaps'); } });

  const isOpen = (g) => {
    if (filtering) return true;
    if (openMap[g.key] !== undefined) return openMap[g.key];
    const saved = readPref(`rt:grp:${doc.id}:${g.key}`);
    if (saved) return saved === 'open';
    const done = g.items.filter((i) => i.status === 'done').length;
    return done < g.items.length || g.items.length === 0;
  };
  const setOpen = (g, open) => { setOpenMap((m) => ({ ...m, [g.key]: open })); writePref(`rt:grp:${doc.id}:${g.key}`, open ? 'open' : 'closed'); };
  const setAll = (open) => { const m = {}; for (const g of groups) { m[g.key] = open; writePref(`rt:grp:${doc.id}:${g.key}`, open ? 'open' : 'closed'); } setOpenMap(m); };

  const shown = groups.map((g) => ({ ...g, rows: g.items.filter(match) })).filter((g) => !filtering || g.rows.length);

  return (
    <>
      <Button component={RouterLink} to="/roadmaps" startIcon={<ArrowBack />} sx={{ mb: 2 }}>All roadmaps</Button>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2.5 }}>
        <Typography variant="h1" component="h1">{doc.title}</Typography>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {safeUrl(doc.notionUrl) && <Button size="small" endIcon={<OpenInNew />} href={doc.notionUrl} target="_blank" rel="noopener noreferrer">Notion</Button>}
          {admin && <Button size="small" startIcon={<EditOutlined />} onClick={() => setEditing(true)}>Edit page</Button>}
          {admin && <Button size="small" color="error" startIcon={<DeleteOutline />} onClick={deleteRoadmap}>Delete</Button>}
        </Stack>
      </Stack>

      <ProgressCard items={items} practice={practice} />
      {editing ? <PageEditor doc={doc} onCancel={() => setEditing(false)} onSaved={(d) => { setDoc((x) => ({ ...x, ...d })); setEditing(false); }} /> : <PageDetails doc={doc} />}

      {next ? (
        <Paper variant="outlined" sx={{ p: 2, my: 3, borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.06) }}>
          <RowStyles>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            {admin && <Tick done={false} title={next.title} onClick={() => actions.toggle(next)} />}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>Up next · {next.sectionTitle}{next.level ? ` · ${levelLabel(next.level, practice)}` : ''}</Typography>
              <ItemTitle i={next} />
            </Box>
            <LinkSlots i={next} slots={groupSlots([next])} />
          </Stack>
          </RowStyles>
        </Paper>
      ) : items.length > 0 && <Alert severity="success" sx={{ my: 3 }}>Every topic in this roadmap is done.</Alert>}

      <Typography variant="h2" sx={{ mb: 1.5 }}>Course index</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} useFlexGap flexWrap="wrap" alignItems={{ md: 'center' }} sx={{ mb: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={group} onChange={(_, v) => v && setGroup(v)} aria-label="Group by">
          <ToggleButton value="level">{practice ? 'By difficulty' : 'By level'}</ToggleButton><ToggleButton value="topic">By topic</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)} aria-label="Show">
          <ToggleButton value="all">All</ToggleButton><ToggleButton value="todo">To do</ToggleButton><ToggleButton value="in_progress">In progress</ToggleButton><ToggleButton value="done">Done</ToggleButton>
        </ToggleButtonGroup>
        <TextField placeholder={practice ? 'Search questions' : 'Search topics'} value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1, minWidth: 200 }}
          inputProps={{ 'aria-label': practice ? 'Search questions' : 'Search topics' }} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
        <Stack direction="row" spacing={0.5}>
          <Button size="small" startIcon={<UnfoldMore />} onClick={() => setAll(true)}>Expand all</Button>
          <Button size="small" startIcon={<UnfoldLess />} onClick={() => setAll(false)}>Collapse all</Button>
        </Stack>
      </Stack>

      <RowStyles>
        {shown.map((g) => (
          <GroupBlock key={g.key} g={g} group={group} practice={practice} admin={admin} open={isOpen(g)} onOpen={(o) => setOpen(g, o)} actions={actions}
            onAdd={addItem} onRename={renameSection} onDelete={deleteSection} section={g.sectionId ? doc.sections.find((s) => s.id === g.sectionId) : null} />
        ))}
        {!shown.length && <Typography color="text.secondary" sx={{ py: 3 }}>{doc.sections.length ? 'Nothing matches.' : 'No topics yet.'}</Typography>}
      </RowStyles>

      {(doc.id === 'u3NA5_Fv' || /\bdsa\b/i.test(doc.title)) && <DsaPatterns />}
      {admin && <AddSection onAdd={addSection} />}

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)}>
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent><DialogContentText>{confirm?.text} This can't be undone.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button color="error" onClick={async () => { const c = confirm; setConfirm(null); try { await c.run(); notify('Deleted'); } catch (e) { notify(e.message, 'error'); } }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function ProgressCard({ items, practice }) {
  const done = items.filter((i) => i.status === 'done').length;
  const doing = items.filter((i) => i.status === 'in_progress').length;
  const tiles = LEVELS.map((l) => { const of = items.filter((i) => i.level === l); return of.length ? { l, total: of.length, done: of.filter((i) => i.status === 'done').length } : null; }).filter(Boolean);
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }} aria-label="Progress">
      <Box sx={{ flex: 1.2 }}>
        <Typography variant="overline" color="text.secondary">Overall progress</Typography>
        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="h1" component="p">{done}</Typography><Typography color="text.secondary">/ {items.length}</Typography>
          <Box sx={{ flex: 1 }} /><Typography color="primary" sx={{ fontWeight: 700 }}>{pct(done, items.length)}%</Typography>
        </Stack>
        <Bar done={done} total={items.length} height={10} />
        {doing > 0 && <Typography variant="caption" color="text.secondary">{doing} in progress</Typography>}
      </Box>
      {tiles.length > 0 && (
        <Stack direction="row" spacing={1.5} sx={{ flex: 2 }}>
          {tiles.map((t) => (
            <Paper key={t.l} variant="outlined" sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', border: 0 }}>
              <Typography variant="body2" color={`${LEVEL_COLOR[t.l]}.main`} sx={{ fontWeight: 600 }}>{levelLabel(t.l, practice)}</Typography>
              <Typography variant="h3" component="p">{t.done}<Typography component="span" color="text.secondary" variant="body2"> / {t.total}</Typography></Typography>
              <LinearProgress variant="determinate" value={pct(t.done, t.total)} color={LEVEL_COLOR[t.l]} sx={{ mt: 0.5, height: 4 }} />
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

const Inline = ({ text }) => <span dangerouslySetInnerHTML={{ __html: inline(text) }} />; // render.js escapes first

function PageDetails({ doc }) {
  const resources = (doc.resources ?? []).filter((r) => r.title);
  const notes = (doc.notes ?? []).filter((n) => n.lines?.length || n.heading);
  if (!resources.length && !doc.intro && !notes.length) return null;
  return (
    <Stack spacing={2} sx={{ mt: 3 }}>
      {doc.intro && <Typography color="text.secondary"><Inline text={doc.intro} /></Typography>}
      {resources.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><MenuBookOutlined color="primary" fontSize="small" /><Typography variant="h4" component="h2">Resources</Typography></Stack>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>{resources.map((r) => <li key={r.title + r.url}>{safeUrl(r.url) ? <Link href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</Link> : r.title}</li>)}</Box>
        </Paper>
      )}
      {notes.map((n) => (
        <Paper key={n.heading} variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h4" component="h2" sx={{ mb: 1 }}>{n.heading}</Typography>
          <Box component="ul" sx={{ m: 0, pl: 3, '& a': { color: 'primary.main' } }}>{n.lines.map((l, k) => <li key={k}><Inline text={l} /></li>)}</Box>
        </Paper>
      ))}
    </Stack>
  );
}

function PageEditor({ doc, onCancel, onSaved }) {
  const notify = useNotify();
  const [f, setF] = useState({
    title: doc.title, intro: doc.intro || '',
    resources: (doc.resources ?? []).map((r) => (r.url ? `${r.title} | ${r.url}` : r.title)).join('\n'),
    notes: (doc.notes ?? []).map((n) => `## ${n.heading}\n${n.lines.map((l) => `- ${l}`).join('\n')}`).join('\n\n'),
  });
  const save = async (e) => {
    e.preventDefault();
    const resources = f.resources.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [title, url] = l.split(/\s+\|\s+/); return { title: title.trim(), url: url?.trim() || null }; });
    const notes = [];
    for (const raw of f.notes.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('## ')) notes.push({ heading: line.slice(3).trim(), lines: [] });
      else { if (!notes.length) notes.push({ heading: 'Notes', lines: [] }); notes.at(-1).lines.push(line.replace(/^[-*]\s+/, '')); }
    }
    try { const d = await api(`/roadmaps/${doc.id}`, { method: 'PATCH', body: { title: f.title, intro: f.intro, resources, notes } }); changed('roadmaps'); notify('Page saved'); onSaved({ title: d.title ?? f.title, intro: d.intro ?? f.intro, resources: d.resources ?? resources, notes: d.notes ?? notes }); } catch (x) { notify(x.message, 'error'); }
  };
  return (
    <Paper variant="outlined" component="form" onSubmit={save} sx={{ p: 2.5, mt: 3 }}>
      <Typography variant="h3" component="h2" sx={{ mb: 2 }}>Edit page</Typography>
      <Stack spacing={2}>
        <TextField label="Title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <TextField label="Intro" multiline minRows={2} value={f.intro} onChange={(e) => setF({ ...f, intro: e.target.value })} />
        <TextField label="Resources" helperText="One per line: Title | https://link" multiline minRows={3} value={f.resources} onChange={(e) => setF({ ...f, resources: e.target.value })} />
        <TextField label="Notes" helperText="## Heading, then - line. [text](url) for links." multiline minRows={6} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        <Stack direction="row" spacing={1}><Button type="submit" variant="contained">Save</Button><Button onClick={onCancel}>Cancel</Button></Stack>
      </Stack>
    </Paper>
  );
}

// ---------- rows (plain elements styled once, for long lists) ----------

function RowStyles({ children }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const siteCss = Object.fromEntries(Object.entries(SITE_COLORS).map(([site, [fg, bg]]) => [`& .qb-${site.toLowerCase().replace(/[^a-z0-9]/g, '')}`, dark ? { color: bg, backgroundColor: alpha(fg, 0.35), borderColor: alpha(bg, 0.25) } : { color: fg, backgroundColor: bg, borderColor: alpha(fg, 0.25) }]));
  return (
    <Box sx={{
      '& .rt-row': { display: 'flex', alignItems: 'flex-start', gap: 1.25, px: { xs: 1.25, sm: 2 }, py: 1.1, borderTop: 1, borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' }, '&:hover .rt-actions': { opacity: 1 } },
      '& .rt-row.is-doing': { boxShadow: `inset 3px 0 0 ${theme.palette.info.main}` },
      '& .rt-name': { flex: 1, minWidth: 0 },
      '& .rt-tick': {
        flexShrink: 0, width: 24, height: 24, mt: '1px', borderRadius: '6px', border: '2px solid', borderColor: theme.palette.text.disabled, display: 'grid', placeItems: 'center', p: 0,
        cursor: 'pointer', bgcolor: 'transparent', color: theme.palette.primary.contrastText, '&:hover:not(:disabled)': { borderColor: theme.palette.primary.main },
        '&[aria-checked="true"]': { borderColor: theme.palette.primary.main, bgcolor: theme.palette.primary.main }, '&:disabled': { cursor: 'default', opacity: 0.75 },
        '@media (pointer: coarse)': { width: 28, height: 28, position: 'relative', '&::after': { content: '""', position: 'absolute', inset: -8 } },
      },
      '& .rt-title': { fontWeight: 500, color: 'text.primary', textDecoration: 'none', wordBreak: 'break-word', '&:hover': { color: 'primary.main', textDecoration: 'underline' } },
      '& .is-done .rt-title': { color: 'text.secondary', textDecoration: 'line-through' },
      '& .rt-sub': { color: 'text.secondary', fontSize: 12.5, display: 'block', mt: 0.25 },
      '& .rt-note': { fontSize: 13, mt: 0.5, color: 'text.primary', bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1, whiteSpace: 'pre-wrap' },
      '& .rt-pill': { display: 'inline-flex', alignItems: 'center', ml: 0.75, px: 0.9, height: 20, borderRadius: 10, fontSize: 11.5, fontWeight: 600, border: 1, borderColor: 'divider', bgcolor: 'transparent', color: 'text.secondary', verticalAlign: 'middle', cursor: 'default', fontFamily: 'inherit' },
      '& button.rt-pill': { cursor: 'pointer', '&:hover': { borderColor: 'text.secondary' } },
      '& .lvl-beginner': { color: 'success.main', borderColor: alpha(theme.palette.success.main, 0.4) },
      '& .lvl-intermediate': { color: 'warning.main', borderColor: alpha(theme.palette.warning.main, 0.4) },
      '& .lvl-advanced': { color: 'error.main', borderColor: alpha(theme.palette.error.main, 0.4) },
      '& .st-doing': { color: 'info.main', borderColor: alpha(theme.palette.info.main, 0.4) },
      '& .rt-actions': { display: 'flex', gap: 0.25, opacity: { xs: 1, md: 0.35 }, transition: 'opacity .15s', '&:focus-within': { opacity: 1 } },
      '& .rt-iconbtn': { display: 'grid', placeItems: 'center', width: 30, height: 30, border: 0, borderRadius: 1.5, bgcolor: 'transparent', color: 'text.secondary', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected', color: 'text.primary' }, '@media (pointer: coarse)': { width: 38, height: 38 } },
      '& .rt-links': { display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' },
      '& .qb': { display: 'grid', placeItems: 'center', width: 36, height: 28, borderRadius: 1.5, fontSize: 11, fontWeight: 700, textDecoration: 'none', border: 1, '@media (pointer: coarse)': { width: 40, height: 34 } },
      '& .qi': { display: 'grid', placeItems: 'center', width: 30, height: 28, borderRadius: 1.5, color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' }, '@media (pointer: coarse)': { width: 36, height: 34 } },
      '& .qe': { width: 36, height: 28, borderRadius: 1.5, border: '1px dashed', borderColor: 'divider', opacity: 0.5 },
      '& .qe.k': { width: 30 },
      '& .rt-subhead': { display: 'flex', justifyContent: 'space-between', gap: 2, px: { xs: 1.25, sm: 2 }, py: 0.9, bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider', fontSize: 13, fontWeight: 600, color: 'text.secondary', '& span:first-of-type': { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }, '& span:last-of-type': { whiteSpace: 'nowrap' } },
      '@media (max-width: 760px)': { '& .rt-row': { flexWrap: 'wrap' }, '& .rt-name': { flexBasis: 150 }, '& .rt-links': { ml: 'auto' } },
      ...siteCss,
    }}
    >
      {children}
    </Box>
  );
}

// Plain button styled by RowStyles (.rt-tick): cheap to render hundreds of times.
function Tick({ done, title, onClick, readOnly }) {
  return (
    <button type="button" className="rt-tick" role="checkbox" aria-checked={done} disabled={readOnly} onClick={onClick}
      aria-label={`${readOnly ? (done ? 'Done' : 'Not done') : done ? 'Mark not done' : 'Mark done'}: ${title}`}>
      {done && <Check sx={{ fontSize: 18 }} />}
    </button>
  );
}

const ItemTitle = ({ i }) => (safeUrl(i.url)
  ? <a className="rt-title" href={i.url} target="_blank" rel="noopener noreferrer">{i.title}</a>
  : <span className="rt-title">{i.title}</span>);

function LinkSlots({ i, slots }) {
  const byKey = new Map(itemLinks(i).map((l) => [slotKey(l), l]));
  return (
    <div className="rt-links">
      {slots.map((k) => {
        const l = byKey.get(k);
        if (!l) return <span key={k} className={`qe ${k.startsWith('p:') ? '' : 'k'}`} title={k.startsWith('p:') ? `Not on ${k.slice(2)}` : `No ${k}`} aria-hidden="true" />;
        if (l.kind === 'practice') {
          return <a key={k} className={`qb qb-${l.site.toLowerCase().replace(/[^a-z0-9]/g, '')}`} href={l.url} target="_blank" rel="noopener noreferrer" title={`Solve on ${l.site}`} aria-label={`Solve ${i.title} on ${l.site}`}>{SITE_SHORT[l.site] ?? l.site.slice(0, 3)}</a>;
        }
        const label = l.kind === 'video' ? 'Watch the video' : l.site === 'Link' ? 'Open the link' : 'Read the article';
        return <a key={k} className="qi" href={l.url} target="_blank" rel="noopener noreferrer" title={label} aria-label={`${label}: ${i.title}`}>{l.kind === 'video' ? <SmartDisplayOutlined fontSize="small" /> : <ArticleOutlined fontSize="small" />}</a>;
      })}
    </div>
  );
}

const Row = memo(function Row({ i, slots, practice, admin, showTopic, actions }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const { meta, own } = metaOf(i);
  const answer = answerOf(i.note);
  const nextLabel = STATUS[STATUS[i.status]?.next ?? 'in_progress'].label.toLowerCase();
  return (
    <div className={`rt-row ${i.status === 'done' ? 'is-done' : ''} ${i.status === 'in_progress' ? 'is-doing' : ''}`} role="row">
      <Tick done={i.status === 'done'} title={i.title} onClick={() => actions.toggle(i)} readOnly={!admin} />
      <div className="rt-name" role="cell">
        <div>
          <ItemTitle i={i} />
          {admin
            ? <button type="button" className={`rt-pill lvl-${(i.level || 'none').toLowerCase()}`} onClick={() => actions.level(i)} title={`Change ${practice ? 'difficulty' : 'level'}`}>{levelLabel(i.level, practice) || (practice ? 'Set difficulty' : 'Set level')}</button>
            : i.level && <span className={`rt-pill lvl-${i.level.toLowerCase()}`}>{levelLabel(i.level, practice)}</span>}
          {i.status === 'in_progress' && <span className="rt-pill st-doing">In progress</span>}
        </div>
        {showTopic && <span className="rt-sub">{i.sectionTitle}</span>}
        {meta && <span className="rt-sub"><Inline text={meta} /></span>}
        {answer && (
          <Box sx={{ mt: 0.5 }}>
            <Button size="small" onClick={() => setShowAnswer(!showAnswer)} aria-expanded={showAnswer} sx={{ px: 0.5, minWidth: 0 }}>{showAnswer ? 'Hide answer' : 'Show answer'}</Button>
            {showAnswer && <div className="rt-note">{answer}</div>}
          </Box>
        )}
        {own && !noteOpen && <div className="rt-note"><Inline text={own} /></div>}
        {i.status === 'done' && i.doneAt && <span className="rt-sub">Done {ago(i.doneAt)}</span>}
        {noteOpen && (
          <Stack component="form" spacing={1} sx={{ mt: 1 }} onSubmit={(e) => { e.preventDefault(); actions.note(i, noteText); setNoteOpen(false); }}>
            <TextField multiline minRows={2} autoFocus value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="What did you learn? Anything to revisit?" inputProps={{ 'aria-label': 'Note' }} />
            <Stack direction="row" spacing={1}><Button type="submit" size="small" variant="contained">Save note</Button><Button size="small" onClick={() => setNoteOpen(false)}>Cancel</Button></Stack>
          </Stack>
        )}
      </div>
      {admin && (
        <div className="rt-actions">
          <button type="button" className="rt-iconbtn" onClick={() => actions.cycle(i)} title={`Mark ${nextLabel}`} aria-label={`Mark ${i.title} ${nextLabel}`}><TimelapseOutlined fontSize="small" /></button>
          <button type="button" className="rt-iconbtn" onClick={() => { setNoteText(own ? i.note : ''); setNoteOpen(true); }} title={own ? 'Edit note' : 'Add note'} aria-label={`Note for ${i.title}`}><StickyNote2Outlined fontSize="small" /></button>
          <button type="button" className="rt-iconbtn" onClick={() => actions.remove(i)} title="Delete topic" aria-label={`Delete ${i.title}`}><DeleteOutline fontSize="small" /></button>
        </div>
      )}
      <LinkSlots i={i} slots={slots} />
    </div>
  );
});

function GroupBlock({ g, group, practice, admin, open, onOpen, actions, onAdd, onRename, onDelete, section }) {
  const total = g.items.length;
  const done = g.items.filter((i) => i.status === 'done').length;
  // Sub-topic labels and link slots depend only on the group's items, so filtering and searching
  // reuse them (and memoised rows skip re-rendering).
  const { label, slots } = useMemo(() => {
    const grouped = group === 'topic' && g.items.some((x) => subTopicOf(x));
    const lessons = g.items.filter((x) => !subTopicOf(x));
    const lessonLabel = lessons.length && lessons.every((x) => /youtu\.?be/.test(x.url || '')) ? 'Videos' : 'Lessons';
    const lab = (x) => (!grouped ? '' : subTopicOf(x) || lessonLabel);
    const slotsFor = new Map();
    for (const x of g.items) {
      const sub = lab(x);
      if (!slotsFor.has(sub)) slotsFor.set(sub, groupSlots(grouped ? g.items.filter((y) => lab(y) === sub) : g.items));
    }
    return { label: lab, slots: (sub) => slotsFor.get(sub) };
  }, [g.items, group]);
  let last = null;
  return (
    <Accordion expanded={open} onChange={(_, o) => onOpen(o)} TransitionProps={{ unmountOnExit: true }} sx={{ borderColor: total && done === total ? 'success.main' : undefined }}>
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5, minWidth: 0, my: 1.25 } }}>
        {g.level !== undefined
          ? <Chip size="small" label={g.level ? levelLabel(g.level, practice) : g.title} color={LEVEL_COLOR[g.level] || 'default'} variant="outlined" />
          : <><Chip size="small" label={`Step ${g.step}`} sx={{ flexShrink: 0 }} /><Typography sx={{ fontWeight: 600, minWidth: 0 }}>{g.title.replace(/^Striver A2Z: /, 'A2Z · ')}</Typography></>}
        <Box sx={{ flex: 1 }} />
        <Box sx={{ width: 90, display: { xs: 'none', sm: 'block' } }}><Bar done={done} total={total} height={5} /></Box>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', mr: 1 }}>{done} / {total}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <div role="table" aria-label={`${practice ? 'Questions' : 'Topics'} in ${g.title}`}>
          {g.rows.map((i) => {
            const sub = label(i);
            let head = null;
            if (sub && sub !== last) {
              const of = g.items.filter((x) => label(x) === sub);
              head = <div className="rt-subhead" role="row"><span role="cell" title={sub}>{sub}</span><span>{of.filter((x) => x.status === 'done').length} / {of.length}</span></div>;
            }
            last = sub;
            return <Fragment key={i.id}>{head}<Row i={i} slots={slots(sub)} practice={practice} admin={admin} showTopic={group === 'level'} actions={actions} /></Fragment>;
          })}
        </div>
        {admin && section && <SectionFoot section={section} onAdd={onAdd} onRename={onRename} onDelete={onDelete} />}
      </AccordionDetails>
    </Accordion>
  );
}

function SectionFoot({ section, onAdd, onRename, onDelete }) {
  const notify = useNotify();
  const [f, setF] = useState({ title: '', url: '' });
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(section.title);
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'action.hover' }} justifyContent="space-between">
      <Stack component="form" direction="row" spacing={1} sx={{ flex: 1 }} onSubmit={async (e) => { e.preventDefault(); try { await onAdd(section.id, f.title, f.url); setF({ title: '', url: '' }); } catch (x) { notify(x.message, 'error'); } }}>
        <TextField placeholder="Add a topic" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} inputProps={{ 'aria-label': `New topic in ${section.title}` }} sx={{ flex: 2 }} />
        <TextField placeholder="Link (optional)" type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} inputProps={{ 'aria-label': 'Link' }} sx={{ flex: 1.5 }} />
        <Button type="submit" variant="outlined">Add</Button>
      </Stack>
      {renaming ? (
        <Stack component="form" direction="row" spacing={1} onSubmit={async (e) => { e.preventDefault(); try { await onRename(section, name); setRenaming(false); } catch (x) { notify(x.message, 'error'); } }}>
          <TextField value={name} onChange={(e) => setName(e.target.value)} required inputProps={{ 'aria-label': 'Section name' }} />
          <Button type="submit">Save</Button><Button onClick={() => setRenaming(false)}>Cancel</Button>
        </Stack>
      ) : (
        <Stack direction="row" spacing={0.5}><Button size="small" onClick={() => setRenaming(true)}>Rename</Button><Button size="small" color="error" onClick={() => onDelete(section)}>Delete section</Button></Stack>
      )}
    </Stack>
  );
}

function AddSection({ onAdd }) {
  const notify = useNotify();
  const [t, setT] = useState('');
  return (
    <Stack component="form" direction="row" spacing={1} sx={{ mt: 3 }} onSubmit={async (e) => { e.preventDefault(); try { await onAdd(t); setT(''); } catch (x) { notify(x.message, 'error'); } }}>
      <TextField placeholder="New topic group (section) name" required value={t} onChange={(e) => setT(e.target.value)} inputProps={{ 'aria-label': 'New section name' }} sx={{ flex: 1, maxWidth: 480 }} />
      <Button type="submit" variant="outlined">Add section</Button>
    </Stack>
  );
}

function DsaPatterns() {
  const [checked, setChecked] = useLocalStorage('rt:dsa-patterns', {});
  const total = DSA_PATTERNS.reduce((n, p) => n + p.questions.length, 0);
  const done = DSA_PATTERNS.reduce((n, p) => n + p.questions.filter((q) => checked[q.id]).length, 0);
  const ref = useRef();
  return (
    <Box sx={{ mt: 4 }} ref={ref}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
        <Typography variant="h2">DSA patterns</Typography>
        <Typography variant="body2" color="text.secondary">{done} / {total} · ticks saved in this browser</Typography>
      </Stack>
      <RowStyles>
        {DSA_PATTERNS.map((p) => {
          const d = p.questions.filter((q) => checked[q.id]).length;
          return (
            <Accordion key={p.title} TransitionProps={{ unmountOnExit: true }}>
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 } }}>
                <Typography sx={{ fontWeight: 600 }}>{p.title}</Typography><Box sx={{ flex: 1 }} /><Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>{d} / {p.questions.length}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {p.questions.map((q) => (
                  <div key={q.id} className={`rt-row ${checked[q.id] ? 'is-done' : ''}`}>
                    <Tick done={Boolean(checked[q.id])} title={q.title} onClick={() => setChecked((c) => ({ ...c, [q.id]: !c[q.id] }))} />
                    <div className="rt-name"><a className="rt-title" href={q.url} target="_blank" rel="noopener noreferrer">{q.title}</a></div>
                    <LinkSlots i={{ title: q.title, url: q.url }} slots={['p:LeetCode']} />
                  </div>
                ))}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </RowStyles>
    </Box>
  );
}
