/**
 * Object-URL cache for binary assets stored in IndexedDB. Images are kept
 * as Blobs and exposed to <image> elements via object URLs — never inflated
 * into base64 strings during normal use.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { getAsset } from '../persistence/projectRepo';

interface AssetUrlState {
  urls: Record<string, string>;
  failed: Record<string, true>;
  ensure(id: string): void;
  register(id: string, blob: Blob): string;
  clear(): void;
}

const pending = new Set<string>();

export const useAssetUrls = create<AssetUrlState>()((set, get) => ({
  urls: {},
  failed: {},
  ensure(id) {
    if (get().urls[id] || get().failed[id] || pending.has(id)) return;
    pending.add(id);
    getAsset(id)
      .then((a) => {
        if (a) set({ urls: { ...get().urls, [id]: URL.createObjectURL(a.blob) } });
        else set({ failed: { ...get().failed, [id]: true } });
      })
      .catch(() => set({ failed: { ...get().failed, [id]: true } }))
      .finally(() => pending.delete(id));
  },
  register(id, blob) {
    const url = URL.createObjectURL(blob);
    set({ urls: { ...get().urls, [id]: url } });
    return url;
  },
  clear() {
    for (const url of Object.values(get().urls)) URL.revokeObjectURL(url);
    set({ urls: {}, failed: {} });
  },
}));

export function useAssetUrl(id: string | null | undefined): string | undefined {
  const url = useAssetUrls((s) => (id ? s.urls[id] : undefined));
  const ensure = useAssetUrls((s) => s.ensure);
  useEffect(() => {
    if (id && !url) ensure(id);
  }, [id, url, ensure]);
  return url;
}
