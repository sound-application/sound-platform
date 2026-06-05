/**
 * Sound Platform — Config Context
 * ===============================
 * Fetches and provides real-time access to Admin toggled Worlds and Feature Flags.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  COL_WORLDS, 
  COL_FEATURE_FLAGS, 
  type WorldConfigDoc, 
  type FeatureFlagDoc 
} from '@sound/shared';

interface ConfigContextValue {
  worlds: Record<string, WorldConfigDoc>;
  featureFlags: Record<string, FeatureFlagDoc>;
  isWorldEnabled: (worldId: string) => boolean;
  isFeatureEnabled: (featureId: string) => boolean;
  isLoading: boolean;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [worlds, setWorlds] = useState<Record<string, WorldConfigDoc>>({});
  const [featureFlags, setFeatureFlags] = useState<Record<string, FeatureFlagDoc>>({});
  const [isLoadingWorlds, setIsLoadingWorlds] = useState(true);
  const [isLoadingFlags, setIsLoadingFlags] = useState(true);

  useEffect(() => {
    // Listen to worlds collection
    const unsubscribeWorlds = onSnapshot(
      collection(db, COL_WORLDS),
      (snapshot) => {
        const worldsMap: Record<string, WorldConfigDoc> = {};
        snapshot.forEach((doc) => {
          const data = doc.data() as WorldConfigDoc;
          worldsMap[data.id || doc.id] = data;
        });
        setWorlds(worldsMap);
        setIsLoadingWorlds(false);
      },
      (error) => {
        console.error('[ConfigContext] Error fetching worlds:', error);
        setIsLoadingWorlds(false);
      }
    );

    // Listen to featureFlags collection
    const unsubscribeFlags = onSnapshot(
      collection(db, COL_FEATURE_FLAGS),
      (snapshot) => {
        const flagsMap: Record<string, FeatureFlagDoc> = {};
        snapshot.forEach((doc) => {
          const data = doc.data() as FeatureFlagDoc;
          flagsMap[data.id || doc.id] = data;
        });
        setFeatureFlags(flagsMap);
        setIsLoadingFlags(false);
      },
      (error) => {
        console.error('[ConfigContext] Error fetching featureFlags:', error);
        setIsLoadingFlags(false);
      }
    );

    return () => {
      unsubscribeWorlds();
      unsubscribeFlags();
    };
  }, []);

  const isWorldEnabled = (worldId: string): boolean => {
    // Default to true if not explicitly disabled or if still loading
    if (isLoadingWorlds) return true;
    const worldConfig = worlds[worldId];
    if (!worldConfig) return true; // If document doesn't exist, assume enabled for backward compatibility
    return worldConfig.enabled !== false;
  };

  const isFeatureEnabled = (featureId: string): boolean => {
    // Default to true if not explicitly disabled or if still loading
    if (isLoadingFlags) return true;
    const flagConfig = featureFlags[featureId];
    if (!flagConfig) return true; // If document doesn't exist, assume enabled
    return flagConfig.enabled !== false;
  };

  const value: ConfigContextValue = {
    worlds,
    featureFlags,
    isWorldEnabled,
    isFeatureEnabled,
    isLoading: isLoadingWorlds || isLoadingFlags,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useAppConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error('useAppConfig must be used within a ConfigProvider');
  }
  return ctx;
}
