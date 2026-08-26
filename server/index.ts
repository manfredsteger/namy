import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes';
import { initDataDir } from './remotesManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API Routes
app.use('/api', routes);

// Serve static files in production
// In production, __dirname is server/dist, so dist is ../../dist
// Let's use process.cwd() instead. The app is started from the root.
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA
app.get('*all', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

async function start() {
  await initDataDir();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
