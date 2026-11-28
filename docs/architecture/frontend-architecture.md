# Frontend architecture

React 18 + Material UI 6, built with Vite 6. Source in `web/`, output in `dist/`.

## Structure

```
web/index.html            Shell: fonts, theme-colour script, #root
web/public/               Copied as-is: favicon, manifest, 404.html
web/src/main.jsx          Theme (light/dark), CSS variables, providers, HashRouter, stale-chunk reload
web/src/App.jsx           Routes; every page is lazy-loaded
web/src/theme.js          MUI theme + the shared priority / category colour map
web/src/components/       Layout (AppBar + Drawer), common UI, TaskDialog/TaskRow, TodayWidget,
                          GoogleSyncPanel, PlanUpload, SprintPlanner, RoadmapCard, ErrorBoundary
web/src/pages/            One file per page (interview/ has the two interview pages)
web/src/lib/              api.js (fetch + change events), hooks.js, auth.jsx, notify.jsx,
                          tasks.js (deadline rules), roadmaps.js (link slots, roles), render.js (Markdown),
                          mindmap.js and tour.js (framework-free modules from the old app)
web/src/data/             Static content: role resources/projects, DSA patterns, hero icons
web/src/styles/           Plain CSS for the mind map, hero and tour (they build their own DOM)
```

## Decisions

- **Hash routing** (`#/r/<id>`) keeps every link from the old app working and needs no server rewrites.
- **Data fetching**: a small `useApi(path, { topics })` hook (loading / error / reload). Writes call `changed('tasks')`
  etc.; every hook subscribed to that topic reloads quietly. This is how the Today widget, calendar and tasks page stay
  in sync without a state library.
- **Owner vs member UI** comes from `/api/me`; the server enforces the same rules.
- **Long lists**: the roadmap page renders rows as plain elements styled once by a parent (`RowStyles`) instead of
  hundreds of MUI components, memoises rows and their link slots, and unmounts collapsed sections. 679 rows re-render in
  ~250 ms in the production build.
- **Markdown** is rendered by `lib/render.js`, which escapes all input before adding markup (no HTML injection).
  AI-written answers go through the same renderer.
- **Playground code** runs in a Web Worker with a 3-second limit: no access to the page, cookies or DOM, and an
  infinite loop can't freeze the tab.
- **Stale deploys**: if a lazy page chunk 404s after a new deploy, the page reloads once (`vite:preloadError`).
  An error boundary shows a message instead of a blank page if a page crashes.
- **Icons**: Material Icons (`@mui/icons-material`) everywhere; no emoji in the UI.
- **Colour coding** (`theme.js`): critical red, high orange, medium blue, low green, study purple, personal teal,
  completed grey; used by the calendar, task rows, Today widget and the Google event colours.

## Accessibility

Labelled controls, `aria-pressed` / `aria-expanded` on toggles, live regions for results, keyboard focus outlines,
skip link, touch targets enlarged on coarse pointers, `prefers-reduced-motion` respected by the hero and tour.
