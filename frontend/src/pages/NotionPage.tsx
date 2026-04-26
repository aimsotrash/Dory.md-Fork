import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { notionStatus, notionConnect, listNotionPages, importNotionPages, ingestFile } from '@/lib/api'
import type { NotionStatus, NotionPage } from '@/lib/types'
import { config } from '@/lib/config'

export function NotionPage() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState<NotionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState<NotionPage[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ pages: number; chunks: number } | null>(null)
  const [manualToken, setManualToken] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [mdFiles, setMdFiles] = useState<File[]>([])
  const [mdUploading, setMdUploading] = useState(false)
  const [mdResult, setMdResult] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const connected = params.get('connected')
    const error = params.get('error')
    if (connected === 'true') setBanner({ type: 'ok', msg: 'Connected to Notion!' })
    if (error) setBanner({ type: 'err', msg: `OAuth error: ${error}` })
  }, [params])

  useEffect(() => {
    notionStatus()
      .then(s => { setStatus(s); if (s.connected) loadPages() })
      .catch(() => setStatus({ connected: false, oauth_available: false }))
      .finally(() => setLoading(false))
  }, [])

  function loadPages() {
    setPagesLoading(true)
    listNotionPages()
      .then(setPages)
      .catch(() => setBanner({ type: 'err', msg: 'Failed to load pages.' }))
      .finally(() => setPagesLoading(false))
  }

  async function handleOAuthConnect() {
    window.location.href = `${config.apiBaseUrl}/auth/notion`
  }

  async function handleTokenConnect() {
    if (!manualToken.trim()) return
    setConnecting(true)
    try {
      const res = await notionConnect(manualToken.trim())
      setStatus({ connected: true, oauth_available: status?.oauth_available ?? false, workspace: res.workspace })
      setBanner({ type: 'ok', msg: `Connected to ${res.workspace}` })
      loadPages()
    } catch (e: any) {
      setBanner({ type: 'err', msg: e.message })
    } finally {
      setConnecting(false)
      setManualToken('')
    }
  }

  async function handleDisconnect() {
    await fetch(`${config.apiBaseUrl}/auth/notion`, { method: 'DELETE' })
    setStatus(s => s ? { ...s, connected: false, workspace: undefined } : s)
    setPages([])
    setSelected(new Set())
  }

  function togglePage(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === pages.length) setSelected(new Set())
    else setSelected(new Set(pages.map(p => p.id)))
  }

  async function handleImport() {
    if (!selected.size) return
    setImporting(true)
    setImportResult(null)
    try {
      const res = await importNotionPages([...selected])
      setImportResult({ pages: res.pages_imported, chunks: res.chunks_created })
      setBanner({ type: 'ok', msg: `Imported ${res.pages_imported} page(s), ${res.chunks_created} chunks indexed.` })
      setSelected(new Set())
    } catch (e: any) {
      setBanner({ type: 'err', msg: e.message })
    } finally {
      setImporting(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f => f.name.endsWith('.md') || f.name.endsWith('.txt'))
    setMdFiles(prev => [...prev, ...files])
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.md') || f.name.endsWith('.txt'))
    setMdFiles(prev => [...prev, ...files])
  }

  async function handleMdUpload() {
    if (!mdFiles.length) return
    setMdUploading(true)
    setMdResult(null)
    let totalChunks = 0
    const errors: string[] = []
    for (const file of mdFiles) {
      try {
        const res = await ingestFile(file)
        totalChunks += res.chunks_created ?? 1
      } catch (e: any) {
        errors.push(`${file.name}: ${e.message}`)
      }
    }
    if (errors.length) setMdResult(`Errors: ${errors.join('; ')}`)
    else setMdResult(`Done! ${totalChunks} chunks indexed from ${mdFiles.length} file(s).`)
    setMdFiles([])
    setMdUploading(false)
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-up space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-50 tracking-tight">Notion Integration</h1>
        <p className="label mt-1">Pull pages from Notion or import local .md files into Dory</p>
      </div>

      {/* Banner */}
      {banner && (
        <div className={`flex items-center justify-between px-4 py-3 border font-mono text-sm ${
          banner.type === 'ok'
            ? 'border-metro-teal/40 bg-metro-teal/10 text-metro-teal'
            : 'border-metro-red/40 bg-metro-red/10 text-metro-red'
        }`}>
          <span>{banner.msg}</span>
          <button onClick={() => setBanner(null)} className="ml-4 text-ink-400 hover:text-ink-100">✕</button>
        </div>
      )}

      {/* Notion connection card */}
      <div className="tile tile-amber p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono font-bold text-xl text-metro-amber">N</span>
          <h2 className="font-display font-semibold text-ink-50">Notion</h2>
          {status?.connected && (
            <span className="ml-auto badge-fading text-[10px]">CONNECTED</span>
          )}
        </div>

        {loading ? (
          <p className="font-mono text-sm text-ink-400">Checking status...</p>
        ) : status?.connected ? (
          <div className="space-y-3">
            {status.workspace && (
              <div className="flex items-center gap-3">
                {status.avatar && <img src={status.avatar} alt="" className="w-8 h-8 rounded-full" />}
                <div>
                  <p className="font-mono text-sm text-ink-100">{status.workspace}</p>
                  <p className="text-[10px] font-mono text-ink-400">OAuth token stored</p>
                </div>
              </div>
            )}
            <button onClick={handleDisconnect} className="btn text-metro-red border-metro-red/40 hover:bg-metro-red/10">
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {status?.oauth_available ? (
              <div>
                <p className="text-sm font-mono text-ink-300 mb-3">
                  OAuth is configured. Click below to authorize Dory to access your Notion workspace.
                </p>
                <button onClick={handleOAuthConnect} className="btn-primary">
                  Connect with Notion
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-mono text-ink-300 mb-1">
                  OAuth not configured. Paste an internal integration token:
                </p>
                <p className="text-[10px] font-mono text-ink-500 mb-3">
                  Notion → Settings → Connections → Develop/manage integrations → copy Secret
                </p>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    type="password"
                    placeholder="secret_..."
                    value={manualToken}
                    onChange={e => setManualToken(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTokenConnect()}
                  />
                  <button onClick={handleTokenConnect} disabled={connecting || !manualToken.trim()} className="btn-primary">
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
                <p className="text-[10px] font-mono text-ink-500 mt-2">
                  To enable OAuth: set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET in backend/.env
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Page browser */}
      {status?.connected && (
        <div className="tile tile-teal p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink-50">Your Pages</h2>
            <div className="flex items-center gap-2">
              {pages.length > 0 && (
                <button onClick={toggleAll} className="btn text-xs">
                  {selected.size === pages.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
              <button onClick={loadPages} disabled={pagesLoading} className="btn text-xs">
                {pagesLoading ? '...' : '↺ Refresh'}
              </button>
            </div>
          </div>

          {pagesLoading ? (
            <p className="font-mono text-sm text-ink-400">Loading pages...</p>
          ) : pages.length === 0 ? (
            <p className="font-mono text-sm text-ink-400">No pages found. Make sure you've shared pages with the integration.</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {pages.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-ink-700 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => togglePage(p.id)}
                    className="accent-metro-teal"
                  />
                  <span className="font-mono text-sm text-ink-200 group-hover:text-ink-50 flex-1 truncate">{p.title}</span>
                  <span className="text-[10px] font-mono text-ink-500 shrink-0">{p.id.slice(0, 8)}</span>
                </label>
              ))}
            </div>
          )}

          {pages.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-600">
              <span className="text-[10px] font-mono text-ink-400">
                {selected.size} page{selected.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handleImport}
                disabled={!selected.size || importing}
                className="btn-primary"
              >
                {importing ? 'Importing...' : `Import ${selected.size || ''} page${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {importResult && (
            <div className="mt-3 p-3 bg-metro-teal/10 border border-metro-teal/30 font-mono text-sm text-metro-teal">
              Imported {importResult.pages} page(s) · {importResult.chunks} chunks indexed into Dory
            </div>
          )}
        </div>
      )}

      {/* Local .md file importer */}
      <div className="tile tile-purple p-5">
        <h2 className="font-display font-semibold text-ink-50 mb-1">Import Local Files</h2>
        <p className="label mb-4">Drag and drop .md or .txt files to index them in Dory</p>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-none p-8 text-center cursor-pointer transition-colors ${
            dragging ? 'border-metro-purple bg-metro-purple/10' : 'border-ink-600 hover:border-ink-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
          <p className="font-mono text-sm text-ink-400">
            {dragging ? 'Drop files here' : 'Click or drag .md / .txt files here'}
          </p>
        </div>

        {mdFiles.length > 0 && (
          <div className="mt-3 space-y-1">
            {mdFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-ink-750 border border-ink-600">
                <span className="font-mono text-sm text-ink-200 truncate">{f.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-ink-500">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setMdFiles(prev => prev.filter((_, j) => j !== i)) }}
                    className="text-ink-500 hover:text-metro-red text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          {mdResult && (
            <span className="font-mono text-sm text-metro-teal">{mdResult}</span>
          )}
          <button
            onClick={handleMdUpload}
            disabled={!mdFiles.length || mdUploading}
            className="btn-primary ml-auto"
          >
            {mdUploading ? 'Indexing...' : `Index ${mdFiles.length || ''} file${mdFiles.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Back link */}
      <div className="text-center">
        <Link to="/notes" className="text-[10px] font-mono text-ink-500 hover:text-ink-300 underline">
          ← Back to Note Editor
        </Link>
      </div>
    </div>
  )
}
