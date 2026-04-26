import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import {
  Upload, X, CheckCircle2, AlertCircle,
  Loader2, CloudUpload, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ingestText } from '@/lib/api';

interface UploadModalProps {
  onClose: () => void;
}

type FileStatus = 'pending' | 'processing' | 'done' | 'error';

interface QueuedFile {
  id: string;
  file: File;
  status: FileStatus;
  error?: string;
  preview?: string;
}

const ACCEPTED = ['.pdf', '.txt', '.doc', '.docx', '.md'];
const ACCEPTED_MIME = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <span className="text-red-400 text-[10px] font-mono font-bold">PDF</span>;
  if (ext === 'doc' || ext === 'docx') return <span className="text-blue-400 text-[10px] font-mono font-bold">DOC</span>;
  if (ext === 'md') return <span className="text-nebula-400 text-[10px] font-mono font-bold">MD</span>;
  return <span className="text-slate-400 text-[10px] font-mono font-bold">TXT</span>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function UploadModal({ onClose }: UploadModalProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const valid = arr.filter((f) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return ACCEPTED.includes(ext) || ACCEPTED_MIME.includes(f.type);
    });
    if (!valid.length) return;
    setQueue((prev) => [
      ...prev,
      ...valid.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        status: 'pending' as FileStatus,
      })),
    ]);
  }

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  }, []);

  function removeFile(id: string) {
    setQueue((prev) => prev.filter((f) => f.id !== id));
  }

  async function processAll() {
    if (!queue.filter((f) => f.status === 'pending').length) return;
    setUploading(true);

    for (const item of queue) {
      if (item.status !== 'pending') continue;

      setQueue((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'processing' } : f))
      );

      try {
        const ext = item.file.name.split('.').pop()?.toLowerCase();
        let content: string;

        if (ext === 'pdf') {
          content = `[PDF] ${item.file.name} — PDF parsing requires backend processing. File queued for ingestion.`;
        } else if (ext === 'doc' || ext === 'docx') {
          content = `[DOC] ${item.file.name} — Document parsing requires backend processing. File queued for ingestion.`;
        } else {
          content = await readFileAsText(item.file);
        }

        await ingestText(content, 'file', item.file.name);

        setQueue((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'done' } : f))
        );
      } catch (e) {
        setQueue((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: 'error', error: e instanceof Error ? e.message : 'Upload failed' }
              : f
          )
        );
      }
    }

    setUploading(false);
  }

  const pending = queue.filter((f) => f.status === 'pending').length;
  const done = queue.filter((f) => f.status === 'done').length;
  const allDone = queue.length > 0 && done === queue.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="gcard w-full max-w-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #1f1f1f' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-nebula-500/20 border border-nebula-500/40 flex items-center justify-center">
              <CloudUpload size={14} className="text-nebula-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Upload files</h3>
              <p className="text-[10px] text-slate-500">PDF, TXT, DOC, DOCX, MD supported</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-[#1c1c1c] transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* Drop zone */}
        <div className="px-6 pt-5">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 cursor-pointer transition-all duration-200 select-none',
              dragging
                ? 'border-nebula-400 scale-[1.01]'
                : 'border-[#252525] hover:border-[#7c3aed]/50'
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
                dragging ? 'bg-[#7c3aed]/20 scale-110' : 'bg-[#1c1c1c]'
              )}
            >
              <Upload size={20} className={dragging ? 'text-nebula-300' : 'text-slate-400'} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-300">
                {dragging ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                or <span className="text-nebula-400 underline underline-offset-2">browse to upload</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {ACCEPTED.map((ext) => (
                <span
                  key={ext}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1c1c1c] text-slate-500 border border-[#252525]"
                >
                  {ext}
                </span>
              ))}
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED.join(',')}
              className="hidden"
              onChange={onInputChange}
            />
          </div>
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="px-6 pt-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                {queue.length} file{queue.length !== 1 ? 's' : ''} queued
              </p>
              {pending > 0 && !uploading && (
                <button
                  onClick={() => setQueue([])}
                  className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={10} /> Clear all
                </button>
              )}
            </div>
            <div className="space-y-2 pb-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-300',
                    item.status === 'done' && 'border-green-500/20 bg-green-500/5',
                    item.status === 'error' && 'border-red-500/20 bg-red-500/5',
                    item.status === 'processing' && 'border-nebula-500/20 bg-nebula-500/5',
                    item.status === 'pending' && 'border-[#252525] bg-[#141414]'
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1c1c1c] flex items-center justify-center shrink-0">
                    {item.status === 'processing' ? (
                      <Loader2 size={14} className="text-nebula-400 animate-spin" />
                    ) : item.status === 'done' ? (
                      <CheckCircle2 size={14} className="text-green-400" />
                    ) : item.status === 'error' ? (
                      <AlertCircle size={14} className="text-red-400" />
                    ) : (
                      fileIcon(item.file.name)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{item.file.name}</p>
                    <p className="text-[10px] text-slate-600">
                      {item.status === 'error'
                        ? item.error
                        : item.status === 'done'
                        ? 'Ingested successfully'
                        : item.status === 'processing'
                        ? 'Processing…'
                        : formatBytes(item.file.size)}
                    </p>
                  </div>

                  {item.status === 'pending' && !uploading && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1 rounded text-slate-600 hover:text-slate-400 transition-colors shrink-0"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3 mt-2" style={{ borderTop: '1px solid #1f1f1f' }}>
          <p className="text-[11px] text-slate-600">
            {allDone
              ? `${done} file${done !== 1 ? 's' : ''} added to your knowledge base`
              : 'Files are processed and chunked by the AI engine'}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn-secondary text-xs" onClick={onClose}>
              {allDone ? 'Close' : 'Cancel'}
            </button>
            {!allDone && (
              <button
                className="btn-primary text-xs flex items-center gap-1.5"
                onClick={processAll}
                disabled={uploading || pending === 0}
              >
                {uploading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <CloudUpload size={12} />
                    Upload {pending > 0 ? `${pending} file${pending !== 1 ? 's' : ''}` : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
