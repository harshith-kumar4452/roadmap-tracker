import { useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardActionArea, CardContent, Grid, Paper, Stack, Tooltip, Typography } from '@mui/material';
import MapOutlined from '@mui/icons-material/MapOutlined';
import QuestionAnswerOutlined from '@mui/icons-material/QuestionAnswerOutlined';
import CodeOutlined from '@mui/icons-material/CodeOutlined';
import ChecklistOutlined from '@mui/icons-material/ChecklistOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import WorkOutline from '@mui/icons-material/WorkOutline';
import LayersOutlined from '@mui/icons-material/LayersOutlined';
import RuleOutlined from '@mui/icons-material/RuleOutlined';
import LocalFireDepartmentOutlined from '@mui/icons-material/LocalFireDepartmentOutlined';
import HubOutlined from '@mui/icons-material/HubOutlined';
import { Loading, ErrorState, pct, plural } from '../components/common.jsx';
import TodayWidget from '../components/TodayWidget.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useApi, isoDay, addDays } from '../lib/hooks.js';
import { activity } from '../lib/roadmaps.js';
import { routineState, DAY_NAMES } from '../lib/tasks.js';
import { G, CHIPS, fieldX } from '../data/floaters.js';
import { startTour, tourSeen } from '../lib/tour.js';

const STORY = [
  { icon: LayersOutlined, label: 'The problem', title: 'Dozens of scattered Notion pages, one quiet place', text: 'Playlists, articles, practice sets and checkboxes used to live across dozens of tabs. Now every roadmap sits in one structured hub.' },
  { icon: RuleOutlined, label: 'The system', title: 'Three-step progress on every topic', text: 'Move a topic from Not started to In progress to Done, tag its difficulty, and keep private notes right next to the link.' },
  { icon: LocalFireDepartmentOutlined, label: 'Consistency', title: 'Daily problems and weekly contests, tracked', text: 'A daily coding pick, your POTD routine and contests sit in streak grids, so momentum stays visible.' },
  { icon: HubOutlined, label: 'The big picture', title: 'Interview prep, plans and notes together', text: 'Practise with an AI interviewer, turn a study plan into calendar events, and keep cheat sheets and mind maps close.' },
];

export function tourSteps({ admin, hasAccount, phone }) {
  return [
    { target: null, title: 'Welcome to your learning hub', text: 'Roadmaps, interview prep, daily coding, your routine and your notes, all in one place. This takes about 30 seconds.' },
    { target: '[data-tour="stats"]', title: 'Progress at a glance', text: "Topics finished across every roadmap, your learning streak, and how today's routine is going." },
    { target: '[data-tour="routine"]', title: 'Daily practice routine', text: "Your POTDs and contests. Filled squares are days done; streaks skip days that aren't scheduled." },
    { target: '[data-tour="sections"]', title: 'Everything in one place', text: 'Roadmaps, interview prep with AI mock interviews, daily coding, tasks, the calendar, resources, cheat sheets, projects and mind maps.' },
    { target: phone ? '.menu-btn' : '#site-nav', title: 'Jump between sections', text: phone ? 'Open this menu to move between sections.' : 'Move between sections from here.' },
    { target: '#auth', title: admin ? "You're logged in" : hasAccount ? 'Log in to make changes' : 'Create your account', text: admin ? 'You can tick topics, log your routine and edit every page.' : 'Anyone can look around. Logging in lets you open roadmaps and track progress.' },
    { target: '.help-btn', title: 'Replay this tour any time', text: 'Click the help button whenever you want a refresher.' },
  ];
}

