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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
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
    const session = { email, name }
    setUser(session)
    localStorage.setItem('dory-session', JSON.stringify(session))
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
