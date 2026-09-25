/**
 * Global plant database state: loads bundled reference datasets and the
 * user's own plants, and keeps favourites and recently used plants.
 */
import { create } from 'zustand';
import { BUNDLED_DATASETS, fetchDataset, PlantCatalog } from '../plants/catalog';
import type { Plant } from '../plants/schema';
import { getDb } from '../persistence/db';
import { kvGet, kvSet } from '../persistence/projectRepo';

interface PlantState {
  catalog: PlantCatalog;
  /** Incremented whenever the catalog content changes (memo key). */
  version: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  favourites: Set<string>;
  recents: string[];
  load(): Promise<void>;
  toggleFavourite(id: string): void;
  touchRecent(id: string): void;
  saveUserPlant(p: Plant): Promise<void>;
  deleteUserPlant(id: string): Promise<void>;
}

const RECENT_LIMIT = 20;

export const usePlants = create<PlantState>()((set, get) => ({
  catalog: new PlantCatalog(),
  version: 0,
  status: 'idle',
  error: null,
  favourites: new Set(),
  recents: [],

  async load() {
    if (get().status === 'loading' || get().status === 'ready') return;
    set({ status: 'loading' });
    const catalog = new PlantCatalog();
    const errors: string[] = [];
    for (const url of BUNDLED_DATASETS) {
      try {
        catalog.addDataset(await fetchDataset(url), 'bundled');
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    try {
      catalog.addUserPlants(await getDb().userPlants.toArray());
    } catch (e) {
      errors.push(`Could not read your plants: ${e instanceof Error ? e.message : String(e)}`);
    }
    const favourites = new Set(await kvGet<string[]>('favourites', []));
    const recents = await kvGet<string[]>('recentPlants', []);
    set({
      catalog,
      version: get().version + 1,
      status: catalog.plants.size ? 'ready' : 'error',
      error: errors.length ? errors.join(' ') : null,
      favourites,
      recents,
    });
    // Build the search index when the browser is idle.
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
    idle(() => catalog.warmIndex());
  },

  toggleFavourite(id) {
    const favourites = new Set(get().favourites);
    if (favourites.has(id)) favourites.delete(id);
    else favourites.add(id);
    set({ favourites });
    void kvSet('favourites', [...favourites]);
  },

  touchRecent(id) {
    const recents = [id, ...get().recents.filter((r) => r !== id)].slice(0, RECENT_LIMIT);
    set({ recents });
    void kvSet('recentPlants', recents);
  },

  async saveUserPlant(p) {
    await getDb().userPlants.put(p);
    get().catalog.upsertUserPlant(p);
    set({ version: get().version + 1 });
  },

  async deleteUserPlant(id) {
    await getDb().userPlants.delete(id);
    get().catalog.removePlant(id);
    set({ version: get().version + 1 });
  },
}));
