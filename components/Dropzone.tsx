import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

interface DropzoneProps {
  onFilesProcessed: (files: File[]) => void;
  isProcessing: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFilesProcessed, isProcessing }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const { t } = useTranslation();

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
          // Fix: Cast item to `any` to access the non-standard `webkitGetAsEntry` method.
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
        <div className="flex flex-col items-center z-10">
            <div className={`p-6 rounded-full mb-6 transition-colors ${isDragActive ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-800 text-gray-500 group-hover:text-gray-300'}`}>
                <UploadIcon className="w-12 h-12" />
            </div>
            <p className="text-2xl font-semibold text-gray-200 mb-2">{t('dropzone.title')}</p>
            <p className="text-gray-500 text-sm">{t('dropzone.subtitle')}</p>
            {/* Fix: Use a spread object with `as any` to pass non-standard directory selection attributes to bypass TypeScript type checking. */}
            <input type="file" multiple {...{ webkitdirectory: "true", directory: "true" } as any} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => e.target.files && onFilesProcessed(Array.from(e.target.files))} />
        </div>
      )}
    </div>
  );
};

export default Dropzone;