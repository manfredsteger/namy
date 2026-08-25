import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setLanguage('de')}
        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
          language === 'de'
            ? 'bg-primary-500 text-white'
            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
        }`}
      >
        {t('languageSwitcher.de')}
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
          language === 'en'
            ? 'bg-primary-500 text-white'
            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
        }`}
      >
        {t('languageSwitcher.en')}
      </button>
    </div>
  );
};

export default LanguageSwitcher;
