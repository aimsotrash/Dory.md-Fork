import { useState, useEffect, useRef, useCallback } from 'react';
import { getDiscovery } from './api';
import { config } from './config';
import type { DiscoveryResponse } from './types';

const SESSION_KEY = 'dory_dismissed_discovery';

function getDismissedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addDismissedId(id: string) {
  const ids = getDismissedIds();
  ids.add(id);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids]));
}

export function useDiscoveryPolling() {
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await getDiscovery();
      if (res.has_discovery) {
        const chunkId = res.chunk?.id ?? '';
        if (!getDismissedIds().has(chunkId)) {
          setDiscovery(res);
        }
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

  const dismiss = useCallback(() => {
    if (discovery && discovery.has_discovery) {
      const chunkId = discovery.chunk?.id ?? '';
      if (chunkId) addDismissedId(chunkId);
    }
    setDiscovery(null);
  }, [discovery]);

  const recheck = useCallback(() => poll(), [poll]);

  return { discovery: discovery?.has_discovery ? discovery : null, dismiss, recheck };
}
