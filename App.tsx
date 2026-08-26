import React, { useState, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { v4 as uuidv4 } from 'uuid';

import Dropzone from './components/Dropzone';
import FileTable from './components/FileTable';
import Sidebar from './components/Sidebar';
import LanguageSwitcher from './components/LanguageSwitcher';
import SettingsModal from './components/SettingsModal';
import RecipeBuilderModal from './components/RecipeBuilderModal';
import { DownloadIcon, SettingsIcon, SparklesIcon } from './components/icons';
import { ProcessedFile, Convention, Rule } from './types';
import { generateRenameScript } from './services/geminiService';
import { useTranslation } from './hooks/useTranslation';
import { generateScriptFromRules } from './utils';

// Default conventions
const defaultConventions: Convention[] = [
  {
    id: 'web-safe',
    name: 'conventions.webSafe',
    script: `const parts = path.split('/');
const lastPart = parts.pop() || '';

// Separate name from extension
const nameParts = lastPart.split('.');
const extension = nameParts.length > 1 ? nameParts.pop() : '';
const name = nameParts.join('.');

const newName = name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
  .replace(/--+/g, '-') // Collapse hyphens
  .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens

let finalName = newName;
if (extension) {
  finalName += '.' + extension.toLowerCase();
}

// Handle hidden files like .DS_Store correctly
if (lastPart.startsWith('.') && !newName) {
    finalName = '.' + extension.toLowerCase();
}

parts.push(finalName);
return parts.join('/');`,
  },
  {
    id: 'remove-spaces',
    name: 'conventions.removeSpaces',
    script: `return path.replace(/\\s+/g, '');`,
  },
  {
    id: 'rename-series',
    name: 'conventions.renameSeries',
    script: `// Example: "My.Show.S01E02.mkv" -> "My Show/Season 01/My Show - s01e02.mkv"
// This is a complex example and might need adjustments for your specific file names.
if (isDirectory) return path;

const parts = path.split('/');
const filename = parts.pop() || '';

const match = filename.match(/(.*?)[.sS](\\d+)[.eE](\\d+)/);

if (match) {
  const showName = match[1].replace(/\\./g, ' ').trim();
  const season = match[2].padStart(2, '0');
  const episode = match[3].padStart(2, '0');
  
  // Note: This script creates new directories.
  // The zipping process will handle creation of these folders.
  return \`\${showName}/Season \${season}/\${showName} - s\${season}e\${episode}.mkv\`;
}

return path; // Return original path if no match`,
  },
  {
    id: 'jellyfin-movies',
    name: 'conventions.jellyfinMovies',
    requiresProviderCode: true,
    script: `// Jellyfin Movie Convention
// Uses folder name or file name to extract Title and Year, and appends [tmdbid-XXX] or [imdbid-XXX]
if (isDirectory) return path;

const parts = path.split('/');
const filename = parts.pop() || '';
const match = filename.match(/^(.*?)(?:\\s*\\(?(\\d{4})\\)?)?(?:\\s*\\[.*\\])?(\\.[^.]+)$/);

if (match) {
  const title = match[1].replace(/\\./g, ' ').trim();
  const year = match[2] ? \` (\${match[2]})\` : '';
  const ext = match[3] || '';
  
  const code = providerCode ? \` [\${providerCode}]\` : '';
  return \`\${title}\${year}\${code}\${ext}\`;
}

return path;`,
  },
  {
    id: 'jellyfin-series',
    name: 'conventions.jellyfinSeries',
    requiresProviderCode: true,
    script: `// Jellyfin Series Convention
// Extracts Series Title, Year, Season, and Episode. Appends Provider Code to Series Folder and Episode file.
// E.g. "Series.Name.2023.S01E02.mkv" -> "Series Name (2023) [tmdbid-123]/Season 01/Series Name (2023) S01E02 [tmdbid-123].mkv"
if (isDirectory) return path;

const parts = path.split('/');
const filename = parts.pop() || '';

// Regex to capture Show Name, optional Year, Season, Episode, and Extension
const match = filename.match(/(.*?)(?:\\s*\\(?(\\d{4})\\)?)?[.sS](\\d+)[.eE](\\d+)(?:.*?)(\\.[^.]+)$/);

if (match) {
  const showName = match[1].replace(/\\./g, ' ').trim();
  const year = match[2] ? \` (\${match[2]})\` : '';
  const season = match[3].padStart(2, '0');
  const episode = match[4].padStart(2, '0');
  const ext = match[5] || '';
  
  const code = providerCode ? \` [\${providerCode}]\` : '';
  const folderName = \`\${showName}\${year}\${code}\`;
  
  return \`\${folderName}/Season \${season}/\${showName}\${year} S\${season}E\${episode}\${code}\${ext}\`;
}

return path;`,
  },
];


const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [script, setScript] = useState<string>(`return path.toLowerCase().replace(/\\s+/g, '-');`);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedConventions, setSavedConventions] = useState<Convention[]>([]);
  const [ignoreList, setIgnoreList] = useState<string>('.DS_Store\nthumbs.db');
  const [providerCode, setProviderCode] = useState<string>('');
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'info' | 'success' } | null>(null);
  
  
  const [appMode, setAppMode] = useState<'upload' | 'direct'>('upload');
  const [rootHandle, setRootHandle] = useState<any>(null);
  const [undoHistory, setUndoHistory] = useState<{ originalPath: string, newPath: string }[] | null>(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameProgress, setRenameProgress] = useState<{current: number, total: number, message: string} | null>(null);
  const [renameResult, setRenameResult] = useState<{success: number, skipped: number, errors: string[]} | null>(null);

  const { t } = useTranslation();

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isVisualBuilderOpen, setIsVisualBuilderOpen] = useState<boolean>(false);

  // Load saved conventions and ignore list from local storage on mount
  useEffect(() => {
    try {
      const storedConventions = localStorage.getItem('renamer-conventions');
      if (storedConventions) {
        setSavedConventions(JSON.parse(storedConventions));
      } else {
        setSavedConventions(defaultConventions);
      }
      const storedIgnoreList = localStorage.getItem('renamer-ignore-list');
      if (storedIgnoreList) {
        setIgnoreList(storedIgnoreList);
      }
    } catch (e) {
      setError(t('app.error.conventions.load'));
      setSavedConventions(defaultConventions);
    }
  }, [t]);

  // Save conventions to local storage
  useEffect(() => {
    try {
      localStorage.setItem('renamer-conventions', JSON.stringify(savedConventions));
    } catch (e) {
      setError(t('app.error.conventions.save'));
    }
  }, [savedConventions, t]);

  // Save ignore list to local storage
  useEffect(() => {
    try {
      localStorage.setItem('renamer-ignore-list', ignoreList);
    } catch (e) {
      setError(t('app.error.ignoreList.save'));
    }
  }, [ignoreList, t]);

  // This is the core renaming logic. It runs whenever files, script or ignore list changes.
  const processedFiles = useMemo(() => {
    if (files.length === 0) return [];
    
    let renameFn: (path: string, isDirectory: boolean, providerCode: string) => string;
    try {
      renameFn = new Function('path', 'isDirectory', 'providerCode', script) as (path: string, isDirectory: boolean, providerCode: string) => string;
    } catch (e) {
      console.error("Script error:", e);
      // If script is invalid, return files with original path as new path
      return files.map(f => ({ ...f, newPath: f.originalPath }));
    }

    const ignorePatterns = ignoreList
      .split('\n')
      .map(p => p.trim().toLowerCase())
      .filter(p => p.length > 0);

    const result = files
      .filter(file => {
        const path = file.originalPath.toLowerCase();
        // If any part of the ignore list is in the path, it's ignored.
        const isIgnored = ignorePatterns.some(p => path.includes(p));
        return !isIgnored;
      })
      .map(file => {
        try {
          const newPath = renameFn(file.originalPath, file.isDirectory, providerCode);
          return { ...file, newPath };
        } catch (e) {
          console.error(`Error processing file "${file.originalPath}":`, e);
          // If an error occurs for one file, don't change its path
          return { ...file, newPath: file.originalPath };
        }
      });

    // Detect Collisions
    const newPathCounts = new Map<string, number>();
    for (const f of result) {
      if (!f.isDirectory) {
        newPathCounts.set(f.newPath, (newPathCounts.get(f.newPath) || 0) + 1);
      }
    }

    for (const f of result) {
      if (!f.isDirectory) {
        f.hasCollision = (newPathCounts.get(f.newPath) || 0) > 1;
      }
    }

    return result;
  }, [files, script, ignoreList, providerCode]);
  
  
  const finalizeFiles = useCallback((processed: ProcessedFile[]) => {
      // Sort to ensure directories appear before their files
      processed.sort((a, b) => a.originalPath.localeCompare(b.originalPath));

      // PRE-SCAN LOGIC
      let detectedType: 'series' | 'movie' | null = null;
      let potentialTitle = '';
      let detectedResolution = '';
      let detectedCodec = '';
      let detectedAudio = '';

      const mediaExts = ['.mp4', '.mkv', '.avi', '.m4v', '.ts'];
      for (const f of processed) {
         if (f.isDirectory) continue;
         const name = f.originalPath.split('/').pop() || '';
         const lowerName = name.toLowerCase();

         if (mediaExts.some(ext => lowerName.endsWith(ext))) {
             if (/[sS]\d{2}[eE]\d{2}/.test(name)) {
                 detectedType = 'series';
                 const match = name.match(/^(.*?)[sS]\d{2}/);
                 if (match && match[1]) potentialTitle = match[1].replace(/[\._]/g, ' ').trim();
             } else if (/\((19|20)\d{2}\)/.test(name) || /(19|20)\d{2}/.test(name)) {
                 if (detectedType !== 'series') {
                     detectedType = 'movie';
                     const match = name.match(/^(.*?)\(?(19|20)\d{2}/);
                     if (match && match[1]) potentialTitle = match[1].replace(/[\._]/g, ' ').trim();
                 }
             }
             
             // Extract Metadata
             if (!detectedResolution) {
                 const resMatch = lowerName.match(/(1080p|720p|2160p|4k|480p)/);
                 if (resMatch) detectedResolution = resMatch[1];
             }
             if (!detectedCodec) {
                 const codMatch = lowerName.match(/(x264|x265|h264|h265|hevc|av1)/);
                 if (codMatch) detectedCodec = codMatch[1];
             }
             if (!detectedAudio) {
                 const audMatch = name.match(/\b(DL|Dual[\.\-\s]?Audio|Multi|GER|ENG|DE|EN)\b/i);
                 if (audMatch) detectedAudio = audMatch[1].toUpperCase();
             }
         }
      }

      const metadataParts = [detectedResolution, detectedCodec, detectedAudio].filter(Boolean);
      const metadataStr = metadataParts.length > 0 ? metadataParts.join(' ') : '';

      if (detectedType === 'series') {
          const conv = defaultConventions.find(c => c.id === 'jellyfin-series');
          if (conv) {
              let finalScript = conv.script;
              if (metadataStr) {
                  finalScript = finalScript.replace('${code}${ext}', `\${code} - ${metadataStr}\${ext}`);
              }
              setScript(finalScript);
              
              let msg = t('app.scan.seriesDetected') + (potentialTitle ? ` - ${t('app.scan.titleExtracted')}"${potentialTitle}"` : '');
              if (metadataStr) msg += ` | Meta: ${metadataStr}`;
              setScanMessage({ text: msg, type: 'success' });
          }
      } else if (detectedType === 'movie') {
          const conv = defaultConventions.find(c => c.id === 'jellyfin-movies');
          if (conv) {
              let finalScript = conv.script;
              if (metadataStr) {
                  finalScript = finalScript.replace('${code}${ext}', `\${code} - ${metadataStr}\${ext}`);
              }
              setScript(finalScript);

              let msg = t('app.scan.movieDetected') + (potentialTitle ? ` - ${t('app.scan.titleExtracted')}"${potentialTitle}"` : '');
              if (metadataStr) msg += ` | Meta: ${metadataStr}`;
              setScanMessage({ text: msg, type: 'success' });
          }
      } else if (metadataStr) {
          setScanMessage({ text: `Detected Metadata: ${metadataStr}`, type: 'info' });
      }

      setFiles(processed);
      setIsProcessing(false);
  }, [t]);

  const scanDirectory = async (dirHandle: any, path: string = '', processed: ProcessedFile[] = [], dirPaths: Set<string> = new Set()) => {
    for await (const entry of dirHandle.values()) {
      const fullPath = path ? `${path}/${entry.name}` : entry.name;
      const parts = fullPath.split('/');
      
      if (entry.kind === 'file') {
        // Ensure directories are created
        for (let i = 1; i < parts.length; i++) {
          const dirPath = parts.slice(0, i).join('/');
          if (!dirPaths.has(dirPath)) {
            processed.push({
              id: uuidv4(),
              originalPath: dirPath,
              newPath: dirPath,
              file: null,
              isDirectory: true,
              size: 0,
              depth: i - 1,
            });
            dirPaths.add(dirPath);
          }
        }
        
        const file = await entry.getFile();
        processed.push({
          id: uuidv4(),
          originalPath: fullPath,
          newPath: fullPath,
          file: null, // Minimal memory usage
          isDirectory: false,
          size: file.size,
          depth: parts.length - 1,
          handle: entry,
          parentHandle: dirHandle,
        });
      } else if (entry.kind === 'directory') {
          if (!dirPaths.has(fullPath)) {
            processed.push({
              id: uuidv4(),
              originalPath: fullPath,
              newPath: fullPath,
              file: null,
              isDirectory: true,
              size: 0,
              depth: parts.length - 1,
              handle: entry,
              parentHandle: dirHandle,
            });
            dirPaths.add(fullPath);
          }
          await scanDirectory(entry, fullPath, processed, dirPaths);
      }
    }
    return processed;
  };

  const handleDirectorySelected = useCallback(async (dirHandle: any) => {
    setIsProcessing(true);
    setError(null);
    setScanMessage(null);
    setAppMode('direct');
    setRootHandle(dirHandle);
    
    try {
        const processed = await scanDirectory(dirHandle);
        finalizeFiles(processed);
    } catch (e) {
        console.error('Scan error:', e);
        setError('Error scanning directory');
        setIsProcessing(false);
    }
  }, [finalizeFiles]);

  const handleFilesProcessed = useCallback((droppedFiles: File[]) => {
    setAppMode('upload');
    setIsProcessing(true);
    setError(null);
    setScanMessage(null);

    // Using setTimeout to allow UI to update to "Processing..."
    setTimeout(() => {
      const processed: ProcessedFile[] = [];
      const directoryPaths = new Set<string>();

      droppedFiles.forEach(file => {
        // 'webkitRelativePath' is the key to getting folder structure
        const path = (file as any).webkitRelativePath || file.name;
        const parts = path.split('/');

        // Create directory entries if they don't exist
        for (let i = 1; i < parts.length; i++) {
          const dirPath = parts.slice(0, i).join('/');
          if (!directoryPaths.has(dirPath)) {
            processed.push({
              id: uuidv4(),
              originalPath: dirPath,
              newPath: dirPath,
              file: null,
              isDirectory: true,
              size: 0,
              depth: i - 1,
            });
            directoryPaths.add(dirPath);
          }
        }

        processed.push({
          id: uuidv4(),
          originalPath: path,
          newPath: path,
          file: file,
          isDirectory: false,
          size: file.size,
          depth: parts.length - 1,
        });
      });
      
      finalizeFiles(processed);
    }, 100);
  }, [finalizeFiles]);

  const handleGenerateWithAI = useCallback(async (prompt: string) => {
    setIsAiLoading(true);
    setError(null);
    try {
      const generatedScript = await generateRenameScript(prompt);
      setScript(generatedScript);
    } catch (e) {
      setError(t('app.error.ai'));
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  }, [t]);

  const handleSaveConvention = useCallback((name: string, scriptToSave: string) => {
    const newConvention: Convention = {
      id: uuidv4(),
      name,
      script: scriptToSave,
    };
    setSavedConventions(prev => [...prev, newConvention]);
    setScript(scriptToSave);
  }, []);

  const handleSaveVisualRecipe = useCallback((name: string, rules: Rule[]) => {
    const generatedScript = generateScriptFromRules(rules);
    const newConvention: Convention = {
      id: uuidv4(),
      name,
      script: generatedScript,
      rules,
    };
    setSavedConventions(prev => [...prev, newConvention]);
    setScript(generatedScript);
  }, []);

  const handleDeleteConvention = useCallback((id: string) => {
    // Prevent deleting default conventions
    if (defaultConventions.some(c => c.id === id)) return;
    setSavedConventions(prev => prev.filter(c => c.id !== id));
  }, []);

  
  
  const handleApplyInPlace = async () => {
    if (!rootHandle || processedFiles.length === 0) return;
    
    const filesToRename = processedFiles.filter(f => !f.isDirectory && f.originalPath !== f.newPath && !f.hasCollision);
    if (filesToRename.length === 0) {
       setError("No files to rename or all have collisions.");
       return;
    }

    if (!window.confirm(t('app.directMode.confirmMessage') + ` (${filesToRename.length} files)`)) {
       return;
    }

    setIsRenaming(true);
    let successCount = 0;
    let skipCount = 0;
    let errors: string[] = [];
    const successfulRenames: {originalPath: string, newPath: string}[] = [];

    // Helper to get or create directory handle recursively
    const getDirectoryHandleRecursively = async (baseHandle: any, pathParts: string[]) => {
       let currentHandle = baseHandle;
       for (const part of pathParts) {
           if (!part) continue;
           currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
       }
       return currentHandle;
    };

    for (let i = 0; i < filesToRename.length; i++) {
        const file = filesToRename[i];
        setRenameProgress({ current: i + 1, total: filesToRename.length, message: file.originalPath });
        
        try {
            const newPathParts = file.newPath.split('/');
            const newName = newPathParts.pop() || '';
            const newDirParts = newPathParts;
            
            const origPathParts = file.originalPath.split('/');
            origPathParts.pop(); // remove filename
            
            const targetDirHandle = await getDirectoryHandleRecursively(rootHandle, newDirParts);
            
            // Check if file already exists in target
            try {
                await targetDirHandle.getFileHandle(newName, { create: false });
                // File exists, skip
                skipCount++;
                errors.push(`Skipped: ${newName} already exists.`);
                continue;
            } catch (e) {
                // Not found, we can proceed
            }
            
            if (origPathParts.join('/') === newDirParts.join('/')) {
                // Same directory, just rename
                if (typeof file.handle.move === 'function') {
                    await file.handle.move(newName);
                    successCount++;
                    successfulRenames.push({ originalPath: file.originalPath, newPath: file.newPath });
                } else {
                    throw new Error("move API not supported on this browser");
                }
            } else {
                // Cross-directory move
                try {
                    if (typeof file.handle.move === 'function') {
                        await file.handle.move(targetDirHandle, newName);
                        successCount++;
                        successfulRenames.push({ originalPath: file.originalPath, newPath: file.newPath });
                    } else {
                        throw new Error("move API not supported on this browser");
                    }
                } catch (e) {
                    // Fallback to copy & delete
                    console.warn(`Fallback copy for ${file.originalPath}`);
                    const src = await file.handle.getFile();
                    const dest = await targetDirHandle.getFileHandle(newName, { create: true });
                    const w = await dest.createWritable();
                    await src.stream().pipeTo(w);
                    await file.parentHandle.removeEntry(file.originalPath.split('/').pop());
                    successCount++;
                    successfulRenames.push({ originalPath: file.originalPath, newPath: file.newPath });
                }
            }
        } catch (err: any) {
            console.error(`Error renaming ${file.originalPath}:`, err);
            errors.push(`Failed: ${file.originalPath} (${err.message})`);
        }
    }
    
    // Clean up empty directories
    const dirs = processedFiles.filter(f => f.isDirectory).sort((a, b) => b.depth - a.depth);
    for (const d of dirs) {
        try {
            const parts = d.originalPath.split('/');
            const dirName = parts.pop() || '';
            let parentHandle = rootHandle;
            if (parts.length > 0) {
                 parentHandle = await getDirectoryHandleRecursively(rootHandle, parts);
            }
            const dirHandle = await parentHandle.getDirectoryHandle(dirName, { create: false });
            
            let isEmpty = true;
            for await (const _ of dirHandle.values()) {
                isEmpty = false;
                break;
            }
            if (isEmpty) {
                await parentHandle.removeEntry(dirName);
            }
        } catch (e) {
           // Ignore
        }
    }

    setRenameResult({ success: successCount, skipped: skipCount, errors });
    if (successfulRenames.length > 0) {
        setUndoHistory(successfulRenames);
    } else {
        setUndoHistory(null);
    }
    
    // Rescan
    try {
        const processed = await scanDirectory(rootHandle);
        finalizeFiles(processed);
    } catch(e) {
    }

    setIsRenaming(false);
    setRenameProgress(null);
  };

  const handleUndoDirect = async () => {
      if (!rootHandle || !undoHistory || undoHistory.length === 0) return;
      
      setIsRenaming(true);
      let successCount = 0;
      let skipCount = 0;
      let errors: string[] = [];

      const getDirectoryHandleRecursively = async (baseHandle: any, pathParts: string[]) => {
         let currentHandle = baseHandle;
         for (const part of pathParts) {
             if (!part) continue;
             currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
         }
         return currentHandle;
      };

      // Undo in reverse order
      for (let i = undoHistory.length - 1; i >= 0; i--) {
          const { originalPath, newPath } = undoHistory[i];
          setRenameProgress({ current: undoHistory.length - i, total: undoHistory.length, message: `Undoing: ${newPath}` });
          
          try {
              const srcPathParts = newPath.split('/');
              const srcName = srcPathParts.pop() || '';
              const destPathParts = originalPath.split('/');
              const destName = destPathParts.pop() || '';
              
              const srcDirHandle = await getDirectoryHandleRecursively(rootHandle, srcPathParts);
              const destDirHandle = await getDirectoryHandleRecursively(rootHandle, destPathParts);
              
              const srcFileHandle = await srcDirHandle.getFileHandle(srcName, { create: false });
              
              try {
                  await destDirHandle.getFileHandle(destName, { create: false });
                  skipCount++;
                  errors.push(`Skipped: ${destName} already exists.`);
                  continue;
              } catch(e) {}
              
              if (srcPathParts.join('/') === destPathParts.join('/')) {
                  if (typeof srcFileHandle.move === 'function') {
                      await srcFileHandle.move(destName);
                      successCount++;
                  } else {
                       throw new Error("move API not supported");
                  }
              } else {
                  try {
                      if (typeof srcFileHandle.move === 'function') {
                          await srcFileHandle.move(destDirHandle, destName);
                          successCount++;
                      } else {
                          throw new Error("move API not supported");
                      }
                  } catch(e) {
                      const srcFile = await srcFileHandle.getFile();
                      const destHandle = await destDirHandle.getFileHandle(destName, { create: true });
                      const w = await destHandle.createWritable();
                      await srcFile.stream().pipeTo(w);
                      await srcDirHandle.removeEntry(srcName);
                      successCount++;
                  }
              }
          } catch (err: any) {
              console.error(`Error undoing ${newPath}:`, err);
              errors.push(`Failed to undo ${newPath}: ${err.message}`);
          }
      }
      
      // Cleanup empty dirs, we scan the whole root handle for empty dirs?
      // Since it's hard to track all created dirs during undo, we just rescan and do nothing, or we can use the same logic if we tracked it.
      // A quick cleanup:
      const dirs = processedFiles.filter(f => f.isDirectory).sort((a, b) => b.depth - a.depth);
      for (const d of dirs) {
          try {
              const parts = d.originalPath.split('/');
              const dirName = parts.pop() || '';
              let parentHandle = rootHandle;
              if (parts.length > 0) {
                   parentHandle = await getDirectoryHandleRecursively(rootHandle, parts);
              }
              const dirHandle = await parentHandle.getDirectoryHandle(dirName, { create: false });
              let isEmpty = true;
              for await (const _ of dirHandle.values()) {
                  isEmpty = false;
                  break;
              }
              if (isEmpty) {
                  await parentHandle.removeEntry(dirName);
              }
          } catch (e) {}
      }
      
      setUndoHistory(null); // Clear undo history
      setRenameResult({ success: successCount, skipped: skipCount, errors });
      
      try {
          const processed = await scanDirectory(rootHandle);
          finalizeFiles(processed);
      } catch(e) {}
      
      setIsRenaming(false);
      setRenameProgress(null);
  };

  const handleDownloadZip = useCallback(async () => {
    if (processedFiles.length === 0) return;

    setIsZipping(true);
    setError(null);
    const zip = new JSZip();

    try {
      for (const file of processedFiles) {
        if (!file.isDirectory && file.file) {
          zip.file(file.newPath, file.file);
        } else if (file.isDirectory) {
          // JSZip creates directories automatically from file paths,
          // but we can add them explicitly if we want to ensure empty dirs are included.
          zip.folder(file.newPath);
        }
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'renamed-files.zip');
    } catch (e) {
      console.error("Zipping error:", e);
      setError(t('app.error.zip'));
    } finally {
      setIsZipping(false);
    }
  }, [processedFiles, t]);

  const handleDownloadScript = useCallback(() => {
    if (processedFiles.length === 0) return;
    
    let scriptContent = "#!/bin/bash\n# Automatically generated rename script by File Renamer Pro\n\n";
    
    // We only process files (ignore directories, let the moves handle them or create them)
    // Actually for bash, we should create directories first
    const dirsToCreate = new Set<string>();
    
    processedFiles.forEach(f => {
       if (f.originalPath !== f.newPath) {
           const parts = f.newPath.split('/');
           parts.pop(); // remove filename
           if (parts.length > 0) {
               dirsToCreate.add(parts.join('/'));
           }
       }
    });

    if (dirsToCreate.size > 0) {
        scriptContent += "echo \"Creating directories...\"\n";
        dirsToCreate.forEach(dir => {
            scriptContent += `mkdir -p "${dir}"\n`;
        });
        scriptContent += "\n";
    }

    scriptContent += "echo \"Renaming files...\"\n";
    processedFiles.forEach(f => {
        if (!f.isDirectory && f.originalPath !== f.newPath) {
            scriptContent += `mv "${f.originalPath}" "${f.newPath}"\n`;
        }
    });

    scriptContent += "echo \"Done!\"\n";

    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'rename.sh');
  }, [processedFiles]);

  const handleStartOver = () => {
    setFiles([]);
    setError(null);
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-950 text-gray-200 font-sans">
      {files.length > 0 && (
        <Sidebar
          script={script}
          setScript={setScript}
          savedConventions={savedConventions}
          onSaveConvention={handleSaveConvention}
          onDeleteConvention={handleDeleteConvention}
          onGenerateWithAI={handleGenerateWithAI}
          isAiLoading={isAiLoading}
          providerCode={providerCode}
          onProviderCodeChange={setProviderCode}
          onOpenVisualBuilder={() => setIsVisualBuilderOpen(true)}
        />
      )}
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden relative">
        <header className="flex justify-between items-start md:items-center mb-6 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">{t('app.title')}</h1>
            <p className="text-gray-500 mt-1">{t('app.description')}</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-400 hover:text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors border border-gray-800"
              title={t('settings.title')}
            >
              <SettingsIcon />
            </button>
            <LanguageSwitcher />
          </div>
        </header>

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          ignoreList={ignoreList} 
          onIgnoreListChange={setIgnoreList} 
        />

        
        {isRenaming && renameProgress && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
               <h3 className="text-xl font-bold text-gray-100 mb-4">{t('app.directMode.progressTitle')}</h3>
               <div className="w-full bg-gray-800 rounded-full h-4 mb-2 overflow-hidden">
                 <div className="bg-primary-500 h-4 rounded-full transition-all duration-300" style={{ width: `${(renameProgress.current / renameProgress.total) * 100}%` }}></div>
               </div>
               <p className="text-sm text-gray-400 text-center mb-1">
                 {renameProgress.current} / {renameProgress.total}
               </p>
               <p className="text-xs text-gray-500 text-center truncate">
                 {renameProgress.message}
               </p>
             </div>
           </div>
        )}

        {renameResult && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[80vh] flex flex-col">
               <h3 className="text-xl font-bold text-green-400 mb-2">Done!</h3>
               <p className="text-gray-300 mb-4">
                 {t('app.directMode.successMessage').replace('{{count}}', String(renameResult.success)).replace('{{skipped}}', String(renameResult.skipped))}
               </p>
               {renameResult.errors.length > 0 && (
                 <div className="flex-1 overflow-y-auto bg-gray-950 p-3 rounded-lg border border-red-900/50 mb-4">
                   <p className="text-red-400 text-sm font-bold mb-2">Errors:</p>
                   <ul className="text-xs text-red-300/80 space-y-1 font-mono">
                     {renameResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                   </ul>
                 </div>
               )}
               <button onClick={() => setRenameResult(null)} className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                 {t('app.directMode.close')}
               </button>
             </div>
           </div>
        )}

        <RecipeBuilderModal
          isOpen={isVisualBuilderOpen}
          onClose={() => setIsVisualBuilderOpen(false)}
          onSave={handleSaveVisualRecipe}
        />

        {error && (
          <div className="bg-red-900/50 border border-red-700/50 text-red-200 px-4 py-3 rounded-lg relative mb-6 flex-shrink-0 animate-fade-in" role="alert">
            <strong className="font-bold">{t('app.error.title')}: </strong>
            <span className="block sm:inline">{error}</span>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3 opacity-70 hover:opacity-100 transition-opacity">
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        )}

        <div className={`flex-grow overflow-y-auto ${files.length === 0 ? 'flex items-center justify-center' : 'flex flex-col'}`}>
          {files.length === 0 ? (
            <div className="w-full max-w-4xl animate-fade-in-up">
              <Dropzone onFilesProcessed={handleFilesProcessed} isProcessing={isProcessing} onDirectorySelected={handleDirectorySelected} />
            </div>
          ) : (
            <>
              {scanMessage && (
                <div className={`mb-4 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm animate-fade-in-up ${scanMessage.type === 'success' ? 'bg-primary-900/20 border border-primary-500/30 text-primary-200' : 'bg-gray-800 border border-gray-700 text-gray-200'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{scanMessage.type === 'success' ? '✨' : 'ℹ️'}</span>
                    <span className="font-medium text-sm">{scanMessage.text}</span>
                  </div>
                  <button onClick={() => setScanMessage(null)} className="opacity-70 hover:opacity-100 transition-opacity">
                    <span className="text-xl">&times;</span>
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <FileTable files={processedFiles} />
              </div>
            </>
          )}
        </div>

        {files.length > 0 && (
          <footer className="flex justify-end items-center gap-4 pt-4 mt-auto flex-shrink-0">
            <button 
              onClick={handleStartOver}
              className="bg-gray-800 text-gray-200 font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {t('app.startOver')}
            </button>
            
            
            <button
              onClick={handleDownloadScript}
              className="flex items-center gap-2 bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <DownloadIcon />
              <span>{t('common.downloadScript')}</span>
            </button>
            {appMode === 'direct' && undoHistory && undoHistory.length > 0 && (
              <button
                onClick={handleUndoDirect}
                disabled={isRenaming}
                className="flex items-center gap-2 bg-amber-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-amber-600 transition-colors disabled:bg-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span>{t('app.directMode.undoButton')}</span>
              </button>
            )}
            {appMode === 'direct' ? (
              <button
                onClick={handleApplyInPlace}
                disabled={isRenaming}
                className="flex items-center gap-2 bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors disabled:bg-gray-600"
              >
                {isRenaming ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('app.renaming')}</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon />
                    <span>{t('app.renameDirectly')}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="flex items-center gap-2 bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors disabled:bg-gray-600"
              >
                {isZipping ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('app.zipping')}</span>
                  </>
                ) : (
                  <>
                    <DownloadIcon />
                    <span>{t('app.downloadZip')}</span>
                  </>
                )}
              </button>
            )}

          </footer>
        )}
      </main>
    </div>
  );
};

export default App;