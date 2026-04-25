import { useState, useCallback } from 'react'

export interface Note {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

const STORAGE_KEY = 'dory-notes'

function load(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function persist(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(load)

  const createNote = useCallback((): Note => {
    const note: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setNotes(prev => {
      const next = [note, ...prev]
      persist(next)
      return next
    })
    return note
  }, [])

  const updateNote = useCallback((id: string, changes: Partial<Pick<Note, 'title' | 'content'>>) => {
    setNotes(prev => {
      const next = prev.map(n =>
        n.id === id ? { ...n, ...changes, updated_at: new Date().toISOString() } : n
      )
      persist(next)
      return next
    })
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id)
      persist(next)
      return next
    })
  }, [])

  return { notes, createNote, updateNote, deleteNote }
}
