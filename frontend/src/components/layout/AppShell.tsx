import { type ReactNode, useRef } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { DiscoveryCard } from '@/components/discovery/DiscoveryCard';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { useDiscoveryPolling } from '@/lib/useDiscoveryPolling';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { discovery, dismiss } = useDiscoveryPolling();
  const discoveryRef = useRef<HTMLDivElement>(null);

  function scrollToDiscovery() {
    discoveryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <AnimatedBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header hasDiscovery={discovery !== null} onDiscoveryClick={scrollToDiscovery} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {discovery && (
              <div ref={discoveryRef} className="px-6 pt-4">
                <DiscoveryCard discovery={discovery} onDismiss={dismiss} />
              </div>
            )}
            <div className="px-6 py-5">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
