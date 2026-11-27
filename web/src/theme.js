import { createTheme, alpha } from '@mui/material/styles';

// One palette for the whole app, in light and dark. Keeps the existing identity: teal accent,
// warm off-white background, Inter.
const tokens = {
  light: { bg: '#f6f5f1', paper: '#ffffff', text: '#1c1b19', muted: '#5f5d57', border: '#e4e2dc', primary: '#0f766e', primaryDark: '#0b5f58' },
  dark: { bg: '#111211', paper: '#1a1b19', text: '#ecebe6', muted: '#a3a19a', border: '#2c2d2a', primary: '#3cc0a6', primaryDark: '#5fd3bb' },
};

// Priority / category colours shared by the calendar, the tasks widget and task chips.
export const PRIORITY_COLORS = {
  critical: { light: '#d32f2f', dark: '#f26b6b', label: 'Critical' },
  high: { light: '#ed6c02', dark: '#ffa04d', label: 'High' },
  medium: { light: '#1e6fd9', dark: '#6aa8ff', label: 'Medium' },
  low: { light: '#2e7d32', dark: '#66bb6a', label: 'Low' },
};
export const CATEGORY_COLORS = {
  study: { light: '#7b3fbf', dark: '#b48cf0', label: 'Academic / Study' },
  personal: { light: '#00897b', dark: '#4fd1c0', label: 'Personal' },
  work: { light: '#455a64', dark: '#90a4ae', label: 'Work' },
};
export const COMPLETED_COLOR = { light: '#9e9e9e', dark: '#757575', label: 'Completed' };

export const colorFor = (mode, { done, priority, category } = {}) => {
  if (done) return COMPLETED_COLOR[mode];
  if (priority && PRIORITY_COLORS[priority] && (priority === 'critical' || priority === 'high' || !category)) return PRIORITY_COLORS[priority][mode];
  if (category && CATEGORY_COLORS[category]) return CATEGORY_COLORS[category][mode];
  return PRIORITY_COLORS[priority || 'medium'][mode];
};

export function makeTheme(mode) {
  const t = tokens[mode];
  return createTheme({
    palette: {
      mode,
      primary: { main: t.primary, dark: t.primaryDark, contrastText: mode === 'dark' ? '#0d1f1c' : '#ffffff' },
      secondary: { main: mode === 'dark' ? '#b48cf0' : '#7b3fbf' },
      error: { main: PRIORITY_COLORS.critical[mode] },
      warning: { main: PRIORITY_COLORS.high[mode] },
      info: { main: PRIORITY_COLORS.medium[mode] },
      success: { main: PRIORITY_COLORS.low[mode] },
      background: { default: t.bg, paper: t.paper },
      text: { primary: t.text, secondary: t.muted },
      divider: t.border,
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontSize: '1.2rem', fontWeight: 650 },
      h4: { fontSize: '1.05rem', fontWeight: 650 },
      h5: { fontSize: '1rem', fontWeight: 600 },
      h6: { fontSize: '0.95rem', fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
      overline: { fontWeight: 600, letterSpacing: '0.06em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: t.bg },
          'code, pre': { fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace' },
          '::selection': { background: alpha(t.primary, 0.25) },
        },
      },
      MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: t.border } } },
      MuiCard: { defaultProps: { variant: 'outlined' } },
      MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' }, styleOverrides: { root: { borderBottom: `1px solid ${t.border}`, backgroundColor: alpha(t.paper, 0.92), backdropFilter: 'blur(8px)' } } },
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 8 } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiAccordion: {
        defaultProps: { disableGutters: true, elevation: 0 },
        styleOverrides: { root: { border: `1px solid ${t.border}`, '&:before': { display: 'none' }, '&:not(:last-of-type)': { borderBottom: 0 } } },
      },
      MuiLinearProgress: { styleOverrides: { root: { borderRadius: 4, height: 6 } } },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 8 } } },
    },
  });
}
