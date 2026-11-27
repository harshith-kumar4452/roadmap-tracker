import { useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Box, Button, Card, CardActionArea, CardContent, Checkbox, FormControl, Grid, InputAdornment, InputLabel, MenuItem, Paper, Select,
  Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography, Chip, Link,
} from '@mui/material';
import MapOutlined from '@mui/icons-material/MapOutlined';
import Search from '@mui/icons-material/Search';
import Add from '@mui/icons-material/Add';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { PageHeader, Loading, ErrorState, EmptyState, pct, plural } from '../components/common.jsx';
import RoadmapCard, { Bar } from '../components/RoadmapCard.jsx';
import NotFound from './NotFound.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useApi, useLocalStorage, isoDay, addDays } from '../lib/hooks.js';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';
import { bundleRoadmaps, activity, SORTERS, rmStatus, JOB_ROLES, ROADMAP_GROUPS, safeUrl } from '../lib/roadmaps.js';

export default function Roadmaps() {
  const { admin } = useAuth();
  const list = useApi('/roadmaps', { topics: ['roadmaps'] });
  const stats = useApi('/stats', { topics: ['roadmaps'] });
  const [mode, setMode] = useLocalStorage('rt:rm-mode', 'subject');
  const [status, setStatus] = useLocalStorage('rt:rm-status', 'all');
  const [sort, setSort] = useLocalStorage('rt:sort', 'recent');
  const [q, setQ] = useState('');

  const bundled = useMemo(() => bundleRoadmaps(list.data || []), [list.data]);
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!list.data || !stats.data) return <Loading />;
  if (!list.data.length) {
    return <EmptyState icon={MapOutlined} title="No roadmaps yet" text={admin ? 'Paste one in or start a blank one.' : 'Log in to add roadmaps.'} action={<Button variant="contained" component={RouterLink} to={admin ? '/import' : '/login'}>{admin ? 'Add roadmaps' : 'Log in'}</Button>} />;
  }
  const act = activity(stats.data.doneAt);
  const active = list.data.filter((r) => r.next && r.lastDoneAt).sort(SORTERS.recent).slice(0, 3);
  const cont = active.length ? active : list.data.filter((r) => r.next).sort(SORTERS.progress).slice(0, 3);
  const hour = new Date().getHours();
  const rows = bundled
    .filter((r) => status === 'all' || rmStatus(r) === status)
    .filter((r) => !q.trim() || (r.searchText || r.title.toLowerCase()).includes(q.trim().toLowerCase()))
    .sort(SORTERS[sort] || SORTERS.recent);

  return (
    <Stack spacing={4}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ md: 'center' }}>
          <Box>
            <Typography variant="overline" color="text.secondary">{hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}</Typography>
            <Typography variant="h1">{stats.data.done} of {plural(stats.data.total, 'topic')} done</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>{plural(list.data.length, 'roadmap')} · {pct(stats.data.done, stats.data.total)}% overall</Typography>
          </Box>
          <Stack direction="row" spacing={{ xs: 3, sm: 5 }}>
            {[['Today', act.today], ['This week', act.week], ['Day streak', act.streak]].map(([l, v]) => (
              <Box key={l}><Typography variant="body2" color="text.secondary">{l}</Typography><Typography variant="h1" component="p">{v}</Typography></Box>
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
          <Typography variant="h3" component="h2">Activity</Typography>
          <Typography variant="caption" color="text.secondary">Topics finished, last 26 weeks</Typography>
        </Stack>
        <ActivityHeatmap counts={act.counts} />
      </Paper>

      {cont.length > 0 && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1.5 }}>{active.length ? 'Pick up where you left off' : 'Start here'}</Typography>
          <Grid container spacing={2}>{cont.map((r) => <Grid item xs={12} md={4} key={r.id}><ContinueCard r={r} /></Grid>)}</Grid>
        </Box>
      )}

      <Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h2">Explore roadmaps</Typography>
            <Typography variant="body2" color="text.secondary">{mode === 'role' ? 'Pick a job role to see its roadmaps, resources, interview patterns and playground.' : `Showing ${rows.length} of ${bundled.length} subject cards (${list.data.length} roadmaps).`}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)} aria-label="Browse by">
              <ToggleButton value="subject">By subject</ToggleButton><ToggleButton value="role">By role</ToggleButton>
            </ToggleButtonGroup>
            {admin && <Button size="small" startIcon={<Add />} component={RouterLink} to="/import">Add</Button>}
          </Stack>
        </Stack>
        {mode === 'role' ? <RoleGrid list={list.data} /> : (
          <>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }} justifyContent="space-between">
              <ToggleButtonGroup size="small" exclusive value={status} onChange={(_, v) => v && setStatus(v)} aria-label="Filter by status" sx={{ flexWrap: 'wrap' }}>
                <ToggleButton value="all">All</ToggleButton><ToggleButton value="in_progress">In progress</ToggleButton>
                <ToggleButton value="not_started">Not started</ToggleButton><ToggleButton value="done">Done</ToggleButton>
              </ToggleButtonGroup>
              <Stack direction="row" spacing={1}>
                <TextField placeholder="Filter roadmaps" value={q} onChange={(e) => setQ(e.target.value)} inputProps={{ 'aria-label': 'Filter roadmaps' }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} sx={{ flex: 1 }} />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="sort">Sort</InputLabel>
                  <Select labelId="sort" label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                    <MenuItem value="recent">Recently active</MenuItem><MenuItem value="progress">Most progress</MenuItem>
                    <MenuItem value="least">Least progress</MenuItem><MenuItem value="name">Name</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
            {rows.length ? <Grid container spacing={2}>{rows.map((r) => <Grid item xs={12} sm={6} lg={4} key={r.id || r.slug}><RoadmapCard r={r} /></Grid>)}</Grid>
              : <Typography color="text.secondary">No roadmaps match those filters.</Typography>}
          </>
        )}
      </Box>
    </Stack>
  );
}

