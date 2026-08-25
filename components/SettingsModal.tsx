import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { XIcon, PlusIcon, TrashIcon } from './icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ignoreList: string;
  onIgnoreListChange: (list: string) => void;
}

const SUGGESTIONS = {
  os: ['.DS_Store', 'Thumbs.db', 'desktop.ini', '.Trashes', 'ehthumbs.db'],
  dev: ['node_modules', '.git', '.env', '.vscode', '.idea'],
  misc: ['*.tmp', '*.bak', '~*']
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  ignoreList,
  onIgnoreListChange,
}) => {
  const { t } = useTranslation();
  const [activeIgnores, setActiveIgnores] = useState<string[]>([]);
  const [customRule, setCustomRule] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveIgnores(ignoreList.split('\n').map(s => s.trim()).filter(Boolean));
    }
  }, [ignoreList, isOpen]);

  if (!isOpen) return null;

  const updateIgnoreList = (newIgnores: string[]) => {
    const uniqueIgnores = Array.from(new Set(newIgnores));
    setActiveIgnores(uniqueIgnores);
    onIgnoreListChange(uniqueIgnores.join('\n'));
  };

  const addRule = (rule: string) => {
    if (!rule) return;
    if (!activeIgnores.includes(rule)) {
      updateIgnoreList([...activeIgnores, rule]);
    }
  };

  const removeRule = (rule: string) => {
    updateIgnoreList(activeIgnores.filter(r => r !== rule));
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    addRule(customRule.trim());
    setCustomRule('');
  };

  const handleDragStart = (e: React.DragEvent, rule: string) => {
    e.dataTransfer.setData('text/plain', rule);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const rule = e.dataTransfer.getData('text/plain');
    if (rule) addRule(rule);
  };

  const renderSuggestionBlock = (rule: string) => (
    <div
      key={rule}
      draggable
      onDragStart={(e) => handleDragStart(e, rule)}
      className="flex items-center justify-between px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-mono text-gray-300 cursor-grab active:cursor-grabbing hover:bg-gray-750 hover:border-gray-600 transition-colors group"
    >
      <span>{rule}</span>
      <button 
        onClick={() => addRule(rule)} 
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-400 transition-all"
        title="Add"
      >
        <PlusIcon className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-100">{t('settings.title')} - {t('settings.ignore.title')}</h2>
            <p className="text-sm text-gray-400 mt-1">{t('settings.ignore.description')}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Left Column: Suggestions */}
          <div className="w-full md:w-1/2 p-6 border-r border-gray-800 bg-gray-900/30 overflow-y-auto">
            <h3 className="text-sm font-semibold mb-4 text-gray-300 uppercase tracking-wider">{t('settings.ignore.suggestions')}</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">{t('settings.ignore.categories.os')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.os.map(renderSuggestionBlock)}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">{t('settings.ignore.categories.dev')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.dev.map(renderSuggestionBlock)}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">{t('settings.ignore.categories.misc')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.misc.map(renderSuggestionBlock)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column: Active Rules */}
          <div 
            className={`w-full md:w-1/2 p-6 flex flex-col transition-colors ${isDragOver ? 'bg-primary-900/10' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <h3 className="text-sm font-semibold mb-4 text-primary-400 uppercase tracking-wider">{t('settings.ignore.active')}</h3>
            
            <form onSubmit={handleAddCustom} className="mb-4 flex gap-2">
              <input
                type="text"
                value={customRule}
                onChange={(e) => setCustomRule(e.target.value)}
                placeholder={t('settings.ignore.customPlaceholder')}
                className="flex-1 p-2 bg-gray-950 border border-gray-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-200 font-mono text-sm text-gray-200"
              />
              <button 
                type="submit"
                disabled={!customRule.trim()}
                className="px-4 py-2 bg-gray-800 text-gray-200 hover:text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('settings.ignore.addCustom')}</span>
              </button>
            </form>

            <div className={`flex-1 overflow-y-auto p-4 border-2 border-dashed rounded-xl ${isDragOver ? 'border-primary-500 bg-primary-900/5' : 'border-gray-800 bg-gray-950/30'}`}>
              {activeIgnores.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 pointer-events-none">
                  <PlusIcon className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">{t('settings.ignore.description')}</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeIgnores.map(rule => (
                    <div 
                      key={rule} 
                      className="flex items-center gap-2 pl-3 pr-1 py-1 bg-primary-900/20 border border-primary-500/30 rounded-full text-sm font-mono text-primary-200 animate-fade-in"
                    >
                      <span>{rule}</span>
                      <button 
                        onClick={() => removeRule(rule)}
                        className="p-1 hover:bg-primary-900/50 rounded-full text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/80 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors text-sm font-bold shadow-lg shadow-primary-900/20"
          >
            {t('common.done', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
