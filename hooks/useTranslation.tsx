import React, { createContext, useState, useContext, useMemo } from 'react';
import { en, Translations } from '../locales/en';
import { de } from '../locales/de';

type Language = 'en' | 'de';

const translations: Record<Language, Translations> = {
  en,
  de,
};

interface TranslationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, variablesOrFallback?: Record<string, any> | string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('de');

  const t = useMemo(() => (key: string, variablesOrFallback?: Record<string, any> | string): string => {
    const variables = typeof variablesOrFallback === 'object' ? variablesOrFallback : undefined;
    const keys = key.split('.');
    let result: any = translations[language];

    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        break;
      }
    }
    
    if (result === undefined) {
      let fallbackResult: any = translations['en'];
      for (const fk of keys) {
        fallbackResult = fallbackResult?.[fk];
      }
      result = fallbackResult;
    }

    let finalStr = typeof result === 'string' ? result : key;
    
    if (variables && typeof finalStr === 'string') {
      for (const [k, v] of Object.entries(variables)) {
        finalStr = finalStr.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    
    return finalStr;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
