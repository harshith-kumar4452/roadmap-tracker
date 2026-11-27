import { useCallback, useEffect, useRef, useState } from 'react';
import { api, onChange } from './api.js';

// Loads an API path, with loading / error state, and reloads when `deps` change or any of the
// `topics` is announced as changed.
export function useApi(path, { deps = [], topics = [], skip = false } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: !skip });
  const ctrl = useRef();
  const load = useCallback(async (quiet = false) => {
    if (skip || !path) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api(path, { signal: c.signal });
      if (!c.signal.aborted) setState({ data, error: null, loading: false });
    } catch (error) {
      if (!c.signal.aborted) setState((s) => ({ ...s, error, loading: false }));
    }
  }, [path, skip]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); return () => ctrl.current?.abort(); }, [load, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const offs = topics.map((t) => onChange(t, () => load(true)));
    return () => offs.forEach((off) => off());
  }, [load, topics.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: load, setData: (fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })) };
}

export function useLocalStorage(key, initial) {
  const [v, setV] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw === null ? initial : JSON.parse(raw); } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }, [key, v]);
  return [v, setV];
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// Local calendar day as YYYY-MM-DD.
export const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoDay(new Date(y, m - 1, d + n)); };
export const daysBetween = (a, b) => {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};
