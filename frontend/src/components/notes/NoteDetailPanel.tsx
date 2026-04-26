import { useState, useEffect } from 'react';
import {
  Pencil, Trash2, FolderOpen, Lock, Unlock, Eye, EyeOff,
  Save, X, Loader2, Brain, Clock, TrendingDown, Sparkles,
  BookOpen, Layers, Check, ChevronDown, Download,
} from 'lucide-react';
import { cn, formatRetentionPct } from '@/lib/utils';
import {
  getChunkDetail, updateChunk, deleteChunk,
  moveChunkToFolder, aiSummarize, aiExpand, aiOptimize,
  ingestText,
} from '@/lib/api';
import { retentionToColor, retentionToLabel, categoryColors } from '@/styles/theme';
import type { Category } from '@/lib/types';

// ── Crypto ────────────────────────────────────────────────────────────────────
const ENC_PREFIX = 'ENC:';

async function encryptContent(content: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['encrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(content));
  const combined = new Uint8Array(16 + 12 + ct.byteLength);
  combined.set(salt, 0); combined.set(iv, 16); combined.set(new Uint8Array(ct), 28);
  return ENC_PREFIX + btoa(String.fromCharCode(...combined));
}

async function decryptContent(enc: string, password: string): Promise<string> {
  const combined = Uint8Array.from(atob(enc.slice(ENC_PREFIX.length)), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16), iv = combined.slice(16, 28), ct = combined.slice(28);
  const e = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', e.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct));
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PanelChunk {
  id: string;
  source_file: string;
  category?: string | null;
  retention?: number;
  access_count: number;
  last_accessed: string;
  folder?: string | null;
  content: string; // preview (may be truncated)
}

interface NoteDetailPanelProps {
  chunk: PanelChunk;
  folders?: string[];
  onDelete?: (id: string) => void;
  onContentUpdate?: (id: string, content: string) => void;
  onFolderChange?: (id: string, folder: string | null) => void;
}

type AIPhase = 'idle' | 'summarizing' | 'summarized' | 'expanding' | 'expanded' | 'optimizing' | 'optimized';

function baseName(p: string) { return p.split(/[\\/]/).pop() ?? p; }

// ── Component ─────────────────────────────────────────────────────────────────

export function NoteDetailPanel({ chunk, folders = [], onDelete, onContentUpdate, onFolderChange }: NoteDetailPanelProps) {
  const [fullContent, setFullContent] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(true);

  // Edit
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Folder menu
  const [showFolderMenu, setShowFolderMenu] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Encrypt
  const [encryptModal, setEncryptModal] = useState<'lock' | 'unlock' | null>(null);
  const [encryptPw, setEncryptPw] = useState('');
  const [encryptConfirm, setEncryptConfirm] = useState('');
  const [encryptError, setEncryptError] = useState('');
  const [encryptBusy, setEncryptBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [decryptedView, setDecryptedView] = useState<string | null>(null);

  // AI
  const [aiPhase, setAiPhase] = useState<AIPhase>('idle');
  const [aiError, setAiError] = useState('');
  const [summary, setSummary] = useState('');
  const [expanded, setExpanded] = useState('');
  const [optimized, setOptimized] = useState('');
  const [savedOptimized, setSavedOptimized] = useState(false);

  // Load full content on chunk change
  useEffect(() => {
    setLoadingDetail(true);
    setEditMode(false);
    setDecryptedView(null);
    setAiPhase('idle');
    setSummary(''); setExpanded(''); setOptimized('');
    setSavedOptimized(false);
    getChunkDetail(chunk.id)
      .then(d => setFullContent(d.content))
      .catch(() => setFullContent(chunk.content))
      .finally(() => setLoadingDetail(false));
  }, [chunk.id]);

  const isEncrypted = fullContent.startsWith(ENC_PREFIX);
  const displayContent = decryptedView ?? (isEncrypted ? null : fullContent);
  const retention = chunk.retention ?? 0.5;
  const color = retentionToColor(retention);
  const catColor = categoryColors[(chunk.category?.toLowerCase() as Category) ?? 'general'] ?? '#64748b';

  // ── Edit ────────────────────────────────────────────────────────────────────
  function startEdit() {
    setEditContent(decryptedView ?? fullContent);
    setEditMode(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await updateChunk(chunk.id, editContent);
      setFullContent(editContent);
      onContentUpdate?.(chunk.id, editContent);
      setEditMode(false);
    } catch { /* noop */ }
    setSaving(false);
  }

  // ── Folder ──────────────────────────────────────────────────────────────────
  async function moveTo(folder: string | null) {
    await moveChunkToFolder(chunk.id, folder);
    onFolderChange?.(chunk.id, folder);
    setShowFolderMenu(false);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function doDelete() {
    await deleteChunk(chunk.id);
    onDelete?.(chunk.id);
    setConfirmDelete(false);
  }

  // ── Encrypt ─────────────────────────────────────────────────────────────────
  async function doEncrypt() {
    if (encryptPw !== encryptConfirm) { setEncryptError('Passwords do not match'); return; }
    if (encryptPw.length < 4) { setEncryptError('At least 4 characters'); return; }
    setEncryptBusy(true); setEncryptError('');
    try {
      const enc = await encryptContent(fullContent, encryptPw);
      await updateChunk(chunk.id, enc);
      setFullContent(enc);
      onContentUpdate?.(chunk.id, enc);
      setDecryptedView(null);
    } catch { setEncryptError('Encryption failed'); }
    setEncryptBusy(false); setEncryptPw(''); setEncryptConfirm(''); setEncryptModal(null);
  }

  async function doDecrypt() {
    setEncryptBusy(true); setEncryptError('');
    try {
      setDecryptedView(await decryptContent(fullContent, encryptPw));
      setEncryptModal(null);
    } catch { setEncryptError('Wrong password'); }
    setEncryptBusy(false); setEncryptPw('');
  }

  // ── AI ──────────────────────────────────────────────────────────────────────
  const contentForAI = decryptedView ?? fullContent;

  async function handleSummarize() {
    setAiPhase('summarizing'); setAiError('');
    try {
      setSummary(await aiSummarize(contentForAI));
      setAiPhase('summarized');
    } catch { setAiError('Summarize failed'); setAiPhase('idle'); }
  }

  async function handleExpand() {
    setAiPhase('expanding'); setAiError('');
    try {
      setExpanded(await aiExpand(contentForAI));
      setAiPhase('expanded');
    } catch { setAiError('Expand failed'); setAiPhase('idle'); }
  }

  async function handleOptimize() {
    setAiPhase('optimizing'); setAiError('');
    try {
      setOptimized(await aiOptimize(contentForAI, expanded));
      setAiPhase('optimized');
    } catch { setAiError('Optimize failed'); setAiPhase('expanded'); }
  }

  async function saveOptimized() {
    await ingestText(optimized, 'note', `optimized_${baseName(chunk.source_file)}`);
    setSavedOptimized(true);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3 shrink-0" style={{ borderBottom: '1px solid #1f1f1f' }}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{baseName(chunk.source_file)}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {chunk.category && (
              <span className="text-[10px] capitalize px-1.5 py-0.5 rounded font-medium"
                style={{ color: catColor, background: `${catColor}15` }}>
                {chunk.category}
              </span>
            )}
            {chunk.folder && (
              <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                <FolderOpen size={9} />{chunk.folder}
              </span>
            )}
            <span className="text-[10px] font-mono" style={{ color }}>
              {formatRetentionPct(retention)} · {retentionToLabel(retention)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Folder */}
          <div className="relative">
            <button onClick={() => setShowFolderMenu(v => !v)} title="Move to folder"
              className="p-1.5 rounded text-slate-600 hover:text-white hover:bg-[#1c1c1c] transition-all">
              <FolderOpen size={13} />
            </button>
            {showFolderMenu && (
              <div className="absolute right-0 top-8 z-30 rounded-lg border border-[#252525] shadow-xl py-1 min-w-[150px]" style={{ background: '#161616' }}>
                <button onClick={() => moveTo(null)} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-500 hover:text-white hover:bg-[#1c1c1c] transition-colors">
                  Remove from folder
                </button>
                {folders.map(f => (
                  <button key={f} onClick={() => moveTo(f)} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-400 hover:text-white hover:bg-[#1c1c1c] transition-colors flex items-center gap-1.5">
                    <FolderOpen size={9} /> {f}
                    {chunk.folder === f && <Check size={9} className="text-nebula-400 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Encrypt */}
          {isEncrypted ? (
            <button onClick={() => decryptedView ? setDecryptedView(null) : setEncryptModal('unlock')}
              title={decryptedView ? 'Lock' : 'Unlock'}
              className="p-1.5 rounded text-amber-500 hover:text-amber-300 hover:bg-amber-500/10 transition-all">
              {decryptedView ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          ) : (
            <button onClick={() => setEncryptModal('lock')} title="Encrypt"
              className="p-1.5 rounded text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
              <Lock size={13} />
            </button>
          )}

          {/* Edit / Save */}
          {(!isEncrypted || decryptedView) && (
            editMode ? (
              <>
                <button onClick={saveEdit} disabled={saving}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all"
                  style={{ background: '#7c3aed', color: 'white', opacity: saving ? 0.6 : 1 }}>
                  {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditMode(false)} className="p-1.5 rounded text-slate-600 hover:text-slate-300 transition-all">
                  <X size={13} />
                </button>
              </>
            ) : (
              <button onClick={startEdit} title="Edit" className="p-1.5 rounded text-slate-600 hover:text-white hover:bg-[#1c1c1c] transition-all">
                <Pencil size={13} />
              </button>
            )
          )}

          {/* Delete */}
          <button onClick={() => setConfirmDelete(true)} title="Delete"
            className="p-1.5 rounded text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* AI toolbar */}
      {!editMode && displayContent && !isEncrypted && (
        <div className="px-5 py-2 flex items-center gap-2 flex-wrap shrink-0" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <button
            onClick={handleSummarize}
            disabled={aiPhase === 'summarizing' || aiPhase === 'expanding' || aiPhase === 'optimizing'}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
              aiPhase === 'summarized' ? 'border-nebula-500/40 text-nebula-300 bg-nebula-500/10' : 'border-[#252525] text-slate-500 hover:text-slate-200 hover:bg-[#1c1c1c]'
            )}
          >
            {aiPhase === 'summarizing' ? <Loader2 size={10} className="animate-spin" /> : <BookOpen size={10} />}
            Summarize
          </button>
          <button
            onClick={handleExpand}
            disabled={aiPhase === 'summarizing' || aiPhase === 'expanding' || aiPhase === 'optimizing'}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
              (aiPhase === 'expanded' || aiPhase === 'optimized' || aiPhase === 'optimizing') ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' : 'border-[#252525] text-slate-500 hover:text-slate-200 hover:bg-[#1c1c1c]'
            )}
          >
            {aiPhase === 'expanding' ? <Loader2 size={10} className="animate-spin" /> : <Layers size={10} />}
            Go deeper
          </button>
          {(aiPhase === 'expanded' || aiPhase === 'optimizing' || aiPhase === 'optimized') && (
            <button
              onClick={handleOptimize}
              disabled={aiPhase === 'optimizing'}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
                aiPhase === 'optimized' ? 'border-green-500/40 text-green-300 bg-green-500/10' : 'border-[#252525] text-slate-500 hover:text-slate-200 hover:bg-[#1c1c1c]'
              )}
            >
              {aiPhase === 'optimizing' ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              Optimize note
            </button>
          )}
          {aiPhase !== 'idle' && (
            <button onClick={() => { setAiPhase('idle'); setAiError(''); }}
              className="ml-auto p-1 rounded text-slate-700 hover:text-slate-400 transition-colors">
              <ChevronDown size={11} />
            </button>
          )}
          {aiError && <span className="text-[10px] text-red-400">{aiError}</span>}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loadingDetail ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={18} className="animate-spin text-slate-700" />
          </div>
        ) : isEncrypted && !decryptedView ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Lock size={20} className="text-amber-500" />
            </div>
            <p className="text-sm text-slate-400">This note is encrypted</p>
            <button onClick={() => setEncryptModal('unlock')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Unlock size={13} /> Unlock with password
            </button>
          </div>
        ) : editMode ? (
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full min-h-[300px] text-sm text-slate-200 leading-relaxed resize-none outline-none rounded-lg p-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #252525', fontFamily: 'inherit', height: 'calc(100% - 8px)' }}
            autoFocus
          />
        ) : (
          <div className="space-y-5">
            {/* Main content */}
            <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {displayContent}
            </pre>

            {/* AI: Summary */}
            {(aiPhase === 'summarized' || aiPhase === 'expanded' || aiPhase === 'optimized' || aiPhase === 'optimizing') && summary && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <div className="flex items-center gap-1.5">
                  <BookOpen size={11} className="text-nebula-400" />
                  <span className="text-[10px] font-semibold text-nebula-400 uppercase tracking-wider">AI Summary</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
              </div>
            )}

            {/* AI: Expanded */}
            {(aiPhase === 'expanded' || aiPhase === 'optimizing' || aiPhase === 'optimized') && expanded && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(8,145,178,0.05)', border: '1px solid rgba(8,145,178,0.2)' }}>
                <div className="flex items-center gap-1.5">
                  <Layers size={11} className="text-cyan-400" />
                  <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">AI Deep Dive</span>
                </div>
                <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{expanded}</pre>
              </div>
            )}

            {/* AI: Optimized */}
            {aiPhase === 'optimized' && optimized && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={11} className="text-green-400" />
                    <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">Optimized Note</span>
                  </div>
                  <button
                    onClick={saveOptimized}
                    disabled={savedOptimized}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all"
                    style={savedOptimized
                      ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }
                      : { background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
                  >
                    {savedOptimized ? <><Check size={10} /> Saved to library</> : <><Download size={10} /> Save as new note</>}
                  </button>
                </div>
                <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{optimized}</pre>
              </div>
            )}

            {/* Footer meta */}
            <div className="flex items-center gap-5 text-[11px] font-mono text-slate-700 pt-3 flex-wrap"
              style={{ borderTop: '1px solid #1a1a1a' }}>
              <span className="flex items-center gap-1"><Clock size={10} /> {chunk.last_accessed}</span>
              <span className="flex items-center gap-1"><TrendingDown size={10} /> {chunk.access_count}× reviewed</span>
              <span className="flex items-center gap-1"><Brain size={10} /> {baseName(chunk.source_file)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="gcard w-full max-w-xs p-5 space-y-4">
            <p className="text-sm font-semibold text-white">Delete this note?</p>
            <p className="text-xs text-slate-500">This permanently removes the chunk from your knowledge base.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={doDelete}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {encryptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="gcard w-full max-w-xs p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Lock size={13} className="text-amber-500" />
              <p className="text-sm font-semibold text-white">{encryptModal === 'lock' ? 'Encrypt note' : 'Unlock note'}</p>
            </div>
            <p className="text-xs text-slate-500">
              {encryptModal === 'lock' ? 'AES-256 encryption. You need this password to read it again.' : 'Enter the password to decrypt.'}
            </p>
            <div className="space-y-2">
              <div className="relative">
                <input autoFocus type={showPw ? 'text' : 'password'} value={encryptPw}
                  onChange={e => { setEncryptPw(e.target.value); setEncryptError(''); }}
                  placeholder="Password…"
                  className="w-full text-sm text-white rounded-lg px-3 py-2 pr-8 outline-none"
                  style={{ background: '#161616', border: '1px solid #252525' }} />
                <button onClick={() => setShowPw(v => !v)} className="absolute right-2 top-2 text-slate-600 hover:text-slate-400">
                  {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
              {encryptModal === 'lock' && (
                <input type={showPw ? 'text' : 'password'} value={encryptConfirm}
                  onChange={e => { setEncryptConfirm(e.target.value); setEncryptError(''); }}
                  placeholder="Confirm password…"
                  className="w-full text-sm text-white rounded-lg px-3 py-2 outline-none"
                  style={{ background: '#161616', border: '1px solid #252525' }} />
              )}
              {encryptError && <p className="text-[11px] text-red-400">{encryptError}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setEncryptModal(null); setEncryptPw(''); setEncryptConfirm(''); setEncryptError(''); }}
                className="btn-secondary text-xs">Cancel</button>
              <button onClick={encryptModal === 'lock' ? doEncrypt : doDecrypt}
                disabled={encryptBusy || !encryptPw}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', opacity: encryptBusy || !encryptPw ? 0.5 : 1 }}>
                {encryptBusy ? <Loader2 size={10} className="animate-spin" /> : encryptModal === 'lock' ? <Lock size={10} /> : <Unlock size={10} />}
                {encryptModal === 'lock' ? 'Encrypt' : 'Decrypt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
