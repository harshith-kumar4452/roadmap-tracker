import { Box, Button, CircularProgress, Paper, Skeleton, Stack, Typography, Alert } from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { markdown } from '../lib/render.js';

export function PageHeader({ title, subtitle, icon: Icon, actions, children }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" sx={{ mb: 3 }}>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          {Icon && <Icon color="primary" sx={{ fontSize: 30 }} />}
          <Typography variant="h1" component="h1">{title}</Typography>
        </Stack>
        {subtitle && <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 720 }}>{subtitle}</Typography>}
        {children}
      </Box>
      {actions && <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap', gap: 1 }}>{actions}</Stack>}
    </Stack>
  );
}

export function Loading({ label = 'Loading', rows = 4 }) {
  return (
    <Stack spacing={1.5} aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} variant="rounded" height={i ? 56 : 80} />)}
    </Stack>
  );
}

export function Spinner({ label }) {
  return (
    <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }} aria-live="polite">
      <CircularProgress size={28} />
      {label && <Typography color="text.secondary">{label}</Typography>}
    </Stack>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <Alert severity="error" action={onRetry && <Button color="inherit" size="small" onClick={() => onRetry()}>Try again</Button>}>
      {error?.message || String(error)}
    </Alert>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
      {Icon && <Icon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />}
      <Typography variant="h4" component="p">{title}</Typography>
      {text && <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 460, mx: 'auto' }}>{text}</Typography>}
      {action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
    </Paper>
  );
}

export function LoginRequired({ what = 'this page' }) {
  const loc = useLocation();
  return (
    <EmptyState
      icon={LockOutlined}
      title={`Log in to open ${what}`}
      text="You can browse the roadmap list freely. Everything else needs an account."
      action={(
        <Stack direction="row" spacing={1} justifyContent="center">
          <Button variant="contained" component={RouterLink} to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`}>Log in</Button>
          <Button variant="outlined" component={RouterLink} to="/signup">Create account</Button>
        </Stack>
      )}
    />
  );
}

// Renders trusted-renderer Markdown: render.js escapes every input before adding markup.
export function Markdown({ source, sx }) {
  return (
    <Box
      className="md"
      sx={{
        lineHeight: 1.65,
        '& p': { my: 1 },
        '& pre': { bgcolor: 'action.hover', p: 1.5, borderRadius: 1.5, overflowX: 'auto', fontSize: '0.85rem' },
        '& code': { fontSize: '0.88em', bgcolor: 'action.hover', px: 0.5, py: 0.1, borderRadius: 0.75 },
        '& pre code': { bgcolor: 'transparent', p: 0 },
        '& table': { borderCollapse: 'collapse', my: 1.5, display: 'block', overflowX: 'auto', maxWidth: '100%' },
        '& th, & td': { border: 1, borderColor: 'divider', px: 1.25, py: 0.75, textAlign: 'left', verticalAlign: 'top' },
        '& th': { bgcolor: 'action.hover', fontWeight: 600 },
        '& ul, & ol': { pl: 3, my: 1 },
        '& a': { color: 'primary.main' },
        '& h1, & h2, & h3, & h4': { mt: 2, mb: 1, lineHeight: 1.3 },
        '& blockquote': { borderLeft: 3, borderColor: 'divider', m: 0, pl: 2, color: 'text.secondary' },
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: markdown(source || '') }}
    />
  );
}

export const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);
export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
