import { Brain, Bell, Settings, Plus, Zap, Upload } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ingestText } from '@/lib/api';
import { UploadModal } from '@/components/upload/UploadModal';

interface HeaderProps {
  hasDiscovery?: boolean;
  onDiscoveryClick?: () => void;
}

export function Header({ hasDiscovery, onDiscoveryClick }: HeaderProps) {
  const [showIngest, setShowIngest] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [ingestContent, setIngestContent] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);
  const location = useLocation();

  const pageTitle: Record<string, string> = {
    '/': 'Dashboard',
    '/search': 'Search',
    '/quiz': 'Quiz Mode',
    '/library': 'Library',
    '/settings': 'Settings',
  };

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
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(5,8,16,0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(8,145,178,0.2) 100%)',
                  border: '1px solid rgba(124,58,237,0.4)',
                  boxShadow: '0 0 16px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <Brain size={15} className="text-nebula-300" />
              </div>
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-pulsar-400"
                style={{ boxShadow: '0 0 6px #22d3ee', animation: 'pulse-ring 2s ease-out infinite' }}
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-white text-sm tracking-wide">Dory.md</span>
              <span className="text-[9px] text-slate-600 font-mono tracking-[0.15em] uppercase">Memory OS</span>
            </div>
          </Link>

          {/* Current page breadcrumb */}
          <span className="hidden md:block text-xs text-slate-600 font-medium">
            {pageTitle[location.pathname] ?? ''}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <Upload size={12} />
              Upload
            </button>

            <button
              onClick={() => setShowIngest(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-nebula-300 transition-all duration-200"
              style={{
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.35)',
                boxShadow: '0 0 16px rgba(124,58,237,0.15)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(124,58,237,0.35)';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.22)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px rgba(124,58,237,0.15)';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.15)';
              }}
            >
              <Plus size={12} />
              Add memory
            </button>

            <button
              onClick={onDiscoveryClick}
              className="relative p-2 rounded-lg transition-all duration-200"
              style={{
                background: hasDiscovery ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${hasDiscovery ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.07)'}`,
                color: hasDiscovery ? '#fb923c' : '#64748b',
              }}
            >
              <Bell size={15} />
              {hasDiscovery && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-flare-400"
                  style={{ boxShadow: '0 0 6px #f97316', animation: 'pulse-ring 2s ease-out infinite' }}
                />
              )}
            </button>

            <Link
              to="/settings"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-300 transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              title="Settings"
            >
              <Settings size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* Text ingest modal */}
      {showIngest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(5,8,16,0.85)', backdropFilter: 'blur(16px)' }}
        >
          <div className="gcard w-full max-w-lg p-6 space-y-4" style={{ borderColor: 'rgba(124,58,237,0.3)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }}>
                  <Zap size={13} className="text-nebula-400" />
                </div>
                <h3 className="font-semibold text-white">Add a memory</h3>
              </div>
              <button onClick={() => setShowIngest(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
                ×
              </button>
            </div>
            <textarea
              className="input-field resize-none h-36 font-mono text-sm leading-relaxed"
              placeholder="Paste text, notes, or anything you want to remember..."
              value={ingestContent}
              onChange={(e) => setIngestContent(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-between gap-2">
              <button className="btn-ghost flex items-center gap-1.5 text-xs"
                onClick={() => { setShowIngest(false); setShowUpload(true); }}>
                <Upload size={11} /> Upload a file instead
              </button>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setShowIngest(false)}>Cancel</button>
                <button className="btn-primary flex items-center gap-2" onClick={handleIngest}
                  disabled={ingesting || !ingestContent.trim()}>
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
