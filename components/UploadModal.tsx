import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { ProcessedFile, RemoteConfig, ScanResult } from '../types';
import { Upload, X, CheckCircle, AlertTriangle, HelpCircle, ChevronDown, Play, StopCircle, RefreshCw } from 'lucide-react';

// Simple Levenshtein distance
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,
        matrix[i - 1][j] + 1,
        matrix[i - 1][j - 1] + indicator
      );
    }
  }
  return matrix[a.length][b.length];
}

function stringSimilarity(a: string, b: string): number {
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - dist / maxLen;
}

interface UploadModalProps {
  files: ProcessedFile[];
  onClose: () => void;
  tmdbApiKeySet?: boolean;
}

interface MatchResult {
  fileId: string;
  originalName: string;
  newName: string;
  targetPath: string;
  matchType: 'id' | 'name-high' | 'name-low' | 'new';
  seriesTitle?: string;
  providerId?: string;
  selected: boolean;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'conflict' | 'skipped';
  progress: number;
  message?: string;
}

export function UploadModal({ files, onClose, tmdbApiKeySet }: UploadModalProps) {
  const { t } = useTranslation();
  const [remotes, setRemotes] = useState<RemoteConfig[]>([]);
  const [selectedRemoteId, setSelectedRemoteId] = useState<string>('');
  const [library, setLibrary] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [manualIds, setManualIds] = useState<Record<string, { id: string, title?: string, year?: string | null } | string>>({});
  const [customPaths, setCustomPaths] = useState<Record<string, string>>({});
  const [uploadStats, setUploadStats] = useState({ total: 0, done: 0, error: 0, skipped: 0 });

  useEffect(() => {
    fetch('/api/remotes')
      .then(res => res.json())
      .then(data => {
        setRemotes(data);
        if (data.length > 0) {
          // Auto-select based on content
          const hasSeries = files.some(f => /S\d+E\d+/i.test(f.newPath));
          const seriesRemote = data.find((r: RemoteConfig) => r.mediaType === 'series');
          const firstRemote = hasSeries && seriesRemote ? seriesRemote.id : data[0].id;
          setSelectedRemoteId(firstRemote);
        }
      })
      .catch(console.error);
  }, [files]);

  useEffect(() => {
    if (selectedRemoteId) {
      scanRemote(selectedRemoteId);
    }
  }, [selectedRemoteId]);

  const scanRemote = async (id: string) => {
    setIsScanning(true);
    try {
      const res = await fetch(`/api/remotes/${id}/scan`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLibrary(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const selectedRemote = useMemo(() => remotes.find(r => r.id === selectedRemoteId), [remotes, selectedRemoteId]);

  useEffect(() => {
    if (!selectedRemote) return;
    
    // Calculate matches
    const newMatches: MatchResult[] = files.filter(f => !f.isDirectory).map(f => {
      const parts = f.newPath.split('/');
      const folderNamePart = parts.length > 1 ? parts[0] : f.newPath;
      const name = parts.pop() || f.newPath;
      
      // Extract info
      const tmdbMatch = folderNamePart.match(/\[tmdbid-(.*?)\]/);
      const imdbMatch = folderNamePart.match(/\[imdbid-(.*?)\]/);
      let tmdbId = tmdbMatch ? tmdbMatch[1] : null;
      let imdbId = imdbMatch ? imdbMatch[1] : null;
      
      const seasonMatch = name.match(/S(\d+)E\d+/i);
      const seasonNum = seasonMatch ? parseInt(seasonMatch[1], 10) : null;
      
      let title = folderNamePart.replace(/\[tmdbid-.*?\]/gi, '').replace(/\[imdbid-.*?\]/gi, '').replace(/\(\d{4}\)/g, '');
      if (seasonMatch && title.includes(seasonMatch[0])) {
        title = title.substring(0, title.indexOf(seasonMatch[0]));
      }
      title = title.replace(/[._]/g, ' ').trim();
      
      const existingYearMatch = folderNamePart.match(/\(\d{4}\)/);
      let year = existingYearMatch ? existingYearMatch[0] : '';

      const originalTitle = title;
      const manualVal = manualIds[originalTitle];
      let manualIdStr = '';
      
      if (manualVal) {
         if (typeof manualVal === 'string') {
           manualIdStr = manualVal;
         } else {
           manualIdStr = manualVal.id;
           if (manualVal.title) {
             title = manualVal.title.replace(/[._]/g, ' ').trim();
           }
           if (manualVal.year) {
             year = `(${manualVal.year})`;
           }
         }
         
         if (/^\d+$/.test(manualIdStr)) manualIdStr = `tmdbid-${manualIdStr}`;
         else if (/^tt\d+$/.test(manualIdStr)) manualIdStr = `imdbid-${manualIdStr}`;
         if (manualIdStr.startsWith('imdbid-')) imdbId = manualIdStr.slice(7);
         else if (manualIdStr.startsWith('tmdbid-')) tmdbId = manualIdStr.slice(7);
      }

      // Find in library by ID
      let libItem = null;
      if (tmdbId || imdbId) {
        libItem = library.find(item => (tmdbId && item.tmdbId === tmdbId) || (imdbId && item.imdbId === imdbId));
      }
      
      let matchType: MatchResult['matchType'] = 'new';
      
      if (libItem) {
        matchType = 'id';
      } else {
        // Find by name
        let bestScore = 0;
        let bestItem = null;
        for (const item of library) {
          const itemTitle = item.title || item.folderName;
          const score = stringSimilarity(title, itemTitle);
          if (score > bestScore) {
            bestScore = score;
            bestItem = item;
          }
        }
        
        if (bestScore >= 0.85) {
          matchType = 'name-high';
          libItem = bestItem;
        } else if (bestScore >= 0.6) {
          matchType = 'name-low';
          libItem = bestItem;
        }
      }
      
      let targetPath = '';
      if (libItem) {
        targetPath = libItem.folderName;
        if (selectedRemote.mediaType === 'series' && seasonNum !== null) {
          // Find existing season folder
          const seasonFolder = libItem.seasons?.find(s => s.match(new RegExp(`Season\\s*0?${seasonNum}`, 'i'))) || `Season ${seasonNum.toString().padStart(2, '0')}`;
          targetPath += `/${seasonFolder}/${name}`;
        } else {
          targetPath += `/${name}`;
        }
      } else {
        // New folder suggestion
        const folderName = folderNamePart.replace(/\.[^/.]+$/, ""); // Without extension
        if (selectedRemote.mediaType === 'series' && seasonNum !== null) {
           const seriesFolder = title + (year ? ` ${year}` : '') + (manualIdStr ? ` [${manualIdStr}]` : (tmdbId ? ` [tmdbid-${tmdbId}]` : (imdbId ? ` [imdbid-${imdbId}]` : '')));
           targetPath = `${seriesFolder}/Season ${seasonNum.toString().padStart(2, '0')}/${name}`;
        } else {
           if (manualIdStr) {
               targetPath = `${title} ${year ? year + ' ' : ''}[${manualIdStr}]/${name}`;
           } else {
               targetPath = `${folderName}/${name}`;
           }
        }
      }
      
      return {
        fileId: f.id,
        originalName: f.originalPath,
        newName: name,
        targetPath: customPaths[f.id] || targetPath,
        matchType,
        seriesTitle: folderNamePart.replace(/\[tmdbid-.*?\]/gi, '').replace(/\[imdbid-.*?\]/gi, '').replace(/\(\d{4}\)/g, '').replace(/[._]/g, ' ').trim(), // keep original generic title for dict key
        providerId: manualIdStr || '',
        selected: true,
        status: 'pending',
        progress: 0
      };
    });
    
    // Preserve statuses and progress from existing matches if they exist
    setMatches(prev => {
        if (prev.length === 0) return newMatches;
        
        return newMatches.map(nm => {
            const existing = prev.find(p => p.fileId === nm.fileId);
            if (existing) {
                return {
                    ...nm,
                    status: existing.status,
                    progress: existing.progress,
                    message: existing.message,
                    selected: existing.selected
                };
            }
            return nm;
        });
    });
  }, [files, library, selectedRemote, manualIds, customPaths]);

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadStats({ total: matches.filter(m => m.selected).length, done: 0, error: 0, skipped: 0 });
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      if (!match.selected || match.status === 'success' || match.status === 'skipped') continue;
      
      setMatches(prev => prev.map((m, idx) => idx === i ? { ...m, status: 'uploading', progress: 0 } : m));
      
      const fileEntry = files.find(f => f.id === match.fileId);
      if (!fileEntry) continue;
      
      let file: File;
      if (fileEntry.file) {
        file = fileEntry.file;
      } else if (fileEntry.handle && fileEntry.handle.getFile) {
        try {
          file = await fileEntry.handle.getFile();
        } catch (e: any) {
          setMatches(prev => prev.map((m, idx) => idx === i ? { ...m, status: 'error', message: 'Cannot read file' } : m));
          setUploadStats(s => ({ ...s, error: s.error + 1 }));
          continue;
        }
      } else {
        setMatches(prev => prev.map((m, idx) => idx === i ? { ...m, status: 'error', message: 'No file data' } : m));
        setUploadStats(s => ({ ...s, error: s.error + 1 }));
        continue;
      }
      
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `/api/remotes/${selectedRemoteId}/upload`);
          
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setMatches(prev => prev.map((m, idx) => idx === i ? { ...m, progress: percent } : m));
            }
          };
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setMatches(prev => prev.map((m, idx) => idx === i ? { ...m, status: 'success', progress: 100 } : m));
              setUploadStats(s => ({ ...s, done: s.done + 1 }));
              resolve();
            } else if (xhr.status === 409) {
              setMatches(prev => prev.map((m, idx) => idx === i ? { ...m, status: 'conflict', message: t('upload.conflict') } : m));
              resolve(); // Don't reject on conflict, pause for user
            } else {
              try {
                const res = JSON.parse(xhr.responseText);
                reject(new Error(res.message || 'Upload failed'));
              } catch {
                reject(new Error('Upload failed with status ' + xhr.status));
              }
            }
          };
          
          xhr.onerror = () => reject(new Error('Network error'));
          
          const formData = new FormData();
          formData.append('targetPath', match.targetPath);
          formData.append('file', file, match.newName);
          
          xhr.send(formData);
        });
      } catch (err: any) {
        setMatches(prev => prev.map((m, idx) => idx === i && m.status !== 'conflict' ? { ...m, status: 'error', message: err.message } : m));
        if (matches[i].status !== 'conflict') {
          setUploadStats(s => ({ ...s, error: s.error + 1 }));
        }
      }
    }
    
    setIsUploading(false);
  };

  const handleResolveConflict = async (index: number, action: 'skip' | 'overwrite') => {
    if (action === 'skip') {
      setMatches(prev => prev.map((m, idx) => idx === index ? { ...m, status: 'skipped' } : m));
      setUploadStats(s => ({ ...s, skipped: s.skipped + 1 }));
    } else {
      // Overwrite - restart upload for this file
      setMatches(prev => prev.map((m, idx) => idx === index ? { ...m, status: 'pending' } : m));
      
      const match = matches[index];
      const fileEntry = files.find(f => f.id === match.fileId);
      if (!fileEntry) return;
      
      let file: File;
      try {
         file = fileEntry.file || (await fileEntry.handle.getFile());
      } catch (e) { return; }
      
      setMatches(prev => prev.map((m, idx) => idx === index ? { ...m, status: 'uploading', progress: 0 } : m));
      
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `/api/remotes/${selectedRemoteId}/upload?overwrite=true`);
          
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setMatches(prev => prev.map((m, idx) => idx === index ? { ...m, progress: percent } : m));
            }
          };
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setMatches(prev => prev.map((m, idx) => idx === index ? { ...m, status: 'success', progress: 100 } : m));
              setUploadStats(s => ({ ...s, done: s.done + 1 }));
              resolve();
            } else {
              reject(new Error('Upload failed'));
            }
          };
          
          xhr.onerror = () => reject(new Error('Network error'));
          
          const formData = new FormData();
          formData.append('targetPath', match.targetPath);
          formData.append('file', file, match.newName);
          
          xhr.send(formData);
        });
      } catch (err: any) {
        setMatches(prev => prev.map((m, idx) => idx === index ? { ...m, status: 'error', message: err.message } : m));
        setUploadStats(s => ({ ...s, error: s.error + 1 }));
      }
    }
    
    // Check if we need to resume
    if (isUploading) {
      // It's already running in the loop, wait for it
    } else {
      // Resume the queue if there are pending items
      if (matches.some(m => m.selected && m.status === 'pending')) {
        handleUpload();
      }
    }
  };

  const getBadgeColor = (type: MatchResult['matchType']) => {
    switch (type) {
      case 'id': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'name-high': return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'name-low': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBadgeText = (type: MatchResult['matchType']) => {
    switch (type) {
      case 'id': return t('upload.matchId');
      case 'name-high': return t('upload.matchNameHigh');
      case 'name-low': return t('upload.matchNameLow');
      case 'new': return t('upload.matchNew');
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('upload.title')}
            </h2>
          </div>
          <button onClick={onClose} disabled={isUploading} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('upload.selectRemote')}</label>
            <select 
              value={selectedRemoteId} 
              onChange={e => setSelectedRemoteId(e.target.value)}
              disabled={isUploading}
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
            >
              {remotes.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({t(`remotes.type.${r.mediaType}`)})</option>
              ))}
            </select>
          </div>
          {isScanning && (
            <div className="flex items-center gap-2 text-primary-500 text-sm mt-4 sm:mt-0">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{t('upload.scanning')}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-0">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input 
                    type="checkbox" 
                    checked={matches.length > 0 && matches.every(m => m.selected)}
                    onChange={e => setMatches(prev => prev.map(m => ({ ...m, selected: e.target.checked })))}
                    disabled={isUploading}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="p-3 font-medium text-gray-600 dark:text-gray-300">{t('upload.localFile')}</th>
                <th className="p-3 font-medium text-gray-600 dark:text-gray-300 w-1/2">{t('upload.targetPath')}</th>
                <th className="p-3 font-medium text-gray-600 dark:text-gray-300 w-24 text-center">{t('upload.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {matches.map((match, index) => (
                <tr key={match.fileId} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!match.selected ? 'opacity-50' : ''}`}>
                  <td className="p-3 text-center align-top">
                    <input 
                      type="checkbox" 
                      checked={match.selected}
                      onChange={e => setMatches(prev => prev.map((m, idx) => idx === index ? { ...m, selected: e.target.checked } : m))}
                      disabled={isUploading || match.status === 'success'}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-1"
                    />
                  </td>
                  <td className="p-3 align-top">
                    <div className="font-medium text-gray-900 dark:text-white truncate max-w-xs" title={match.newName}>
                      {match.newName}
                    </div>
                    <div className="mt-1 flex items-center">
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold ${getBadgeColor(match.matchType)}`}>
                        {getBadgeText(match.matchType)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 align-top">
                    {match.matchType === 'new' && match.status === 'pending' && match.seriesTitle && (
                      <div className="mb-2 flex items-center gap-2">
                        <input
                           type="text"
                           value={typeof manualIds[match.seriesTitle] === 'string' ? manualIds[match.seriesTitle] as string : (manualIds[match.seriesTitle] as any)?.id || ''}
                           onChange={e => setManualIds(prev => ({ ...prev, [match.seriesTitle!]: e.target.value }))}
                           placeholder={t("upload.providerIdPlaceholder")}
                           className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-800 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 outline-none"
                        />
                        {tmdbApiKeySet && (
                          <TmdbSearchDropdown 
                             initialQuery={match.seriesTitle}
                             onSelect={(id, title, year) => {
                               setManualIds(prev => ({ ...prev, [match.seriesTitle!]: { id, title, year } }));
                             }}
                          />
                        )}
                        {!manualIds[match.seriesTitle] && (
                           <div title={t("upload.noIdWarning")} className="text-amber-500 cursor-help">
                              <AlertTriangle className="w-4 h-4" />
                           </div>
                        )}
                      </div>
                    )}
                    {match.status === 'pending' || match.status === 'error' ? (
                      <input 
                        type="text" 
                        value={match.targetPath}
                        onChange={e => {
                          setCustomPaths(prev => ({ ...prev, [match.fileId]: e.target.value }));
                        }}
                        disabled={isUploading}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm font-mono text-gray-800 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    ) : (
                      <div className="font-mono text-sm text-gray-600 dark:text-gray-400 break-all bg-gray-50 dark:bg-gray-900 p-1.5 rounded">
                        {match.targetPath}
                      </div>
                    )}
                    
                    {match.status === 'conflict' && (
                      <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 text-xs font-medium">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{match.message}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleResolveConflict(index, 'skip')} className="px-2 py-1 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                            {t('upload.skip')}
                          </button>
                          <button onClick={() => handleResolveConflict(index, 'overwrite')} className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100 rounded hover:bg-amber-200 dark:hover:bg-amber-700">
                            {t('upload.overwrite')}
                          </button>
                        </div>
                      </div>
                    )}
                    {match.status === 'error' && (
                      <div className="mt-1 text-xs text-red-500 font-medium">
                        {match.message}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center align-top">
                    {match.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />}
                    {match.status === 'skipped' && <span className="text-gray-400 text-xs font-medium uppercase">{t('upload.skipped')}</span>}
                    {match.status === 'pending' && <span className="text-gray-400">-</span>}
                    {match.status === 'error' && <X className="w-5 h-5 text-red-500 mx-auto" />}
                    {match.status === 'uploading' && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1.5 overflow-hidden">
                        <div className="bg-primary-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${match.progress}%` }}></div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {matches.length === 0 && !isScanning && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400 italic">
                    {t('upload.noFiles')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {uploadStats.total > 0 && (
              <span className="font-medium">
                {uploadStats.done} / {uploadStats.total} {t('upload.done')} 
                {uploadStats.error > 0 && <span className="text-red-500 ml-2">({uploadStats.error} {t('upload.errors')})</span>}
                {uploadStats.skipped > 0 && <span className="text-amber-500 ml-2">({uploadStats.skipped} {t('upload.skipped')})</span>}
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={isUploading && matches.some(m => m.status === 'conflict')} // Can close if not uploading or just paused on conflict
              className="px-6 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              {isUploading ? t('common.cancel') : t('common.close')}
            </button>
            
            <button 
              onClick={handleUpload}
              disabled={isUploading || isScanning || matches.filter(m => m.selected && m.status === 'pending' || m.status === 'error').length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-primary-500 text-white font-medium hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{t('upload.uploading')}</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>{t('upload.startBtn')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
