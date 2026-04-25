import { useState, useEffect, useRef, useCallback } from 'react';
import { getDiscovery } from './api';
import { config } from './config';
import type { DiscoveryResponse } from './types';

export function useDiscoveryPolling() {
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await getDiscovery();
      if (res.has_discovery) {
        setDiscovery(res);
        setDismissed(false);
      }
    } catch {
      // silently ignore polling errors
    }
  }, []);

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, config.discoveryPollMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  const dismiss = useCallback(() => setDismissed(true), []);
  const recheck = useCallback(() => poll(), [poll]);

  const visible =
    discovery !== null && discovery.has_discovery && !dismissed;

  return { discovery: visible ? discovery : null, dismiss, recheck };
}
