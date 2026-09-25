/**
 * Detects the same project being open in several tabs (BroadcastChannel).
 * IndexedDB has no cross-tab locking, so two tabs editing one project would
 * overwrite each other's saves; we warn instead of silently losing edits.
 */
import { create } from 'zustand';
import { newId } from '../lib/ids';

interface TabState {
  otherTabs: boolean;
  staleSavedAt: string | null;
  reset(): void;
}

export const useTabGuard = create<TabState>()((set) => ({
  otherTabs: false,
  staleSavedAt: null,
  reset: () => set({ otherTabs: false, staleSavedAt: null }),
}));

type Msg = { type: 'hello' | 'here' | 'saved' | 'closed'; projectId: string; tab: string; at?: string };

const TAB = newId('tab');
let channel: BroadcastChannel | null = null;
let current: string | null = null;

function ensureChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === 'undefined') return channel;
  channel = new BroadcastChannel('garden-toolkit');
  channel.onmessage = (e: MessageEvent<Msg>) => {
    const m = e.data;
    if (!m || m.tab === TAB || m.projectId !== current) return;
    if (m.type === 'hello') {
      useTabGuard.setState({ otherTabs: true });
      channel?.postMessage({ type: 'here', projectId: current, tab: TAB } satisfies Msg);
    } else if (m.type === 'here') useTabGuard.setState({ otherTabs: true });
    else if (m.type === 'saved') useTabGuard.setState({ otherTabs: true, staleSavedAt: m.at ?? new Date().toISOString() });
  };
  return channel;
}

export function announceOpen(projectId: string): void {
  current = projectId;
  useTabGuard.getState().reset();
  ensureChannel()?.postMessage({ type: 'hello', projectId, tab: TAB } satisfies Msg);
}

export function announceSaved(projectId: string): void {
  ensureChannel()?.postMessage({ type: 'saved', projectId, tab: TAB, at: new Date().toISOString() } satisfies Msg);
}

export function announceClosed(): void {
  if (current) ensureChannel()?.postMessage({ type: 'closed', projectId: current, tab: TAB } satisfies Msg);
  current = null;
  useTabGuard.getState().reset();
}
