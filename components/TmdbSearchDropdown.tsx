import React, { useState, useEffect, useRef } from 'react';
import { Search, Film, Tv } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface SearchResult {
  id: number;
  mediaType?: 'tv' | 'movie';
  title: string;
  originalTitle: string;
  year: string | null;
  posterUrl: string | null;
  overview: string | null;
}

interface Props {
  initialQuery?: string;
  onSelect: (id: string, title: string, year: string | null) => void;
  className?: string;
}

export const TmdbSearchDropdown: React.FC<Props> = ({ initialQuery = '', onSelect, className = '' }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([]);
      return;
    }
    
    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Error ${res.status}`);
        }
        const data = await res.json();
        setResults(data.results || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, isOpen]);

  const handleSelect = (item: SearchResult) => {
    setIsOpen(false);
    onSelect(`tmdbid-${item.id}`, item.title, item.year);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
        title={t("tmdb.searchTitle")}
      >
        <Search className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t("tmdb.placeholder")}
                autoFocus
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-1 focus:ring-primary-500 outline-none dark:text-white"
              />
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {isLoading && (
              <div className="p-4 text-center text-sm text-gray-500">{t("tmdb.searching")}</div>
            )}
            {!isLoading && error && (
              <div className="p-4 text-center text-sm text-red-500">{error}</div>
            )}
            {!isLoading && !error && results.length === 0 && query.trim() && (
              <div className="p-4 text-center text-sm text-gray-500">{t("tmdb.noResults")}</div>
            )}
            {!isLoading && !error && results.map(item => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full text-left p-2 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-750 last:border-0"
              >
                {item.posterUrl ? (
                  <img src={item.posterUrl} alt="" className="w-10 h-14 object-cover rounded shadow-sm bg-gray-200" />
                ) : (
                  <div className="w-10 h-14 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                    <Film className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {item.title}
                    </div>
                    {item.mediaType && (
                      <span className="text-[10px] uppercase bg-gray-100 dark:bg-gray-700 px-1 rounded text-gray-500 flex-shrink-0 flex items-center gap-1">
                        {item.mediaType === 'tv' ? <Tv className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                        {item.mediaType}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {item.year ? `${item.year} • ` : ''}{item.originalTitle !== item.title ? item.originalTitle : ''}
                  </div>
                  {item.overview && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2 leading-tight">
                      {item.overview}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
