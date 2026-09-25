import { useSyncExternalStore } from 'react';

/**
 * Phone layout: narrow screens, or a phone held sideways (short and touch).
 * Keep in sync with the `compact` media query in styles.css.
 */
export const COMPACT_QUERY = '(max-width: 900px), (max-height: 500px) and (pointer: coarse)';

function subscribe(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(COMPACT_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export function isCompact(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(COMPACT_QUERY).matches;
}

export function useCompact(): boolean {
  return useSyncExternalStore(subscribe, isCompact, () => false);
}

const COARSE_QUERY = '(pointer: coarse)';

function subscribeCoarse(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(COARSE_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** Touch is the primary input (phones, tablets). */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribeCoarse,
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(COARSE_QUERY).matches,
    () => false,
  );
}
