/**
 * Sound Platform — Firebase Connectivity Hook
 * =============================================
 * Phase: 5-A (Online App Shell)
 *
 * Checks whether the app is connected to Firebase online services.
 * Reports online/offline/checking status to the UI.
 */

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type ConnectivityStatus = 'checking' | 'online' | 'offline';

/**
 * useFirebaseConnectivity — ping Firestore to verify online connectivity.
 * Uses a lightweight read of a known public document or catches network errors.
 */
export function useFirebaseConnectivity(): ConnectivityStatus {
  const [status, setStatus] = useState<ConnectivityStatus>('checking');

  useEffect(() => {
    let cancelled = false;

    // Ping: attempt to read a known public collection root document.
    // worlds/general is seeded and readable by any authenticated user.
    // If not seeded yet, the doc simply won't exist — that is still "online".
    const ping = async () => {
      try {
        await getDoc(doc(db, '_health', 'ping'));
        if (!cancelled) setStatus('online');
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          // network-request-failed = offline; permission-denied = online (rules applied)
          if (msg.includes('network-request-failed') || msg.includes('Failed to fetch')) {
            setStatus('offline');
          } else {
            // Any other error (permission-denied, not-found) means we're connected
            setStatus('online');
          }
        }
      }
    };

    void ping();
    return () => { cancelled = true; };
  }, []);

  return status;
}
