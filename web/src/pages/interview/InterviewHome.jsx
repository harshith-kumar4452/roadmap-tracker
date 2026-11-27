import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardActionArea, CardContent, Chip, FormControl,
  Grid, IconButton, InputAdornment, InputLabel, LinearProgress, MenuItem, Pagination, Paper, Select, Slider, Stack, Tab, Tabs,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography, Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
} from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import BookmarkBorder from '@mui/icons-material/BookmarkBorder';
import Bookmark from '@mui/icons-material/Bookmark';
import Search from '@mui/icons-material/Search';
import QuestionAnswerOutlined from '@mui/icons-material/QuestionAnswerOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import { PageHeader, Loading, ErrorState, EmptyState, LoginRequired, Markdown, pct } from '../../components/common.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { useApi, useDebounced } from '../../lib/hooks.js';
import { api, changed } from '../../lib/api.js';
import { useNotify } from '../../lib/notify.jsx';

export const DIFF_COLOR = { Easy: 'success', Medium: 'warning', Hard: 'error' };
const STATUS_LABEL = { not_started: 'Not started', learning: 'Learning', completed: 'Completed' };
const TYPE_LABEL = { conceptual: 'Conceptual', coding: 'Coding', 'system-design': 'System design', behavioral: 'Behavioral', aptitude: 'Aptitude' };

