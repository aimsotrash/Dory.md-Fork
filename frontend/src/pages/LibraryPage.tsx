import { useState } from 'react';
import { ChunkCard } from '@/components/chunks/ChunkCard';
import mockChunks from '@/data/mock_chunks.json';
import type { Chunk, Category } from '@/lib/types';
import { categoryColors } from '@/styles/theme';
import { BookOpen, SlidersHorizontal } from 'lucide-react';

const ALL_CATEGORIES: Category[] = ['technical', 'personal', 'reference', 'general'];

export function LibraryPage() {
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all');
  const [sortBy, setSortBy] = useState<'retention' | 'recent' | 'access'>('retention');

  const chunks = (mockChunks as Chunk[])
    .filter((c) => filterCat === 'all' || c.category === filterCat)
    .sort((a, b) => {
      if (sortBy === 'retention') return (a.retention ?? 0) - (b.retention ?? 0);
      if (sortBy === 'recent') return new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime();
      return b.access_count - a.access_count;
    });

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Library</h1>
        <p className="text-sm text-slate-500">All your ingested knowledge chunks</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterCat('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
              filterCat === 'all'
                ? 'bg-nebula-500/20 border-nebula-500/40 text-nebula-300'
                : 'bg-cosmos-800 border-cosmos-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          {ALL_CATEGORIES.map((cat) => {
            const color = categoryColors[cat];
            const active = filterCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 capitalize"
                style={
                  active
                    ? { color, borderColor: `${color}50`, background: `${color}15` }
                    : { color: '#94a3b8', borderColor: '#334155', background: 'rgba(30,41,59,0.5)' }
                }
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <SlidersHorizontal size={12} className="text-slate-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-cosmos-800 border border-cosmos-700 text-slate-400 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-nebula-500/50"
          >
            <option value="retention">Sort: Fading first</option>
            <option value="recent">Sort: Recent</option>
            <option value="access">Sort: Most accessed</option>
          </select>
        </div>
      </div>

      {chunks.length === 0 ? (
        <div className="glass-card p-10 text-center space-y-3">
          <BookOpen size={28} className="text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm">No memories in this category yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chunks.map((chunk) => (
            <ChunkCard key={chunk.id} chunk={chunk} />
          ))}
        </div>
      )}
    </div>
  );
}
