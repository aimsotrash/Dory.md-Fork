import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '@/components/search/SearchBar';
import { ChunkCard } from '@/components/chunks/ChunkCard';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { search } from '@/lib/api';
import type { SearchResult } from '@/lib/types';
import { Search, SlidersHorizontal } from 'lucide-react';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setQuery(q);
    setSearchParams({ q });
    setLoading(true);
    setError(null);
    try {
      const res = await search(q);
      setResults(res.results);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Search memories</h1>
        <p className="text-sm text-slate-500">Semantic search across all your knowledge chunks</p>
      </div>

      <SearchBar
        onSearch={handleSearch}
        loading={loading}
        initialValue={query}
        placeholder="Search your memories…"
      />

      {searched && !loading && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {results.length === 0
              ? 'No results found'
              : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
          </span>
          <button className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
            <SlidersHorizontal size={11} />
            Filter
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 glass-card p-3">{error}</p>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map(({ chunk, score, highlight }) => (
            <ChunkCard
              key={chunk.id}
              chunk={chunk}
              score={score}
              highlight={highlight}
            />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="glass-card p-10 text-center space-y-3">
          <Search size={28} className="text-slate-700 mx-auto" />
          <p className="text-slate-400">No memories match "{query}"</p>
          <p className="text-xs text-slate-600">Try different keywords or add new memories with the + button</p>
        </div>
      )}

      {!searched && !loading && (
        <div className="glass-card p-10 text-center space-y-3">
          <Search size={28} className="text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm">Type to search your knowledge base</p>
          <p className="text-xs text-slate-600">Searches content, tags, and source names</p>
        </div>
      )}
    </div>
  );
}
