import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { SearchPage } from '@/pages/SearchPage';
import { QuizPage } from '@/pages/QuizPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { NoteEditorPage } from '@/pages/NoteEditorPage';
import { PomodoroPage } from '@/pages/PomodoroPage';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function App() {
  return (
    <AppShell>
      <ErrorBoundary>
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/search"   element={<SearchPage />} />
          <Route path="/quiz"     element={<QuizPage />} />
          <Route path="/library"  element={<LibraryPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/notes"    element={<NoteEditorPage />} />
          <Route path="/pomodoro" element={<PomodoroPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={
            <div className="gcard p-10 text-center">
              <p className="text-slate-400">Page not found</p>
            </div>
          } />
        </Routes>
      </ErrorBoundary>
    </AppShell>
  );
}
