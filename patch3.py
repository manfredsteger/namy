import re

with open('App.tsx', 'r') as f:
    content = f.read()

handle_apply = """
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
                } else {
                    throw new Error("move API not supported on this browser");
                }
            } else {
                // Cross-directory move
                try {
                    if (typeof file.handle.move === 'function') {
                        await file.handle.move(targetDirHandle, newName);
                        successCount++;
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
                }
            }
        } catch (err: any) {
            console.error(`Error renaming ${file.originalPath}:`, err);
            errors.push(`Failed: ${file.originalPath} (${err.message})`);
        }
    }
    
    // Clean up empty directories
    // We sort directories by depth descending so we clean up deepest first
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
            
            // Check if empty
            let isEmpty = true;
            for await (const _ of dirHandle.values()) {
                isEmpty = false;
                break;
            }
            if (isEmpty) {
                await parentHandle.removeEntry(dirName);
            }
        } catch (e) {
           // Ignore cleanup errors
        }
    }

    setRenameResult({ success: successCount, skipped: skipCount, errors });
    
    // Rescan
    try {
        const processed = await scanDirectory(rootHandle);
        finalizeFiles(processed);
    } catch(e) {
        // Rescan failed
    }

    setIsRenaming(false);
    setRenameProgress(null);
  };
"""

content = content.replace("const handleDownloadZip = useCallback(async () => {", handle_apply + "\n  const handleDownloadZip = useCallback(async () => {")

buttons_replace = """
            <button
              onClick={handleDownloadScript}
              className="flex items-center gap-2 bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <DownloadIcon />
              <span>{t('common.downloadScript')}</span>
            </button>
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
"""
content = re.sub(r'<button\s*onClick=\{handleDownloadScript\}.*?<span>\{t\(\'app.downloadZip\'\)\}</span>\s*</>\s*\)\}\s*</button>', buttons_replace, content, flags=re.DOTALL)

modal_insert = """
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
"""

content = content.replace("<RecipeBuilderModal", modal_insert + "\n        <RecipeBuilderModal")

with open('App.tsx', 'w') as f:
    f.write(content)

