import fs from 'fs/promises';
import path from 'path';

export interface RemoteConfig {
  id: string;
  name: string;
  protocol: 'sftp' | 'ftp';
  host: string;
  port: number;
  username: string;
  password?: string;
  basePath: string;
  mediaType: 'series' | 'movies' | 'music' | 'other';
}

const dataDir = path.join(process.cwd(), 'data');
const remotesFile = path.join(dataDir, 'remotes.json');

export async function initDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

export async function getRemotes(): Promise<RemoteConfig[]> {
  try {
    const data = await fs.readFile(remotesFile, 'utf-8');
    return JSON.parse(data) as RemoteConfig[];
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function saveRemotes(remotes: RemoteConfig[]): Promise<void> {
  await initDataDir();
  await fs.writeFile(remotesFile, JSON.stringify(remotes, null, 2), 'utf-8');
}

export async function getRemote(id: string): Promise<RemoteConfig | undefined> {
  const remotes = await getRemotes();
  return remotes.find(r => r.id === id);
}

export async function addRemote(remote: RemoteConfig): Promise<void> {
  const remotes = await getRemotes();
  remotes.push(remote);
  await saveRemotes(remotes);
}

export async function updateRemote(id: string, updates: Partial<RemoteConfig>): Promise<RemoteConfig | null> {
  const remotes = await getRemotes();
  const index = remotes.findIndex(r => r.id === id);
  if (index === -1) return null;
  remotes[index] = { ...remotes[index], ...updates, id };
  await saveRemotes(remotes);
  return remotes[index];
}

export async function deleteRemote(id: string): Promise<boolean> {
  const remotes = await getRemotes();
  const filtered = remotes.filter(r => r.id !== id);
  if (filtered.length === remotes.length) return false;
  await saveRemotes(filtered);
  return true;
}
