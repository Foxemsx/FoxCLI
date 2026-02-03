/**
 * Tier List Persistence Service
 * 
 * Provides a unified API for saving/loading tier lists that works across
 * both the renderer process (localStorage) and main process (file system).
 */

export interface TierAnime {
  id: number;
  title: string;
  image: string;
  score: number;
  status: string;
}

export type TierName = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface TierData {
  name: TierName;
  color: string;
  items: TierAnime[];
}

export interface TierListData {
  sfTiers: TierData[];
  top10: TierAnime[];
  lastUpdated: string;
}

const SF_TIERLIST_KEY = 'foxcli-sf-tierlist';
const TOP10_STORAGE_KEY = 'foxcli-anime-tierlist';

/**
 * Save tier lists to both localStorage (for renderer) and persistent storage (for main process)
 */
export async function saveTierLists(sfTiers: TierData[], top10: TierAnime[]): Promise<void> {
  const data: TierListData = {
    sfTiers,
    top10,
    lastUpdated: new Date().toISOString(),
  };

  // Save to localStorage (for immediate renderer access)
  try {
    localStorage.setItem(SF_TIERLIST_KEY, JSON.stringify(sfTiers));
    localStorage.setItem(TOP10_STORAGE_KEY, JSON.stringify(top10));
  } catch (err) {
    console.error('[TierListStore] Failed to save to localStorage:', err);
  }

  // Save to persistent file (for main process / website export)
  try {
    if (window.nexus?.saveTierLists) {
      await window.nexus.saveTierLists(data);
      console.log('[TierListStore] Saved tier lists to persistent storage');
    }
  } catch (err) {
    console.error('[TierListStore] Failed to save to persistent storage:', err);
  }
}

/**
 * Load tier lists from localStorage
 */
export function loadTierLists(): { sfTiers: TierData[] | null; top10: TierAnime[] | null } {
  try {
    const sfTiersRaw = localStorage.getItem(SF_TIERLIST_KEY);
    const top10Raw = localStorage.getItem(TOP10_STORAGE_KEY);

    return {
      sfTiers: sfTiersRaw ? JSON.parse(sfTiersRaw) : null,
      top10: top10Raw ? JSON.parse(top10Raw) : null,
    };
  } catch (err) {
    console.error('[TierListStore] Failed to load tier lists:', err);
    return { sfTiers: null, top10: null };
  }
}

/**
 * Clear all tier list data
 */
export async function clearTierLists(): Promise<void> {
  try {
    localStorage.removeItem(SF_TIERLIST_KEY);
    localStorage.removeItem(TOP10_STORAGE_KEY);

    if (window.nexus?.clearTierLists) {
      await window.nexus.clearTierLists();
    }
  } catch (err) {
    console.error('[TierListStore] Failed to clear tier lists:', err);
  }
}