export function ActivityHeatmap({ counts, weeks = 26 }) {
  const today = isoDay();
  const start = addDays(today, -((weeks - 1) * 7) - new Date(`${today}T12:00`).getDay());
  const days = [];
  for (let d = start; d <= today; d = addDays(d, 1)) days.push(d);
  const max = Math.max(1, ...counts.values());
  const active = days.filter((d) => counts.get(d)).length;
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box role="img" aria-label={`Activity over the last ${weeks} weeks: active on ${plural(active, 'day')}`}
        sx={{ display: 'grid', gridTemplateRows: 'repeat(7, 13px)', gridAutoFlow: 'column', gridAutoColumns: '13px', gap: '3px', width: 'max-content' }}>
        {days.map((d) => {
          const c = counts.get(d) ?? 0;
          const level = c === 0 ? 0 : Math.min(4, Math.ceil((c / max) * 4));
          return (
            <Tooltip key={d} title={`${plural(c, 'topic')} on ${new Date(`${d}T12:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`}>
              <Box sx={{ width: 13, height: 13, borderRadius: '3px', bgcolor: level ? 'primary.main' : 'action.hover', opacity: level ? 0.25 + level * 0.19 : 1 }} />
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}

function ContinueCard({ r }) {
  const { admin } = useAuth();
  const notify = useNotify();
  const tick = async () => {
    try { await api(`/items/${r.next.id}`, { method: 'PATCH', body: { status: 'done' } }); changed('roadmaps'); notify(`Done: ${r.next.title}`); } catch (e) { notify(e.message, 'error'); }
  };
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Link component={RouterLink} to={`/r/${r.id}`} underline="hover" color="inherit"><Typography variant="h4" component="h3">{r.title}</Typography></Link>
          <Typography variant="caption" color="text.secondary">{r.done}/{r.total}</Typography>
        </Stack>
        <Bar done={r.done} total={r.total} sx={{ my: 1.5 }} />
        <Stack direction="row" spacing={1} alignItems="flex-start">
          {admin && <Checkbox onChange={tick} sx={{ p: 0.5 }} inputProps={{ 'aria-label': `Mark done: ${r.next.title}` }} />}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4, display: 'block' }}>Up next · {r.next.section}</Typography>
            {safeUrl(r.next.url) ? <Link href={r.next.url} target="_blank" rel="noopener noreferrer" underline="hover">{r.next.title}</Link> : <Typography>{r.next.title}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function RoleGrid({ list }) {
  return (
    <Grid container spacing={2}>
      {JOB_ROLES.map((role) => {
        const items = list.filter((r) => role.match.test(r.title));
        const done = items.reduce((n, r) => n + r.done, 0);
        const total = items.reduce((n, r) => n + r.total, 0);
        return (
          <Grid item xs={12} sm={6} lg={4} key={role.id}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea component={RouterLink} to={`/role/${role.id}`} sx={{ height: '100%', alignItems: 'stretch' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, height: '100%' }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center"><role.icon color="primary" /><Typography variant="h4" component="h3">{role.label}</Typography></Stack>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.secondary">{pct(done, total)}%</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{role.desc}</Typography>
                  <Bar done={done} total={total} />
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    <Chip size="small" label={plural(items.length, 'roadmap')} color="primary" variant="outlined" />
                    <Chip size="small" label={`${done} / ${total} topics`} variant="outlined" />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

export function RoadmapGroup() {
  const { id } = useParams();
  const grp = ROADMAP_GROUPS.find((g) => g.slug === id);
  const list = useApi('/roadmaps', { topics: ['roadmaps'] });
  if (!grp) return <NotFound />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (!list.data) return <Loading />;
  const items = list.data.filter((r) => grp.match.test(r.title)).sort((a, b) => a.title.localeCompare(b.title));
  if (!items.length) return <NotFound />;
  const done = items.reduce((n, r) => n + r.done, 0);
  const total = items.reduce((n, r) => n + r.total, 0);
  return (
    <>
      <Button component={RouterLink} to="/roadmaps" startIcon={<ArrowBack />} sx={{ mb: 2 }}>All roadmaps</Button>
      <PageHeader title={grp.title} icon={grp.icon} subtitle={grp.desc} />
      <Box sx={{ mb: 3 }}>
        <Bar done={done} total={total} height={10} />
        <Typography sx={{ mt: 1 }}><strong>{pct(done, total)}%</strong> <Typography component="span" color="text.secondary">· {done} of {plural(total, 'topic')} done across {plural(items.length, 'roadmap')}</Typography></Typography>
      </Box>
      <Grid container spacing={2}>{items.map((r) => <Grid item xs={12} sm={6} lg={4} key={r.id}><RoadmapCard r={r} /></Grid>)}</Grid>
    </>
  );
}
