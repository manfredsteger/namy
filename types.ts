
export interface ProcessedFile {
  id: string;
  originalPath: string;
  newPath: string;
  file: File | null; // Null for directories
  isDirectory: boolean;
  size: number;
  depth: number;
  hasCollision?: boolean;
  handle?: any; // FileSystemFileHandle | FileSystemDirectoryHandle
  parentHandle?: any; // FileSystemDirectoryHandle
}

export type RuleType = 
  | 'lowercase' 
  | 'uppercase' 
  | 'remove_spaces' 
  | 'replace' 
  | 'prefix' 
  | 'suffix' 
  | 'jellyfin_movie' 
  | 'jellyfin_series' 
  | 'custom_script';

export interface Rule {
  id: string;
  type: RuleType;
  params?: any;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  customScript?: string;
  requiresProviderCode?: boolean;
}

export interface Convention {
  id: string;
  name: string;
  script: string;
  requiresProviderCode?: boolean;
  rules?: Rule[];
}

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

export interface RemoteFileInfo {
  name: string;
  isDirectory: boolean;
  size: number;
}

export interface ScanResult {
  folderName: string;
  tmdbId?: string;
  imdbId?: string;
  title?: string;
  year?: string;
  seasons?: string[];
}
