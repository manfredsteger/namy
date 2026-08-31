import React from 'react';
import { ProcessedFile } from '../types';
import { FileIcon, FolderIcon, AlertTriangleIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

interface FileTableProps {
  files: ProcessedFile[];
}

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FileTable: React.FC<FileTableProps> = ({ files }) => {
  const { t } = useTranslation();

  if (files.length === 0) {
    return null;
  }
  
  const getFileName = (path: string) => path.split('/').pop() || path;

  return (
    <div className="mt-4 bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-200">
          <thead className="text-xs text-gray-200 uppercase bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 w-1/2">
                {t('fileTable.originalPath')}
              </th>
              <th scope="col" className="px-6 py-3 w-1/2">
                {t('fileTable.newPath')}
              </th>
              <th scope="col" className="px-6 py-3 text-right">
                {t('fileTable.size')}
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${file.hasCollision ? 'bg-red-900/10' : ''}`}>
                <td className="px-6 py-4 font-mono">
                  <div className="flex items-center">
                    <span style={{ paddingLeft: `${file.depth * 20}px` }}></span>
                    {file.isDirectory ? <FolderIcon className="mr-2 text-primary-500 flex-shrink-0" /> : <FileIcon className="mr-2 text-gray-600 flex-shrink-0" />}
                    <span className="truncate" title={file.originalPath}>{getFileName(file.originalPath)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono">
                  <div className={`flex items-center ${file.hasCollision ? 'text-red-400' : 'text-primary-500'}`}>
                    <span style={{ paddingLeft: `${file.depth * 20}px` }}></span>
                     {file.isDirectory ? <FolderIcon className="mr-2 flex-shrink-0" /> : <FileIcon className="mr-2 flex-shrink-0" />}
                    <span className="truncate" title={file.hasCollision ? t('fileTable.collisionWarning') : file.newPath}>{getFileName(file.newPath)}</span>
                    {file.hasCollision && (
                      <div className="ml-2 relative group flex-shrink-0">
                        <AlertTriangleIcon className="text-red-500" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 border border-red-500 text-xs text-red-200 rounded shadow-lg z-10 text-center pointer-events-none">
                          {t('fileTable.collisionWarning')}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-mono text-gray-600">
                  {file.isDirectory ? '-' : formatBytes(file.size)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileTable;
