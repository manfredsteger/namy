import React, { useState } from 'react';
import { Rule, RuleType } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { PlusIcon, TrashIcon } from './icons';
import { v4 as uuidv4 } from 'uuid';

interface RecipeBuilderProps {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
}

const AVAILABLE_BLOCKS: { type: RuleType; label: string; icon: string; requiresParams?: boolean }[] = [
  { type: 'lowercase', label: 'To Lowercase', icon: '🔤' },
  { type: 'uppercase', label: 'To Uppercase', icon: '🔠' },
  { type: 'remove_spaces', label: 'Remove Spaces', icon: '␠' },
  { type: 'replace', label: 'Replace String', icon: '🔄', requiresParams: true },
  { type: 'prefix', label: 'Add Prefix', icon: '⬅️', requiresParams: true },
  { type: 'suffix', label: 'Add Suffix', icon: '➡️', requiresParams: true },
];

const RecipeBuilder: React.FC<RecipeBuilderProps> = ({ rules, onChange }) => {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const addRule = (type: RuleType) => {
    const newRule: Rule = { id: uuidv4(), type, params: {} };
    if (type === 'replace') newRule.params = { find: '', replaceWith: '' };
    if (type === 'prefix' || type === 'suffix') newRule.params = { text: '' };
    onChange([...rules, newRule]);
  };

  const removeRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id));
  };

  const updateRuleParams = (id: string, params: any) => {
    onChange(rules.map(r => r.id === id ? { ...r, params: { ...r.params, ...params } } : r));
  };

  // Drag from palette
  const handlePaletteDragStart = (e: React.DragEvent, type: RuleType) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'palette', type }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Drag active rules for reordering
  const handleActiveDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'active', index }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemIndex(index);
  };

  const handleActiveDragEnter = (e: React.DragEvent, index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    // Reorder
    const newRules = [...rules];
    const item = newRules.splice(draggedItemIndex, 1)[0];
    newRules.splice(index, 0, item);
    
    setDraggedItemIndex(index);
    onChange(newRules);
  };

  const handleActiveDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.source === 'palette') {
        addRule(data.type as RuleType);
      }
    } catch (err) {
      // ignore parsing errors
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full">
      {/* Palette */}
      <div className="w-full md:w-1/3 bg-gray-900/50 rounded-xl border border-gray-800 p-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('sidebar.visualBuilder.availableBlocks', 'Available Blocks')}</h4>
        <div className="grid grid-cols-1 gap-2">
          {AVAILABLE_BLOCKS.map(block => (
            <div
              key={block.type}
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, block.type)}
              className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 cursor-grab active:cursor-grabbing hover:bg-gray-750 hover:border-gray-600 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span>{block.icon}</span>
                <span>{block.label}</span>
              </div>
              <button 
                onClick={() => addRule(block.type)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-400 transition-all"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Rules Area */}
      <div 
        className={`w-full md:w-2/3 p-4 flex flex-col border-2 border-dashed rounded-xl transition-colors min-h-[300px] overflow-y-auto ${isDragOver ? 'border-primary-500 bg-primary-900/10' : 'border-gray-800 bg-gray-950/30'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h4 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-4">{t('sidebar.visualBuilder.activeRules', 'Active Rules Pipeline')}</h4>
        
        {rules.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 pointer-events-none">
            <PlusIcon className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">{t('sidebar.visualBuilder.dragHint', 'Drag & drop blocks here')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => {
              const blockInfo = AVAILABLE_BLOCKS.find(b => b.type === rule.type);
              
              return (
                <div 
                  key={rule.id}
                  draggable
                  onDragStart={(e) => handleActiveDragStart(e, index)}
                  onDragEnter={(e) => handleActiveDragEnter(e, index)}
                  onDragEnd={handleActiveDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`bg-gray-800 border ${draggedItemIndex === index ? 'border-primary-500 opacity-50' : 'border-gray-700'} rounded-lg p-3 flex flex-col gap-3 shadow-sm cursor-grab active:cursor-grabbing`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 font-medium text-gray-200">
                      <span className="text-gray-400 text-xs bg-gray-900 px-2 py-0.5 rounded-full">{index + 1}</span>
                      <span>{blockInfo?.icon}</span>
                      <span>{blockInfo?.label || rule.type}</span>
                    </div>
                    <button onClick={() => removeRule(rule.id)} className="text-gray-500 hover:text-red-400 p-1 transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {blockInfo?.requiresParams && (
                    <div className="bg-gray-900/50 p-2 rounded border border-gray-800 cursor-default" draggable={false} onDragStart={(e) => e.preventDefault()}>
                      {rule.type === 'replace' && (
                        <div className="flex flex-col gap-2 text-sm">
                          <input 
                            type="text" 
                            placeholder="Find (regex supported)..." 
                            value={rule.params?.find || ''}
                            onChange={(e) => updateRuleParams(rule.id, { find: e.target.value })}
                            className="p-1.5 bg-gray-950 border border-gray-700 rounded text-gray-200 focus:border-primary-500"
                          />
                          <input 
                            type="text" 
                            placeholder="Replace with..." 
                            value={rule.params?.replaceWith || ''}
                            onChange={(e) => updateRuleParams(rule.id, { replaceWith: e.target.value })}
                            className="p-1.5 bg-gray-950 border border-gray-700 rounded text-gray-200 focus:border-primary-500"
                          />
                        </div>
                      )}
                      {(rule.type === 'prefix' || rule.type === 'suffix') && (
                        <div className="text-sm">
                          <input 
                            type="text" 
                            placeholder="Text..." 
                            value={rule.params?.text || ''}
                            onChange={(e) => updateRuleParams(rule.id, { text: e.target.value })}
                            className="w-full p-1.5 bg-gray-950 border border-gray-700 rounded text-gray-200 focus:border-primary-500"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeBuilder;
