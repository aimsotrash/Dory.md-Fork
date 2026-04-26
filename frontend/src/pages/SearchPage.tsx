import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '@/components/search/SearchBar';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { NoteDetailPanel, type PanelChunk } from '@/components/notes/NoteDetailPanel';
import { search } from '@/lib/api';
import type { SearchResult } from '@/lib/types';
import { Search, Star } from 'lucide-react';
import { retentionToColor, categoryColors } from '@/styles/theme';
import { formatRetentionPct, cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

function baseName(p: string) { return p.split(/[\\/]/).pop() ?? p; }

function toPanel(chunk: SearchResult['chunk']): PanelChunk {
  return {
    id: chunk.id,
    source_file: (chunk as unknown as { source_name?: string }).source_name ?? chunk.id,
    category: chunk.category,
    retention: chunk.retention,
    access_count: chunk.access_count,
    last_accessed: chunk.last_accessed,
    content: chunk.content,
  };
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<SearchResult | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setQuery(q);
    setSearchParams({ q });
    setLoading(true);
    setError(null);
    setActiveResult(null);
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

  // Auto-search if URL has ?q=
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !searched) handleSearch(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="flex -mx-6 -my-5 border-t"
      style={{ height: 'calc(100vh - 110px)', borderColor: '#1f1f1f' }}
    >
      {/* Left panel */}
      <div className="flex flex-col border-r" style={{ width: 420, minWidth: 300, borderColor: '#1f1f1f' }}>
        <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid #1f1f1f' }}>
          <h1 className="text-base font-semibold text-white mb-3">Search</h1>
          <SearchBar onSearch={handleSearch} loading={loading} initialValue={query} placeholder="Search your knowledge…" />
          {searched && !loading && (
            <p className="text-[11px] text-slate-600 mt-2">
              {results.length === 0 ? 'No results' : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <p className="px-4 py-3 text-sm text-red-400">{error}</p>}

          {loading && (
            <div className="space-y-2 p-4">
              {[1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          )}

          {!loading && results.length > 0 && results.map((r) => {
            const color = retentionToColor(r.chunk.retention ?? 0.5);
            const catColor = categoryColors[(r.chunk.category?.toLowerCase() as Category) ?? 'general'] ?? '#64748b';
            const isActive = activeResult?.chunk.id === r.chunk.id;
            return (
              <div
                key={r.chunk.id}
                onClick={() => setActiveResult(r)}
                className={cn(
                  'flex items-start gap-2.5 px-4 py-3 cursor-pointer border-b transition-all',
                  isActive ? 'bg-[#161616]' : 'hover:bg-[#111]'
                )}
                style={{ borderColor: '#141414' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono text-slate-500 truncate flex-1">
                      {baseName((r.chunk as unknown as { source_name?: string }).source_name ?? r.chunk.id)}
                    </span>
                    {r.score !== undefined && (
                      <span className="text-[10px] font-mono flex items-center gap-0.5 shrink-0" style={{ color: '#a78bfa' }}>
                        <Star size={8} />{Math.round(r.score * 100)}%
                      </span>
                    )}
                    <span className="text-[10px] font-mono shrink-0" style={{ color }}>{formatRetentionPct(r.chunk.retention ?? 0.5)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {r.highlight
                      ? <span dangerouslySetInnerHTML={{ __html: r.highlight }} />
                      : r.chunk.content}
                  </p>
                  {r.chunk.category && (
                    <span className="mt-1.5 inline-block text-[9px] capitalize px-1.5 py-0.5 rounded font-medium"
                      style={{ color: catColor, background: `${catColor}15` }}>
                      {r.chunk.category}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {!loading && searched && results.length === 0 && (
            <div className="p-10 text-center">
              <Search size={24} className="text-slate-800 mx-auto mb-3" />
              <p className="text-sm text-slate-600">No results for "{query}"</p>
            </div>
          )}

          {!searched && !loading && (
            <div className="p-10 text-center">
              <Search size={24} className="text-slate-800 mx-auto mb-3" />
              <p className="text-sm text-slate-600">Type to search your knowledge base</p>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-hidden" style={{ background: '#0a0a0a' }}>
        {activeResult ? (
          <NoteDetailPanel
            chunk={toPanel(activeResult.chunk)}
            onDelete={(id) => {
              setResults(prev => prev.filter(r => r.chunk.id !== id));
              setActiveResult(null);
            }}
            onContentUpdate={(id, content) => {
              setResults(prev => prev.map(r => r.chunk.id === id ? { ...r, chunk: { ...r.chunk, content } } : r));
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <Search size={32} className="text-slate-800" />
            <p className="text-sm text-slate-600">{searched ? 'Select a result to view the full note' : 'Search results will appear here'}</p>
            <p className="text-xs text-slate-700">AI summarize, expand, and optimize available for each note</p>
          </div>
        )}
      </div>
    </div>
  );
}
