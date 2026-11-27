import { StrictMode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import { HashRouter } from 'react-router-dom';
import { makeTheme } from './theme.js';
import { AuthProvider } from './lib/auth.jsx';
import { NotifyProvider } from './lib/notify.jsx';
import App from './App.jsx';

const ColorModeContext = createContext({ mode: 'light', toggle: () => {} });
export const useColorMode = () => useContext(ColorModeContext);

function Root() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  const [saved, setSaved] = useState(() => { try { return localStorage.getItem('rt:theme'); } catch { return null; } });
  const mode = saved === 'light' || saved === 'dark' ? saved : prefersDark ? 'dark' : 'light';
  useEffect(() => { document.documentElement.dataset.theme = mode; }, [mode]);
  const colorMode = useMemo(() => ({
    mode,
    toggle: () => {
      const next = mode === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('rt:theme', next); } catch { /* storage unavailable */ }
      setSaved(next);
    },
  }), [mode]);
  const theme = useMemo(() => makeTheme(mode), [mode]);
  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotifyProvider>
          <AuthProvider>
            {/* Hash routes keep every existing #/... link working. */}
            <HashRouter>
              <App />
            </HashRouter>
          </AuthProvider>
        </NotifyProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><Root /></StrictMode>);
