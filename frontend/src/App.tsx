import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/pages/Dashboard'
import { SearchPage } from '@/pages/SearchPage'
import { QuizPage } from '@/pages/QuizPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { NoteEditorPage } from '@/pages/NoteEditorPage'
import { PomodoroPage } from '@/pages/PomodoroPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default function App() {
  return (
    <AppShell>
      <ErrorBoundary>
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/notes"    element={<NoteEditorPage />} />
          <Route path="/search"   element={<SearchPage />} />
          <Route path="/library"  element={<LibraryPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/pomodoro" element={<PomodoroPage />} />
          <Route path="/quiz"     element={<QuizPage />} />
          <Route
            path="*"
            element={
              <div className="tile p-10 text-center">
                <p className="font-mono text-ink-400">404 — page not found</p>
              </div>
            }
          />
        </Routes>
      </ErrorBoundary>
    </AppShell>
  )
}
