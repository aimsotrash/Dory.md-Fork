import { Brain, Bell, Settings, Plus, Zap, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
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

  async function handleIngest() {
    if (!ingestContent.trim()) return;
    setIngesting(true);
    try {
      await ingestText(ingestContent.trim());
      setIngestSuccess(true);
      setIngestContent('');
      setTimeout(() => {
        setIngestSuccess(false);
        setShowIngest(false);
      }, 1500);
    } finally {
      setIngesting(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-cosmos-700/50 bg-cosmos-950/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-nebula-500/20 border border-nebula-500/40 flex items-center justify-center group-hover:glow-nebula transition-all duration-300">
                <Brain size={16} className="text-nebula-400" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-pulsar-400 animate-pulse-slow" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-white text-sm tracking-wide">Dory.md</span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider">MEMORY OS</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Upload files */}
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cosmos-800 hover:bg-cosmos-700 border border-cosmos-700 hover:border-cosmos-600 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all duration-200"
            >
              <Upload size={13} />
              Upload
            </button>

            {/* Add memory (text) */}
            <button
              onClick={() => setShowIngest(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-nebula-500/20 hover:bg-nebula-500/30 border border-nebula-500/40 text-nebula-300 rounded-lg text-xs font-medium transition-all duration-200 hover:glow-nebula"
            >
              <Plus size={13} />
              Add memory
            </button>

            {/* Discovery bell */}
            <button
              onClick={onDiscoveryClick}
              className={`relative p-2 rounded-lg transition-all duration-200 ${
                hasDiscovery
                  ? 'text-flare-400 bg-flare-500/10 hover:bg-flare-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-cosmos-800'
              }`}
            >
              <Bell size={16} />
              {hasDiscovery && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-flare-400 rounded-full animate-pulse" />
              )}
            </button>

            {/* Settings */}
            <Link
              to="/settings"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-cosmos-800 transition-all duration-200"
              title="Settings"
            >
              <Settings size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Text ingest modal */}
      {showIngest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cosmos-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg p-6 space-y-4 border-nebula-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-nebula-400" />
                <h3 className="font-semibold text-white">Add a memory</h3>
              </div>
              <button
                onClick={() => setShowIngest(false)}
                className="text-slate-500 hover:text-slate-300 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <textarea
              className="input-field resize-none h-32 font-mono text-sm"
              placeholder="Paste text, notes, or anything you want to remember..."
              value={ingestContent}
              onChange={(e) => setIngestContent(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-between gap-2">
              <button
                className="btn-ghost flex items-center gap-1.5 text-xs"
                onClick={() => { setShowIngest(false); setShowUpload(true); }}
              >
                <Upload size={12} />
                Upload a file instead
              </button>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setShowIngest(false)}>
                  Cancel
                </button>
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={handleIngest}
                  disabled={ingesting || !ingestContent.trim()}
                >
                  {ingesting ? (
                    <>
                      <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : ingestSuccess ? (
                    '✓ Saved!'
                  ) : (
                    'Remember this'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </>
  );
}
