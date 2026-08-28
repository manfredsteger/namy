import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import busboy from 'busboy';
import path from 'path';
import fs from 'fs/promises';
import { initDataDir } from './remotesManager';
import { getRemotes, getRemote, addRemote, updateRemote, deleteRemote, RemoteConfig } from './remotesManager';
import { createRemoteClient } from './remoteClient';

const router = express.Router();

function stripPassword(remote: RemoteConfig) {
  const { password, ...rest } = remote;
  return rest;
}

/**
 * Resolves credentials for a request body. If no password was supplied but the body
 * references an existing remote via `credentialsFromId`, the stored password of that
 * remote is used. The reference field itself is always stripped so it never ends up
 * in remotes.json, and passwords are never sent back to the client.
 */
async function resolveCredentials(body: any): Promise<any> {
  const { credentialsFromId, ...rest } = body ?? {};
  if (!rest.password && credentialsFromId) {
    const source = await getRemote(credentialsFromId);
    if (source?.password) {
      return { ...rest, password: source.password };
    }
  }
  return rest;
}


// Settings
const getSettingsPath = () => path.join(process.cwd(), 'data', 'settings.json');

async function getSettings() {
  try {
    const data = await fs.readFile(getSettingsPath(), 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

async function saveSettings(settings: any) {
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2));
}

router.get('/settings', async (req, res) => {
  const settings = await getSettings();
  res.json({ tmdbApiKeySet: !!settings.tmdbApiKey });
});

router.put('/settings', async (req, res) => {
  const settings = await getSettings();
  if (req.body.tmdbApiKey !== undefined) {
    settings.tmdbApiKey = req.body.tmdbApiKey;
  }
  await saveSettings(settings);
  res.json({ tmdbApiKeySet: !!settings.tmdbApiKey });
});

router.get('/tmdb/search', async (req, res) => {
  const query = req.query.query as string;
  const type = req.query.type || 'multi';
  
  if (!query) return res.status(400).json({ message: 'Query is required' });
  
  const settings = await getSettings();
  const apiKey = settings.tmdbApiKey;
  if (!apiKey) return res.status(400).json({ message: 'TMDB API key not configured' });
  
  try {
    const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=de-DE`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 401) {
         return res.status(401).json({ message: 'API-Key ungültig' });
      }
      return res.status(response.status).json({ message: `TMDB API error: ${response.statusText}` });
    }
    const data = await response.json();
    
    // Map response
    const results = data.results.map((item: any) => ({
      id: item.id,
      mediaType: item.media_type || (type === 'multi' ? undefined : type),
      title: item.title || item.name,
      originalTitle: item.original_title || item.original_name,
      year: item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : null),
      posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null,
      overview: item.overview ? (item.overview.length > 200 ? item.overview.substring(0, 197) + '...' : item.overview) : null
    }));
    
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ message: 'Error searching TMDB: ' + err.message });
  }
});

router.get('/remotes', async (req, res) => {
  try {
    const remotes = await getRemotes();
    res.json(remotes.map(stripPassword));
  } catch (err: any) {
    res.status(500).json({ message: 'Error reading remotes: ' + err.message });
  }
});

router.post('/remotes', async (req, res) => {
  try {
    const config = await resolveCredentials(req.body);
    const newRemote = { ...config, id: uuidv4() } as RemoteConfig;
    await addRemote(newRemote);
    res.status(201).json(stripPassword(newRemote));
  } catch (err: any) {
    res.status(500).json({ message: 'Error saving remote: ' + err.message });
  }
});

router.put('/remotes/:id', async (req, res) => {
  try {
    const config = await resolveCredentials(req.body);
    // An empty password field means "keep the stored one", never overwrite it with ''.
    if (!config.password) delete config.password;
    const updated = await updateRemote(req.params.id, config);
    if (!updated) {
      return res.status(404).json({ message: 'Remote not found' });
    }
    res.json(stripPassword(updated));
  } catch (err: any) {
    res.status(500).json({ message: 'Error updating remote: ' + err.message });
  }
});

router.delete('/remotes/:id', async (req, res) => {
  try {
    const deleted = await deleteRemote(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Remote not found' });
    }
    res.json({ message: 'Remote deleted' });
  } catch (err: any) {
    res.status(500).json({ message: 'Error deleting remote: ' + err.message });
  }
});

router.post('/remotes/test', async (req, res) => {
  const config = await resolveCredentials(req.body) as RemoteConfig;
  const client = createRemoteClient(config);
  try {
    await client.connect();
    await client.disconnect();
    res.json({ message: 'Connection successful' });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/remotes/browse', async (req, res) => {
  const { path: browsePath, ...body } = req.body;
  const config = await resolveCredentials(body) as RemoteConfig;
  const client = createRemoteClient(config);
  try {
    await client.connect();
    const list = await client.list(browsePath || config.basePath || '/');
    await client.disconnect();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ message: 'Error browsing remote: ' + err.message });
  }
});

router.post('/remotes/:id/browse', async (req, res) => {
  const remote = await getRemote(req.params.id);
  if (!remote) return res.status(404).json({ message: 'Remote not found' });

  const client = createRemoteClient(remote);
  try {
    await client.connect();
    const list = await client.list(req.body.path || remote.basePath || '/');
    await client.disconnect();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ message: 'Error browsing remote: ' + err.message });
  }
});

router.post('/remotes/:id/exists', async (req, res) => {
  const remote = await getRemote(req.params.id);
  if (!remote) return res.status(404).json({ message: 'Remote not found' });

  const client = createRemoteClient(remote);
  try {
    await client.connect();
    const result = await client.exists(req.body.path);
    await client.disconnect();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: 'Error checking existence: ' + err.message });
  }
});

// Cache for scan results
const scanCache = new Map<string, { timestamp: number; data: any }>();

router.post('/remotes/:id/scan', async (req, res) => {
  const remote = await getRemote(req.params.id);
  if (!remote) return res.status(404).json({ message: 'Remote not found' });

  const cacheKey = remote.id;
  const cached = scanCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return res.json(cached.data);
  }

  const client = createRemoteClient(remote);
  try {
    await client.connect();
    const basePath = remote.basePath || '/';
    const list = await client.list(basePath);
    
    const results = [];
    
    for (const item of list) {
      if (!item.isDirectory) continue;
      
      const folderName = item.name;
      const result: any = { folderName };
      
      const tmdbMatch = folderName.match(/\[tmdbid-(.*?)\]/);
      if (tmdbMatch) result.tmdbId = tmdbMatch[1];
      
      const imdbMatch = folderName.match(/\[imdbid-(.*?)\]/);
      if (imdbMatch) result.imdbId = imdbMatch[1];
      
      // Parse year
      const yearMatch = folderName.match(/\((\d{4})\)/);
      if (yearMatch) result.year = yearMatch[1];
      
      // Parse title
      result.title = folderName.replace(/\[tmdbid-.*?\]/g, '').replace(/\[imdbid-.*?\]/g, '').replace(/\(\d{4}\)/g, '').trim();

      // For series, look for seasons
      if (remote.mediaType === 'series') {
         try {
             const subList = await client.list(`${basePath}/${folderName}`);
             result.seasons = subList.filter(s => s.isDirectory && s.name.toLowerCase().includes('season')).map(s => s.name);
         } catch(e) {
             // Ignore sub-listing errors
         }
      }
      
      results.push(result);
    }
    
    await client.disconnect();
    
    scanCache.set(cacheKey, { timestamp: Date.now(), data: results });
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ message: 'Error scanning remote: ' + err.message });
  }
});

router.post('/remotes/:id/upload', async (req, res) => {
  const remote = await getRemote(req.params.id);
  if (!remote) return res.status(404).json({ message: 'Remote not found' });

  const bb = busboy({ headers: req.headers });
  let targetPath = '';
  const overwrite = req.query.overwrite === 'true';

  let client: ReturnType<typeof createRemoteClient> | null = null;
  let fileProcessed = false;
  let hasError = false;
  let uploadPromise: Promise<void> | null = null;

  bb.on('field', (name, val) => {
    if (name === 'targetPath') {
      targetPath = val;
    }
  });

  bb.on('file', (name, fileStream, info) => {
    uploadPromise = (async () => {
      if (!targetPath) {
        hasError = true;
        fileStream.resume(); // consume stream
        if (!res.headersSent) res.status(400).json({ message: 'targetPath field must come before file' });
        return;
      }

      try {
        client = createRemoteClient(remote);
        await client.connect();

        const fullDestPath = `${remote.basePath}/${targetPath}`.replace(/\/+/g, '/');
        const parts = fullDestPath.split('/');
        const filename = parts.pop() || '';
        const parentDir = parts.join('/');

        if (parentDir) {
          await client.mkdirRecursive(parentDir);
        }

        if (!overwrite) {
          const check = await client.exists(fullDestPath);
          if (check.exists) {
            hasError = true;
            fileStream.resume();
            await client.disconnect();
            if (!res.headersSent) res.status(409).json({ message: 'File already exists' });
            return;
          }
        }

        await client.uploadStream(fileStream, fullDestPath);
        fileProcessed = true;
        await client.disconnect();
        
        // Invalidate scan cache for this remote
        scanCache.delete(remote.id);
      } catch (err: any) {
        hasError = true;
        if (client) await client.disconnect().catch(() => {});
        if (!res.headersSent) res.status(500).json({ message: 'Upload failed: ' + err.message });
      }
    })();
  });

  bb.on('finish', async () => {
    if (uploadPromise) {
      await uploadPromise;
    }
    
    if (!hasError && fileProcessed) {
      if (!res.headersSent) res.json({ message: 'Upload successful' });
    } else if (!hasError && !fileProcessed) {
      if (!res.headersSent) res.status(400).json({ message: 'No file uploaded' });
    }
  });

  req.pipe(bb);
});

export default router;
