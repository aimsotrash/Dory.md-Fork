import { createContext, useContext, useState, type ReactNode } from 'react'

export interface User {
  email: string
  name: string
}

interface AuthCtx {
  user: User | null
  login: (email: string, password: string) => boolean
  register: (name: string, email: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  login: () => false,
  register: () => false,
  logout: () => {},
})

interface StoredUser { name: string; email: string; password: string }

const SEED_USERS: StoredUser[] = [
  { name: 'Demo User', email: 'demo@dory.md', password: 'demo123' },
]

function initUsers(): void {
  try {
    const stored = JSON.parse(localStorage.getItem('dory-users') ?? '[]') as StoredUser[]
    const seedEmails = new Set(SEED_USERS.map(s => s.email))
    const userCreated = stored.filter(u => !seedEmails.has(u.email))
    localStorage.setItem('dory-users', JSON.stringify([...SEED_USERS, ...userCreated]))
  } catch {
    localStorage.setItem('dory-users', JSON.stringify(SEED_USERS))
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    initUsers()
    try {
      return JSON.parse(localStorage.getItem('dory-session') ?? 'null')
    } catch {
      return null
    }
  })

  function login(email: string, password: string): boolean {
    const users: StoredUser[] = JSON.parse(localStorage.getItem('dory-users') ?? '[]')
    const found = users.find(u => u.email === email && u.password === password)
    if (!found) return false
    const session = { email: found.email, name: found.name }
    setUser(session)
    localStorage.setItem('dory-session', JSON.stringify(session))
    return true
  }

  function register(name: string, email: string, password: string): boolean {
    const users: StoredUser[] = JSON.parse(localStorage.getItem('dory-users') ?? '[]')
    if (users.some(u => u.email === email)) return false
    users.push({ name, email, password })
    localStorage.setItem('dory-users', JSON.stringify(users))
    return true
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('dory-session')
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
