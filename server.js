// Local development server. On Vercel, api/index.js serves the API and
// the public/ folder is served as static files.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './src/app.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const local = express();
local.use(express.static(path.join(root, 'public')));
local.use(app);

const port = Number(process.env.PORT) || 4321;
local.listen(port, '127.0.0.1', () => console.log(`Roadmap tracker running at http://localhost:${port}`));
