import { useState } from 'react';
import { Link as RouterLink, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  ListSubheader, Toolbar, Tooltip, Typography, useMediaQuery, Menu, MenuItem, Avatar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import MapOutlined from '@mui/icons-material/MapOutlined';
import QuestionAnswerOutlined from '@mui/icons-material/QuestionAnswerOutlined';
import CodeOutlined from '@mui/icons-material/CodeOutlined';
import ChecklistOutlined from '@mui/icons-material/ChecklistOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import WorkOutline from '@mui/icons-material/WorkOutline';
import PersonOutline from '@mui/icons-material/PersonOutline';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import TaskAlt from '@mui/icons-material/TaskAlt';
import Logout from '@mui/icons-material/Logout';
import { useAuth } from '../lib/auth.jsx';
import { useColorMode } from '../main.jsx';

const DRAWER = 248;

export const NAV = [
  { group: 'Learn', items: [
    { to: '/', label: 'Home', icon: HomeOutlined, end: true },
    { to: '/roadmaps', label: 'Roadmaps', icon: MapOutlined },
    { to: '/interview', label: 'Interview prep', icon: QuestionAnswerOutlined },
    { to: '/coding', label: 'Daily coding', icon: CodeOutlined },
    { to: '/roles', label: 'Job roles', icon: WorkOutline },
  ] },
  { group: 'Plan', items: [
    { to: '/tasks', label: 'Tasks & routine', icon: ChecklistOutlined },
    { to: '/calendar', label: 'Calendar', icon: CalendarMonthOutlined },
  ] },
  { group: 'Reference', items: [
    { to: '/library', label: 'Library', icon: MenuBookOutlined },
    { to: '/resources', label: 'Resources', icon: LinkOutlined },
    { to: '/profile', label: 'Profile', icon: PersonOutline },
  ] },
];

function NavList({ onNavigate }) {
  return (
    <Box component="nav" aria-label="Main" sx={{ px: 1.5, py: 1 }}>
      {NAV.map((g) => (
        <List key={g.group} dense subheader={<ListSubheader disableSticky sx={{ bgcolor: 'transparent', lineHeight: '32px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.group}</ListSubheader>}>
          {g.items.map((it) => (
            <ListItemButton
              key={it.to}
              component={NavLink}
              to={it.to}
              end={it.end}
              onClick={onNavigate}
              sx={{
                mb: 0.25, py: 0.9,
                '&.active': { bgcolor: 'action.selected', color: 'primary.main', '& .MuiListItemIcon-root': { color: 'primary.main' } },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}><it.icon fontSize="small" /></ListItemIcon>
              <ListItemText primary={it.label} primaryTypographyProps={{ fontWeight: 500, fontSize: 14 }} />
            </ListItemButton>
          ))}
        </List>
      ))}
    </Box>
  );
}

export default function Layout() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const { mode, toggle } = useColorMode();
  const { me, authenticated, logout } = useAuth();
  const [anchor, setAnchor] = useState(null);
  const navigate = useNavigate();
  const loc = useLocation();

  const brand = (
    <Box component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary', textDecoration: 'none' }} aria-label="Learning hub home">
      <TaskAlt color="primary" />
      <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>Learning hub</Typography>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box component="a" href="#main" sx={{ position: 'absolute', left: -9999, '&:focus': { left: 8, top: 8, zIndex: 2000, bgcolor: 'background.paper', p: 1, borderRadius: 1 } }}>Skip to content</Box>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          {!desktop && (
            <IconButton edge="start" aria-label="Open navigation" onClick={() => setOpen(true)}><MenuIcon /></IconButton>
          )}
          {brand}
          <Box sx={{ flex: 1 }} />
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton onClick={toggle} aria-label="Toggle dark mode">{mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}</IconButton>
          </Tooltip>
          {authenticated ? (
            <>
              <Tooltip title="Account">
                <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Account menu">
                  <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 14 }}>{(me?.name || '?').slice(0, 1).toUpperCase()}</Avatar>
                </IconButton>
              </Tooltip>
              <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                <MenuItem disabled>{me?.name}{me?.admin ? ' (owner)' : ''}</MenuItem>
                <MenuItem onClick={() => { setAnchor(null); navigate('/profile'); }}><ListItemIcon><PersonOutline fontSize="small" /></ListItemIcon>Profile</MenuItem>
                <MenuItem onClick={async () => { setAnchor(null); await logout(); navigate('/'); }}><ListItemIcon><Logout fontSize="small" /></ListItemIcon>Log out</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button component={RouterLink} to={`/login?next=${encodeURIComponent(loc.pathname)}`} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Log in</Button>
              <Button variant="contained" component={RouterLink} to="/signup">Sign up</Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant={desktop ? 'permanent' : 'temporary'}
        open={desktop || open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ width: DRAWER, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider', bgcolor: 'background.default' } }}
      >
        <Toolbar>{!desktop && brand}</Toolbar>
        {!desktop && <Divider />}
        <NavList onNavigate={() => setOpen(false)} />
      </Drawer>

      <Box component="main" id="main" tabIndex={-1} sx={{ flex: 1, minWidth: 0, outline: 'none' }}>
        <Toolbar />
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2.5, md: 4 }, maxWidth: 1240, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
