import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import PersonAddAlt1Outlined from '@mui/icons-material/PersonAddAlt1Outlined';
import { useAuth } from '../lib/auth.jsx';

// Only in-app paths: no protocol-relative (//) or backslash tricks.
const safeNext = (n) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') && !n.includes('\\') ? n : '/');

function Shell({ icon: Icon, title, subtitle, children }) {
  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', mt: { xs: 2, sm: 6 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack alignItems="center" spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
          <Icon color="primary" sx={{ fontSize: 36 }} />
          <Typography variant="h2" component="h1">{title}</Typography>
          {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
        </Stack>
        {children}
      </Paper>
    </Box>
  );
}

export function Login() {
  const { login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await login(form.username, form.password); navigate(safeNext(params.get('next'))); } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Shell icon={LoginOutlined} title="Log in" subtitle="Open your roadmaps, interview prep and plans.">
      <Stack component="form" spacing={2} onSubmit={submit}>
        {err && <Alert severity="error">{err}</Alert>}
        <TextField label="Username" autoComplete="username" required autoFocus value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} size="medium" />
        <TextField label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} size="medium" />
        <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</Button>
        <Typography variant="body2" color="text.secondary" textAlign="center">No account? <Link component={RouterLink} to="/signup">Create one</Link></Typography>
      </Stack>
    </Shell>
  );
}

export function Signup() {
  const { signup, me } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', password: '', setupKey: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const owner = me && !me.hasAccount;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await signup({ ...form, setupKey: owner ? form.setupKey : undefined }); navigate('/'); } catch (x) { setErr(x.message); setBusy(false); }
  };
  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  return (
    <Shell icon={PersonAddAlt1Outlined} title="Create account" subtitle={owner ? 'Set up the owner account with your setup key.' : 'Members can open every roadmap, page and question.'}>
      <Stack component="form" spacing={2} onSubmit={submit}>
        {err && <Alert severity="error">{err}</Alert>}
        <TextField label="Name" required autoComplete="name" {...f('name')} size="medium" />
        <TextField label="Username" required autoComplete="username" helperText="3–40 letters, numbers, dots, dashes or underscores" inputProps={{ pattern: '[A-Za-z0-9._-]{3,40}' }} {...f('username')} size="medium" />
        <TextField label="Password" type="password" required autoComplete="new-password" helperText="At least 8 characters" inputProps={{ minLength: 8 }} {...f('password')} size="medium" />
        {owner && <TextField label="Setup key" type="password" required helperText="The ADMIN_PASSWORD set on the server" {...f('setupKey')} size="medium" />}
        <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Button>
        <Typography variant="body2" color="text.secondary" textAlign="center">Already have one? <Link component={RouterLink} to="/login">Log in</Link></Typography>
      </Stack>
    </Shell>
  );
}
