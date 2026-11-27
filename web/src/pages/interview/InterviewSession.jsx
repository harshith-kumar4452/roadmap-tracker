import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Grid, IconButton, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Paper, Stack,
  TextField, Tooltip, Typography,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Mic from '@mui/icons-material/Mic';
import MicOff from '@mui/icons-material/MicOff';
import Send from '@mui/icons-material/Send';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import TipsAndUpdatesOutlined from '@mui/icons-material/TipsAndUpdatesOutlined';
import FlagOutlined from '@mui/icons-material/FlagOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import AssessmentOutlined from '@mui/icons-material/AssessmentOutlined';
import { Loading, ErrorState, LoginRequired, Markdown } from '../../components/common.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { useApi } from '../../lib/hooks.js';
import { api } from '../../lib/api.js';
import { useNotify } from '../../lib/notify.jsx';
import { DIFF_COLOR } from './InterviewHome.jsx';

const LABELS = {
  accuracy: 'Technical accuracy', understanding: 'Conceptual understanding', completeness: 'Completeness',
  communication: 'Communication', problemSolving: 'Problem solving', relevance: 'Relevance',
};
const tone = (n) => (n >= 70 ? 'success' : n >= 45 ? 'warning' : 'error');

export default function InterviewSession() {
  const { id } = useParams();
  const { ready, authenticated } = useAuth();
  const s = useApi(`/interview/sessions/${id}`, { skip: !authenticated });
  if (!ready) return <Loading />;
  if (!authenticated) return <LoginRequired what="this interview" />;
  return (
    <>
      <Button component={RouterLink} to="/interview/ai" startIcon={<ArrowBack />} sx={{ mb: 2 }}>All interviews</Button>
      {s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data ? <Loading /> : s.data.status === 'completed'
        ? <Report session={s.data} />
        : <Active session={s.data} onUpdate={(d) => s.setData(d)} />}
    </>
  );
}

// ---------------------------------------------------------------- answering

function useSpeech(onText) {
  const Rec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const rec = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => () => rec.current?.stop(), []);
  if (!Rec) return { supported: false };
  return {
    supported: true,
    on,
    toggle() {
      if (on) { rec.current?.stop(); return; }
      const r = new Rec();
      r.lang = 'en-US';
      r.continuous = true;
      r.interimResults = false;
      r.onresult = (e) => {
        const text = Array.from(e.results).slice(e.resultIndex).filter((x) => x.isFinal).map((x) => x[0].transcript).join(' ');
        if (text) onText(text.trim());
      };
      r.onend = () => setOn(false);
      r.onerror = () => setOn(false);
      rec.current = r;
      r.start();
      setOn(true);
    },
  };
}

