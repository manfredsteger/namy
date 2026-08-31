
/** Cleaned-up music metadata, merged from embedded tags, file name and folder. */
export interface AudioTags {
  artist?: string;
  albumArtist?: string;
  album?: string;
  title?: string;
  track?: number;
  trackTotal?: number;
  disc?: number;
  discTotal?: number;
  year?: string;
  /** True when the album came from a real tag - only then is the year trustworthy. */
  albumFromTags?: boolean;
  /** False when the file carried no readable tags and everything was guessed. */
  hasTags?: boolean;
}

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
  tags?: AudioTags; // audio files only
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
  | 'music_flat'
  | 'music_jellyfin'
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
  /** Shows the artist/album/year override panel in the sidebar. */
  requiresMusicInfo?: boolean;
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
