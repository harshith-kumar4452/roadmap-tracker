// Local server: the API plus the built web app (dist/, from `npm run build`). On Vercel,
// api/index.js serves the API and dist/ is served as static files.
// For frontend work with hot reload, run this (`npm run dev`) and `npm run dev:web` together:
// Vite (port 5173) proxies /api to this server.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './src/app.js';
import * as store from './src/store.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const local = express();
local.use(express.static(path.join(root, 'dist')));
local.use(app);
local.use((req, res) => res.status(404).sendFile(path.join(root, 'dist', '404.html')));

const port = Number(process.env.PORT) || 4321;
local.listen(port, '127.0.0.1', () => console.log(`Roadmap tracker running at http://localhost:${port}`));

// Warm the connection and caches so the first visitor isn't the slow one.
Promise.all([store.getAccount(), store.listRoadmaps(), store.stats()]).catch(() => {});
