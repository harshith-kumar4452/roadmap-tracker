import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Avatar, Box, Button, Card, CardActionArea, CardContent, Chip, Grid, LinearProgress, Link, Paper, Stack, TextField, Typography,
} from '@mui/material';
import PersonOutline from '@mui/icons-material/PersonOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import LinkedIn from '@mui/icons-material/LinkedIn';
import GitHub from '@mui/icons-material/GitHub';
import LanguageOutlined from '@mui/icons-material/LanguageOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import OpenInNew from '@mui/icons-material/OpenInNew';
import { Loading, ErrorState, LoginRequired, EmptyState, pct } from '../components/common.jsx';
import { Bar } from '../components/RoadmapCard.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useApi, isoDay, addDays } from '../lib/hooks.js';
import { api, changed } from '../lib/api.js';
import { useNotify } from '../lib/notify.jsx';
import { safeUrl, ago, SORTERS } from '../lib/roadmaps.js';
import { routineState } from '../lib/tasks.js';

const PLATFORMS = {
  leetcode: { short: 'LC', color: '#f59e0b' }, github: { short: 'GH', color: '#6e7681' }, codechef: { short: 'CC', color: '#7c5b3c' },
  codeforces: { short: 'CF', color: '#1f8acb' }, geeksforgeeks: { short: 'GfG', color: '#2f8d46' }, gfg: { short: 'GfG', color: '#2f8d46' },
  hackerrank: { short: 'HR', color: '#16a34a' }, atcoder: { short: 'AC', color: '#475569' }, kaggle: { short: 'K', color: '#20beff' },
};
const platformKey = (p) => String(p || '').toLowerCase().replace(/[^a-z]/g, '');
const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();

export default function Profile() {
  const { ready, admin, authenticated, me } = useAuth();
  const prof = useApi('/profile', { skip: !admin, topics: ['profile'] });
  const [editing, setEditing] = useState(false);
  if (!ready) return <Loading />;
  if (!admin) return authenticated ? <EmptyState icon={PersonOutline} title="Profile is private" text="Only the site owner can view and edit the profile." /> : <LoginRequired what="the profile" />;
  if (prof.error) return <ErrorState error={prof.error} onRetry={prof.reload} />;
  if (prof.loading && !prof.data) return <Loading />;
  if (editing || !prof.data) return <ProfileEditor p={prof.data || { name: me?.name }} onDone={() => setEditing(false)} canCancel={Boolean(prof.data)} />;
  return <ProfileView p={prof.data} onEdit={() => setEditing(true)} />;
}

