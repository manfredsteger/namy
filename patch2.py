import re

with open('App.tsx', 'r') as f:
    content = f.read()

finalize_method = """
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
                 if (match && match[1]) potentialTitle = match[1].replace(/[\\._]/g, ' ').trim();
             } else if (/\((19|20)\d{2}\)/.test(name) || /(19|20)\d{2}/.test(name)) {
                 if (detectedType !== 'series') {
                     detectedType = 'movie';
                     const match = name.match(/^(.*?)\(?(19|20)\d{2}/);
                     if (match && match[1]) potentialTitle = match[1].replace(/[\\._]/g, ' ').trim();
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
                 const audMatch = name.match(/\\b(DL|Dual[\\.\\-\\s]?Audio|Multi|GER|ENG|DE|EN)\\b/i);
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
                  finalScript = finalScript.replace('${code}${ext}', `\\${code} - ${metadataStr}\\${ext}`);
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
                  finalScript = finalScript.replace('${code}${ext}', `\\${code} - ${metadataStr}\\${ext}`);
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
"""

match = re.search(r'// Sort to ensure directories appear before their files.*?setIsProcessing\(false\);\n    \}, 100\);\n  \}, \[t\]\);', content, re.DOTALL)
if match:
    content = content.replace(match.group(0), "finalizeFiles(processed);\n    }, 100);\n  }, [finalizeFiles]);")

content = content.replace("const handleFilesProcessed = useCallback((droppedFiles: File[]) => {", finalize_method + "\n  const handleFilesProcessed = useCallback((droppedFiles: File[]) => {\n    setAppMode('upload');")

content = content.replace('<Dropzone onFilesProcessed={handleFilesProcessed} isProcessing={isProcessing} />', '<Dropzone onFilesProcessed={handleFilesProcessed} isProcessing={isProcessing} onDirectorySelected={handleDirectorySelected} />')

with open('App.tsx', 'w') as f:
    f.write(content)

