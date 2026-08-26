import re

with open('App.tsx', 'r') as f:
    content = f.read()

state_insert = """
  const [appMode, setAppMode] = useState<'upload' | 'direct'>('upload');
  const [rootHandle, setRootHandle] = useState<any>(null);
  const [undoHistory, setUndoHistory] = useState<{ originalPath: string, newPath: string }[] | null>(null);
"""
content = re.sub(
    r"const \[appMode, setAppMode\] = useState<'upload' \| 'direct'>\('upload'\);\n  const \[rootHandle, setRootHandle\] = useState<any>\(null\);",
    state_insert,
    content
)

# Replace handleApplyInPlace
handleApplyInPlace_new = """
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
"""

# Replace handleApplyInPlace and insert handleUndoDirect
match = re.search(r'const handleApplyInPlace = async \(\) => \{.*?\n  const handleDownloadZip', content, re.DOTALL)
if match:
    content = content.replace(match.group(0), handleApplyInPlace_new + "\n  const handleDownloadZip")

with open('App.tsx', 'w') as f:
    f.write(content)

