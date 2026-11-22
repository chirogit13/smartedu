'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PARENT_SESSION_KEY,
  PARENT_UNAUTH_EVENT,
  parentLogin,
  parentLogout,
  setParentCredentials,
  type ParentSession,
} from '@/lib/api/parent/parentClient';

interface ParentSessionValue {
  /** false until the stored session has been read on the client */
  ready: boolean;
  session: ParentSession | null;
  selectedChildId: number | null;
  selectChild: (id: number) => void;
  login: (input: { email: string; password: string; schoolCode: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const ParentSessionContext = createContext<ParentSessionValue | null>(null);

function readStored(): ParentSession | null {
  try {
    const raw = window.sessionStorage.getItem(PARENT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ParentSession;
    return parsed && typeof parsed.token === 'string' && typeof parsed.schoolCode === 'string'
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * Holds the guardian session for the /parent area. The session lives in
 * sessionStorage (cleared when the tab closes) and is separate from the
 * student session, so the two roles never share credentials.
 */
export function ParentSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<ParentSession | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const apply = useCallback((next: ParentSession | null) => {
    setParentCredentials(next?.token ?? null, next?.schoolCode ?? null);
    setSession(next);
    setSelectedChildId(next?.children[0]?.id ?? null);
    try {
      if (next) window.sessionStorage.setItem(PARENT_SESSION_KEY, JSON.stringify(next));
      else window.sessionStorage.removeItem(PARENT_SESSION_KEY);
    } catch {
      /* storage unavailable: session stays in memory only */
    }
  }, []);

  useEffect(() => {
    apply(readStored());
    setReady(true);
  }, [apply]);

  useEffect(() => {
    const onUnauth = () => {
      apply(null);
      queryClient.removeQueries({ queryKey: ['parent'] });
    };
    window.addEventListener(PARENT_UNAUTH_EVENT, onUnauth);
    return () => window.removeEventListener(PARENT_UNAUTH_EVENT, onUnauth);
  }, [apply, queryClient]);

  const login = useCallback(
    async (input: { email: string; password: string; schoolCode: string }) => {
      const next = await parentLogin(input);
      queryClient.removeQueries({ queryKey: ['parent'] });
      apply(next);
    },
    [apply, queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await parentLogout();
    } catch {
      /* token may already be invalid; clear locally regardless */
    }
    queryClient.removeQueries({ queryKey: ['parent'] });
    apply(null);
  }, [apply, queryClient]);

  const value = useMemo<ParentSessionValue>(
    () => ({
      ready,
      session,
      selectedChildId,
      selectChild: setSelectedChildId,
      login,
      logout,
    }),
    [ready, session, selectedChildId, login, logout],
  );

  return <ParentSessionContext.Provider value={value}>{children}</ParentSessionContext.Provider>;
}

export function useParentSession(): ParentSessionValue {
  const ctx = useContext(ParentSessionContext);
  if (!ctx) throw new Error('useParentSession must be used inside ParentSessionProvider');
  return ctx;
}
