import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, Command } from 'lucide-react';
import { debounce } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  initialValue?: string;
  placeholder?: string;
}

const SUGGESTIONS = [
  'forgetting curve',
  'react hooks',
  'machine learning',
  'typescript types',
  'distributed systems',
];

export function SearchBar({ onSearch, loading, initialValue = '', placeholder }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useRef(debounce(onSearch, 350));

  useEffect(() => {
    debouncedSearch.current = debounce(onSearch, 350);
  }, [onSearch]);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (value.trim().length >= 2) {
      debouncedSearch.current(value.trim());
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  }

  function handleSuggestion(s: string) {
    setQuery(s);
    onSearch(s);
    setShowSuggestions(false);
    inputRef.current?.blur();
  }

  function clear() {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
            focused
              ? 'border-nebula-500/60 bg-cosmos-800/80 ring-1 ring-nebula-500/20'
              : 'border-cosmos-700/60 bg-cosmos-800/40 hover:border-cosmos-600'
          }`}
        >
          {loading ? (
            <Loader2 size={16} className="text-nebula-400 animate-spin shrink-0" />
          ) : (
            <Search size={16} className="text-slate-500 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => { setFocused(true); setShowSuggestions(true); }}
            onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 150); }}
            placeholder={placeholder ?? 'Search your memories… (⌘K)'}
            className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 outline-none text-sm"
          />
          {query && (
            <button type="button" onClick={clear} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={14} />
            </button>
          )}
          {!query && (
            <div className="flex items-center gap-1 text-slate-600">
              <Command size={11} />
              <span className="text-[10px] font-mono">K</span>
            </div>
          )}
        </div>
      </form>

      {showSuggestions && !query && (
        <div className="absolute top-full left-0 right-0 mt-1 glass-card py-1.5 z-10 animate-fade-in">
          <p className="px-3 py-1 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            Recent searches
          </p>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-cosmos-800 transition-colors text-left"
              onClick={() => handleSuggestion(s)}
            >
              <Search size={12} className="text-slate-600" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
