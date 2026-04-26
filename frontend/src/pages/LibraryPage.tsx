import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Loader2, X, Brain, Clock,
  TrendingDown, Pencil, Trash2, FolderPlus, FolderOpen,
  Check, Lock, Unlock, Eye, EyeOff, ChevronRight, Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAllChunks, getChunkDetail, updateChunk, deleteChunk,
  bulkDeleteChunks, moveChunkToFolder, getFolders,
} from '@/lib/api';
import type { BackendChunk, Category } from '@/lib/types';
import { categoryColors, retentionToColor, retentionToLabel } from '@/styles/theme';
import { formatRetentionPct } from '@/lib/utils';

// ── Crypto helpers ────────────────────────────────────────────────────────────

const ENC_PREFIX = 'ENC:';

async function encryptContent(content: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey'],
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(content));
  const combined = new Uint8Array(16 + 12 + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(ciphertext), 28);
  return ENC_PREFIX + btoa(String.fromCharCode(...combined));
}

async function decryptContent(encrypted: string, password: string): Promise<string> {
  const combined = Uint8Array.from(atob(encrypted.slice(ENC_PREFIX.length)), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LibraryChunk extends BackendChunk {
  folder?: string | null;
}

const ALL_CATEGORIES: Category[] = ['technical', 'personal', 'reference', 'general'];

function toLibraryChunk(c: BackendChunk): LibraryChunk {
  return { ...c, folder: (c as LibraryChunk).folder ?? null };
}

function baseName(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LibraryPage() {
  const [chunks, setChunks] = useState<LibraryChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = All
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all');
  const [sortBy, setSortBy] = useState<'retention' | 'recent' | 'access'>('retention');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Right panel state
  const [activeChunk, setActiveChunk] = useState<LibraryChunk | null>(null);
  const [fullContent, setFullContent] = useState<string>('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Folder modal
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<'single' | 'bulk' | null>(null);

  // Encrypt modal
  const [encryptModal, setEncryptModal] = useState<'lock' | 'unlock' | null>(null);
  const [encryptPassword, setEncryptPassword] = useState('');
  const [encryptConfirm, setEncryptConfirm] = useState('');
  const [encryptError, setEncryptError] = useState('');
  const [encryptBusy, setEncryptBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [decryptedView, setDecryptedView] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, f] = await Promise.all([getAllChunks(), getFolders()]);
      setChunks(r.chunks.map(toLibraryChunk));
      setFolders(f);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Load full content when active chunk changes
  useEffect(() => {
    if (!activeChunk) { setFullContent(''); setDecryptedView(null); return; }
    setLoadingDetail(true);
    setEditMode(false);
    setDecryptedView(null);
    getChunkDetail(activeChunk.chunk_id)
      .then(d => setFullContent(d.content))
      .catch(() => setFullContent(activeChunk.content))
      .finally(() => setLoadingDetail(false));
  }, [activeChunk?.chunk_id]);

  // ── Filtered / sorted list ─────────────────────────────────────────────────

  const visible = chunks
    .filter(c => {
      if (activeFolder !== null && (c.folder ?? null) !== activeFolder) return false;
      if (filterCat !== 'all') {
        const cat = (c.category ?? '').toLowerCase();
        const mapped =
          cat.includes('technical') || cat.includes('code') || cat.includes('algorithm') || cat.includes('data')
            ? 'technical'
            : cat.includes('personal') ? 'personal'
            : cat.includes('reference') ? 'reference'
            : 'general';
        if (mapped !== filterCat) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'retention') return (a.retention ?? 0) - (b.retention ?? 0);
      if (sortBy === 'recent') return new Date(b.last_accessed_iso).getTime() - new Date(a.last_accessed_iso).getTime();
      return b.access_count - a.access_count;
    });

  // ── Selection helpers ──────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function selectAll() {
    const allIds = visible.map(c => c.chunk_id);
    setSelected(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function doDeleteSingle() {
    if (!activeChunk) return;
    await deleteChunk(activeChunk.chunk_id);
    setChunks(prev => prev.filter(c => c.chunk_id !== activeChunk.chunk_id));
    setActiveChunk(null);
    setConfirmDelete(null);
    await getFolders().then(setFolders);
  }

  async function doDeleteBulk() {
    const ids = [...selected];
    await bulkDeleteChunks(ids);
    setChunks(prev => prev.filter(c => !ids.includes(c.chunk_id)));
    setSelected(new Set());
    setConfirmDelete(null);
    if (activeChunk && ids.includes(activeChunk.chunk_id)) setActiveChunk(null);
    await getFolders().then(setFolders);
  }

  // ── Edit / Save ────────────────────────────────────────────────────────────

  function startEdit() {
    setEditContent(decryptedView ?? fullContent);
    setEditMode(true);
  }

  async function saveEdit() {
    if (!activeChunk) return;
    setSaving(true);
    try {
      // Re-encrypt if content was previously encrypted
      const toStore = fullContent.startsWith(ENC_PREFIX) && decryptedView !== null
        ? fullContent  // keep old encrypted blob; user must re-encrypt explicitly
        : editContent;
      await updateChunk(activeChunk.chunk_id, toStore);
      setFullContent(toStore);
      setChunks(prev => prev.map(c => c.chunk_id === activeChunk.chunk_id
        ? { ...c, content: toStore.slice(0, 300) } : c));
      setEditMode(false);
    } catch { /* noop */ }
    setSaving(false);
  }

  // ── Folders ────────────────────────────────────────────────────────────────

  async function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    if (!folders.includes(name)) setFolders(prev => [...prev, name].sort());
    setNewFolderName('');
    setShowNewFolder(false);
  }

  async function moveTo(folder: string | null) {
    if (!activeChunk) return;
    await moveChunkToFolder(activeChunk.chunk_id, folder);
    setChunks(prev => prev.map(c => c.chunk_id === activeChunk.chunk_id ? { ...c, folder } : c));
    setActiveChunk(prev => prev ? { ...prev, folder } : prev);
    setShowMoveMenu(false);
    await getFolders().then(setFolders);
  }

  async function moveBulkTo(folder: string | null) {
    await Promise.all([...selected].map(id => moveChunkToFolder(id, folder)));
    setChunks(prev => prev.map(c => selected.has(c.chunk_id) ? { ...c, folder } : c));
    setShowMoveMenu(false);
    await getFolders().then(setFolders);
  }

  // ── Encrypt ────────────────────────────────────────────────────────────────

  async function doEncrypt() {
    if (!activeChunk) return;
    if (encryptPassword !== encryptConfirm) { setEncryptError('Passwords do not match'); return; }
    if (encryptPassword.length < 4) { setEncryptError('Password must be at least 4 characters'); return; }
    setEncryptBusy(true);
    setEncryptError('');
    try {
      const encrypted = await encryptContent(fullContent, encryptPassword);
      await updateChunk(activeChunk.chunk_id, encrypted);
      setFullContent(encrypted);
      setChunks(prev => prev.map(c => c.chunk_id === activeChunk.chunk_id
        ? { ...c, content: '[Encrypted]' } : c));
      setDecryptedView(null);
    } catch { setEncryptError('Encryption failed'); }
    setEncryptBusy(false);
    setEncryptPassword(''); setEncryptConfirm('');
    setEncryptModal(null);
  }

  async function doDecrypt() {
    if (!activeChunk) return;
    setEncryptBusy(true);
    setEncryptError('');
    try {
      const plain = await decryptContent(fullContent, encryptPassword);
      setDecryptedView(plain);
      setEncryptModal(null);
    } catch { setEncryptError('Wrong password'); }
    setEncryptBusy(false);
    setEncryptPassword('');
  }

  const isEncrypted = fullContent.startsWith(ENC_PREFIX);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex -mx-6 -my-5 border-t"
      style={{ height: 'calc(100vh - 110px)', borderColor: '#1f1f1f' }}
    >
      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col border-r" style={{ width: 380, minWidth: 280, borderColor: '#1f1f1f' }}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid #1f1f1f' }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-semibold text-white">Library</h1>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-[#1c1c1c] transition-all border border-[#252525]"
              >
                <FolderPlus size={11} /> New folder
              </button>
            </div>
          </div>

          {/* Folder tabs */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            <button
              onClick={() => setActiveFolder(null)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
                activeFolder === null
                  ? 'bg-nebula-500/20 border-nebula-500/40 text-nebula-300'
                  : 'border-[#252525] text-slate-500 hover:text-slate-300 hover:bg-[#1c1c1c]'
              )}
            >
              All ({chunks.length})
            </button>
            {folders.map(f => (
              <button
                key={f}
                onClick={() => setActiveFolder(f)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1',
                  activeFolder === f
                    ? 'bg-nebula-500/20 border-nebula-500/40 text-nebula-300'
                    : 'border-[#252525] text-slate-500 hover:text-slate-300 hover:bg-[#1c1c1c]'
                )}
              >
                <FolderOpen size={10} /> {f}
              </button>
            ))}
          </div>

          {/* Category filter + sort */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 flex-wrap flex-1">
              <button
                onClick={() => setFilterCat('all')}
                className={cn('px-2 py-1 rounded text-[10px] font-medium border transition-all',
                  filterCat === 'all' ? 'bg-[#252525] border-[#333] text-slate-200' : 'border-[#1f1f1f] text-slate-600 hover:text-slate-400')}
              >All</button>
              {ALL_CATEGORIES.map(cat => (
                <button key={cat}
                  onClick={() => setFilterCat(cat)}
                  className="px-2 py-1 rounded text-[10px] font-medium border transition-all capitalize"
                  style={filterCat === cat
                    ? { color: categoryColors[cat], borderColor: `${categoryColors[cat]}50`, background: `${categoryColors[cat]}15` }
                    : { color: '#64748b', borderColor: '#1f1f1f' }}
                >{cat}</button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="text-[10px] text-slate-500 rounded px-1.5 py-1 outline-none"
              style={{ background: '#161616', border: '1px solid #252525' }}
            >
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
              <button
                onClick={() => setShowMoveMenu(v => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-400 hover:text-white hover:bg-[#1c1c1c] border border-[#252525] transition-all"
              >
                <FolderOpen size={10} /> Move
              </button>
              {showMoveMenu && (
                <div className="absolute left-0 top-7 z-20 rounded-lg border border-[#252525] shadow-xl py-1 min-w-[140px]" style={{ background: '#161616' }}>
                  <button onClick={() => moveBulkTo(null)} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-400 hover:text-white hover:bg-[#1c1c1c] transition-colors">
                    Remove from folder
                  </button>
                  {folders.map(f => (
                    <button key={f} onClick={() => moveBulkTo(f)} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-400 hover:text-white hover:bg-[#1c1c1c] transition-colors flex items-center gap-1.5">
                      <FolderOpen size={9} /> {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setConfirmDelete('bulk')}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all"
            >
              <Trash2 size={10} /> Delete
            </button>
          </div>
        )}

        {/* Select all / count row */}
        <div className="px-4 py-2 flex items-center gap-2 shrink-0" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <button onClick={selectAll} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
            <div className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
              selected.size > 0 && selected.size === visible.length
                ? 'bg-nebula-500 border-nebula-500' : 'border-[#333]')}>
              {selected.size > 0 && selected.size === visible.length && <Check size={9} className="text-white" />}
            </div>
            Select all
          </button>
          <span className="text-[10px] text-slate-700 ml-auto">{visible.length} notes</span>
        </div>

        {/* Chunk list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={18} className="animate-spin text-slate-700" />
            </div>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen size={24} className="text-slate-800 mx-auto mb-3" />
              <p className="text-[12px] text-slate-600">
                {chunks.length === 0 ? 'No notes yet — import files to get started.' : 'No notes in this view.'}
              </p>
            </div>
          ) : (
            visible.map(chunk => {
              const retention = chunk.retention ?? 0.5;
              const color = retentionToColor(retention);
              const isActive = activeChunk?.chunk_id === chunk.chunk_id;
              const isSelected = selected.has(chunk.chunk_id);
              const isEnc = chunk.content.startsWith(ENC_PREFIX) || chunk.content === '[Encrypted]';
              return (
                <div
                  key={chunk.chunk_id}
                  onClick={() => setActiveChunk(chunk)}
                  className={cn(
                    'flex items-start gap-2.5 px-4 py-3 cursor-pointer border-b transition-all',
                    isActive ? 'bg-[#161616]' : 'hover:bg-[#111]'
                  )}
                  style={{ borderColor: '#141414' }}
                >
                  {/* Checkbox */}
                  <div
                    onClick={e => { e.stopPropagation(); toggleSelect(chunk.chunk_id); }}
                    className={cn('mt-0.5 w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-all cursor-pointer',
                      isSelected ? 'bg-nebula-500 border-nebula-500' : 'border-[#333] hover:border-[#555]')}
                  >
                    {isSelected && <Check size={9} className="text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Source + retention */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono text-slate-500 truncate flex-1">{baseName(chunk.source_file)}</span>
                      {isEnc && <Lock size={9} className="text-amber-500 shrink-0" />}
                      <span className="text-[10px] font-mono shrink-0" style={{ color }}>{formatRetentionPct(retention)}</span>
                    </div>
                    {/* Content preview */}
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {isEnc ? '🔒 Encrypted note' : chunk.content}
                    </p>
                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] text-slate-700">{chunk.last_accessed}</span>
                      {chunk.folder && (
                        <span className="text-[9px] text-slate-700 flex items-center gap-0.5">
                          <FolderOpen size={8} /> {chunk.folder}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active indicator */}
                  {isActive && <ChevronRight size={12} className="text-nebula-400 shrink-0 mt-1" />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0a0a0a' }}>
        {!activeChunk ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <BookOpen size={32} className="text-slate-800" />
            <p className="text-sm text-slate-600">Select a note to view or edit it</p>
            <p className="text-xs text-slate-700">Use checkboxes for bulk actions</p>
          </div>
        ) : (
          <>
            {/* Detail header */}
            <div className="px-6 py-3 flex items-center gap-3 shrink-0" style={{ borderBottom: '1px solid #1f1f1f' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{baseName(activeChunk.source_file)}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {activeChunk.category && (
                    <span className="text-[10px] capitalize px-1.5 py-0.5 rounded font-medium"
                      style={{ color: categoryColors[(activeChunk.category?.toLowerCase() as Category) ?? 'general'] ?? '#64748b', background: `${categoryColors[(activeChunk.category?.toLowerCase() as Category) ?? 'general'] ?? '#64748b'}15` }}>
                      {activeChunk.category}
                    </span>
                  )}
                  {activeChunk.folder && (
                    <span className="text-[10px] text-slate-600 flex items-center gap-0.5"><FolderOpen size={9} />{activeChunk.folder}</span>
                  )}
                  <span className="text-[10px] font-mono" style={{ color: retentionToColor(activeChunk.retention ?? 0.5) }}>
                    {formatRetentionPct(activeChunk.retention ?? 0.5)} · {retentionToLabel(activeChunk.retention ?? 0.5)}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Move to folder */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoveMenu(v => !v)}
                    title="Move to folder"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-[#1c1c1c] transition-all border border-transparent hover:border-[#252525]"
                  >
                    <FolderOpen size={13} />
                  </button>
                  {showMoveMenu && (
                    <div className="absolute right-0 top-8 z-20 rounded-lg border border-[#252525] shadow-xl py-1 min-w-[160px]" style={{ background: '#161616' }}>
                      <button onClick={() => moveTo(null)} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-400 hover:text-white hover:bg-[#1c1c1c] transition-colors">
                        Remove from folder
                      </button>
                      {folders.map(f => (
                        <button key={f} onClick={() => moveTo(f)} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-400 hover:text-white hover:bg-[#1c1c1c] transition-colors flex items-center gap-1.5">
                          <FolderOpen size={9} /> {f}
                          {activeChunk.folder === f && <Check size={9} className="text-nebula-400 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Encrypt / decrypt */}
                {isEncrypted ? (
                  <button
                    onClick={() => decryptedView ? setDecryptedView(null) : setEncryptModal('unlock')}
                    title={decryptedView ? 'Lock note' : 'Unlock note'}
                    className="p-1.5 rounded-lg text-amber-500 hover:text-amber-300 hover:bg-amber-500/10 transition-all border border-transparent hover:border-amber-500/20"
                  >
                    {decryptedView ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                ) : (
                  <button
                    onClick={() => setEncryptModal('lock')}
                    title="Encrypt note"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all border border-transparent hover:border-amber-500/20"
                  >
                    <Lock size={13} />
                  </button>
                )}

                {/* Edit / Save */}
                {!isEncrypted || decryptedView ? (
                  editMode ? (
                    <button onClick={saveEdit} disabled={saving}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                      style={{ background: '#7c3aed', color: 'white', opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  ) : (
                    <button onClick={startEdit}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-[#1c1c1c] transition-all border border-transparent hover:border-[#252525]"
                      title="Edit note"
                    >
                      <Pencil size={13} />
                    </button>
                  )
                ) : null}

                {editMode && (
                  <button onClick={() => setEditMode(false)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 transition-all"
                  >
                    <X size={13} />
                  </button>
                )}

                {/* Delete */}
                <button onClick={() => setConfirmDelete('single')}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                  title="Delete note"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={18} className="animate-spin text-slate-700" />
                </div>
              ) : isEncrypted && !decryptedView ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Lock size={20} className="text-amber-500" />
                  </div>
                  <p className="text-sm text-slate-400">This note is encrypted</p>
                  <button
                    onClick={() => setEncryptModal('unlock')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    <Unlock size={13} /> Unlock with password
                  </button>
                </div>
              ) : editMode ? (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[400px] text-sm text-slate-200 leading-relaxed resize-none outline-none rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #252525', fontFamily: 'inherit' }}
                  autoFocus
                />
              ) : (
                <div>
                  <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {decryptedView ?? fullContent}
                  </pre>
                  {/* Footer meta */}
                  <div className="flex items-center gap-5 text-[11px] font-mono text-slate-700 mt-8 pt-4 flex-wrap" style={{ borderTop: '1px solid #1a1a1a' }}>
                    <span className="flex items-center gap-1"><Clock size={10} /> {activeChunk.last_accessed}</span>
                    <span className="flex items-center gap-1"><TrendingDown size={10} /> {activeChunk.access_count}× reviewed</span>
                    <span className="flex items-center gap-1"><Brain size={10} /> {baseName(activeChunk.source_file)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}

      {/* New folder */}
      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="gcard w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Create folder</h3>
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
              placeholder="Folder name…"
              className="w-full text-sm text-white rounded-lg px-3 py-2 outline-none"
              style={{ background: '#161616', border: '1px solid #252525' }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="btn-secondary text-xs">Cancel</button>
              <button onClick={createFolder} disabled={!newFolderName.trim()} className="btn-primary text-xs">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="gcard w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              {confirmDelete === 'bulk' ? `Delete ${selected.size} notes?` : 'Delete this note?'}
            </h3>
            <p className="text-xs text-slate-500">This will permanently remove the note{confirmDelete === 'bulk' ? 's' : ''} from your knowledge base.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary text-xs">Cancel</button>
              <button
                onClick={confirmDelete === 'bulk' ? doDeleteBulk : doDeleteSingle}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Encrypt modal */}
      {encryptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="gcard w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-white">
                {encryptModal === 'lock' ? 'Encrypt note' : 'Unlock note'}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              {encryptModal === 'lock'
                ? 'Note will be encrypted with AES-256. You need your password to read it again.'
                : 'Enter the password to decrypt this note.'}
            </p>
            <div className="space-y-2">
              <div className="relative">
                <input
                  autoFocus
                  type={showPw ? 'text' : 'password'}
                  value={encryptPassword}
                  onChange={e => { setEncryptPassword(e.target.value); setEncryptError(''); }}
                  placeholder="Password…"
                  className="w-full text-sm text-white rounded-lg px-3 py-2 outline-none pr-8"
                  style={{ background: '#161616', border: '1px solid #252525' }}
                />
                <button onClick={() => setShowPw(v => !v)} className="absolute right-2 top-2 text-slate-600 hover:text-slate-400">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {encryptModal === 'lock' && (
                <input
                  type={showPw ? 'text' : 'password'}
                  value={encryptConfirm}
                  onChange={e => { setEncryptConfirm(e.target.value); setEncryptError(''); }}
                  placeholder="Confirm password…"
                  className="w-full text-sm text-white rounded-lg px-3 py-2 outline-none"
                  style={{ background: '#161616', border: '1px solid #252525' }}
                />
              )}
              {encryptError && <p className="text-[11px] text-red-400">{encryptError}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setEncryptModal(null); setEncryptPassword(''); setEncryptConfirm(''); setEncryptError(''); }} className="btn-secondary text-xs">Cancel</button>
              <button
                onClick={encryptModal === 'lock' ? doEncrypt : doDecrypt}
                disabled={encryptBusy || !encryptPassword}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', opacity: encryptBusy || !encryptPassword ? 0.5 : 1 }}
              >
                {encryptBusy ? <Loader2 size={11} className="animate-spin" /> : encryptModal === 'lock' ? <Lock size={11} /> : <Unlock size={11} />}
                {encryptModal === 'lock' ? 'Encrypt' : 'Decrypt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
