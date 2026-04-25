import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { marked } from 'marked'
import { ingestText, notionStatus, listNotionPages, createNotionPage } from '@/lib/api'
import type { NotionPage } from '@/lib/types'

const TOOLBAR = [
  { label: 'H1', action: (t: string) => `# ${t}` },
  { label: 'H2', action: (t: string) => `## ${t}` },
  { label: 'B',  action: (t: string) => `**${t}**` },
  { label: 'I',  action: (t: string) => `*${t}*` },
  { label: '`',  action: (t: string) => `\`${t}\`` },
  { label: '```',action: (t: string) => `\`\`\`\n${t}\n\`\`\`` },
  { label: '>',  action: (t: string) => `> ${t}` },
  { label: '-',  action: (t: string) => `- ${t}` },
]

type SaveMode = 'local' | 'notion' | 'dory'

export function NoteEditorPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState(false)
  const [saveMode, setSaveMode] = useState<SaveMode>('dory')
  const [notionConnected, setNotionConnected] = useState(false)
  const [notionPages, setNotionPages] = useState<NotionPage[]>([])
  const [selectedParentId, setSelectedParentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (saveMode === 'notion' && !notionConnected) {
      notionStatus()
        .then(s => {
          setNotionConnected(s.connected)
          if (s.connected) {
            listNotionPages().then(pages => {
              setNotionPages(pages)
              if (pages.length) setSelectedParentId(pages[0].id)
            }).catch(() => {})
          }
        })
        .catch(() => {})
    }
  }, [saveMode])

  const renderedHtml = marked.parse(content || '*Start writing...*') as string

  function applyFormat(action: (t: string) => string) {
    const ta = document.getElementById('editor') as HTMLTextAreaElement
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = content.slice(start, end) || 'text'
    const formatted = action(selected)
    const next = content.slice(0, start) + formatted + content.slice(end)
    setContent(next)
  }

  function downloadMd() {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title.replace(/\s+/g, '-').toLowerCase() || 'note'}.md`
    a.click()
    setStatus('Downloaded as .md')
    setTimeout(() => setStatus(null), 2000)
  }

  async function saveToNotion() {
    if (!selectedParentId) { setStatus('Select a parent page first'); return }
    setSaving(true)
    try {
      await createNotionPage({ title: title || 'Untitled', content, parent_id: selectedParentId })
      setStatus('Saved to Notion ✓')
      setTimeout(() => setStatus(null), 2500)
    } catch (e: any) {
      setStatus(`Error: ${e.message}`)
    } finally { setSaving(false) }
  }

  async function saveToDory() {
    if (!content.trim()) return
    setSaving(true)
    try {
      await ingestText(`# ${title}\n\n${content}`, 'note', title || 'note')
      setStatus('Indexed in Dory ✓')
      setTimeout(() => setStatus(null), 2500)
    } catch (e: any) {
      setStatus(`Error: ${e.message}`)
    } finally { setSaving(false) }
  }

  async function handleSave() {
    if (saveMode === 'local') downloadMd()
    else if (saveMode === 'notion') await saveToNotion()
    else await saveToDory()
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-up">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-50 tracking-tight">Note Editor</h1>
          <p className="label mt-1">Markdown editor — write, preview, save</p>
        </div>

        <div className="flex items-center gap-3">
          {status && (
            <span className="text-xs font-mono text-metro-teal border border-metro-teal/30 px-2 py-1">
              {status}
            </span>
          )}

          {/* Save mode selector */}
          <div className="flex border border-ink-600">
            {(['dory', 'local', 'notion'] as SaveMode[]).map(m => (
              <button
                key={m}
                onClick={() => setSaveMode(m)}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all ${
                  saveMode === m
                    ? 'bg-metro-amber text-ink-900 font-bold'
                    : 'text-ink-300 hover:text-ink-100 hover:bg-ink-700'
                }`}
              >
                {m === 'dory' ? '◈ Dory' : m === 'local' ? '⬇ Local' : 'N Notion'}
              </button>
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || (!content.trim() && saveMode !== 'local')}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Notion config panel */}
      {saveMode === 'notion' && (
        <div className="tile tile-teal p-4 mb-4">
          {notionConnected ? (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="label mb-1 block">Save under page</label>
                {notionPages.length > 0 ? (
                  <select
                    className="input w-full"
                    value={selectedParentId}
                    onChange={e => setSelectedParentId(e.target.value)}
                  >
                    {notionPages.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs font-mono text-ink-400">No pages found — share pages with your integration first.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-sm font-mono text-ink-300 flex-1">
                Not connected to Notion.
              </p>
              <Link to="/notion" className="btn-primary text-xs">
                Connect Notion →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <input
        className="w-full bg-transparent border-b border-ink-600 focus:border-metro-amber outline-none text-2xl font-display font-bold text-ink-50 pb-3 mb-4 placeholder-ink-500 transition-colors"
        placeholder="Note title..."
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-0 bg-ink-800 border border-ink-600 border-b-0 px-3 py-2">
        {TOOLBAR.map(({ label, action }) => (
          <button
            key={label}
            onClick={() => applyFormat(action)}
            className="px-2.5 py-1 text-xs font-mono text-ink-300 hover:text-metro-amber hover:bg-ink-700 transition-colors"
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setPreview(false)}
            className={`px-3 py-1 text-xs font-mono transition-colors ${!preview ? 'bg-metro-amber text-ink-900' : 'text-ink-400 hover:text-ink-200'}`}
          >
            WRITE
          </button>
          <button
            onClick={() => setPreview(true)}
            className={`px-3 py-1 text-xs font-mono transition-colors ${preview ? 'bg-metro-amber text-ink-900' : 'text-ink-400 hover:text-ink-200'}`}
          >
            PREVIEW
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="border border-ink-600 bg-ink-800" style={{ minHeight: '520px' }}>
        {!preview ? (
          <textarea
            id="editor"
            className="w-full h-full bg-transparent text-ink-100 font-mono text-sm p-5 outline-none resize-none leading-relaxed placeholder-ink-500"
            style={{ minHeight: '520px' }}
            placeholder="Start writing in Markdown...&#10;&#10;# Heading&#10;**bold**, *italic*, `code`&#10;&#10;- bullet point&#10;> blockquote"
            value={content}
            onChange={e => setContent(e.target.value)}
            spellCheck
          />
        ) : (
          <div
            className="p-5 md-preview"
            style={{ minHeight: '520px' }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>

      {/* Word count */}
      <div className="flex gap-4 mt-2">
        <span className="text-[10px] font-mono text-ink-500">
          {content.split(/\s+/).filter(Boolean).length} words
        </span>
        <span className="text-[10px] font-mono text-ink-500">
          {content.length} chars
        </span>
        <span className="text-[10px] font-mono text-ink-500">
          ~{Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)} min read
        </span>
      </div>
    </div>
  )
}
