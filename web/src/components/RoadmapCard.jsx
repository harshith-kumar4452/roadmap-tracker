import { Link as RouterLink } from 'react-router-dom';
import { Card, CardActionArea, CardContent, Chip, LinearProgress, Stack, Typography, Box } from '@mui/material';
import FolderCopyOutlined from '@mui/icons-material/FolderCopyOutlined';
import { pct, plural } from './common.jsx';
import { rolesFor, ago } from '../lib/roadmaps.js';

export function Bar({ done, total, height = 6, sx }) {
  const p = pct(done, total);
  return <LinearProgress variant="determinate" value={p} color={p === 100 ? 'success' : 'primary'} sx={{ height, ...sx }} aria-label={`${p}% complete`} />;
}

export default function RoadmapCard({ r }) {
  const p = pct(r.done, r.total);
  const roles = rolesFor(r).slice(0, 2);
  return (
    <Card sx={{ height: '100%', borderColor: p === 100 ? 'success.main' : undefined }}>
      <CardActionArea component={RouterLink} to={r.isGroup ? `/g/${r.slug}` : `/r/${r.id}`} sx={{ height: '100%', alignItems: 'stretch' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
            <Typography variant="h4" component="h3" sx={{ lineHeight: 1.35 }}>{r.title}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: p === 100 ? 'success.main' : 'text.secondary', flexShrink: 0 }}>{p === 100 ? 'Done' : `${p}%`}</Typography>
          </Stack>
          <Bar done={r.done} total={r.total} />
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {r.isGroup && <Chip size="small" icon={<FolderCopyOutlined />} label={plural(r.items.length, 'roadmap')} color="primary" variant="outlined" />}
            {roles.map((ro) => <Chip key={ro.id} size="small" label={ro.label} variant="outlined" />)}
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography variant="caption" color="text.secondary">{r.done} / {plural(r.total, 'topic')}{r.inProgress ? ` · ${r.inProgress} in progress` : ''}</Typography>
            <Typography variant="caption" color="text.secondary">{r.lastDoneAt ? `Active ${ago(r.lastDoneAt)}` : r.done ? 'Imported progress' : 'Not started'}</Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