function ProfileView({ p, onEdit }) {
  const stats = useApi('/stats');
  const routine = useApi(`/habits?since=${addDays(isoDay(), -120)}`);
  const list = useApi('/roadmaps');
  const live = useApi('/profile/stats');
  const st = routine.data ? routineState(routine.data) : null;
  const lc = live.data?.leetcode;
  const c = p.contact || {};
  const contacts = [
    c.email && { icon: EmailOutlined, href: `mailto:${c.email}`, label: c.email },
    c.phone && { icon: PhoneOutlined, href: `tel:${c.phone.replace(/[^+\d]/g, '')}`, label: c.phone },
    safeUrl(c.linkedin) && { icon: LinkedIn, href: c.linkedin, label: 'LinkedIn', ext: true },
    safeUrl(c.github) && { icon: GitHub, href: c.github, label: 'GitHub', ext: true },
    safeUrl(c.portfolio) && { icon: LanguageOutlined, href: c.portfolio, label: 'Portfolio', ext: true },
    safeUrl(c.resume) && { icon: DownloadOutlined, href: c.resume, label: 'Resume', ext: true, primary: true },
  ].filter(Boolean);
  const active = (list.data || []).filter((r) => r.done > 0 && r.done < r.total).sort(SORTERS.recent).slice(0, 4);
  const statText = (key) => {
    if (key === 'leetcode' && lc) return `${lc.solved.all} solved${lc.contest ? ` · ${lc.contest.rating} rating` : ''}`;
    if (key === 'github' && live.data?.github) return `${live.data.github.repos} repos · ${live.data.github.followers} followers`;
    if (key === 'codeforces' && live.data?.codeforces) return live.data.codeforces.rating ? `${live.data.codeforces.rating} · ${live.data.codeforces.rank}` : 'Unrated';
    return '';
  };

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
          <Avatar src={safeUrl(p.avatar) || undefined} alt={`Photo of ${p.name}`} sx={{ width: 112, height: 112, fontSize: 36, bgcolor: 'primary.main' }}>{initials(p.name)}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {p.openTo && <Chip size="small" color="success" variant="outlined" label={`Open to ${p.openTo}`} sx={{ mb: 1 }} />}
            <Typography variant="h1">{p.name}</Typography>
            {p.headline && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{p.headline}</Typography>}
            {p.location && <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }}><PlaceOutlined fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{p.location}</Typography></Stack>}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
              {contacts.map((x) => <Button key={x.label} size="small" variant={x.primary ? 'contained' : 'outlined'} startIcon={<x.icon />} href={x.href} {...(x.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{x.label}</Button>)}
            </Stack>
          </Box>
          <Button startIcon={<EditOutlined />} onClick={onEdit} sx={{ alignSelf: 'flex-start' }}>Edit profile</Button>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {[
          ['LeetCode solved', lc ? lc.solved.all ?? 0 : '–', lc ? 'problems' : ''],
          ['Contest rating', lc?.contest ? lc.contest.rating : '–', lc?.contest ? `top ${lc.contest.topPercent}%` : ''],
          ['Hub topics done', stats.data ? stats.data.done : '–', stats.data ? `of ${stats.data.total.toLocaleString()}` : ''],
          ['Best routine streak', st ? Math.max(0, ...routine.data.habits.map(st.streak)) : '–', 'days'],
        ].map(([l, v, sub]) => (
          <Grid item xs={6} md={3} key={l}><Card sx={{ height: '100%' }}><CardContent>
            <Typography variant="body2" color="text.secondary">{l}</Typography>
            <Typography variant="h1" component="p">{v} <Typography component="span" variant="body2" color="text.secondary">{sub}</Typography></Typography>
          </CardContent></Card></Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            {p.bio && <Paper variant="outlined" sx={{ p: 2.5 }}><Typography variant="h3" component="h2" sx={{ mb: 1 }}>About</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{p.bio}</Typography></Paper>}
            {p.coding?.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}><Typography variant="h3" component="h2">Coding profiles</Typography>{live.data?.fetchedAt && <Typography variant="caption" color="text.secondary">Live stats · updated {ago(live.data.fetchedAt)}</Typography>}</Stack>
                <Grid container spacing={1.5}>
                  {p.coding.map((x) => {
                    const key = platformKey(x.platform);
                    const pf = PLATFORMS[key] || { short: initials(x.platform), color: '#0f766e' };
                    const url = safeUrl(x.url);
                    const inner = (
                      <CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, color: '#fff', bgcolor: pf.color, flexShrink: 0 }}>{pf.short}</Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontWeight: 600 }}>{x.platform}</Typography>
                          <Typography variant="caption" color="text.secondary" component="div">{x.username ? `@${x.username}` : 'Profile'}</Typography>
                          {statText(key) && <Typography variant="caption" component="div">{statText(key)}</Typography>}
                        </Box>
                        {url && <OpenInNew fontSize="small" color="action" />}
                      </CardContent>
                    );
                    return <Grid item xs={12} sm={6} key={x.platform + x.username}><Card>{url ? <CardActionArea component="a" href={url} target="_blank" rel="noopener noreferrer">{inner}</CardActionArea> : inner}</Card></Grid>;
                  })}
                </Grid>
                {lc && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="overline" color="text.secondary">LeetCode by difficulty</Typography>
                    {[['easy', 'Easy', 'success'], ['medium', 'Medium', 'warning'], ['hard', 'Hard', 'error']].map(([k, l, color]) => (
                      <Stack key={k} direction="row" spacing={1.5} alignItems="center" sx={{ my: 0.5 }}>
                        <Typography variant="body2" sx={{ width: 64 }}>{l}</Typography>
                        <LinearProgress variant="determinate" value={pct(lc.solved[k] || 0, lc.total[k] || 1)} color={color} sx={{ flex: 1 }} />
                        <Typography variant="body2" sx={{ width: 90, textAlign: 'right' }}><strong>{lc.solved[k] || 0}</strong><Typography component="span" variant="body2" color="text.secondary">/{lc.total[k] || '?'}</Typography></Typography>
                      </Stack>
                    ))}
                  </Box>
                )}
              </Paper>
            )}
            {p.skills?.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="h3" component="h2" sx={{ mb: 1.5 }}>Skills</Typography>
                {p.skills.map((s) => (
                  <Box key={s.group} sx={{ mb: 1.5 }}>
                    <Typography variant="overline" color="text.secondary">{s.group}</Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">{s.items.map((x) => <Chip key={x} label={x} size="small" variant="outlined" />)}</Stack>
                  </Box>
                ))}
              </Paper>
            )}
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            {p.education?.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="h3" component="h2" sx={{ mb: 1.5 }}>Education</Typography>
                <Stack spacing={2}>
                  {p.education.map((e) => (
                    <Stack key={e.school + e.when} direction="row" spacing={1.5}>
                      <SchoolOutlined color="primary" sx={{ mt: 0.25 }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">{e.when}</Typography>
                        <Typography sx={{ fontWeight: 600 }}>{e.school}</Typography>
                        {e.degree && <Typography variant="body2" color="text.secondary">{e.degree}</Typography>}
                        {e.score && <Chip size="small" color="success" variant="outlined" label={e.score} sx={{ mt: 0.5 }} />}
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            )}
            {p.achievements?.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="h3" component="h2" sx={{ mb: 1.5 }}>Achievements</Typography>
                <Stack spacing={1.5}>
                  {p.achievements.map((a) => (
                    <Stack key={a.title} direction="row" spacing={1.5} alignItems="flex-start">
                      <EmojiEventsOutlined color="warning" />
                      <Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 600 }}>{a.title}</Typography>{a.detail && <Typography variant="body2" color="text.secondary">{a.detail}</Typography>}</Box>
                      {a.when && <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{a.when}</Typography>}
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            )}
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}><Typography variant="h3" component="h2">Learning now</Typography><Button size="small" component={RouterLink} to="/roadmaps">All roadmaps</Button></Stack>
              {!list.data ? <Loading rows={2} /> : active.length ? (
                <Stack spacing={1.5}>
                  {active.map((r) => (
                    <Link key={r.id} component={RouterLink} to={`/r/${r.id}`} underline="none" color="inherit">
                      <Stack direction="row" justifyContent="space-between"><Typography variant="body2" sx={{ fontWeight: 500 }}>{r.title}</Typography><Typography variant="caption" color="text.secondary">{r.done}/{r.total}</Typography></Stack>
                      <Bar done={r.done} total={r.total} />
                    </Link>
                  ))}
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">No roadmap started yet.</Typography>}
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}

const lines = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean);
const fields = (l) => l.split(/\s*\|\s*/);

function ProfileEditor({ p, onDone, canCancel }) {
  const notify = useNotify();
  const c = p.contact || {};
  const [f, setF] = useState({
    name: p.name || '', headline: p.headline || '', location: p.location || '', openTo: p.openTo || '', avatar: p.avatar || '', bio: p.bio || '',
    email: c.email || '', phone: c.phone || '', linkedin: c.linkedin || '', github: c.github || '', portfolio: c.portfolio || '', resume: c.resume || '',
    coding: (p.coding || []).map((x) => [x.platform, x.username, x.url].join(' | ')).join('\n'),
    education: (p.education || []).map((e) => [e.school, e.degree, e.when, e.score].join(' | ')).join('\n'),
    skills: (p.skills || []).map((s) => `${s.group}: ${s.items.join(', ')}`).join('\n'),
    achievements: (p.achievements || []).map((a) => [a.title, a.detail, a.when].join(' | ')).join('\n'),
  });
  const set = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  const save = async (e) => {
    e.preventDefault();
    const body = {
      name: f.name, headline: f.headline, location: f.location, openTo: f.openTo, avatar: f.avatar, bio: f.bio,
      contact: { email: f.email, phone: f.phone, linkedin: f.linkedin, github: f.github, portfolio: f.portfolio, resume: f.resume },
      coding: lines(f.coding).map(fields).map(([platform, username = '', url = '']) => ({ platform, username, url })),
      education: lines(f.education).map(fields).map(([school, degree = '', when = '', score = '']) => ({ school, degree, when, score })),
      skills: lines(f.skills).map((l) => { const i = l.indexOf(':'); return i < 0 ? { group: 'Skills', items: l.split(',').map((x) => x.trim()).filter(Boolean) } : { group: l.slice(0, i).trim(), items: l.slice(i + 1).split(',').map((x) => x.trim()).filter(Boolean) }; }).filter((s) => s.items.length),
      achievements: lines(f.achievements).map(fields).map(([title, detail = '', when = '']) => ({ title, detail, when })),
    };
    try { await api('/profile', { method: 'PUT', body }); changed('profile'); notify('Profile saved'); onDone(); } catch (x) { notify(x.message, 'error'); }
  };
  const mono = { '& textarea': { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 13 } };
  return (
    <Paper variant="outlined" component="form" onSubmit={save} sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h2" sx={{ mb: 2 }}>{p.headline || p.bio ? 'Edit profile' : 'Set up your profile'}</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><TextField fullWidth label="Full name" required autoComplete="name" inputProps={{ maxLength: 100 }} {...set('name')} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth label="Headline" placeholder="Full-stack developer · B.Tech CSE" inputProps={{ maxLength: 160 }} {...set('headline')} /></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth label="Location" inputProps={{ maxLength: 100 }} {...set('location')} /></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth label="Open to" placeholder="SWE internships & roles" inputProps={{ maxLength: 120 }} {...set('openTo')} /></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth label="Photo URL" type="url" {...set('avatar')} /></Grid>
        <Grid item xs={12}><TextField fullWidth label="About" multiline minRows={3} inputProps={{ maxLength: 2000 }} {...set('bio')} /></Grid>
        <Grid item xs={12}><Typography variant="h4" component="h3">Contact</Typography></Grid>
        {[['email', 'Email', 'email'], ['phone', 'Phone', 'tel'], ['linkedin', 'LinkedIn URL', 'url'], ['github', 'GitHub URL', 'url'], ['portfolio', 'Portfolio URL', 'url'], ['resume', 'Resume URL', 'url']].map(([k, l, type]) => (
          <Grid item xs={12} sm={6} md={4} key={k}><TextField fullWidth label={l} type={type} {...set(k)} /></Grid>
        ))}
        <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Coding profiles" helperText="One per line: Platform | username | profile URL. LeetCode, GitHub and Codeforces show live stats." sx={mono} {...set('coding')} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth multiline minRows={3} label="Education" helperText="School | Degree | Dates | Score" sx={mono} {...set('education')} /></Grid>
        <Grid item xs={12} md={6}><TextField fullWidth multiline minRows={3} label="Skills" helperText="Group: skill, skill, skill" sx={mono} {...set('skills')} /></Grid>
        <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Achievements" helperText="Title | Detail | Date" sx={mono} {...set('achievements')} /></Grid>
      </Grid>
      <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}><Button type="submit" variant="contained">Save profile</Button>{canCancel && <Button onClick={onDone}>Cancel</Button>}</Stack>
    </Paper>
  );
}
