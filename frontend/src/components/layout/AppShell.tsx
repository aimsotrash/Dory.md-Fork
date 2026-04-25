import { type ReactNode, useRef } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { DiscoveryCard } from '@/components/discovery/DiscoveryCard'
import { useDiscoveryPolling } from '@/lib/useDiscoveryPolling'

export function AppShell({ children }: { children: ReactNode }) {
  const { discovery, dismiss } = useDiscoveryPolling()
  const discoveryRef = useRef<HTMLDivElement>(null)

  return (
    <div className="min-h-screen flex flex-col bg-ink-900">
      <Header
        hasDiscovery={discovery !== null}
        onDiscoveryClick={() => discoveryRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {discovery && (
            <div ref={discoveryRef} className="px-6 pt-4">
              <DiscoveryCard discovery={discovery} onDismiss={dismiss} />
            </div>
          )}
          <div className="px-6 py-5">{children}</div>
        </main>
      </div>
    </div>
  )
}
