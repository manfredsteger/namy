import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { RemoteConfig, RemoteFileInfo, ScanResult } from '../types';
import { Settings, Server, Plus, Edit2, Trash2, CheckCircle, XCircle, FolderOpen, Play, Search, RefreshCw, Copy } from 'lucide-react';

interface RemotesModalProps {
  onClose: () => void;
}

export function RemotesModal({ onClose }: RemotesModalProps) {
  const { t } = useTranslation();
  const [remotes, setRemotes] = useState<RemoteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingRemoteId, setEditingRemoteId] = useState<string | null>(null);
  // Remote whose stored password the server should reuse when the password field is left empty.
  const [credentialSourceId, setCredentialSourceId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<RemoteConfig>>({
    name: '',
    mediaType: 'series',
    protocol: 'sftp',
    host: '',
    port: 22,
    username: '',
    password: '',
    basePath: '/'
  });
  
  // Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Browse state
  const [browsePath, setBrowsePath] = useState('/');
  const [browseFiles, setBrowseFiles] = useState<RemoteFileInfo[]>([]);
  const [isBrowsing, setIsBrowsing] = useState(false);
  
  // Library state
  const [scanningRemoteId, setScanningRemoteId] = useState<string | null>(null);
  const [libraryData, setLibraryData] = useState<Record<string, ScanResult[]>>({});

  useEffect(() => {
    fetchRemotes();
  }, []);

  const fetchRemotes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/remotes');
      if (res.ok) {
        const data = await res.json();
        setRemotes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/remotes/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, credentialsFromId: credentialSourceId })
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: t('remotes.testSuccess') });
      } else {
        setTestResult({ success: false, message: data.message || t('remotes.testFailed') });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || t('remotes.testFailed') });
    } finally {
      setIsTesting(false);
    }
  };

  const loadBrowsePath = async (path: string) => {
    setIsBrowsing(true);
    try {
      const res = await fetch('/api/remotes/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, path, credentialsFromId: credentialSourceId })
      });
      if (res.ok) {
        const data = await res.json();
        setBrowseFiles(data.sort((a: RemoteFileInfo, b: RemoteFileInfo) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
          return a.isDirectory ? -1 : 1;
        }));
        setBrowsePath(path);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBrowsing(false);
    }
  };

  const handleNextStep = () => {
    if (wizardStep === 1) {
      loadBrowsePath(formData.basePath || '/');
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setFormData({ ...formData, basePath: browsePath });
      setWizardStep(3);
    }
  };

  const handleSave = async () => {
    try {
      const isEdit = !!editingRemoteId;
      const url = isEdit ? `/api/remotes/${editingRemoteId}` : '/api/remotes';
      const method = isEdit ? 'PUT' : 'POST';
      
      const { id: _ignoredId, ...payload } = formData;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, credentialsFromId: credentialSourceId })
      });
      
      if (res.ok) {
        setIsWizardOpen(false);
        fetchRemotes();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('remotes.confirmDelete'))) return;
    try {
      const res = await fetch(`/api/remotes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRemotes();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (remote: RemoteConfig) => {
    setFormData(remote);
    setEditingRemoteId(remote.id);
    setCredentialSourceId(remote.id);
    setWizardStep(1);
    setTestResult(null);
    setIsWizardOpen(true);
  };

  const buildCopyName = (name: string) => {
    const base = t('remotes.copySuffix', { name });
    if (!remotes.some(r => r.name === base)) return base;
    let n = 2;
    while (remotes.some(r => r.name === `${base} ${n}`)) n++;
    return `${base} ${n}`;
  };

  const handleClone = (remote: RemoteConfig) => {
    // New entry (POST), but the server reuses the source remote's stored password.
    const { id, password, ...rest } = remote;
    setFormData({ ...rest, name: buildCopyName(remote.name), password: '' });
    setEditingRemoteId(null);
    setCredentialSourceId(remote.id);
    setWizardStep(1);
    setTestResult(null);
    setIsWizardOpen(true);
  };

  const openNewWizard = () => {
    setFormData({
      name: '',
      mediaType: 'series',
      protocol: 'sftp',
      host: '',
      port: 22,
      username: '',
      password: '',
      basePath: '/'
    });
    setEditingRemoteId(null);
    setCredentialSourceId(null);
    setWizardStep(1);
    setTestResult(null);
    setIsWizardOpen(true);
  };

  const scanLibrary = async (id: string) => {
    setScanningRemoteId(id);
    try {
      const res = await fetch(`/api/remotes/${id}/scan`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLibraryData(prev => ({ ...prev, [id]: data }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanningRemoteId(null);
    }
  };

  const isCloning = !editingRemoteId && !!credentialSourceId;
  const usesInheritedPassword = !!credentialSourceId && !formData.password;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('remotes.title')}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {!isWizardOpen ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('remotes.listTitle')}</h3>
                <button
                  onClick={openNewWizard}
                  className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('remotes.addBtn')}
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : remotes.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Server className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">{t('remotes.empty')}</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {remotes.map(remote => (
                    <div key={remote.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary-100 dark:bg-primary-900/30 p-3 rounded-lg">
                            <Server className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900 dark:text-white">{remote.name}</h4>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-medium">
                                {t(`remotes.type.${remote.mediaType}`)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {remote.protocol.toUpperCase()} • {remote.host}:{remote.port} • {remote.basePath}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => scanLibrary(remote.id)}
                            disabled={scanningRemoteId === remote.id}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg dark:text-primary-400 dark:hover:bg-gray-700 transition-colors"
                            title={t('remotes.scanBtn')}
                          >
                            <Search className={`w-5 h-5 ${scanningRemoteId === remote.id ? 'animate-pulse' : ''}`} />
                          </button>
                          <button 
                            onClick={() => handleClone(remote)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                            title={t('remotes.cloneBtn')}
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleEdit(remote)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                            title={t('common.edit')}
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(remote.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      {libraryData[remote.id] && (
                        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                          <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">{t('remotes.libraryResults', { count: libraryData[remote.id].length })}</h5>
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {libraryData[remote.id].map((item, idx) => (
                              <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 text-sm flex items-center justify-between">
                                <div className="truncate pr-4">
                                  <span className="font-medium text-gray-900 dark:text-white">{item.title || item.folderName}</span>
                                  {item.year && <span className="text-gray-500 ml-2">({item.year})</span>}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {item.tmdbId && <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">TMDB</span>}
                                  {item.imdbId && <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">IMDB</span>}
                                  {item.seasons && item.seasons.length > 0 && (
                                    <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">{item.seasons.length} {t('remotes.seasons')}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {libraryData[remote.id].length === 0 && (
                              <p className="text-sm text-gray-500 italic">{t('remotes.noResults')}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-center mb-8 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -z-10"></div>
                {[1, 2, 3].map(step => (
                  <div key={step} className="flex flex-col items-center gap-2 bg-white dark:bg-gray-800 px-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${wizardStep >= step ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {step}
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t(`remotes.step${step}`)}
                    </span>
                  </div>
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="space-y-4">
                  {isCloning && (
                    <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-100 dark:border-primary-800 text-sm text-primary-800 dark:text-primary-300">
                      <p>{t('remotes.cloneHint')}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('remotes.name')}</label>
                      <input 
                        type="text" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                        placeholder="My NAS"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('remotes.mediaType')}</label>
                      <select 
                        value={formData.mediaType}
                        onChange={e => setFormData({...formData, mediaType: e.target.value as any})}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                      >
                        <option value="series">{t('remotes.type.series')}</option>
                        <option value="movies">{t('remotes.type.movies')}</option>
                        <option value="music">{t('remotes.type.music')}</option>
                        <option value="other">{t('remotes.type.other')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('remotes.protocol')}</label>
                      <select 
                        value={formData.protocol}
                        onChange={e => setFormData({...formData, protocol: e.target.value as any, port: e.target.value === 'ftp' ? 21 : 22})}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                      >
                        <option value="sftp">SFTP</option>
                        <option value="ftp">FTP</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('remotes.host')}</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={formData.host} 
                          onChange={e => setFormData({...formData, host: e.target.value})}
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                          placeholder="192.168.1.100"
                        />
                        <input 
                          type="number" 
                          value={formData.port} 
                          onChange={e => setFormData({...formData, port: parseInt(e.target.value)})}
                          className="w-24 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('remotes.username')}</label>
                      <input 
                        type="text" 
                        value={formData.username} 
                        onChange={e => setFormData({...formData, username: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('remotes.password')}</label>
                      <input 
                        type="password" 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                        placeholder={isCloning ? t('remotes.passwordInherited') : (editingRemoteId ? t('remotes.passwordUnchanged') : '')}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 mt-6">
                    <button 
                      onClick={handleTestConnection}
                      disabled={isTesting || !formData.host || !formData.username}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      {isTesting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 dark:border-white"></div> : <Play className="w-4 h-4" />}
                      {t('remotes.testBtn')}
                    </button>

                    {testResult && (
                      <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {testResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {testResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-3 flex items-center gap-2 text-sm font-mono border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-primary-500">
                      <FolderOpen className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      <input 
                        type="text" 
                        value={browsePath}
                        onChange={e => setBrowsePath(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && loadBrowsePath(browsePath)}
                        className="bg-transparent border-none outline-none w-full text-gray-700 dark:text-gray-300"
                        placeholder="/"
                      />
                    </div>
                    <button 
                      onClick={() => loadBrowsePath(browsePath)}
                      className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      title={t("remotes.loadPath")}
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg h-64 overflow-y-auto bg-white dark:bg-gray-800">
                    {isBrowsing ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {browsePath !== '/' && (
                          <li>
                            <button 
                              onClick={() => {
                                const parts = browsePath.split('/').filter(Boolean);
                                parts.pop();
                                loadBrowsePath('/' + parts.join('/'));
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                            >
                              <FolderOpen className="w-5 h-5 text-yellow-500" />
                              <span className="font-medium text-gray-900 dark:text-white">..</span>
                            </button>
                          </li>
                        )}
                        {browseFiles.map(file => (
                          <li key={file.name}>
                            <button 
                              onClick={() => {
                                if (file.isDirectory) {
                                  const newPath = browsePath === '/' ? `/${file.name}` : `${browsePath}/${file.name}`;
                                  loadBrowsePath(newPath);
                                }
                              }}
                              disabled={!file.isDirectory}
                              className={`w-full flex items-center justify-between p-3 transition-colors text-left ${file.isDirectory ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer' : 'opacity-60 cursor-default'}`}
                            >
                              <div className="flex items-center gap-3">
                                {file.isDirectory ? (
                                  <FolderOpen className="w-5 h-5 text-yellow-500" />
                                ) : (
                                  <div className="w-5 h-5 flex items-center justify-center">
                                    <div className="w-3 h-4 border-2 border-gray-400 rounded-sm"></div>
                                  </div>
                                )}
                                <span className={`${file.isDirectory ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                  {file.name}
                                </span>
                              </div>
                              {!file.isDirectory && (
                                <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                              )}
                            </button>
                          </li>
                        ))}
                        {browseFiles.length === 0 && (
                          <li className="p-8 text-center text-gray-500 italic">{t('remotes.emptyFolder')}</li>
                        )}
                      </ul>
                    )}
                  </div>
                  
                  <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-100 dark:border-primary-800 text-sm text-primary-800 dark:text-primary-300">
                    <p>{t('remotes.browseHint')}</p>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">{t('remotes.summary')}</h4>
                    
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">{t('remotes.name')}</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">{formData.name}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">{t('remotes.mediaType')}</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">{t(`remotes.type.${formData.mediaType}`)}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">{t('remotes.protocol')}</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">{formData.protocol?.toUpperCase()}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">{t('remotes.host')}</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">{formData.host}:{formData.port}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">{t('remotes.username')}</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">{formData.username}</dd>
                        {usesInheritedPassword && (
                          <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('remotes.credentialsInherited')}</dd>
                        )}
                      </div>
                      <div className="sm:col-span-2 pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                        <dt className="text-gray-500 dark:text-gray-400 mb-1">{t('remotes.basePath')}</dt>
                        <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded text-gray-900 dark:text-gray-300 overflow-x-auto">
                          {formData.basePath}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => setIsWizardOpen(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  {t('common.cancel')}
                </button>
                
                <div className="flex gap-3">
                  {wizardStep > 1 && (
                    <button 
                      onClick={() => setWizardStep(wizardStep - 1)}
                      className="px-6 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t('common.back')}
                    </button>
                  )}
                  
                  {wizardStep < 3 ? (
                    <button 
                      onClick={handleNextStep}
                      disabled={
                        (wizardStep === 1 && !testResult?.success) || 
                        (wizardStep === 2 && !browsePath)
                      }
                      className="px-6 py-2 bg-primary-500 text-white font-medium hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {wizardStep === 2 ? t('remotes.useFolderBtn') : t('common.next')}
                    </button>
                  ) : (
                    <button 
                      onClick={handleSave}
                      className="px-6 py-2 bg-green-500 text-white font-bold hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {t('common.save')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
