import { useState } from 'react';
import { marked } from 'marked';
import { ingestText } from '@/lib/api';
import {
  Save, Eye, Code2, Loader2,
  CheckCircle2, AlertCircle, NotebookPen,
} from 'lucide-react';

const TOOLBAR = [
  { label: 'H1',  action: (t: string) => `# ${t}` },
  { label: 'H2',  action: (t: string) => `## ${t}` },
  { label: 'B',   action: (t: string) => `**${t}**` },
  { label: 'I',   action: (t: string) => `*${t}*` },
  { label: '`',   action: (t: string) => `\`${t}\`` },
  { label: '```', action: (t: string) => `\`\`\`\n${t}\n\`\`\`` },
  { label: '>',   action: (t: string) => `> ${t}` },
  { label: '—',   action: (t: string) => `- ${t}` },
];

type SaveMode = 'dory' | 'local' | 'notion';

export function NoteEditorPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [saveMode, setSaveMode] = useState<SaveMode>('dory');
  const [notionToken, setNotionToken] = useState('');
  const [notionParentId, setNotionParentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const renderedHtml = marked.parse(content || '*Start writing...*') as string;
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  function applyFormat(action: (t: string) => string) {
    const ta = document.getElementById('note-editor') as HTMLTextAreaElement;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end) || 'text';
    const next = content.slice(0, start) + action(selected) + content.slice(end);
    setContent(next);
    setTimeout(() => ta.focus(), 0);
  }

  function setOk(msg: string) {
    setStatus({ type: 'ok', msg });
    setTimeout(() => setStatus(null), 2500);
  }
  function setErr(msg: string) {
    setStatus({ type: 'err', msg });
    setTimeout(() => setStatus(null), 3500);
  }

  function downloadMd() {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/\s+/g, '-').toLowerCase() || 'note'}.md`;
    a.click();
    setOk('Downloaded as .md');
  }

  async function saveToNotion() {
    if (!notionToken || !notionParentId) {
      setErr('Please fill in Notion token and parent page ID below.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/notion/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: notionToken, parent_id: notionParentId, title: title || 'Untitled', content }),
      });
      if (!res.ok) throw new Error(await res.text());
      setOk('Saved to Notion ✓');
    } catch (e: unknown) {
      setErr(`Notion error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally { setSaving(false); }
  }

  async function saveToDory() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await ingestText(`# ${title}\n\n${content}`, 'note', title || 'note');
      setOk('Indexed in Dory ✓');
    } catch (e: unknown) {
      setErr(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally { setSaving(false); }
  }

  async function handleSave() {
    if (saveMode === 'local') downloadMd();
    else if (saveMode === 'notion') await saveToNotion();
    else await saveToDory();
  }

  const saveModes: { id: SaveMode; label: string; color: string }[] = [
    { id: 'dory',   label: '◈ Dory',   color: '#7c3aed' },
    { id: 'local',  label: '⬇ Local',  color: '#0891b2' },
    { id: 'notion', label: 'N Notion', color: '#f97316' },
  ];

  return (
    <div className="max-w-5xl space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }}>
            <NotebookPen size={15} className="text-nebula-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Note Editor</h1>
            <p className="text-xs text-slate-600">Markdown · write, preview, save to Dory</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status */}
          {status && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: status.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${status.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: status.type === 'ok' ? '#86efac' : '#fca5a5',
              }}
            >
              {status.type === 'ok' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {status.msg}
            </div>
          )}

          {/* Save mode */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {saveModes.map(({ id, label, color }) => (
              <button
                key={id}
                onClick={() => setSaveMode(id)}
                className="px-3 py-1.5 text-xs font-mono font-semibold transition-all duration-200"
                style={{
                  background: saveMode === id ? `${color}25` : 'rgba(255,255,255,0.03)',
                  color: saveMode === id ? color : '#64748b',
                  borderRight: id !== 'notion' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <button className="btn-primary flex items-center gap-2" onClick={handleSave}
            disabled={saving || (!content.trim() && saveMode !== 'local')}>
            {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save</>}
          </button>
        </div>
      </div>

      {/* Notion config */}
      {saveMode === 'notion' && (
        <div className="gcard p-4 flex gap-4 items-end" style={{ borderColor: 'rgba(249,115,22,0.3)' }}>
          <div className="flex-1">
            <label className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1 block">Notion Token</label>
            <input className="input-field text-sm" type="password" placeholder="secret_..."
              value={notionToken} onChange={e => setNotionToken(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1 block">Parent Page ID</label>
            <input className="input-field text-sm" placeholder="xxxxxxxxxxxxxxxx"
              value={notionParentId} onChange={e => setNotionParentId(e.target.value)} />
          </div>
        </div>
      )}

      {/* Main editor */}
      <div className="gcard overflow-hidden">
        {/* Title */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px' }}>
          <input
            className="w-full bg-transparent text-xl font-bold text-white placeholder-slate-700 outline-none"
            placeholder="Note title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center gap-0.5 px-3 py-2 flex-wrap"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
        >
          {TOOLBAR.map(({ label, action }) => (
            <button
              key={label}
              onClick={() => applyFormat(action)}
              className="px-2.5 py-1 text-xs font-mono text-slate-500 hover:text-nebula-300 hover:bg-nebula-500/10 rounded-lg transition-all duration-150"
            >
              {label}
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            {[
              { label: 'Write', icon: Code2, active: !preview },
              { label: 'Preview', icon: Eye, active: preview },
            ].map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                onClick={() => setPreview(label === 'Preview')}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200"
                style={{
                  background: active ? 'rgba(124,58,237,0.2)' : 'transparent',
                  color: active ? '#a78bfa' : '#64748b',
                  border: active ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                }}
              >
                <Icon size={11} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Editor / Preview */}
        {!preview ? (
          <textarea
            id="note-editor"
            className="w-full bg-transparent text-slate-300 font-mono text-sm p-5 outline-none resize-none leading-7 placeholder-slate-700"
            style={{ minHeight: 480 }}
            placeholder={`Start writing in Markdown…\n\n# Heading\n**bold**, *italic*, \`code\`\n\n- bullet point\n> blockquote`}
            value={content}
            onChange={e => setContent(e.target.value)}
            spellCheck
          />
        ) : (
          <div
            className="p-5 text-slate-300 prose prose-invert prose-sm max-w-none"
            style={{ minHeight: 480 }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-5 py-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}
        >
          {[
            `${wordCount} words`,
            `${content.length} chars`,
            `~${Math.max(1, Math.ceil(wordCount / 200))} min read`,
          ].map(t => (
            <span key={t} className="text-[10px] font-mono text-slate-700">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
