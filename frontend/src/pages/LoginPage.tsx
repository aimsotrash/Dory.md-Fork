import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Brain, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(m: 'login' | 'register') {
    setMode(m)
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    await new Promise(r => setTimeout(r, 300))

    if (mode === 'login') {
      const ok = login(email, password)
      if (!ok) {
        setError('Invalid email or password.')
        setLoading(false)
      } else {
        navigate('/')
      }
    } else {
      if (name.trim().length < 2) {
        setError('Name must be at least 2 characters.')
        setLoading(false)
        return
      }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return }
      const ok = register(name.trim(), email, password)
      if (!ok) {
        setError('An account with that email already exists.')
        setLoading(false)
      } else {
        setSuccess('Account created! Sign in to continue.')
        setName('')
        setEmail('')
        setPassword('')
        setLoading(false)
        setTimeout(() => switchMode('login'), 1200)
      }
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#0a0a0a' }}
    >
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{
          background: '#111111',
          borderRight: '1px solid #1f1f1f',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#7c3aed' }}
          >
            <Brain size={16} className="text-white" />
          </div>
          <span className="font-semibold text-white text-sm tracking-wide">Dory.md</span>
        </div>

        <div className="space-y-6">
          <blockquote className="space-y-3">
            <p className="text-xl font-medium text-white leading-snug">
              "The notes app that remembers so you don't have to forget."
            </p>
            <footer className="text-sm text-[#666]">
              UWB Hacks 2026 · Track 2: Human Experience
            </footer>
          </blockquote>

          <div className="space-y-3">
            {[
              'Ebbinghaus forgetting curve per knowledge chunk',
              'BM25 + dense hybrid search with RRF',
              'AI-generated quiz from your fading memories',
            ].map(f => (
              <div key={f} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#7c3aed' }} />
                <span className="text-sm text-[#888]">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#444]">© 2026 Dory.md</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[360px] space-y-6">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#7c3aed' }}>
              <Brain size={16} className="text-white" />
            </div>
            <span className="font-semibold text-white text-sm">Dory.md</span>
          </div>

          <div>
            <h1 className="text-xl font-semibold text-white">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#666' }}>
              {mode === 'login'
                ? 'Sign in to access your knowledge base'
                : 'Start building your second brain'}
            </p>
          </div>

          {/* Tab switcher */}
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: '#161616', border: '1px solid #222' }}
          >
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="flex-1 py-1.5 text-sm font-medium rounded-md transition-all duration-150"
                style={mode === m
                  ? { background: '#222', color: '#fff' }
                  : { color: '#555' }
                }
              >
                {m === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium" style={{ color: '#888' }}>
                  Full name
                </label>
                <input
                  className="corp-input w-full"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: '#888' }}>
                Email
              </label>
              <input
                className="corp-input w-full"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus={mode === 'login'}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: '#888' }}>
                Password
              </label>
              <div className="relative">
                <input
                  className="corp-input w-full pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#555' }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}
              >
                <CheckCircle2 size={14} />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="corp-btn-primary w-full py-2.5 flex items-center justify-center gap-2 mt-1"
            >
              {loading
                ? <Loader2 size={15} className="animate-spin" />
                : mode === 'login' ? 'Sign in' : 'Create account'
              }
            </button>
          </form>

          {/* Demo credentials hint */}
          <div
            className="rounded-lg px-3 py-2.5 space-y-0.5"
            style={{ background: '#141414', border: '1px solid #1f1f1f' }}
          >
            <p className="text-[11px] font-medium" style={{ color: '#555' }}>Demo credentials</p>
            <p className="text-[11px] font-mono" style={{ color: '#444' }}>
              demo@dory.md · demo123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