export default function Home() {
  const { me, admin, authenticated, ready } = useAuth();
  const list = useApi('/roadmaps', { topics: ['roadmaps'] });
  const stats = useApi('/stats', { topics: ['roadmaps'] });
  const today = isoDay();
  const routine = useApi(`/habits?since=${addDays(today, -120)}`, { topics: ['habits'] });
  const pages = useApi('/pages/counts');
  const hero = useRef();

  // Chips lean towards the pointer a little (skipped on touch screens and with reduced motion).
  useEffect(() => {
    const el = hero.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(hover: none)').matches) return undefined;
    let frame = 0;
    const move = (e) => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { const r = el.getBoundingClientRect(); el.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3)); el.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3)); }); };
    const leave = () => { el.style.setProperty('--px', '0'); el.style.setProperty('--py', '0'); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [list.data]);

  const loaded = list.data && stats.data && routine.data;
  // First visit: start the tour once the page has rendered. The help button replays it.
  useEffect(() => {
    if (!loaded || !ready) return undefined;
    const run = () => startTour(tourSteps({ admin, hasAccount: me?.hasAccount, phone: matchMedia('(max-width: 899px)').matches }));
    window.addEventListener('rt:tour', run);
    let t;
    if (!tourSeen()) t = setTimeout(run, 900);
    return () => { window.removeEventListener('rt:tour', run); clearTimeout(t); document.querySelector('.tour-layer')?.remove(); document.documentElement.classList.remove('touring'); };
  }, [loaded, ready, admin, me?.hasAccount]);

  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!loaded) return <Loading />;
  const act = activity(stats.data.doneAt);
  const st = routineState(routine.data, today);
  const due = routine.data.habits.filter((h) => st.isDue(h, today));
  const doneToday = due.filter((h) => st.isDone(h, today)).length;
  const best = Math.max(0, ...routine.data.habits.map(st.streak));
  const first = me?.name ? me.name.split(' ')[0] : null;
  const started = list.data.filter((r) => r.done > 0).length;
  const counts = pages.data || {};

  const sections = [
    { to: '/roadmaps', icon: MapOutlined, title: 'Roadmaps', text: `${plural(list.data.length, 'roadmap')}, ${started} under way`, meta: `${pct(stats.data.done, stats.data.total)}% done` },
    { to: '/interview', icon: QuestionAnswerOutlined, title: 'Interview prep', text: 'Question bank with answers and AI mock interviews', meta: 'Learn and practise' },
    { to: '/coding', icon: CodeOutlined, title: 'Daily coding', text: 'One recommended problem a day, streaks and stats', meta: "Today's pick" },
    ...(admin ? [{ to: '/tasks', icon: ChecklistOutlined, title: 'Tasks & routine', text: 'Your to-do list, POTDs and contests', meta: due.length ? `${doneToday}/${due.length} today` : 'Nothing due' }] : []),
    ...(admin ? [{ to: '/calendar', icon: CalendarMonthOutlined, title: 'Calendar', text: 'Deadlines, study plans and Google Calendar sync', meta: 'Upload your plan' }] : []),
    { to: '/roles', icon: WorkOutline, title: 'Job roles', text: 'Roadmaps, projects and a playground for each role', meta: 'SDE, Backend, Data, AI…' },
    { to: '/resources', icon: LinkOutlined, title: 'Resources', text: 'Every course, playlist and practice site in one list', meta: 'All links' },
    { to: '/cheatsheets', icon: DescriptionOutlined, title: 'Cheat sheets', text: 'Quick-reference commands and syntax', meta: counts.cheatsheet !== undefined ? plural(counts.cheatsheet, 'sheet') : 'Library' },
    { to: '/projects', icon: BuildOutlined, title: 'Projects', text: 'Things to build and where each one stands', meta: counts.project !== undefined ? plural(counts.project, 'project') : 'Library' },
    { to: '/mindmaps', icon: AccountTreeOutlined, title: 'Mindmaps', text: 'How the topics connect', meta: counts.mindmap !== undefined ? plural(counts.mindmap, 'map') : 'Library' },
    ...(admin ? [{ to: '/profile', icon: PersonOutline, title: 'Profile', text: 'Education, skills and live coding stats', meta: 'Live LeetCode stats' }] : []),
  ];

  return (
    <Stack spacing={4}>
      <section className="landing-hero" ref={hero}>
        <Stack className="hero-copy" spacing={2}>
          <Box className="hero-eyebrow" component="p" sx={{ m: 0, typography: 'body2' }}><span className="pulse" aria-hidden="true" />{first ? `${first}'s learning hub` : 'Learning hub'}</Box>
          <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, lineHeight: 1.15 }}>
            Backend, system design, DSA and core CS, <Box component="span" sx={{ color: 'primary.main' }}>one day at a time.</Box>
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '1.05rem' }}>
            {plural(list.data.length, 'roadmap')} and {stats.data.total.toLocaleString()} topics, interview prep with an AI interviewer, a daily coding pick, and the notes that go with them.
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" component={RouterLink} to="/roadmaps">Open roadmaps</Button>
            {admin ? <Button variant="outlined" component={RouterLink} to="/tasks">Today's tasks</Button>
              : authenticated ? <Button variant="outlined" component={RouterLink} to="/interview">Interview prep</Button>
                : <Button variant="outlined" component={RouterLink} to="/login">Log in</Button>}
            <Button onClick={() => window.dispatchEvent(new Event('rt:tour'))}>Take the tour</Button>
          </Stack>
        </Stack>
        <div className="float-field" aria-hidden="true">
          {CHIPS.map((c, i) => (
            <RouterLink key={c.label} to={c.href.slice(1)} tabIndex={-1} className={`float-chip${c.mx || c.my ? '' : ' wide-only'}`}
              style={{ '--x': `${fieldX(c.x)}%`, '--y': `${c.y}%`, '--mx': `${c.mx}%`, '--my': `${c.my}%`, '--depth': c.depth, '--dur': `${c.dur}s`, '--delay': `${c.delay}s`, '--c': c.color, '--i': i }}>
              <span className="float-inner"><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: G[c.g] }} /><span>{c.label}</span></span>
            </RouterLink>
          ))}
        </div>
      </section>

      <Grid container spacing={2} data-tour="stats" component="dl" sx={{ m: 0, width: '100%' }}>
        {[['Topics done', stats.data.done, `/ ${stats.data.total.toLocaleString()}`], ['Learning streak', act.streak, act.streak === 1 ? 'day' : 'days'], ['Routine today', doneToday, `/ ${due.length}`], ['Best routine streak', best, '']].map(([l, v, s]) => (
          <Grid item xs={6} md={3} key={l} sx={{ pl: '0 !important', pr: 2, pt: '0 !important', pb: 2 }}>
            <Card sx={{ height: '100%' }}><CardContent>
              <Typography component="dt" variant="body2" color="text.secondary">{l}</Typography>
              <Typography component="dd" variant="h1" sx={{ m: 0 }}>{v} <Typography component="small" variant="body2" color="text.secondary">{s}</Typography></Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      {routine.data.habits.length > 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }} data-tour="routine">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h3" component="h2">Practice routine</Typography>
            {admin ? <Button size="small" component={RouterLink} to="/tasks">Open tasks</Button> : <Typography variant="caption" color="text.secondary">Last 14 days</Typography>}
          </Stack>
          <RoutineMini data={routine.data} st={st} today={today} />
        </Paper>
      )}

      <Box>
        <Typography variant="overline" color="text.secondary">How it works</Typography>
        <Typography variant="h2" sx={{ mb: 2 }}>From scattered playlists to steady progress</Typography>
        <Grid container spacing={2}>
          {STORY.map((s, n) => (
            <Grid item xs={12} sm={6} lg={3} key={s.title}>
              <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><s.icon color="primary" /><Typography variant="overline" color="text.secondary">{String(n + 1).padStart(2, '0')} · {s.label}</Typography></Stack>
                <Typography variant="h4" component="h3" sx={{ mb: 0.75 }}>{s.title}</Typography>
                <Typography variant="body2" color="text.secondary">{s.text}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box data-tour="sections">
        <Typography variant="h2" sx={{ mb: 2 }}>Everything here</Typography>
        <Grid container spacing={2}>
          {sections.map((s) => (
            <Grid item xs={12} sm={6} lg={4} key={s.to}>
              <Card sx={{ height: '100%' }}>
                <CardActionArea component={RouterLink} to={s.to} sx={{ height: '100%', alignItems: 'stretch' }}>
                  <CardContent sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start' }}>
                    <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'action.selected', color: 'primary.main', flexShrink: 0 }}><s.icon /></Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h4" component="h3">{s.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{s.text}</Typography>
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>{s.meta}</Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
      {admin && <TodayWidget />}
    </Stack>
  );
}

function RoutineMini({ data, st, today }) {
  const cols = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 3, '& th': { fontWeight: 500, fontSize: 11, color: 'text.secondary' } }}>
        <thead><tr><th />{cols.map((d) => <th key={d}>{DAY_NAMES[new Date(`${d}T12:00`).getDay()][0]}<br />{Number(d.slice(8))}</th>)}<th>Streak</th></tr></thead>
        <tbody>
          {data.habits.map((h) => (
            <tr key={h.id}>
              <Box component="th" sx={{ textAlign: 'left', pr: 1.5, whiteSpace: 'nowrap', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px !important', color: 'text.primary !important' }}>{h.title}</Box>
              {cols.map((d) => {
                const dueDay = st.isDue(h, d);
                const done = st.isDone(h, d);
                return (
                  <td key={d}>
                    <Tooltip title={dueDay ? `${h.title} · ${d}: ${done ? 'done' : 'not done'}` : 'Not scheduled'}>
                      <Box sx={{ width: 18, height: 18, borderRadius: 1, border: dueDay ? 1 : 0, borderColor: done ? 'primary.main' : 'divider', bgcolor: done ? 'primary.main' : dueDay ? 'transparent' : 'action.disabledBackground', opacity: dueDay ? 1 : 0.35 }} />
                    </Tooltip>
                  </td>
                );
              })}
              <td><Typography variant="body2" sx={{ pl: 1, fontWeight: 600 }}>{st.streak(h)}</Typography></td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}
