import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { XIcon, SaveIcon } from './icons';
import RecipeBuilder from './RecipeBuilder';
import { Rule } from '../types';

interface RecipeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, rules: Rule[]) => void;
}

const RecipeBuilderModal: React.FC<RecipeBuilderModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<Rule[]>([]);
  const [recipeName, setRecipeName] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (recipeName.trim() && rules.length > 0) {
      onSave(recipeName.trim(), rules);
      setRecipeName('');
      setRules([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-100">{t('sidebar.visualBuilder.title', 'Visual Recipe Builder')}</h2>
            <p className="text-sm text-gray-400 mt-1">{t('sidebar.visualBuilder.description', 'Drag and drop blocks to build your renaming logic.')}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-hidden p-6 bg-gray-950">
           <RecipeBuilder rules={rules} onChange={setRules} />
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/80 flex items-center justify-between gap-4">
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder={t('sidebar.visualBuilder.namePlaceholder', 'Name your recipe')}
            className="flex-1 max-w-md p-2 bg-gray-950 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-200 text-gray-200 text-sm"
          />
          <button 
            onClick={handleSave}
            disabled={!recipeName.trim() || rules.length === 0}
            className="px-6 py-2.5 flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors text-sm font-bold shadow-lg shadow-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SaveIcon className="w-4 h-4" />
            <span>{t('sidebar.visualBuilder.save', 'Save Recipe')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeBuilderModal;
