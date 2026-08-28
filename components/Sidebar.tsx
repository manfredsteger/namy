import React, { useState } from 'react';
import { Convention } from '../types';
import { SparklesIcon, SaveIcon, TrashIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { TmdbSearchDropdown } from './TmdbSearchDropdown';

interface SidebarProps {
  tmdbApiKeySet?: boolean;
  script: string;
  setScript: (script: string) => void;
  savedConventions: Convention[];
  onSaveConvention: (name: string, script: string) => void;
  onDeleteConvention: (id: string) => void;
  onGenerateWithAI: (prompt: string) => void;
  isAiLoading: boolean;
  providerCode: string;
  onProviderCodeChange: (code: string) => void;
  onOpenVisualBuilder: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  script,
  setScript,
  savedConventions,
  onSaveConvention,
  onDeleteConvention,
  onGenerateWithAI,
  isAiLoading,
  providerCode,
  onProviderCodeChange,
  onOpenVisualBuilder,
  tmdbApiKeySet,
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [newConventionName, setNewConventionName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { t } = useTranslation();

  const handleSave = () => {
    if (newConventionName.trim() && script.trim()) {
      onSaveConvention(newConventionName, script);
      setNewConventionName('');
    }
  };

  const defaultConventionIds = ['web-safe', 'remove-spaces', 'rename-series', 'jellyfin-movies', 'jellyfin-series'];
  const activeConvention = savedConventions.find(c => c.script === script);

  return (
    <div className="w-full lg:w-96 bg-gray-900 p-6 border-r border-gray-800 flex flex-col h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-100">{t('sidebar.title')}</h2>

      {/* Saved Conventions */}
      <div className="mb-6 flex-shrink-0">
        <h3 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">{t('sidebar.templates.title')}</h3>
        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
          {savedConventions.length > 0 ? (
            savedConventions.map((conv) => (
              <div key={conv.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${script === conv.script ? 'bg-primary-900/20 border-primary-500/50' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}>
                <button onClick={() => setScript(conv.script)} className="text-left text-gray-200 hover:text-white flex-grow font-medium">
                  {defaultConventionIds.includes(conv.id) ? t(conv.name) : conv.name}
                </button>
                 {!defaultConventionIds.includes(conv.id) && (
                   <button onClick={() => onDeleteConvention(conv.id)} className="text-gray-500 hover:text-red-400 p-1 rounded-full transition-colors">
                      <TrashIcon className="w-4 h-4" />
                  </button>
                 )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-600">{t('sidebar.templates.empty')}</p>
          )}
        </div>
      </div>

      {/* Provider Code */}
      {activeConvention?.requiresProviderCode && (
        <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-lg animate-fade-in">
          <h3 className="text-md font-semibold mb-1 text-gray-200">{t('sidebar.providerCode.title')}</h3>
          <p className="text-xs text-gray-500 mb-3">
            {t('sidebar.providerCode.description')}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={providerCode}
              onChange={(e) => onProviderCodeChange(e.target.value)}
              onBlur={() => {
                let code = providerCode.trim();
                if (/^\d+$/.test(code)) code = `tmdbid-${code}`;
                else if (/^tt\d+$/.test(code)) code = `imdbid-${code}`;
                if (code !== providerCode) onProviderCodeChange(code);
              }}
              placeholder={t('sidebar.providerCode.placeholder')}
              className="w-full p-3 bg-gray-950 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-200 text-gray-200 text-sm"
            />
            {tmdbApiKeySet && (
              <TmdbSearchDropdown 
                initialQuery=""
                onSelect={(id) => {
                  let code = id.trim();
                  if (/^\d+$/.test(code)) code = `tmdbid-${code}`;
                  else if (/^tt\d+$/.test(code)) code = `imdbid-${code}`;
                  onProviderCodeChange(code);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Visual Recipe Builder Trigger */}
      <div className="mt-auto pt-6 border-t border-gray-800 mb-4">
        <button
          onClick={onOpenVisualBuilder}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-primary-400 font-semibold py-2.5 px-4 rounded-lg transition-colors border border-gray-700 hover:border-primary-500/50 shadow-sm"
        >
          <SparklesIcon className="w-4 h-4" />
          <span>{t('sidebar.visualBuilder.trigger')}</span>
        </button>
      </div>

      {/* Advanced Toggle */}
      <div className="pt-2">
        <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-400 hover:text-gray-200 font-medium mb-4 flex items-center justify-between w-full"
        >
            <span>Advanced (Custom Script & AI)</span>
            <span>{showAdvanced ? '−' : '+'}</span>
        </button>

        {showAdvanced && (
            <div className="space-y-6 animate-fade-in">
                {/* AI Generator */}
                <div>
                    <h3 className="text-sm font-semibold mb-2 text-gray-300">{t('sidebar.ai.title')}</h3>
                    <div className="space-y-2">
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder={t('sidebar.ai.placeholder')}
                            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-200 text-gray-200 font-mono text-sm resize-none"
                            rows={3}
                        />
                        <button
                            onClick={() => onGenerateWithAI(aiPrompt)}
                            disabled={isAiLoading || !aiPrompt}
                            className="w-full flex justify-center items-center gap-2 bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-500 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
                        >
                            {isAiLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>{t('sidebar.ai.button.generating')}</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-4 h-4"/>
                                    <span>{t('sidebar.ai.button.generate')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
                
                {/* Script Editor */}
                <div className="flex-grow flex flex-col">
                    <h3 className="text-sm font-semibold mb-2 text-gray-300">{t('sidebar.script.title')}</h3>
                    <p className="text-xs text-gray-500 mb-2">
                        {t('sidebar.script.description')}
                    </p>
                    <div className="relative">
                        <textarea
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            placeholder={t('sidebar.script.placeholder')}
                            className="w-full h-40 p-3 bg-gray-950 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-200 text-gray-300 font-mono text-xs resize-none"
                        />
                    </div>
                </div>

                {/* Save Convention */}
                <div>
                    <h3 className="text-sm font-semibold mb-2 text-gray-300">{t('sidebar.save.title')}</h3>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={newConventionName}
                            onChange={(e) => setNewConventionName(e.target.value)}
                            placeholder={t('sidebar.save.placeholder')}
                            className="flex-grow p-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-200 text-gray-200 text-sm"
                        />
                        <button
                            onClick={handleSave}
                            disabled={!newConventionName.trim() || !script.trim()}
                            className="flex items-center gap-2 bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                            <SaveIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
