import { useState } from 'react'
import { ChunkCard } from '@/components/chunks/ChunkCard'
import mockChunks from '@/data/mock_chunks.json'
import type { Chunk, Category } from '@/lib/types'

const ALL_CATEGORIES: (Category | 'all')[] = ['all', 'technical', 'personal', 'reference', 'general']
const CAT_COLORS: Record<string, string> = {
  technical: '#F5A623', personal: '#7C3AED', reference: '#00D4AA', general: '#525252'
}

export function LibraryPage() {
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')
  const [sortBy, setSortBy] = useState<'retention' | 'recent' | 'access'>('retention')

  const chunks = (mockChunks as Chunk[])
    .filter(c => filterCat === 'all' || c.category === filterCat)
    .sort((a, b) => {
      if (sortBy === 'retention') return (a.retention ?? 0) - (b.retention ?? 0)
      if (sortBy === 'recent') return new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime()
      return b.access_count - a.access_count
    })

  return (
    <div className="max-w-3xl space-y-5 animate-fade-up">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-50 tracking-tight">Library</h1>
        <p className="label mt-1">All indexed knowledge — {chunks.length} chunks</p>
      </div>

      {/* Filter + sort row */}
      <div className="flex items-center gap-2 flex-wrap">
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider border transition-all ${
              filterCat === cat ? 'text-ink-900 font-bold' : 'text-ink-400 border-ink-600 hover:border-ink-400 hover:text-ink-200 bg-transparent'
            }`}
            style={filterCat === cat ? { background: CAT_COLORS[cat] ?? '#F5A623', borderColor: CAT_COLORS[cat] ?? '#F5A623' } : {}}
          >
            {cat}
          </button>
        ))}

        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="input text-xs py-1.5 cursor-pointer"
            style={{ width: 'auto' }}
          >
            <option value="retention">FADING FIRST</option>
            <option value="recent">RECENT</option>
            <option value="access">MOST REVIEWED</option>
          </select>
        </div>
      </div>

      {chunks.length === 0 ? (
        <div className="tile p-10 text-center">
          <p className="font-mono text-ink-400 text-sm">No memories in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chunks.map(chunk => <ChunkCard key={chunk.id} chunk={chunk} />)}
        </div>
      )}
    </div>
  )
}