export default function InterviewHome() {
  const { tab = 'learn' } = useParams();
  const navigate = useNavigate();
  const { ready, authenticated } = useAuth();
  return (
    <>
      <PageHeader
        title="Interview prep"
        icon={QuestionAnswerOutlined}
        subtitle="Study questions by subject with full answers, track what you've learned, and practise with an AI interviewer that scores your answers."
      />
      <Tabs value={tab === 'ai' ? 'ai' : 'learn'} onChange={(_, v) => navigate(v === 'learn' ? '/interview' : `/interview/${v}`)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="learn" label="Questions & answers" icon={<SchoolOutlined />} iconPosition="start" />
        <Tab value="ai" label="AI mock interview" icon={<AutoAwesomeOutlined />} iconPosition="start" />
      </Tabs>
      {!ready ? <Loading /> : !authenticated ? <LoginRequired what="interview prep" /> : tab === 'ai' ? <AiInterview /> : <Learn />}
    </>
  );
}

// ---------------------------------------------------------------- Learn mode

function Learn() {
  const [params, setParams] = useSearchParams();
  const meta = useApi('/interview/meta');
  const summary = useApi('/interview/summary', { topics: ['interview-progress'] });
  const f = {
    category: params.get('category') || '', difficulty: params.get('difficulty') || '', type: params.get('type') || '',
    status: params.get('status') || '', bookmarked: params.get('bookmarked') === '1', page: Number(params.get('page')) || 1,
  };
  const [search, setSearch] = useState(params.get('search') || '');
  const debounced = useDebounced(search.trim(), 300);
  const set = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries({ page: '', ...patch })) {
      if (v === '' || v === false || v === null) next.delete(k); else next.set(k, v === true ? '1' : String(v));
    }
    setParams(next, { replace: true });
  };
  useEffect(() => { if ((params.get('search') || '') !== debounced) set({ search: debounced }); }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const qs = new URLSearchParams({ pageSize: '20', page: String(f.page) });
  for (const k of ['category', 'difficulty', 'type', 'status']) if (f[k]) qs.set(k, f[k]);
  if (f.bookmarked) qs.set('bookmarked', '1');
  if (debounced) qs.set('search', debounced);
  const list = useApi(`/interview/questions?${qs}`);

  const cats = summary.data?.categories || [];
  return (
    <Stack spacing={3}>
      {summary.loading && !summary.data ? <Loading rows={1} /> : summary.error ? <ErrorState error={summary.error} onRetry={summary.reload} /> : (
        <Grid container spacing={1.5}>
          {cats.map((c) => (
            <Grid item xs={6} sm={4} md={3} key={c.category}>
              <Card sx={{ height: '100%', borderColor: f.category === c.category ? 'primary.main' : undefined }}>
                <CardActionArea onClick={() => set({ category: f.category === c.category ? '' : c.category })} sx={{ height: '100%' }} aria-pressed={f.category === c.category}>
                  <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                    <Typography variant="h6" component="p" sx={{ lineHeight: 1.3, minHeight: 40 }}>{c.category}</Typography>
                    <Typography variant="body2" color="text.secondary">{c.completed} / {c.total} done{c.learning ? ` · ${c.learning} learning` : ''}</Typography>
                    <LinearProgress variant="determinate" value={pct(c.completed, c.total)} sx={{ mt: 1 }} />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
          <TextField
            label="Search questions" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 2, minWidth: 200 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          />
          <Filter label="Category" value={f.category} onChange={(v) => set({ category: v })} options={meta.data?.categories || []} />
          <Filter label="Difficulty" value={f.difficulty} onChange={(v) => set({ difficulty: v })} options={meta.data?.difficulties || []} />
          <Filter label="Type" value={f.type} onChange={(v) => set({ type: v })} options={(meta.data?.types || []).map((t) => [t, TYPE_LABEL[t] || t])} />
          <Filter label="Status" value={f.status} onChange={(v) => set({ status: v })} options={Object.entries(STATUS_LABEL)} />
          <ToggleButton value="b" selected={f.bookmarked} onChange={() => set({ bookmarked: !f.bookmarked })} size="small" sx={{ px: 1.5 }} aria-label="Only bookmarked">
            <Bookmark fontSize="small" sx={{ mr: 0.75 }} />Bookmarked
          </ToggleButton>
        </Stack>
      </Paper>

      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data ? <Loading /> : !list.data.items.length ? (
        <EmptyState icon={Search} title="No questions match" text="Try another category, difficulty or search term." action={<Button onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>Clear filters</Button>} />
      ) : (
        <Box sx={{ opacity: list.loading ? 0.6 : 1, transition: 'opacity .15s' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{list.data.total} question{list.data.total === 1 ? '' : 's'}</Typography>
          {list.data.items.map((q) => <QuestionItem key={q.id} q={q} onChange={(patch) => list.setData((d) => ({ ...d, items: d.items.map((x) => (x.id === q.id ? { ...x, ...patch } : x)) }))} />)}
          {list.data.total > list.data.pageSize && (
            <Stack alignItems="center" sx={{ mt: 2 }}>
              <Pagination count={Math.ceil(list.data.total / list.data.pageSize)} page={f.page} onChange={(_, p) => { set({ page: p > 1 ? p : '' }); window.scrollTo({ top: 0 }); }} color="primary" />
            </Stack>
          )}
        </Box>
      )}
    </Stack>
  );
}

function Filter({ label, value, onChange, options }) {
  const id = `f-${label}`;
  return (
    <FormControl size="small" sx={{ minWidth: 150, flex: 1 }}>
      <InputLabel id={id}>{label}</InputLabel>
      <Select labelId={id} label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="">All</MenuItem>
        {options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <MenuItem key={v} value={v}>{l}</MenuItem>; })}
      </Select>
    </FormControl>
  );
}


function QuestionItem({ q, onChange }) {
  const { admin } = useAuth();
  const notify = useNotify();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (patch) => {
    const prev = { status: q.status, bookmarked: q.bookmarked };
    onChange(patch);
    try {
      const r = await api(`/interview/progress/${q.id}`, { method: 'PUT', body: patch });
      onChange(r);
      changed('interview-progress');
    } catch (e) {
      onChange(prev);
      notify(e.message, 'error');
    }
  };

  const expand = async (_, isOpen) => {
    setOpen(isOpen);
    if (!isOpen || detail) return;
    try {
      setDetail(await api(`/interview/questions/${q.id}`));
      api(`/interview/progress/${q.id}`, { method: 'PUT', body: { reviewed: true } }).then(onChange).catch(() => {});
    } catch (e) { setErr(e); }
  };

  const generate = async () => {
    setBusy(true); setErr(null);
    try {
      const d = await api(`/interview/questions/${q.id}/answer`, { method: 'POST', body: {} });
      setDetail(d);
      onChange({ hasAnswer: true, answerSource: d.answerSource });
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  return (
    <Accordion expanded={open} onChange={expand} TransitionProps={{ unmountOnExit: true }}>
      <AccordionSummary expandIcon={<ExpandMore />} sx={{ '& .MuiAccordionSummary-content': { my: 1.25, minWidth: 0 } }}>
        <Stack spacing={0.75} sx={{ minWidth: 0, pr: 1 }}>
          <Typography sx={{ fontWeight: 500 }}>{q.q}</Typography>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
            <Chip size="small" label={q.difficulty} color={DIFF_COLOR[q.difficulty]} variant="outlined" />
            <Chip size="small" label={q.category} variant="outlined" />
            <Typography variant="caption" color="text.secondary">{q.topic}</Typography>
            {q.status !== 'not_started' && <Chip size="small" label={STATUS_LABEL[q.status]} color={q.status === 'completed' ? 'success' : 'info'} />}
            {!q.hasAnswer && <Typography variant="caption" color="text.secondary">· no answer yet</Typography>}
          </Stack>
        </Stack>
        <Tooltip title={q.bookmarked ? 'Remove bookmark' : 'Bookmark'}>
          <IconButton
            component="span"
            onClick={(e) => { e.stopPropagation(); save({ bookmarked: !q.bookmarked }); }}
            onFocus={(e) => e.stopPropagation()}
            aria-label={q.bookmarked ? 'Remove bookmark' : 'Bookmark question'}
            aria-pressed={q.bookmarked}
            sx={{ alignSelf: 'flex-start', mr: 0.5 }}
          >
            {q.bookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
          </IconButton>
        </Tooltip>
      </AccordionSummary>
      <AccordionDetails sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
        {err && <Box sx={{ mb: 2 }}><ErrorState error={err} /></Box>}
        {!detail && !err ? <Loading rows={2} /> : detail && (
          detail.a ? (
            <>
              <Markdown source={detail.a} />
              {detail.answerSource === 'ai' && <Typography variant="caption" color="text.secondary">Answer written by AI. Check important details against a trusted source.</Typography>}
            </>
          ) : (
            <Alert severity="info" action={admin && <Button color="inherit" size="small" onClick={generate} disabled={busy} startIcon={<AutoAwesomeOutlined />}>{busy ? 'Writing…' : 'Write with AI'}</Button>}>
              No answer written yet.{admin ? ' Generate one with AI (it is saved for everyone).' : ' Try answering it out loud, then check a trusted source.'}
            </Alert>
          )
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">Your status</Typography>
          <ToggleButtonGroup size="small" exclusive value={q.status} onChange={(_, v) => v && save({ status: v })} aria-label="Learning status">
            {Object.entries(STATUS_LABEL).map(([v, l]) => <ToggleButton key={v} value={v}>{l}</ToggleButton>)}
          </ToggleButtonGroup>
          {q.lastReviewedAt && <Typography variant="caption" color="text.secondary">Reviewed {q.reviews}× · last {new Date(q.lastReviewedAt).toLocaleDateString()}</Typography>}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

// ---------------------------------------------------------------- AI interview mode

function AiInterview() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const meta = useApi('/interview/meta');
  const history = useApi('/interview/sessions');
  const [category, setCategory] = useState('Data Structures & Algorithms');
  const [difficulty, setDifficulty] = useState('Mixed');
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const s = await api('/interview/sessions', { method: 'POST', body: { category, difficulty, count } });
      navigate(`/interview/session/${s.id}`);
    } catch (e) { notify(e.message, 'error'); setBusy(false); }
  };

  const completed = useMemo(() => (history.data || []).filter((s) => s.status === 'completed').slice(0, 12).reverse(), [history.data]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>Start an interview</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>One question at a time. Each answer is scored on accuracy, understanding, completeness, communication, problem solving and relevance.</Typography>
          {!admin ? (
            <Alert severity="info">AI interviews are available to the site owner only. You can still study every question in the Questions & answers tab.</Alert>
          ) : (
            <Stack spacing={2.5}>
              {meta.data && !meta.data.ai.configured && (
                <Alert severity="warning">AI scoring isn't set up yet (GEMINI_API_KEY). Interviews still run, with basic scoring against the reference answers.</Alert>
              )}
              <FormControl fullWidth size="small">
                <InputLabel id="cat">Category</InputLabel>
                <Select labelId="cat" label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {(meta.data?.categories || []).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }} id="diff-label">Difficulty</Typography>
                <ToggleButtonGroup exclusive fullWidth size="small" value={difficulty} onChange={(_, v) => v && setDifficulty(v)} aria-labelledby="diff-label">
                  {['Easy', 'Medium', 'Hard', 'Mixed'].map((d) => <ToggleButton key={d} value={d}>{d}</ToggleButton>)}
                </ToggleButtonGroup>
              </Box>
              <Box>
                <Typography variant="body2" id="count-label">Questions: <strong>{count}</strong></Typography>
                <Slider value={count} min={1} max={15} step={1} marks={[{ value: 1, label: '1' }, { value: 5, label: '5' }, { value: 10, label: '10' }, { value: 15, label: '15' }]} onChange={(_, v) => setCount(v)} aria-labelledby="count-label" />
              </Box>
              <Button variant="contained" size="large" startIcon={<PlayArrow />} onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Start interview'}</Button>
            </Stack>
          )}
        </Paper>
      </Grid>
      <Grid item xs={12} md={7}>
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <HistoryOutlined color="action" />
            <Typography variant="h3" component="h2">Your interviews</Typography>
          </Stack>
          {history.error ? <ErrorState error={history.error} onRetry={history.reload} /> : !history.data ? <Loading rows={3} /> : !history.data.length ? (
            <Typography color="text.secondary">No interviews yet. Your reports and scores will appear here.</Typography>
          ) : (
            <>
              {completed.length > 1 && <ScoreTrend sessions={completed} />}
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Category</TableCell><TableCell align="right">Score</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                  <TableBody>
                    {history.data.map((s) => (
                      <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/interview/session/${s.id}`)}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}><RouterLink to={`/interview/session/${s.id}`} style={{ color: 'inherit' }}>{new Date(s.createdAt).toLocaleDateString()}</RouterLink></TableCell>
                        <TableCell>{s.category}<Typography variant="caption" color="text.secondary" component="div">{s.difficulty} · {s.answered}/{s.count} answered</Typography></TableCell>
                        <TableCell align="right"><strong>{s.overall ?? '–'}</strong></TableCell>
                        <TableCell><Chip size="small" label={s.status === 'completed' ? 'Report ready' : 'In progress'} color={s.status === 'completed' ? 'success' : 'default'} variant="outlined" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}

function ScoreTrend({ sessions }) {
  return (
    <Box sx={{ mb: 2.5 }} role="img" aria-label={`Scores of your last ${sessions.length} interviews: ${sessions.map((s) => s.overall).join(', ')}`}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Score trend (last {sessions.length})</Typography>
      <Stack direction="row" spacing={0.75} alignItems="flex-end" sx={{ height: 90 }}>
        {sessions.map((s) => (
          <Tooltip key={s.id} title={`${s.overall}/100 · ${s.category} · ${new Date(s.createdAt).toLocaleDateString()}`}>
            <Box sx={{ flex: 1, maxWidth: 36, height: `${Math.max(4, s.overall)}%`, bgcolor: s.overall >= 70 ? 'success.main' : s.overall >= 45 ? 'warning.main' : 'error.main', borderRadius: '4px 4px 0 0', opacity: 0.85 }} />
          </Tooltip>
        ))}
      </Stack>
    </Box>
  );
}
