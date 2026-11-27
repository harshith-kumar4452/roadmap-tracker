import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Card, CardActionArea, CardContent, Chip, Grid, Paper, Stack, Tab, Tabs, TextField, Typography, Alert,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import PlayArrow from '@mui/icons-material/PlayArrow';
import RestartAlt from '@mui/icons-material/RestartAlt';
import OpenInNew from '@mui/icons-material/OpenInNew';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { PageHeader, Loading, ErrorState, pct, plural } from '../components/common.jsx';
import RoadmapCard, { Bar } from '../components/RoadmapCard.jsx';
import NotFound from './NotFound.jsx';
import { useApi, useLocalStorage } from '../lib/hooks.js';
import { JOB_ROLES, bundleRoadmaps, LEVEL_COLOR } from '../lib/roadmaps.js';
import { ROLE_CONTENT, ROLE_PROJECTS } from '../data/roleContent.js';

const TABS = [['roadmaps', 'Roadmaps'], ['projects', 'Projects'], ['resources', 'Resources'], ['interviews', 'Interview patterns'], ['playground', 'Playground']];

export default function RoleHub() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const role = JOB_ROLES.find((r) => r.id === id);
  const list = useApi('/roadmaps', { topics: ['roadmaps'] });
  if (!role) return <NotFound />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!list.data) return <Loading />;
  const tab = TABS.some(([t]) => t === params.get('tab')) ? params.get('tab') : 'roadmaps';
  const data = ROLE_CONTENT[role.id] || ROLE_CONTENT.sde;
  const projects = ROLE_PROJECTS[role.id] || ROLE_PROJECTS.sde;
  const items = list.data.filter((r) => role.match.test(r.title));
  const cards = bundleRoadmaps(list.data).filter((r) => (r.isGroup ? r.items.some((i) => role.match.test(i.title)) : role.match.test(r.title)));
  const done = items.reduce((n, r) => n + r.done, 0);
  const total = items.reduce((n, r) => n + r.total, 0);
  const counts = { roadmaps: cards.length, projects: projects.length, resources: data.resources.length, interviews: data.interviews.length };

  return (
    <>
      <Button component={RouterLink} to="/roles" startIcon={<ArrowBack />} sx={{ mb: 2 }}>All roles</Button>
      <PageHeader title={role.label} icon={role.icon} subtitle={role.desc} />
      <Box sx={{ mb: 3 }}>
        <Bar done={done} total={total} height={10} />
        <Typography sx={{ mt: 1 }}><strong>{pct(done, total)}%</strong> <Typography component="span" color="text.secondary">· {done} of {plural(total, 'topic')} done across {plural(items.length, 'roadmap')}</Typography></Typography>
      </Box>
      <Tabs value={tab} onChange={(_, v) => setParams(v === 'roadmaps' ? {} : { tab: v }, { replace: true })} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map(([v, l]) => <Tab key={v} value={v} label={counts[v] !== undefined ? `${l} (${counts[v]})` : l} />)}
      </Tabs>
      {tab === 'roadmaps' && (cards.length ? <Grid container spacing={2}>{cards.map((r) => <Grid item xs={12} sm={6} lg={4} key={r.id || r.slug}><RoadmapCard r={r} /></Grid>)}</Grid> : <Typography color="text.secondary">No roadmaps matched this role yet.</Typography>)}
      {tab === 'projects' && (
        <Grid container spacing={2}>
          {projects.map((p) => (
            <Grid item xs={12} md={6} lg={4} key={p.title}>
              <Card sx={{ height: '100%' }}><CardContent>
                <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}><Typography variant="h4" component="h3">{p.title}</Typography><Chip size="small" label={p.level} color={LEVEL_COLOR[p.level]} variant="outlined" /></Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{p.summary}</Typography>
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">{p.stack.map((s) => <Chip key={s} size="small" label={s} />)}</Stack>
              </CardContent></Card>
            </Grid>
          ))}
        </Grid>
      )}
      {tab === 'resources' && (
        <Stack spacing={1.5}>
          {data.resources.map((r) => {
            const internal = r.url.startsWith('#/');
            return (
              <Card key={r.title}>
                <CardActionArea {...(internal ? { component: RouterLink, to: r.url.slice(1) } : { component: 'a', href: r.url, target: '_blank', rel: 'noopener noreferrer' })}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}><Typography variant="h5" component="h3">{r.title}</Typography><Typography variant="body2" color="text.secondary">{r.note}</Typography></Box>
                    {internal ? <ArrowForward color="action" /> : <OpenInNew color="action" />}
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
          <Button component={RouterLink} to="/resources" sx={{ alignSelf: 'flex-start' }}>Open the full resources library</Button>
        </Stack>
      )}
      {tab === 'interviews' && <Interviews role={role} data={data} />}
      {tab === 'playground' && (
        <Stack spacing={3}>
          <Playground key={role.id} starter={data.starterCode} label={role.label} />
          <PracticeLists items={items} role={role} />
        </Stack>
      )}
    </>
  );
}

function Interviews({ role, data }) {
  const [note, setNote] = useLocalStorage(`rt:role-notes:${role.id}`, '');
  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        {data.interviews.map((it) => (
          <Grid item xs={12} md={6} lg={4} key={it.company}>
            <Card sx={{ height: '100%' }}><CardContent>
              <Typography variant="h4" component="h3" sx={{ mb: 1 }}>{it.company}</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}><strong>Rounds:</strong> {it.rounds}</Typography>
              <Typography variant="body2" color="text.secondary">{it.tips}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h4" component="h2" sx={{ mb: 1 }}>Your interview notes ({role.label})</Typography>
        <TextField multiline minRows={4} fullWidth value={note} onChange={(e) => setNote(e.target.value)} placeholder="Questions you were asked, takeaways, company-specific patterns…" helperText="Saved in this browser" />
      </Paper>
      <Button component={RouterLink} to="/interview" variant="outlined" sx={{ alignSelf: 'flex-start' }}>Practise with the question bank and AI interviews</Button>
    </Stack>
  );
}

// Runs the code in a Web Worker: off the main thread (an infinite loop can't freeze the page),
// without access to the page, cookies or DOM, and stopped after 3 seconds.
const WORKER_SRC = `
self.onmessage = (e) => {
  const out = [];
  const fmt = (a) => (typeof a === 'object' ? (() => { try { return JSON.stringify(a); } catch { return String(a); } })() : String(a));
  const console = { log: (...a) => out.push(a.map(fmt).join(' ')), error: (...a) => out.push('ERROR: ' + a.map(fmt).join(' ')), warn: (...a) => out.push('WARN: ' + a.map(fmt).join(' ')) };
  try { new Function('console', e.data)(console); self.postMessage({ ok: true, out }); }
  catch (err) { self.postMessage({ ok: false, out, error: err.name + ': ' + err.message }); }
};`;

function Playground({ starter, label }) {
  const [code, setCode] = useState(starter);
  const [out, setOut] = useState({ text: 'Click Run to execute…', error: false });
  const [running, setRunning] = useState(false);
  const worker = useRef(null);
  useEffect(() => () => worker.current?.terminate(), []);
  const run = () => {
    worker.current?.terminate();
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    const w = new Worker(url);
    URL.revokeObjectURL(url);
    worker.current = w;
    setRunning(true);
    const timer = setTimeout(() => { w.terminate(); setRunning(false); setOut({ text: 'Stopped: the code ran for more than 3 seconds (infinite loop?).', error: true }); }, 3000);
    w.onmessage = (e) => {
      clearTimeout(timer); w.terminate(); setRunning(false);
      const lines = [...e.data.out, ...(e.data.error ? [e.data.error] : [])];
      setOut({ text: lines.length ? lines.join('\n') : '(Finished with no console output)', error: !e.data.ok });
    };
    w.postMessage(code);
  };
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
        <Box><Typography variant="h3" component="h2">{label} playground</Typography><Typography variant="body2" color="text.secondary">Run JavaScript snippets and algorithms. The code runs in an isolated worker.</Typography></Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RestartAlt />} onClick={() => { setCode(starter); setOut({ text: 'Click Run to execute…', error: false }); }}>Reset</Button>
          <Button variant="contained" startIcon={<PlayArrow />} onClick={run} disabled={running}>{running ? 'Running…' : 'Run'}</Button>
        </Stack>
      </Stack>
      <TextField
        multiline minRows={12} fullWidth value={code} onChange={(e) => setCode(e.target.value)} inputProps={{ spellCheck: false, 'aria-label': 'Playground code editor' }}
        sx={{ '& textarea': { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 13.5, lineHeight: 1.55 } }}
        onKeyDown={(e) => {
          if (e.key === 'Tab') { e.preventDefault(); const t = e.target; const s = t.selectionStart; setCode(code.slice(0, s) + '  ' + code.slice(t.selectionEnd)); requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2; }); }
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run();
        }}
      />
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>Output</Typography>
      <Box component="pre" aria-live="polite" sx={{ m: 0, p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover', color: out.error ? 'error.main' : 'text.primary', whiteSpace: 'pre-wrap', fontSize: 13, minHeight: 60, overflowX: 'auto' }}>{out.text}</Box>
      <Typography variant="caption" color="text.secondary">Ctrl + Enter runs the code.</Typography>
    </Paper>
  );
}

function PracticeLists({ items, role }) {
  const lists = items.filter((r) => /practice/i.test(r.title));
  if (!lists.length) return null;
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Typography variant="h3" component="h2">Practice for {role.label}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Solve these on LeetCode, HackerRank and CodeChef, then tick them off. Grouped by topic, Easy to Hard.</Typography>
      <Stack spacing={1}>
        {lists.map((r) => (
          <Card key={r.id}><CardActionArea component={RouterLink} to={`/r/${r.id}`}><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
              <Box><Typography sx={{ fontWeight: 600 }}>{r.title}</Typography><Typography variant="caption" color="text.secondary">{r.done} of {plural(r.total, 'question')} solved{r.next ? ` · next: ${r.next.title}` : ''}</Typography></Box>
              <Box sx={{ minWidth: 140, alignSelf: { sm: 'center' } }}><Bar done={r.done} total={r.total} /></Box>
            </Stack>
          </CardContent></CardActionArea></Card>
        ))}
      </Stack>
      <Alert severity="info" sx={{ mt: 2 }}>Want one problem a day picked for you? <RouterLink to="/coding">Open Daily coding</RouterLink>.</Alert>
    </Paper>
  );
}
