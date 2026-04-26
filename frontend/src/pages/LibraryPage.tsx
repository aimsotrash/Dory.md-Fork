import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Loader2, FolderPlus, FolderOpen, Check, ChevronRight, Lock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllChunks, bulkDeleteChunks, getFolders } from '@/lib/api';
import { NoteDetailPanel, type PanelChunk } from '@/components/notes/NoteDetailPanel';
import type { BackendChunk, Category } from '@/lib/types';
import { categoryColors, retentionToColor } from '@/styles/theme';
import { formatRetentionPct } from '@/lib/utils';

const ENC_PREFIX = 'ENC:';
const ALL_CATEGORIES: Category[] = ['technical', 'personal', 'reference', 'general'];

interface LibraryChunk extends BackendChunk { folder?: string | null; }

function toPanel(c: LibraryChunk): PanelChunk {
  return {
    id: c.chunk_id,
    source_file: c.source_file,
    category: c.category,
    retention: c.retention,
    access_count: c.access_count,
    last_accessed: c.last_accessed,
    folder: c.folder,
    content: c.content,
  };
}

function baseName(path: string) { return path.split(/[\\/]/).pop() ?? path; }

export function LibraryPage() {
  const [chunks, setChunks] = useState<LibraryChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all');
  const [sortBy, setSortBy] = useState<'retention' | 'recent' | 'access'>('retention');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, f] = await Promise.all([getAllChunks(), getFolders()]);
      setChunks(r.chunks.map(c => ({ ...c, folder: (c as LibraryChunk).folder ?? null })));
      setFolders(f);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const activeChunk = chunks.find(c => c.chunk_id === activeChunkId) ?? null;

  const visible = chunks
    .filter(c => {
      if (activeFolder !== null && (c.folder ?? null) !== activeFolder) return false;
      if (filterCat !== 'all') {
        const cat = (c.category ?? '').toLowerCase();
        const mapped = cat.includes('technical') || cat.includes('code') || cat.includes('algorithm') || cat.includes('data')
          ? 'technical' : cat.includes('personal') ? 'personal' : cat.includes('reference') ? 'reference' : 'general';
        if (mapped !== filterCat) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'retention') return (a.retention ?? 0) - (b.retention ?? 0);
      if (sortBy === 'recent') return new Date(b.last_accessed_iso).getTime() - new Date(a.last_accessed_iso).getTime();
      return b.access_count - a.access_count;
    });

  function toggleSelect(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function selectAll() {
    const ids = visible.map(c => c.chunk_id);
    setSelected(prev => prev.size === ids.length ? new Set() : new Set(ids));
  }

  async function doBulkDelete() {
    const ids = [...selected];
    await bulkDeleteChunks(ids);
    setChunks(prev => prev.filter(c => !ids.includes(c.chunk_id)));
    setSelected(new Set());
    setConfirmBulkDelete(false);
    if (activeChunkId && ids.includes(activeChunkId)) setActiveChunkId(null);
    await getFolders().then(setFolders);
  }

  async function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    if (!folders.includes(name)) setFolders(prev => [...prev, name].sort());
    setNewFolderName(''); setShowNewFolder(false);
  }

  return (
    <div className="flex -mx-6 -my-5 border-t" style={{ height: 'calc(100vh - 110px)', borderColor: '#1f1f1f' }}>

      {/* ── LEFT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex flex-col border-r" style={{ width: 380, minWidth: 280, borderColor: '#1f1f1f' }}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid #1f1f1f' }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-semibold text-white">Library</h1>
            <button onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-[#1c1c1c] transition-all border border-[#252525]">
              <FolderPlus size={11} /> New folder
            </button>
          </div>

          {/* Folder tabs */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            <button onClick={() => setActiveFolder(null)}
              className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
                activeFolder === null ? 'bg-nebula-500/20 border-nebula-500/40 text-nebula-300' : 'border-[#252525] text-slate-500 hover:text-slate-300 hover:bg-[#1c1c1c]')}>
              All ({chunks.length})
            </button>
            {folders.map(f => (
              <button key={f} onClick={() => setActiveFolder(f)}
                className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1',
                  activeFolder === f ? 'bg-nebula-500/20 border-nebula-500/40 text-nebula-300' : 'border-[#252525] text-slate-500 hover:text-slate-300 hover:bg-[#1c1c1c]')}>
                <FolderOpen size={10} /> {f}
              </button>
            ))}
          </div>

          {/* Filter + sort */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 flex-wrap flex-1">
              <button onClick={() => setFilterCat('all')}
                className={cn('px-2 py-1 rounded text-[10px] font-medium border transition-all',
                  filterCat === 'all' ? 'bg-[#252525] border-[#333] text-slate-200' : 'border-[#1f1f1f] text-slate-600 hover:text-slate-400')}>All</button>
              {ALL_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className="px-2 py-1 rounded text-[10px] font-medium border transition-all capitalize"
                  style={filterCat === cat
                    ? { color: categoryColors[cat], borderColor: `${categoryColors[cat]}50`, background: `${categoryColors[cat]}15` }
                    : { color: '#64748b', borderColor: '#1f1f1f' }}>
                  {cat}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="text-[10px] text-slate-500 rounded px-1.5 py-1 outline-none"
              style={{ background: '#161616', border: '1px solid #252525' }}>
              <option value="retention">Fading first</option>
              <option value="recent">Recent</option>
              <option value="access">Most accessed</option>
            </select>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="px-4 py-2 flex items-center gap-2 shrink-0" style={{ borderBottom: '1px solid #1f1f1f', background: '#111' }}>
            <span className="text-[11px] text-slate-400 flex-1">{selected.size} selected</span>
            <div className="relative">
              <button onClick={() => setShowBulkMoveMenu(v => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-400 hover:text-white hover:bg-[#1c1c1c] border border-[#252525] transition-all">
                <FolderOpen size={10} /> Move
              </button>
              {showBulkMoveMenu && (
                <div className="absolute left-0 top-7 z-20 rounded-lg border border-[#252525] shadow-xl py-1 min-w-[140px]" style={{ background: '#161616' }}>
                  <button onClick={async () => { await Promise.all([...selected].map(id => import('@/lib/api').then(m => m.moveChunkToFolder(id, null)))); setChunks(prev => prev.map(c => selected.has(c.chunk_id) ? { ...c, folder: null } : c)); setShowBulkMoveMenu(false); getFolders().then(setFolders); }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-slate-400 hover:text-white hover:bg-[#1c1c1c] transition-colors">
                    Remove from folder
                  </button>
                  {folders.map(f => (
                    <button key={f} onClick={async () => { await Promise.all([...selected].map(id => import('@/lib/api').then(m => m.moveChunkToFolder(id, f)))); setChunks(prev => prev.map(c => selected.has(c.chunk_id) ? { ...c, folder: f } : c)); setShowBulkMoveMenu(false); getFolders().then(setFolders); }}
                      className="w-full text-left px-3 py-1.5 text-[11px] text-slate-400 hover:text-white hover:bg-[#1c1c1c] transition-colors flex items-center gap-1.5">
                      <FolderOpen size={9} /> {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setConfirmBulkDelete(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all">
              <Trash2 size={10} /> Delete
            </button>
          </div>
        )}

        {/* Select all */}
        <div className="px-4 py-2 flex items-center gap-2 shrink-0" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <button onClick={selectAll} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
            <div className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
              selected.size > 0 && selected.size === visible.length ? 'bg-nebula-500 border-nebula-500' : 'border-[#333]')}>
              {selected.size > 0 && selected.size === visible.length && <Check size={9} className="text-white" />}
            </div>
            Select all
          </button>
          <span className="text-[10px] text-slate-700 ml-auto">{visible.length} notes</span>
        </div>

        {/* Chunk list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={18} className="animate-spin text-slate-700" /></div>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen size={24} className="text-slate-800 mx-auto mb-3" />
              <p className="text-[12px] text-slate-600">{chunks.length === 0 ? 'No notes yet — import files to get started.' : 'No notes in this view.'}</p>
            </div>
          ) : visible.map(chunk => {
            const retention = chunk.retention ?? 0.5;
            const color = retentionToColor(retention);
            const isActive = activeChunkId === chunk.chunk_id;
            const isSelected = selected.has(chunk.chunk_id);
            const isEnc = chunk.content.startsWith(ENC_PREFIX) || chunk.content === '[Encrypted]';
            return (
              <div key={chunk.chunk_id} onClick={() => setActiveChunkId(chunk.chunk_id)}
                className={cn('flex items-start gap-2.5 px-4 py-3 cursor-pointer border-b transition-all', isActive ? 'bg-[#161616]' : 'hover:bg-[#111]')}
                style={{ borderColor: '#141414' }}>
                {/* Checkbox */}
                <div onClick={e => { e.stopPropagation(); toggleSelect(chunk.chunk_id); }}
                  className={cn('mt-0.5 w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-all cursor-pointer',
                    isSelected ? 'bg-nebula-500 border-nebula-500' : 'border-[#333] hover:border-[#555]')}>
                  {isSelected && <Check size={9} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono text-slate-500 truncate flex-1">{baseName(chunk.source_file)}</span>
                    {isEnc && <Lock size={9} className="text-amber-500 shrink-0" />}
                    <span className="text-[10px] font-mono shrink-0" style={{ color }}>{formatRetentionPct(retention)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {isEnc ? '🔒 Encrypted note' : chunk.content}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] text-slate-700">{chunk.last_accessed}</span>
                    {chunk.folder && <span className="text-[9px] text-slate-700 flex items-center gap-0.5"><FolderOpen size={8} />{chunk.folder}</span>}
                  </div>
                </div>
                {isActive && <ChevronRight size={12} className="text-nebula-400 shrink-0 mt-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden" style={{ background: '#0a0a0a' }}>
        {activeChunk ? (
          <NoteDetailPanel
            chunk={toPanel(activeChunk)}
            folders={folders}
            onDelete={(id) => {
              setChunks(prev => prev.filter(c => c.chunk_id !== id));
              setActiveChunkId(null);
              getFolders().then(setFolders);
            }}
            onContentUpdate={(id, content) => {
              setChunks(prev => prev.map(c => c.chunk_id === id ? { ...c, content: content.slice(0, 300) } : c));
            }}
            onFolderChange={(id, folder) => {
              setChunks(prev => prev.map(c => c.chunk_id === id ? { ...c, folder } : c));
              getFolders().then(setFolders);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <BookOpen size={32} className="text-slate-800" />
            <p className="text-sm text-slate-600">Select a note to view, edit, or analyze it</p>
            <p className="text-xs text-slate-700">AI summarize · go deeper · optimize note · encrypt</p>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="gcard w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Create folder</h3>
            <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
              placeholder="Folder name…"
              className="w-full text-sm text-white rounded-lg px-3 py-2 outline-none"
              style={{ background: '#161616', border: '1px solid #252525' }} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="btn-secondary text-xs">Cancel</button>
              <button onClick={createFolder} disabled={!newFolderName.trim()} className="btn-primary text-xs">Create</button>
            </div>
          </div>
        </div>
      )}

      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="gcard w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Delete {selected.size} notes?</h3>
            <p className="text-xs text-slate-500">This permanently removes them from your knowledge base.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmBulkDelete(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={doBulkDelete}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
