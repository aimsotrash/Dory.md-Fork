import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { SearchPage } from '@/pages/SearchPage';
import { QuizPage } from '@/pages/QuizPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function App() {
  return (
    <AppShell>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route
            path="*"
            element={
              <div className="glass-card p-10 text-center">
                <p className="text-slate-400">Page not found</p>
              </div>
            }
          />
        </Routes>
      </ErrorBoundary>
    </AppShell>
  );
}
