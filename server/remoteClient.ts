import SftpClient from 'ssh2-sftp-client';
import * as ftp from 'basic-ftp';
import { RemoteConfig } from './remotesManager';
import { Writable, Readable } from 'stream';

export interface RemoteFileInfo {
  name: string;
  isDirectory: boolean;
  size: number;
}

export interface IRemoteClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  list(path: string): Promise<RemoteFileInfo[]>;
  exists(path: string): Promise<{ exists: boolean; isDirectory: boolean; size: number }>;
  mkdirRecursive(path: string): Promise<void>;
  uploadStream(readStream: NodeJS.ReadableStream, destPath: string): Promise<void>;
}

export class SftpRemoteClient implements IRemoteClient {
  private client: SftpClient;
  
  constructor(private config: RemoteConfig) {
    this.client = new SftpClient();
  }

  async connect() {
    await this.client.connect({
      host: this.config.host,
      port: this.config.port || 22,
      username: this.config.username,
      password: this.config.password
    });
  }

  async disconnect() {
    await this.client.end();
  }

  async list(path: string): Promise<RemoteFileInfo[]> {
    const list = await this.client.list(path);
    return list.map(item => ({
      name: item.name,
      isDirectory: item.type === 'd',
      size: item.size
    }));
  }

  async exists(path: string) {
    const type = await this.client.exists(path);
    if (!type) return { exists: false, isDirectory: false, size: 0 };
    if (type === 'd') return { exists: true, isDirectory: true, size: 0 };
    
    // It's a file, get size
    const stat = await this.client.stat(path);
    return { exists: true, isDirectory: false, size: stat.size };
  }

  async mkdirRecursive(path: string) {
    const exists = await this.client.exists(path);
    if (!exists) {
      await this.client.mkdir(path, true);
    }
  }

  async uploadStream(readStream: NodeJS.ReadableStream, destPath: string) {
    await this.client.put(readStream, destPath);
  }
}

export class FtpRemoteClient implements IRemoteClient {
  private client: ftp.Client;
  
  constructor(private config: RemoteConfig) {
    this.client = new ftp.Client();
  }

  async connect() {
    await this.client.access({
      host: this.config.host,
      port: this.config.port || 21,
      user: this.config.username,
      password: this.config.password,
      secure: false
    });
  }

  async disconnect() {
    this.client.close();
  }

  async list(path: string): Promise<RemoteFileInfo[]> {
    const list = await this.client.list(path);
    return list.map(item => ({
      name: item.name,
      isDirectory: item.isDirectory,
      size: item.size
    }));
  }

  async exists(path: string) {
    try {
      // ftp doesn't have a simple exists method that returns size, let's list the parent
      const parts = path.split('/');
      const name = parts.pop();
      const parent = parts.join('/') || '/';
      
      let list;
      try {
        list = await this.client.list(parent);
      } catch (e) {
        return { exists: false, isDirectory: false, size: 0 };
      }
      
      const item = list.find(i => i.name === name);
      if (!item) return { exists: false, isDirectory: false, size: 0 };
      
      return { exists: true, isDirectory: item.isDirectory, size: item.size };
    } catch (err) {
      return { exists: false, isDirectory: false, size: 0 };
    }
  }

  async mkdirRecursive(path: string) {
    await this.client.ensureDir(path);
    // basic-ftp cd's into the dir with ensureDir, we need to cd back or use absolute paths for put
    await this.client.cd('/'); 
  }

  async uploadStream(readStream: NodeJS.ReadableStream, destPath: string) {
    await this.client.uploadFrom(readStream as Readable, destPath);
  }
}

export function createRemoteClient(config: RemoteConfig): IRemoteClient {
  if (config.protocol === 'ftp') {
    return new FtpRemoteClient(config);
  }
  return new SftpRemoteClient(config);
}
