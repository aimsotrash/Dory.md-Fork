import { useState, useEffect } from 'react';
import { ChunkCard } from '@/components/chunks/ChunkCard';
import { getAllChunks } from '@/lib/api';
import type { BackendChunk, Category } from '@/lib/types';
import type { Chunk } from '@/lib/types';
import { categoryColors, retentionToColor, retentionToLabel } from '@/styles/theme';
import { BookOpen, SlidersHorizontal, Loader2, X, Brain, Clock, TrendingDown } from 'lucide-react';
import { formatRetentionPct } from '@/lib/utils';

const ALL_CATEGORIES: Category[] = ['technical', 'personal', 'reference', 'general'];

function toChunk(c: BackendChunk): Chunk {
  const cat = (c.category ?? '').toLowerCase();
  const category: Category =
    cat.includes('computer') || cat.includes('technical') || cat.includes('code') || cat.includes('algorithm') || cat.includes('math') || cat.includes('data') || cat.includes('design')
      ? 'technical'
      : cat.includes('personal')
      ? 'personal'
      : cat.includes('reference')
      ? 'reference'
      : 'general';

  const rawPath = c.source_file ?? '';
  const baseName = rawPath.split(/[\\/]/).pop() ?? rawPath;

  return {
    id: c.chunk_id,
    content: c.content,
    source_type: 'file',
    source_name: baseName,
    category,
    created_at: c.last_accessed_iso,
    last_accessed: c.last_accessed_iso,
    access_count: c.access_count,
    stability_S: 1,
    complexity_k: 1,
    retention: c.retention,
  };
}

export function LibraryPage() {
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all');
  const [sortBy, setSortBy] = useState<'retention' | 'recent' | 'access'>('retention');
  const [allChunks, setAllChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChunk, setOpenChunk] = useState<Chunk | null>(null);

  useEffect(() => {
    setLoading(true);
    getAllChunks()
      .then(r => setAllChunks(r.chunks.map(toChunk)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chunks = allChunks
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
        <p className="text-sm text-slate-500">
          {loading ? 'Loading…' : `${allChunks.length} memories in your knowledge base`}
        </p>
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin text-slate-600" />
        </div>
      ) : chunks.length === 0 ? (
        <div className="gcard p-10 text-center space-y-3">
          <BookOpen size={28} className="text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm">
            {allChunks.length === 0
              ? 'No memories yet — import files or connect Notion to get started.'
              : 'No memories in this category yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {chunks.map((chunk) => (
            <ChunkCard key={chunk.id} chunk={chunk} onClick={() => setOpenChunk(chunk)} />
          ))}
        </div>
      )}

      {/* Chunk detail modal */}
      {openChunk && (() => {
        const retention = openChunk.retention ?? 0.5;
        const color = retentionToColor(retention);
        const label = retentionToLabel(retention);
        const catColor = categoryColors[openChunk.category] ?? '#64748b';
        return (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={() => setOpenChunk(null)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[80vh] flex flex-col"
              style={{
                background: 'linear-gradient(135deg, rgba(15,10,30,0.98) 0%, rgba(5,8,16,0.99) 100%)',
                border: '1px solid rgba(124,58,237,0.3)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Brain size={14} className="text-nebula-400" />
                  <span className="text-xs font-mono text-slate-400">{openChunk.source_name}</span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                    style={{ color: catColor, background: `${catColor}15`, border: `1px solid ${catColor}30` }}
                  >
                    {openChunk.category}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded-full"
                    style={{ color, background: `${color}12`, border: `1px solid ${color}40` }}
                  >
                    {formatRetentionPct(retention)} · {label}
                  </span>
                  <button onClick={() => setOpenChunk(null)} className="text-slate-600 hover:text-white transition-colors">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div
                className="rounded-xl p-4 text-sm text-slate-200 leading-relaxed overflow-y-auto flex-1 whitespace-pre-wrap"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {openChunk.content}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-5 text-[11px] font-mono text-slate-600 shrink-0 flex-wrap">
                <span className="flex items-center gap-1"><Clock size={10} /> {openChunk.last_accessed}</span>
                <span className="flex items-center gap-1"><TrendingDown size={10} /> {openChunk.access_count}× reviewed</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
