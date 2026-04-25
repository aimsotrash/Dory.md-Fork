import { useState } from 'react'
import { marked } from 'marked'
import { ingestText } from '@/lib/api'

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
  const [notionToken, setNotionToken] = useState('')
  const [notionParentId, setNotionParentId] = useState('')
  const [_showNotionCfg, setShowNotionCfg] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

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
    if (!notionToken || !notionParentId) { setShowNotionCfg(true); return }
    setSaving(true)
    try {
      const res = await fetch('/api/notion/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: notionToken, parent_id: notionParentId, title: title || 'Untitled', content }),
      })
      if (!res.ok) throw new Error(await res.text())
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
        <div className="tile tile-teal p-4 mb-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="label mb-1 block">Notion Token</label>
            <input
              className="input"
              type="password"
              placeholder="secret_..."
              value={notionToken}
              onChange={e => setNotionToken(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="label mb-1 block">Parent Page ID</label>
            <input
              className="input"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={notionParentId}
              onChange={e => setNotionParentId(e.target.value)}
            />
          </div>
          <p className="text-[10px] font-mono text-ink-400 w-40">
            Get your token from Notion → Settings → Integrations
          </p>
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
