import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ingestText } from '@/lib/api'

interface HeaderProps {
  hasDiscovery?: boolean
  onDiscoveryClick?: () => void
}

export function Header({ hasDiscovery, onDiscoveryClick }: HeaderProps) {
  const [showQuick, setShowQuick] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const nav = useNavigate()

  async function handleQuickSave() {
    if (!content.trim()) return
    setSaving(true)
    try {
      await ingestText(content.trim(), 'note', 'quick-note')
      setSaved(true)
      setContent('')
      setTimeout(() => { setSaved(false); setShowQuick(false) }, 1200)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-ink-800 border-b border-ink-600 border-t-2 border-t-metro-amber">
        <div className="flex items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="font-mono font-bold text-metro-amber text-xl glow-text-amber">◈</span>
            <div>
              <span className="font-display font-bold text-ink-50 tracking-tight">Dory.md</span>
              <span className="ml-2 text-[9px] font-mono text-ink-400 uppercase tracking-widest">Memory OS</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => nav('/notes')}
              className="btn text-xs"
            >
              <span className="font-mono">✎</span> New Note
            </button>

            <button
              onClick={() => setShowQuick(true)}
              className="btn text-xs"
            >
              <span className="font-mono">+</span> Quick Add
            </button>

            {hasDiscovery && (
              <button
                onClick={onDiscoveryClick}
                className="btn text-xs border-metro-amber text-metro-amber animate-pulse"
              >
                <span className="font-mono">◆</span> Discovery
              </button>
            )}
          </div>
        </div>
      </header>

      {showQuick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 backdrop-blur-sm">
          <div className="bg-ink-800 border border-ink-600 border-t-2 border-t-metro-amber w-full max-w-lg p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-ink-50">Quick Note</h3>
              <button onClick={() => setShowQuick(false)} className="btn-ghost text-lg leading-none">×</button>
            </div>
            <textarea
              className="input resize-none h-32 mb-4 font-mono text-sm"
              placeholder="Type anything to remember — it'll be chunked and indexed..."
              value={content}
              onChange={e => setContent(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.metaKey && e.key === 'Enter') handleQuickSave() }}
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono text-ink-400">⌘+Enter to save</span>
              <div className="flex gap-2">
                <button className="btn" onClick={() => setShowQuick(false)}>Cancel</button>
                <button
                  className="btn-primary"
                  onClick={handleQuickSave}
                  disabled={saving || !content.trim()}
                >
                  {saving ? 'Saving...' : saved ? '✓ Saved' : 'Remember'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
