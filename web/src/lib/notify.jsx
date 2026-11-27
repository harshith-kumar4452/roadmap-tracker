import { createContext, useCallback, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const Ctx = createContext(() => {});

// App-wide snackbar: notify('Saved') or notify('Could not save', 'error').
export function NotifyProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const notify = useCallback((text, severity = 'success') => setMsg({ text, severity, key: Date.now() }), []);
  return (
    <Ctx.Provider value={notify}>
      {children}
      <Snackbar
        key={msg?.key}
        open={Boolean(msg)}
        autoHideDuration={msg?.severity === 'error' ? 6000 : 3000}
        onClose={(_, reason) => reason !== 'clickaway' && setMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {msg ? <Alert onClose={() => setMsg(null)} severity={msg.severity} variant="filled" sx={{ width: '100%' }}>{msg.text}</Alert> : undefined}
      </Snackbar>
    </Ctx.Provider>
  );
}

export const useNotify = () => useContext(Ctx);
