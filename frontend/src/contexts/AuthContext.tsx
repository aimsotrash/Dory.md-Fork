import { createContext, useContext, useState, type ReactNode } from 'react'
import { config } from '@/lib/config'

export interface User {
  email: string
  name: string
}

interface AuthCtx {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<string | true>
  logout: () => void
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  token: null,
  login: async () => false,
  register: async () => true,
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('dory-session') ?? 'null') } catch { return null }
  })
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('dory-token')
  )

  async function login(email: string, password: string): Promise<boolean> {
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) return false
      const data = await res.json()
      const session: User = { email: data.email, name: data.name }
      setUser(session)
      setToken(data.token)
      localStorage.setItem('dory-session', JSON.stringify(session))
      localStorage.setItem('dory-token', data.token)
      return true
    } catch {
      return false
    }
  }

  // Returns true on success, or an error string on failure
  async function register(name: string, email: string, password: string): Promise<string | true> {
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return data.detail ?? 'Registration failed.'
      }
      return true
    } catch {
      return 'Could not reach the server.'
    }
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('dory-session')
    localStorage.removeItem('dory-token')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
