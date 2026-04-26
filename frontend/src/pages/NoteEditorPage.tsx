import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { marked } from 'marked'
import { ingestText, notionStatus, listNotionPages, createNotionPage, getAllChunks } from '@/lib/api'
import { useNotes } from '@/hooks/useNotes'
import type { NotionPage, BackendChunk } from '@/lib/types'
import { retentionToColor } from '@/styles/theme'
import {
  Plus, Trash2, Search, FileText, Eye, Edit3,
  Download, Upload, ChevronRight, Clock, Library, X,
} from 'lucide-react'

const SLASH_COMMANDS = [
  { cmd: '/h1',      label: 'Heading 1',    icon: 'H1', insert: () => '# '           },
  { cmd: '/h2',      label: 'Heading 2',    icon: 'H2', insert: () => '## '          },
  { cmd: '/h3',      label: 'Heading 3',    icon: 'H3', insert: () => '### '         },
  { cmd: '/bullet',  label: 'Bullet list',  icon: '•',  insert: () => '- '           },
  { cmd: '/num',     label: 'Numbered',     icon: '1.', insert: () => '1. '          },
  { cmd: '/code',    label: 'Code block',   icon: '<>', insert: () => '```\n\n```\n' },
  { cmd: '/quote',   label: 'Blockquote',   icon: '"',  insert: () => '> '           },
  { cmd: '/divider', label: 'Divider',      icon: '—',  insert: () => '\n---\n'      },
  { cmd: '/bold',    label: 'Bold',         icon: 'B',  insert: () => '**text**'     },
  { cmd: '/italic',  label: 'Italic',       icon: 'I',  insert: () => '*text*'       },
]

