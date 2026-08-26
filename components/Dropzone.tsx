import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

interface DropzoneProps {
  onFilesProcessed: (files: File[]) => void;
  isProcessing: boolean;
  onDirectorySelected?: (dirHandle: any) => void;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFilesProcessed, isProcessing, onDirectorySelected }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const { t } = useTranslation();
  
  const supportsFileSystemAccess = 'showDirectoryPicker' in window;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.items) {
      const filePromises: Promise<File[]>[] = [];
      const items = Array.from(e.dataTransfer.items);

      const traverseFileTree = async (entry: any): Promise<File[]> => {
          let files: File[] = [];
          if (entry.isFile) {
              return new Promise((resolve, reject) => {
                  entry.file((file: File) => {
                      const newFile = new File([file], entry.fullPath.slice(1), { type: file.type });
                      Object.defineProperty(newFile, 'webkitRelativePath', {
                          value: entry.fullPath.slice(1)
                      });
                      resolve([newFile]);
                  }, reject);
              });
          } else if (entry.isDirectory) {
              const dirReader = entry.createReader();
              const readEntries = (): Promise<any[]> => new Promise((resolve, reject) => {
                  dirReader.readEntries(resolve, reject);
              });
              
              let entries = await readEntries();
              while (entries.length > 0) {
                  for (const childEntry of entries) {
                      files.push(...await traverseFileTree(childEntry));
                  }
                  entries = await readEntries();
              }
          }
          return files;
      };

      for (const item of items) {
          const entry = (item as any).webkitGetAsEntry();
          if (entry) {
              filePromises.push(traverseFileTree(entry));
          }
      }
      
      const allFilesNested = await Promise.all(filePromises);
      onFilesProcessed(allFilesNested.flat());
    } else if (e.dataTransfer.files) {
      onFilesProcessed(Array.from(e.dataTransfer.files));
    }
  }, [onFilesProcessed]);

  const handleDirectFolderSelect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // prevent input type="file" from triggering
    if (!supportsFileSystemAccess || !onDirectorySelected) return;
    
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      onDirectorySelected(dirHandle);
    } catch (e) {
      console.log('User cancelled or error:', e);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`relative w-full h-full min-h-[400px] border-2 border-dashed rounded-2xl transition-all duration-300 flex flex-col justify-center items-center p-12 text-center overflow-hidden group
        ${isDragActive ? 'border-primary-500 bg-primary-900/10' : 'border-gray-700 bg-gray-900/50 hover:bg-gray-800/80 hover:border-gray-500'}
        ${isProcessing ? 'cursor-wait' : 'cursor-pointer'}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {isProcessing ? (
          <div className="flex flex-col items-center z-10">
             <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mb-6"></div>
             <p className="text-xl font-medium text-gray-200">{t('dropzone.processing')}</p>
             <p className="text-sm text-gray-500 mt-2">{t('dropzone.processingHint')}</p>
          </div>
      ) : (
        <div className="flex flex-col items-center z-10 w-full max-w-md">
            <div className={`p-6 rounded-full mb-6 transition-colors ${isDragActive ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-800 text-gray-500 group-hover:text-gray-300'}`}>
                <UploadIcon className="w-12 h-12" />
            </div>
            <p className="text-2xl font-semibold text-gray-200 mb-2">{t('dropzone.title')}</p>
            <p className="text-gray-500 text-sm mb-8">{t('dropzone.subtitle')}</p>
            
            <div className="flex flex-col gap-4 w-full relative z-20">
                <button
                  type="button"
                  onClick={handleDirectFolderSelect}
                  disabled={!supportsFileSystemAccess}
                  className={`w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                    ${supportsFileSystemAccess 
                      ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg hover:shadow-primary-500/25' 
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {t('app.directMode.openFolder')}
                </button>
                
                {!supportsFileSystemAccess && (
                  <p className="text-xs text-orange-400/80 mt-1">
                    {t('app.directMode.browserNotSupported')}
                  </p>
                )}
            </div>

            <input type="file" multiple {...{ webkitdirectory: "true", directory: "true" } as any} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-0" onChange={(e) => e.target.files && onFilesProcessed(Array.from(e.target.files))} />
        </div>
      )}
    </div>
  );
};

export default Dropzone;