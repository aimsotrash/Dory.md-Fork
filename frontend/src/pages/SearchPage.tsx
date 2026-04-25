import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchBar } from '@/components/search/SearchBar'
import { ChunkCard } from '@/components/chunks/ChunkCard'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { search } from '@/lib/api'
import type { SearchResult } from '@/lib/types'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [results, setResults] = useState<SearchResult[]>([])
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setQuery(q)
    setSearchParams({ q })
    setLoading(true)
    setError(null)
    try {
      const res = await search(q)
      setResults(res.results)
      setSearched(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally { setLoading(false) }
  }, [setSearchParams])

  return (
    <div className="max-w-3xl space-y-5 animate-fade-up">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-50 tracking-tight">Search</h1>
        <p className="label mt-1">Semantic search — decay-weighted ranking</p>
      </div>

      <SearchBar onSearch={handleSearch} loading={loading} initialValue={query} placeholder="Search your memory..." />

      {searched && !loading && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-ink-400">
            {results.length === 0 ? 'No results' : `${results.length} results`}
          </span>
          <span className="text-ink-600 font-mono">—</span>
          <span className="text-xs font-mono text-ink-500">"{query}"</span>
        </div>
      )}

      {error && (
        <div className="tile tile-red p-3">
          <p className="text-sm font-mono text-metro-red">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map(({ chunk, score, highlight }) => (
            <ChunkCard key={chunk.id} chunk={chunk} score={score} highlight={highlight} />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="tile p-10 text-center">
          <p className="font-mono text-ink-400 text-sm">No memories match "{query}"</p>
          <p className="text-[11px] font-mono text-ink-600 mt-2">Try different keywords or write a new note</p>
        </div>
      )}

      {!searched && !loading && (
        <div className="tile tile-teal p-10 text-center">
          <p className="font-mono text-4xl text-ink-600 mb-4">⌕</p>
          <p className="font-mono text-ink-300 text-sm">Type to search your knowledge base</p>
          <p className="text-[11px] font-mono text-ink-500 mt-1">Decay-urgency boosted — fading notes ranked higher</p>
        </div>
      )}
    </div>
  )
}