function Active({ session, onUpdate }) {
  const notify = useNotify();
  const navigate = useNavigate();
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const speech = useSpeech((t) => setAnswer((a) => (a ? `${a} ${t}` : t)));
  const current = session.items.find((i) => i.current);
  const answered = session.items.filter((i) => i.answered);
  const last = answered.at(-1);

  useEffect(() => { setAnswer(''); }, [current?.index]);

  const submit = async () => {
    if (speech.on) speech.toggle();
    setBusy(true);
    try {
      onUpdate(await api(`/interview/sessions/${session.id}/answer`, { method: 'POST', body: { answer, index: current.index } }));
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };
  const finish = async () => {
    setFinishing(true);
    try { onUpdate(await api(`/interview/sessions/${session.id}/finish`, { method: 'POST', body: {} })); window.scrollTo({ top: 0 }); } catch (e) { notify(e.message, 'error'); setFinishing(false); }
  };
  const remove = async () => {
    try { await api(`/interview/sessions/${session.id}`, { method: 'DELETE' }); navigate('/interview/ai'); } catch (e) { notify(e.message, 'error'); }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 860 }}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <Typography variant="h2" component="h1">{session.category} interview</Typography>
          <Tooltip title="Delete this interview"><IconButton onClick={() => setConfirmDelete(true)} aria-label="Delete interview"><DeleteOutline /></IconButton></Tooltip>
        </Stack>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {current ? `Question ${current.index + 1} of ${session.count}` : `All ${session.count} questions answered`} · {session.difficulty}
        </Typography>
        <LinearProgress variant="determinate" value={(answered.length / session.count) * 100} aria-label="Interview progress" />
      </Box>

      {last && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="overline" color="text.secondary">Feedback on question {last.index + 1}</Typography>
            <Chip label={`${last.evaluation.score}/100`} color={tone(last.evaluation.score)} />
          </Stack>
          <Typography sx={{ mb: 1 }}>{last.evaluation.feedback}</Typography>
          {last.evaluation.method === 'fallback' && <Alert severity="warning" sx={{ mb: 1 }}>Basic scoring: {last.evaluation.fallbackReason}</Alert>}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>Expected answer and what was missing</AccordionSummary>
            <AccordionDetails>
              {last.evaluation.missingConcepts?.length > 0 && (
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
                  {last.evaluation.missingConcepts.map((m) => <Chip key={m} size="small" label={m} variant="outlined" color="warning" />)}
                </Stack>
              )}
              {last.evaluation.expectedAnswer ? <Markdown source={last.evaluation.expectedAnswer} /> : <Typography color="text.secondary">No reference answer.</Typography>}
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      {current ? (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" spacing={0.75} sx={{ mb: 1.5 }} useFlexGap flexWrap="wrap">
            <Chip size="small" label={current.difficulty} color={DIFF_COLOR[current.difficulty]} variant="outlined" />
            <Chip size="small" label={current.topic} variant="outlined" />
          </Stack>
          <Typography variant="h3" component="h2" sx={{ mb: 2, lineHeight: 1.45 }}>{current.q}</Typography>
          <TextField
            multiline minRows={7} fullWidth label="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)}
            placeholder="Answer as you would out loud: the key idea first, then the details, an example and trade-offs."
            inputProps={{ maxLength: 8000 }}
            disabled={busy}
          />
          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {speech.supported && (
                <Button variant={speech.on ? 'contained' : 'outlined'} color={speech.on ? 'error' : 'primary'} startIcon={speech.on ? <MicOff /> : <Mic />} onClick={speech.toggle} disabled={busy}>
                  {speech.on ? 'Stop dictation' : 'Dictate'}
                </Button>
              )}
              <Typography variant="caption" color="text.secondary">{answer.length} / 8000</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              {answered.length > 0 && <Button onClick={finish} disabled={busy || finishing} startIcon={<FlagOutlined />}>End early</Button>}
              <Button variant="contained" onClick={submit} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <Send />}>
                {busy ? 'Scoring…' : answer.trim() ? 'Submit answer' : 'Skip question'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <AssessmentOutlined color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h3" component="p" sx={{ my: 1 }}>That was the last question</Typography>
          <Button variant="contained" size="large" onClick={finish} disabled={finishing} startIcon={finishing ? <CircularProgress size={16} color="inherit" /> : <AssessmentOutlined />}>
            {finishing ? 'Writing your report…' : 'Get my report'}
          </Button>
        </Paper>
      )}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete this interview?</DialogTitle>
        <DialogContent><DialogContentText>Its answers and scores are removed from your history. This can't be undone.</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setConfirmDelete(false)}>Cancel</Button><Button color="error" onClick={remove}>Delete</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}

// ---------------------------------------------------------------- report

function Report({ session }) {
  const r = session.report;
  const history = useApi('/interview/sessions');
  const previous = (history.data || []).filter((h) => h.status === 'completed' && h.category === session.category && h.id !== session.id && h.createdAt < session.createdAt);
  const prev = previous[0];
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h2" component="h1">{session.category} interview report</Typography>
        <Typography color="text.secondary">{new Date(session.completedAt || session.createdAt).toLocaleString()} · {session.difficulty} · {session.items.length} answered{r.skipped ? `, ${r.skipped} not reached` : ''}</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress variant="determinate" value={100} size={140} thickness={4} sx={{ color: 'action.hover', position: 'absolute' }} />
              <CircularProgress variant="determinate" value={r.overall} size={140} thickness={4} color={tone(r.overall)} aria-label={`Overall score ${r.overall} out of 100`} />
              <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                <Box><Typography variant="h1" component="p">{r.overall}</Typography><Typography variant="caption" color="text.secondary">out of 100</Typography></Box>
              </Box>
            </Box>
            {prev && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Previous {session.category} interview: {prev.overall} ({r.overall - prev.overall >= 0 ? '+' : ''}{r.overall - prev.overall})</Typography>}
            {r.method !== 'ai' && <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>Computed without the AI coach, so strengths and weaknesses come from the per-question notes.</Alert>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Typography variant="h4" component="h2" sx={{ mb: 2 }}>By skill</Typography>
            <Stack spacing={1.5}>
              {Object.entries(LABELS).map(([k, label]) => (
                <Box key={k}>
                  <Stack direction="row" justifyContent="space-between"><Typography variant="body2">{label}</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{r.byCriterion[k]}</Typography></Stack>
                  <LinearProgress variant="determinate" value={r.byCriterion[k]} color={tone(r.byCriterion[k])} aria-label={`${label} ${r.byCriterion[k]} out of 100`} />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h4" component="h2" sx={{ mb: 1 }}>Summary</Typography>
        <Typography>{r.summary}</Typography>
      </Paper>

      <Grid container spacing={2}>
        <ListCard title="Strengths" icon={CheckCircleOutline} color="success" items={r.strengths} empty="No clear strengths noted yet." />
        <ListCard title="To improve" icon={ErrorOutline} color="warning" items={r.weaknesses} empty="Nothing major to improve." />
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><TipsAndUpdatesOutlined color="primary" /><Typography variant="h4" component="h2">Study next</Typography></Stack>
            {r.recommendedTopics?.length ? (
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {r.recommendedTopics.map((t) => (
                  <Chip key={t} label={t} component={RouterLink} to={`/interview?category=${encodeURIComponent(session.category)}&search=${encodeURIComponent(t.split(/[(:,]/)[0].trim().slice(0, 40))}`} clickable color="primary" variant="outlined" />
                ))}
              </Stack>
            ) : <Typography color="text.secondary">Nothing specific: keep practising mixed questions.</Typography>}
            {r.missingConcepts?.length > 0 && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 0.75 }}>Concepts you missed</Typography>
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">{r.missingConcepts.map((m) => <Chip key={m} size="small" label={m} />)}</Stack>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Box>
        <Typography variant="h3" component="h2" sx={{ mb: 1.5 }}>Question by question</Typography>
        {session.items.map((it) => (
          <Accordion key={it.index}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <Chip size="small" label={it.evaluation?.score ?? 0} color={tone(it.evaluation?.score ?? 0)} sx={{ minWidth: 44 }} />
                <Typography sx={{ fontWeight: 500 }}>{it.index + 1}. {it.q}</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="overline" color="text.secondary">Your answer</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{it.answer || <em>No answer given.</em>}</Typography>
              <Typography variant="overline" color="text.secondary">Feedback</Typography>
              <Typography sx={{ mb: 1 }}>{it.evaluation?.feedback}</Typography>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                {Object.entries(LABELS).map(([k, l]) => <Chip key={k} size="small" variant="outlined" label={`${l}: ${it.evaluation?.scores?.[k] ?? 0}/10`} />)}
              </Stack>
              {it.evaluation?.missingConcepts?.length > 0 && <Typography variant="body2" sx={{ mb: 2 }}><strong>Missing:</strong> {it.evaluation.missingConcepts.join(', ')}</Typography>}
              <Typography variant="overline" color="text.secondary">Expected answer</Typography>
              {it.evaluation?.expectedAnswer ? <Markdown source={it.evaluation.expectedAnswer} /> : <Typography color="text.secondary">No reference answer.</Typography>}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" component={RouterLink} to="/interview/ai">New interview</Button>
        <Button component={RouterLink} to={`/interview?category=${encodeURIComponent(session.category)}`}>Study {session.category}</Button>
      </Stack>
    </Stack>
  );
}

function ListCard({ title, icon: Icon, color, items, empty }) {
  return (
    <Grid item xs={12} md={4}>
      <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><Icon color={color} /><Typography variant="h4" component="h2">{title}</Typography></Stack>
        {items?.length ? (
          <List dense disablePadding>
            {items.map((s) => <ListItem key={s} disableGutters sx={{ alignItems: 'flex-start' }}><ListItemIcon sx={{ minWidth: 20, mt: '9px' }}><Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: `${color}.main` }} /></ListItemIcon><ListItemText primary={s} /></ListItem>)}
          </List>
        ) : <Typography color="text.secondary">{empty}</Typography>}
      </Paper>
    </Grid>
  );
}
