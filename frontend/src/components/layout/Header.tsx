import { Brain, Bell, Plus, Upload } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ingestText } from '@/lib/api';
import { UploadModal } from '@/components/upload/UploadModal';

interface HeaderProps {
  hasDiscovery?: boolean;
  onDiscoveryClick?: () => void;
}

const pageTitle: Record<string, string> = {
  '/': 'Dashboard',
  '/search': 'Search',
  '/quiz': 'Quiz Mode',
  '/library': 'Library',
  '/notes': 'Note Editor',
  '/pomodoro': 'Pomodoro',
  '/calendar': 'Calendar',
  '/notion': 'Notion',
  '/settings': 'Settings',
};

export function Header({ hasDiscovery, onDiscoveryClick }: HeaderProps) {
  const [showIngest, setShowIngest] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [ingestContent, setIngestContent] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);
  const location = useLocation();

  async function handleIngest() {
    if (!ingestContent.trim()) return;
    setIngesting(true);
    try {
      await ingestText(ingestContent.trim());
      setIngestSuccess(true);
      setIngestContent('');
      setTimeout(() => { setIngestSuccess(false); setShowIngest(false); }, 1500);
    } finally {
      setIngesting(false);
    }
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 h-12"
        style={{
          background: '#0a0a0a',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: '#7c3aed' }}
          >
            <Brain size={13} className="text-white" />
          </div>
          <span className="font-semibold text-white text-sm tracking-wide">Dory.md</span>
        </Link>

        {/* Breadcrumb */}
        <span className="hidden md:block text-xs" style={{ color: '#444' }}>
          {pageTitle[location.pathname] ?? ''}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{ color: '#666', background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1a1a1a'; (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#666'; }}
          >
            <Upload size={13} />
            Upload
          </button>

          <button
            onClick={() => setShowIngest(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-all"
            style={{ background: '#7c3aed' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#6d28d9')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#7c3aed')}
          >
            <Plus size={13} />
            Add memory
          </button>

          <button
            onClick={onDiscoveryClick}
            className="relative p-1.5 rounded-md transition-colors"
            style={{ color: hasDiscovery ? '#f97316' : '#444' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#1a1a1a')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <Bell size={15} />
            {hasDiscovery && (
              <span
                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                style={{ background: '#f97316' }}
              />
            )}
          </button>
        </div>
      </header>

      {/* Text ingest modal */}
      {showIngest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowIngest(false); }}
        >
          <div
            className="w-full max-w-lg rounded-xl p-5 space-y-4"
            style={{ background: '#141414', border: '1px solid #252525' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Add a memory</h3>
              <button
                onClick={() => setShowIngest(false)}
                className="text-[#444] hover:text-[#888] transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
            <textarea
              className="corp-input resize-none h-36 w-full font-mono text-sm leading-relaxed"
              placeholder="Paste text, notes, or anything you want to remember..."
              value={ingestContent}
              onChange={(e) => setIngestContent(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-between gap-2">
              <button
                className="text-xs transition-colors"
                style={{ color: '#555' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#888')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#555')}
                onClick={() => { setShowIngest(false); setShowUpload(true); }}
              >
                <Upload size={11} className="inline mr-1" />
                Upload a file instead
              </button>
              <div className="flex gap-2">
                <button
                  className="corp-btn-secondary px-3 py-1.5 text-xs"
                  onClick={() => setShowIngest(false)}
                >
                  Cancel
                </button>
                <button
                  className="corp-btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
                  onClick={handleIngest}
                  disabled={ingesting || !ingestContent.trim()}
                >
                  {ingesting ? (
                    <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
                  ) : ingestSuccess ? '✓ Saved!' : 'Remember this'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </>
  );
}
