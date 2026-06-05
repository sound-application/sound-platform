/**
 * Sound Platform — World Navigation Context
 * ==========================================
 * Phase: 5-D
 *
 * Single source of truth for the combined world + tab routing model.
 *
 * Model:
 *   selectedWorld  — one of the 5 locked worlds (general | plus | music | radio | tournaments)
 *   activeTab      — one of the 5 locked bottom tabs (home | discover | live | create | me)
 *
 * The URL IS the state:  /:worldId/:tab
 * No separate React state needed — useParams() + useNavigate() is sufficient.
 *
 * This context exists to:
 *   1. Give AppHeader and BottomNav a shared navigate() helper.
 *   2. Let any page read (world, tab) without prop drilling.
 *   3. Expose switchWorld() — keeps active tab, changes world.
 *   4. Expose switchTab()   — keeps active world, changes tab.
 */

import React, { createContext, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WORLD_ORDER, type LockedWorldKey } from '../constants/lockedLabels';
import { useAppConfig } from './ConfigContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type WorldTab = 'home' | 'discover' | 'live' | 'create' | 'me';

export const DEFAULT_WORLD: LockedWorldKey = 'general';
export const DEFAULT_TAB: WorldTab = 'home';

const VALID_TABS: WorldTab[] = ['home', 'discover', 'live', 'create', 'me'];

function isValidWorld(id: string): id is LockedWorldKey {
  return (WORLD_ORDER as string[]).includes(id);
}

function isValidTab(tab: string): tab is WorldTab {
  return (VALID_TABS as string[]).includes(tab);
}

// ─── Context Shape ─────────────────────────────────────────────────────────────

interface WorldNavValue {
  /** Currently active world — always a valid LockedWorldKey */
  world: LockedWorldKey;
  /** Currently active bottom tab — always a valid WorldTab */
  tab: WorldTab;
  /**
   * Switch the world while keeping the current tab.
   * E.g. user is on music/home → clicks راديو → goes to radio/home
   */
  switchWorld: (newWorld: LockedWorldKey) => void;
  /**
   * Switch the tab while keeping the current world.
   * E.g. user is on music/home → clicks لايف → goes to music/live
   */
  switchTab: (newTab: WorldTab) => void;
  /** Convenience: navigate to an explicit world+tab combo */
  navigate: (world: LockedWorldKey, tab: WorldTab) => void;
}

const WorldNavContext = createContext<WorldNavValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

export function WorldNavProvider({ children }: { children: React.ReactNode }) {
  const routerNavigate = useNavigate();
  const location = useLocation();

  // Derive world + tab from pathname directly.
  //
  // We intentionally do NOT use params.worldId here.
  // Reason: "general" and "plus" are registered as *static* route segments
  // (e.g. <Route path="general">), so React Router never populates
  // params.worldId for them — only the catch-all <Route path=":worldId">
  // fills that param. Parsing the pathname is reliable for all cases.
  //
  // Example:
  //   pathname = "/plus/home"       → segments[0] = "plus"  → world = 'plus'
  //   pathname = "/general/home"    → segments[0] = "general" → world = 'general'
  //   pathname = "/music/live"      → segments[0] = "music" → world = 'music'
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const worldSegment = pathSegments[0] ?? '';
  const world: LockedWorldKey = isValidWorld(worldSegment)
    ? worldSegment
    : DEFAULT_WORLD;

  // :tab is NOT a named dynamic param — the routes use literal segment names
  // ("home", "live", "discover", "create", "me").
  // Derive the active tab by parsing the second segment of pathname directly.
  // Example: pathname = "/music/live" → segments[1] = "live" → tab = 'live'
  //          pathname = "/general/home" → segments[1] = "home" → tab = 'home'
  const tabSegment = pathSegments[1] ?? '';
  const tab: WorldTab = isValidTab(tabSegment) ? tabSegment : DEFAULT_TAB;

  const { isWorldEnabled, isLoading } = useAppConfig();

  const nav = useCallback(
    (w: LockedWorldKey, t: WorldTab) => {
      routerNavigate(`/${w}/${t}`);
    },
    [routerNavigate],
  );

  // Redirect to DEFAULT_WORLD if the current world is disabled
  React.useEffect(() => {
    if (!isLoading && !isWorldEnabled(world)) {
      console.warn(`[WorldNavContext] World "${world}" is currently disabled by Admin. Redirecting to "${DEFAULT_WORLD}".`);
      // NOTE: In a real app we might show a Toast notification here.
      nav(DEFAULT_WORLD, tab);
    }
  }, [world, tab, isWorldEnabled, isLoading, nav]);

  const switchWorld = useCallback(
    (newWorld: LockedWorldKey) => nav(newWorld, tab),
    [nav, tab],
  );

  const switchTab = useCallback(
    (newTab: WorldTab) => nav(world, newTab),
    [nav, world],
  );

  return (
    <WorldNavContext.Provider value={{ world, tab, switchWorld, switchTab, navigate: nav }}>
      {children}
    </WorldNavContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useWorldNav(): WorldNavValue {
  const ctx = useContext(WorldNavContext);
  if (!ctx) {
    throw new Error('useWorldNav must be used inside WorldNavProvider (inside AppLayout)');
  }
  return ctx;
}