type SaveMode = 'dory' | 'local' | 'notion'

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NoteEditorPage() {
  const { notes, createNote, updateNote, deleteNote } = useNotes()
  const [activeId, setActiveId] = useState<string | null>(() => notes[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState(false)
  const [saveMode, setSaveMode] = useState<SaveMode>('dory')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [slashVisible, setSlashVisible] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [notionConnected, setNotionConnected] = useState(false)
  const [notionPages, setNotionPages] = useState<NotionPage[]>([])
  const [selectedParentId, setSelectedParentId] = useState('')

  const [sidebarTab, setSidebarTab] = useState<'notes' | 'library'>('notes')
  const [importedChunks, setImportedChunks] = useState<BackendChunk[]>([])
  const [viewChunk, setViewChunk] = useState<BackendChunk | null>(null)

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const active = notes.find(n => n.id === activeId) ?? null

  useEffect(() => {
    if (!activeId && notes.length > 0) setActiveId(notes[0].id)
  }, [notes.length])

  useEffect(() => {
    if (sidebarTab === 'library' && importedChunks.length === 0) {
      getAllChunks().then(r => setImportedChunks(r.chunks)).catch(() => {})
    }
  }, [sidebarTab])

  useEffect(() => {
    if (saveMode === 'notion' && !notionConnected) {
      notionStatus().then(s => {
        setNotionConnected(s.connected)
        if (s.connected) {
          listNotionPages().then(pages => {
            setNotionPages(pages)
            if (pages.length) setSelectedParentId(pages[0].id)
          }).catch(() => {})
        }
      }).catch(() => {})
    }
  }, [saveMode])

  const handleNewNote = useCallback(() => {
    const n = createNote()
    setActiveId(n.id)
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [createNote])

  const handleContentChange = useCallback((val: string, ta: HTMLTextAreaElement) => {
    if (!activeId) return
    updateNote(activeId, { content: val })

    const cursor = ta.selectionStart
    const lineStart = val.lastIndexOf('\n', cursor - 1) + 1
    const line = val.slice(lineStart, cursor)

    if (line.startsWith('/')) {
      setSlashFilter(line.slice(1).toLowerCase())
      setSlashVisible(true)
    } else {
      setSlashVisible(false)
    }
  }, [activeId, updateNote])

  const applySlash = useCallback((insert: () => string) => {
    if (!editorRef.current || !active) return
    const ta = editorRef.current
    const val = active.content
    const cursor = ta.selectionStart
    const lineStart = val.lastIndexOf('\n', cursor - 1) + 1
    const replacement = insert()
    const newVal = val.slice(0, lineStart) + replacement + val.slice(cursor)
    updateNote(active.id, { content: newVal })
    setSlashVisible(false)
    setTimeout(() => {
      ta.focus()
      const pos = lineStart + replacement.length
      ta.setSelectionRange(pos, pos)
    }, 10)
  }, [active, updateNote])

  const handleFileImport = useCallback((files: FileList | null) => {
    if (!files?.length) return
    Array.from(files).forEach(async (file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'md' || ext === 'txt') {
        const text = await file.text()
        const n = createNote()
        updateNote(n.id, {
          title: file.name.replace(/\.(md|txt)$/, ''),
          content: text,
        })
        setActiveId(n.id)
      } else if (ext === 'doc' || ext === 'docx') {
        try {
          // @ts-ignore — mammoth is optional; prompt user to install if missing
          const mammoth = await import('mammoth/mammoth.browser')
          const buf = await file.arrayBuffer()
          const result = await mammoth.extractRawText({ arrayBuffer: buf })
          const n = createNote()
          updateNote(n.id, {
            title: file.name.replace(/\.(docx?)$/, ''),
            content: result.value,
          })
          setActiveId(n.id)
        } catch {
          alert(`Could not parse ${file.name}. Run: npm i mammoth`)
        }
      }
    })
  }, [createNote, updateNote])

  function flash(type: 'ok' | 'err', msg: string) {
    setSaveStatus({ type, msg })
    setTimeout(() => setSaveStatus(null), 2500)
  }

  async function handleSave() {
    if (!active) return
    if (saveMode === 'local') {
      const blob = new Blob([`# ${active.title}\n\n${active.content}`], { type: 'text/markdown' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${(active.title || 'note').replace(/\s+/g, '-').toLowerCase()}.md`
      a.click()
      flash('ok', 'Downloaded .md')
      return
    }
    setSaving(true)
    try {
      if (saveMode === 'notion') {
        if (!selectedParentId) { flash('err', 'Select a parent page'); return }
        await createNotionPage({ title: active.title || 'Untitled', content: active.content, parent_id: selectedParentId })
        flash('ok', 'Saved to Notion')
      } else {
        await ingestText(`# ${active.title}\n\n${active.content}`, 'note', active.title || 'note')
        flash('ok', 'Indexed in Dory')
      }
    } catch (e: any) {
      flash('err', e.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = notes.filter(n =>
    !search || n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search)
  )

  const filteredSlash = SLASH_COMMANDS.filter(c =>
    c.cmd.slice(1).startsWith(slashFilter) || c.label.toLowerCase().startsWith(slashFilter)
  )

  const wordCount = (active?.content ?? '').split(/\s+/).filter(Boolean).length
  const renderedHtml = marked.parse(active?.content ?? '') as string

  return (
    <div className="flex h-[calc(100vh-49px)] overflow-hidden animate-fade-in">

      {/* ── Notes sidebar ─────────────────────────────────────────────── */}
      <aside
        className="w-60 shrink-0 flex flex-col"
        style={{ background: 'rgba(5,8,16,0.7)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="p-3 space-y-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <div className="flex rounded-md overflow-hidden text-[10px] font-mono font-semibold" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setSidebarTab('notes')}
                className={`flex items-center gap-1 px-2.5 py-1 transition-all ${sidebarTab === 'notes' ? 'bg-nebula-500/20 text-nebula-300' : 'text-slate-600 hover:text-slate-300'}`}
              >
                <FileText size={10} /> Notes
              </button>
              <button
                onClick={() => setSidebarTab('library')}
                className={`flex items-center gap-1 px-2.5 py-1 transition-all ${sidebarTab === 'library' ? 'bg-nebula-500/20 text-nebula-300' : 'text-slate-600 hover:text-slate-300'}`}
              >
                <Library size={10} /> Library
              </button>
            </div>
            {sidebarTab === 'notes' && (
              <button
                onClick={handleNewNote}
                title="New note"
                className="w-5 h-5 rounded-md flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <Plus size={12} />
              </button>
            )}
          </div>
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700" />
            <input
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg outline-none text-slate-300 placeholder-slate-700"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value.toLowerCase())}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sidebarTab === 'notes' ? (
            filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <FileText size={18} className="text-slate-700" />
                <p className="text-xs text-slate-700">No notes yet</p>
                <button onClick={handleNewNote} className="text-[11px] text-nebula-400 hover:text-nebula-300">
                  New note →
                </button>
              </div>
            ) : (
              filtered.map(note => (
                <button
                  key={note.id}
                  onClick={() => { setActiveId(note.id); setViewChunk(null) }}
                  className="w-full text-left px-3 py-2.5 group relative"
                  style={note.id === activeId && !viewChunk
                    ? { background: 'rgba(124,58,237,0.12)', borderLeft: '2px solid rgba(124,58,237,0.5)' }
                    : { borderLeft: '2px solid transparent' }
                  }
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-medium truncate flex-1 ${note.id === activeId && !viewChunk ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {note.title || 'Untitled'}
                    </p>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        const next = notes.find(n => n.id !== note.id)?.id ?? null
                        if (activeId === note.id) setActiveId(next)
                        deleteNote(note.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all ml-1"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-700 mt-0.5 truncate">
                    {note.content.slice(0, 55) || 'Empty'}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={8} className="text-slate-800" />
                    <span className="text-[9px] text-slate-800">{formatRelative(note.updated_at)}</span>
                  </div>
                </button>
              ))
            )
          ) : (
            importedChunks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Library size={18} className="text-slate-700" />
                <p className="text-xs text-slate-700">No imported chunks</p>
              </div>
            ) : (
              importedChunks
                .filter(c => !search || c.content.toLowerCase().includes(search) || (c.source_file ?? '').toLowerCase().includes(search))
                .map(chunk => {
                  const color = retentionToColor(chunk.retention ?? 0.5)
                  const baseName = (chunk.source_file ?? '').split(/[\\/]/).pop() ?? chunk.chunk_id
                  const isActive = viewChunk?.chunk_id === chunk.chunk_id
                  return (
                    <button
                      key={chunk.chunk_id}
                      onClick={() => setViewChunk(chunk)}
                      className="w-full text-left px-3 py-2.5 group relative"
                      style={isActive
                        ? { background: 'rgba(124,58,237,0.12)', borderLeft: `2px solid ${color}` }
                        : { borderLeft: '2px solid transparent' }
                      }
                    >
                      <p className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        {baseName}
                      </p>
                      <p className="text-[10px] text-slate-700 mt-0.5 truncate">
                        {chunk.content.slice(0, 55)}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-[9px] font-mono" style={{ color }}>{Math.round((chunk.retention ?? 0.5) * 100)}%</span>
                      </div>
                    </button>
                  )
                })
            )
          )}
        </div>

        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 hover:text-slate-300 transition-colors">
            <Upload size={11} />
            <span>Import .md / .txt / .docx</span>
            <input type="file" accept=".md,.txt,.doc,.docx" multiple className="hidden"
              onChange={e => handleFileImport(e.target.files)} />
          </label>
        </div>
      </aside>

      {/* ── Editor / Chunk viewer ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {viewChunk ? (
          <>
            <div
              className="flex items-center justify-between px-5 py-2 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,8,16,0.5)' }}
            >
              <div className="flex items-center gap-2">
                <Library size={13} className="text-nebula-400" />
                <span className="text-xs text-slate-300 font-medium">
                  {(viewChunk.source_file ?? '').split(/[\\/]/).pop()}
                </span>
                <span className="text-[10px] font-mono text-slate-600">
                  {Math.round((viewChunk.retention ?? 0.5) * 100)}% retention · {viewChunk.access_count}× reviewed
                </span>
              </div>
              <button onClick={() => setViewChunk(null)} className="text-slate-600 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-8 pt-10 pb-20">
                <h1 className="text-[2rem] font-bold text-white mb-6 leading-tight">
                  {(viewChunk.source_file ?? '').split(/[\\/]/).pop()}
                </h1>
                <p className="text-slate-300 leading-8 whitespace-pre-wrap text-base">{viewChunk.content}</p>
              </div>
            </div>
          </>
        ) : active ? (
          <>
            {/* Top bar */}
            <div
              className="flex items-center justify-between px-5 py-2 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,8,16,0.5)' }}
            >
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden text-xs" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <button
                    onClick={() => setPreview(false)}
                    className={`flex items-center gap-1 px-3 py-1.5 transition-all ${!preview ? 'bg-nebula-500/20 text-nebula-300' : 'text-slate-600 hover:text-slate-300'}`}
                  >
                    <Edit3 size={11} /> Write
                  </button>
                  <button
                    onClick={() => setPreview(true)}
                    className={`flex items-center gap-1 px-3 py-1.5 transition-all ${preview ? 'bg-nebula-500/20 text-nebula-300' : 'text-slate-600 hover:text-slate-300'}`}
                  >
                    <Eye size={11} /> Preview
                  </button>
                </div>
                {wordCount > 0 && <span className="text-[10px] font-mono text-slate-700">{wordCount}w</span>}
              </div>

              <div className="flex items-center gap-2">
                {saveStatus && (
                  <span className={`text-xs px-2 py-1 rounded-lg ${saveStatus.type === 'ok' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    {saveStatus.msg}
                  </span>
                )}

                <div className="flex rounded-lg overflow-hidden text-xs" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  {(['dory', 'local', 'notion'] as SaveMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setSaveMode(m)}
                      className={`px-2.5 py-1.5 transition-all ${saveMode === m ? 'bg-nebula-500/20 text-nebula-300' : 'text-slate-600 hover:text-slate-300'}`}
                    >
                      {m === 'dory' ? '◈' : m === 'local' ? '↓' : 'N'}
                    </button>
                  ))}
                </div>

                {saveMode === 'notion' && notionConnected && notionPages.length > 0 && (
                  <select
                    className="text-xs rounded-lg px-2 py-1.5 text-slate-300 outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    value={selectedParentId}
                    onChange={e => setSelectedParentId(e.target.value)}
                  >
                    {notionPages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                )}
                {saveMode === 'notion' && !notionConnected && (
                  <Link to="/notion" className="text-xs text-nebula-400 hover:text-nebula-300 flex items-center gap-0.5">
                    Connect <ChevronRight size={10} />
                  </Link>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving || (!active.content.trim() && saveMode !== 'local')}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                >
                  {saving ? 'Saving…' : saveMode === 'local' ? <><Download size={11} /> Export</> : 'Save'}
                </button>
              </div>
            </div>

            {/* Writing area */}
            <div className="flex-1 overflow-y-auto relative">
              {!preview ? (
                <div className="max-w-2xl mx-auto px-8 pt-10 pb-20">
                  {/* Notion-style big title */}
                  <input
                    ref={titleRef}
                    className="w-full bg-transparent outline-none text-[2rem] font-bold text-white placeholder-slate-800 mb-1 border-none leading-tight"
                    placeholder="Untitled"
                    value={active.title}
                    onChange={e => updateNote(active.id, { title: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); editorRef.current?.focus() } }}
                  />
                  <div className="h-px mb-6" style={{ background: 'rgba(255,255,255,0.04)' }} />

                  {/* Body */}
                  <div className="relative">
                    <textarea
                      ref={editorRef}
                      className="w-full bg-transparent outline-none resize-none leading-8 placeholder-slate-800 text-slate-200 text-base"
                      style={{ minHeight: 'calc(100vh - 320px)', caretColor: '#a78bfa', fontFamily: 'inherit' }}
                      placeholder={"Write something, or type / for blocks…"}
                      value={active.content}
                      onChange={e => handleContentChange(e.target.value, e.target)}
                      onKeyDown={e => {
                        if (e.key === 'Escape') setSlashVisible(false)
                      }}
                      spellCheck
                    />

                    {/* Slash command popup */}
                    {slashVisible && filteredSlash.length > 0 && (
                      <div
                        className="absolute z-50 rounded-xl overflow-hidden"
                        style={{
                          top: '2rem',
                          left: 0,
                          background: 'rgba(10,14,26,0.97)',
                          border: '1px solid rgba(124,58,237,0.3)',
                          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                          minWidth: '200px',
                        }}
                      >
                        <p className="px-3 py-1.5 text-[9px] font-mono text-slate-700 uppercase tracking-widest border-b"
                          style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                          Insert block
                        </p>
                        {filteredSlash.slice(0, 7).map(cmd => (
                          <button
                            key={cmd.cmd}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-nebula-500/10 hover:text-white transition-colors text-left"
                            onMouseDown={e => { e.preventDefault(); applySlash(cmd.insert) }}
                          >
                            <span className="w-5 h-5 rounded text-[10px] font-bold text-nebula-400 flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(124,58,237,0.15)' }}>
                              {cmd.icon}
                            </span>
                            <span className="flex-1">{cmd.label}</span>
                            <span className="text-[9px] text-slate-700 font-mono">{cmd.cmd}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto px-8 pt-10 pb-20">
                  <h1 className="text-[2rem] font-bold text-white mb-6 leading-tight">
                    {active.title || 'Untitled'}
                  </h1>
                  <div className="md-preview leading-8" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
              <FileText size={22} className="text-slate-700" />
            </div>
            <p className="text-sm text-slate-600">No note selected</p>
            <button onClick={handleNewNote} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
              <Plus size={14} /> New note
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
