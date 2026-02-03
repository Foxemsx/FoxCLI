/**
 * MyAnimeList API v2 Service
 * 
 * Handles OAuth2 PKCE authentication and API calls to MAL.
 * Requires a Client ID from https://myanimelist.net/apiconfig
 */

// MAL API Configuration
const MAL_CLIENT_ID = ''; // User needs to set this
const MAL_AUTH_URL = 'https://myanimelist.net/v1/oauth2/authorize';
const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';
const MAL_API_BASE = 'https://api.myanimelist.net/v2';

// Token storage keys
const TOKEN_EXPIRY_KEY = 'mal_token_expiry';
const CLIENT_ID_KEY = 'mal_client_id';

export type MALAnimeStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

export interface MALStudio {
  id: number;
  name: string;
}

export interface MALSeason {
  year: number;
  season: 'winter' | 'spring' | 'summer' | 'fall';
}

export interface MALRelatedAnime {
  node: {
    id: number;
    title: string;
    main_picture?: { medium?: string; large?: string };
  };
  relation_type: string;
  relation_type_formatted: string;
}

export interface MALGenre {
  id: number;
  name: string;
}

export interface MALAnimeEntry {
  id: number;
  title: string;
  image: string;
  status: MALAnimeStatus;
  score: number;
  episodes_watched: number;
  total_episodes: number;
  url: string;
  updated_at: string;
  // Extended fields for new features
  studios?: MALStudio[];
  start_season?: MALSeason;
  related_anime?: MALRelatedAnime[];
  genres?: MALGenre[];
  mean_score?: number; // Community average score
}

export interface MALUserStats {
  username: string;
  total_anime: number;
  total_episodes: number;
  days_watched: number;
  mean_score: number;
  watching: number;
  completed: number;
  on_hold: number;
  dropped: number;
  plan_to_watch: number;
}

export interface MALScoreDistribution {
  score: number;
  count: number;
}

// --- PKCE Helpers ---
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- Token Management ---
// These functions use a cache that syncs with persistent storage via IPC

// In-memory cache for credentials (synced from persistent store on load)
let credentialsCache: {
  clientId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  username: string;
  userId: string;
} = {
  clientId: '',
  accessToken: '',
  refreshToken: '',
  tokenExpiry: 0,
  username: '',
  userId: '',
};

let credentialsLoaded = false;

// Load credentials from persistent store (called once on app start)
export async function loadCredentials(): Promise<void> {
  if (credentialsLoaded) return;
  
  try {
    const stored = await window.nexus?.getMalCredentials?.();
    if (stored) {
      credentialsCache = { ...credentialsCache, ...stored };
      // Also sync to localStorage for backward compatibility
      if (stored.clientId) localStorage.setItem(CLIENT_ID_KEY, stored.clientId);
      if (stored.tokenExpiry) localStorage.setItem(TOKEN_EXPIRY_KEY, String(stored.tokenExpiry));
      if (stored.username) localStorage.setItem('mal_username', stored.username);
      if (stored.userId) localStorage.setItem('mal_user_id', stored.userId);
    }
    localStorage.removeItem('mal_access_token');
    localStorage.removeItem('mal_refresh_token');
    credentialsLoaded = true;
    console.log('[MAL] Credentials loaded from persistent store');
  } catch (err) {
    console.error('[MAL] Failed to load credentials:', err);
    credentialsLoaded = true;
  }
}

// Save credentials to both cache and persistent store
async function saveCredentialsToPersistentStore(): Promise<void> {
  try {
    await window.nexus?.setMalCredentials?.(credentialsCache);
  } catch (err) {
    console.error('[MAL] Failed to save credentials:', err);
  }
}

export function getClientId(): string {
  // Check cache first, then localStorage as fallback
  return credentialsCache.clientId || localStorage.getItem(CLIENT_ID_KEY) || MAL_CLIENT_ID;
}

export function setClientId(clientId: string): void {
  credentialsCache.clientId = clientId;
  localStorage.setItem(CLIENT_ID_KEY, clientId);
  saveCredentialsToPersistentStore();
}

export function getAccessToken(): string | null {
  // Get expiry from both cache and localStorage, prefer cache if available
  const cacheExpiry = credentialsCache.tokenExpiry;
  const storageExpiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0');

  // Use the most recent expiry time (higher value = more recent)
  const expiry = cacheExpiry > storageExpiry ? cacheExpiry : storageExpiry;

  if (expiry && Date.now() > expiry) {
    // Token expired - clear both sources to stay in sync
    return null;
  }

  // Get token from both sources, prefer cache if available
  const cacheToken = credentialsCache.accessToken;
  const token = cacheToken;

  // Validate: if we have a token but no valid expiry, treat as expired
  if (token && (!expiry || Date.now() > expiry)) {
    return null;
  }

  return token;
}

export function isAuthenticated(): boolean {
  return !!getAccessToken() && !!getClientId();
}

export function getUsername(): string | null {
  return credentialsCache.username || localStorage.getItem('mal_username');
}

function saveTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
  const tokenExpiry = Date.now() + expiresIn * 1000;
  
  // Update cache
  credentialsCache.accessToken = accessToken;
  credentialsCache.refreshToken = refreshToken;
  credentialsCache.tokenExpiry = tokenExpiry;
  
  // Update localStorage for backward compatibility
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(tokenExpiry));
  localStorage.removeItem('mal_access_token');
  localStorage.removeItem('mal_refresh_token');
  
  // Persist to disk
  saveCredentialsToPersistentStore();
}

export function logout(): void {
  // Clear cache
  credentialsCache = {
    clientId: credentialsCache.clientId, // Keep client ID
    accessToken: '',
    refreshToken: '',
    tokenExpiry: 0,
    username: '',
    userId: '',
  };
  
  // Clear localStorage
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem('mal_username');
  localStorage.removeItem('mal_user_id');
  
  // Update persistent store (keep client ID)
  saveCredentialsToPersistentStore();
}

// --- OAuth2 PKCE Flow ---
let codeVerifier: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export async function startOAuthFlow(): Promise<string> {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('MAL Client ID not configured');
  }

  // Generate PKCE code verifier and challenge
  codeVerifier = generateRandomString(128);
  const state = generateRandomString(32);
  localStorage.setItem('mal_oauth_state', state);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(hashed);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: 'http://localhost:7842/callback',
    state,
  });

  return `${MAL_AUTH_URL}?${params.toString()}`;
}

export async function handleOAuthCallback(code: string, state?: string): Promise<boolean> {
  const clientId = getClientId();
  if (!clientId || !codeVerifier) {
    throw new Error('OAuth flow not initialized');
  }

  if (!state) {
    throw new Error('Missing OAuth state');
  }
  const storedState = localStorage.getItem('mal_oauth_state');
  if (!storedState || storedState !== state) {
    throw new Error('OAuth state mismatch');
  }
  localStorage.removeItem('mal_oauth_state');

  try {
    // Use IPC to proxy token exchange through main process (avoids CORS)
    const data = await window.nexus?.malExchangeToken?.({
      clientId,
      code,
      codeVerifier,
    });

    if (!data) {
      throw new Error('Token exchange failed - no response');
    }

    saveTokens(data.access_token, data.refresh_token, data.expires_in);
    codeVerifier = null;

    // Fetch user info
    await fetchCurrentUser();
    
    return true;
  } catch (err) {
    console.error('[MAL] OAuth callback error:', err);
    codeVerifier = null;
    throw err;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const clientId = getClientId();
  const refreshToken = credentialsCache.refreshToken || '';
  
  if (!clientId || !refreshToken) {
    return false;
  }

  refreshInFlight = (async () => {
    try {
    // Use IPC to proxy through main process (avoids CORS)
    const data = await window.nexus?.malRefreshToken?.({
      clientId,
      refreshToken,
    });

    if (!data) {
      logout();
      return false;
    }

    saveTokens(data.access_token, data.refresh_token, data.expires_in);
    return true;
    } catch (err) {
      console.error('[MAL] Token refresh error:', err);
      logout();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// --- API Helpers ---
async function malFetch(endpoint: string): Promise<any> {
  let token = getAccessToken();
  
  if (!token) {
    // Try to refresh
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw new Error('Not authenticated');
    }
    token = getAccessToken();
  }

  try {
    // Use IPC to proxy through main process (avoids CORS)
    const data = await window.nexus?.malApiRequest?.({
      endpoint,
      accessToken: token!,
    });

    return data;
  } catch (err: any) {
    // If token expired, try refresh once
    if (err.message?.includes('401')) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        token = getAccessToken();
        return await window.nexus?.malApiRequest?.({
          endpoint,
          accessToken: token!,
        });
      }
      throw new Error('Authentication expired');
    }
    throw err;
  }
}

// --- API Methods ---
export async function fetchCurrentUser(): Promise<{ id: number; name: string } | null> {
  try {
    const data = await malFetch('/users/@me');
    if (!data) throw new Error('Failed to fetch user');
    
    // Update cache
    credentialsCache.username = data.name;
    credentialsCache.userId = String(data.id);
    
    // Update localStorage
    localStorage.setItem('mal_username', data.name);
    localStorage.setItem('mal_user_id', String(data.id));
    
    // Persist to disk
    saveCredentialsToPersistentStore();
    
    return { id: data.id, name: data.name };
  } catch (err) {
    console.error('[MAL] Failed to fetch user:', err);
    return null;
  }
}

export async function fetchUserStats(): Promise<MALUserStats | null> {
  try {
    const data = await malFetch('/users/@me?fields=anime_statistics');
    if (!data) throw new Error('Failed to fetch stats');
    
    const stats = data.anime_statistics;
    const username = data.name || getUsername() || 'Unknown';
    
    return {
      username,
      total_anime: stats.num_items || 0,
      total_episodes: stats.num_episodes || 0,
      days_watched: stats.num_days || 0,
      mean_score: stats.mean_score || 0,
      watching: stats.num_items_watching || 0,
      completed: stats.num_items_completed || 0,
      on_hold: stats.num_items_on_hold || 0,
      dropped: stats.num_items_dropped || 0,
      plan_to_watch: stats.num_items_plan_to_watch || 0,
    };
  } catch (err) {
    console.error('[MAL] Failed to fetch stats:', err);
    return null;
  }
}

export async function fetchAnimeList(
  status?: MALAnimeStatus,
  limit: number = 1000,
  includeExtendedFields: boolean = false
): Promise<MALAnimeEntry[]> {
  try {
    // Extended fields for recommendations, studio affinity, seasonal breakdown, and franchise map
    const baseFields = 'list_status,num_episodes,main_picture';
    const extendedFields = 'list_status,num_episodes,main_picture,studios,start_season,related_anime,genres,mean';
    const fields = includeExtendedFields ? extendedFields : baseFields;
    let endpoint = `/users/@me/animelist?fields=${fields}&limit=${Math.min(limit, 1000)}&nsfw=true`;
    
    if (status) {
      endpoint += `&status=${status}`;
    }

    const allEntries: MALAnimeEntry[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const currentEndpoint = offset > 0 ? `${endpoint}&offset=${offset}` : endpoint;
      const data = await malFetch(currentEndpoint);
      
      if (!data || !data.data) {
        break;
      }
      
      for (const item of data.data) {
        const node = item.node;
        const listStatus = item.list_status;
        
        allEntries.push({
          id: node.id,
          title: node.title,
          image: node.main_picture?.large || node.main_picture?.medium || '',
          status: listStatus.status,
          score: listStatus.score || 0,
          episodes_watched: listStatus.num_episodes_watched || 0,
          total_episodes: node.num_episodes || 0,
          url: `https://myanimelist.net/anime/${node.id}`,
          updated_at: listStatus.updated_at,
          // Extended fields
          studios: node.studios || [],
          start_season: node.start_season || undefined,
          related_anime: node.related_anime || [],
          genres: node.genres || [],
          mean_score: node.mean || undefined,
        });
      }

      // Handle pagination
      hasMore = !!data.paging?.next;
      offset += data.data.length;
      
      // Rate limit protection (MAL API needs ~300ms+ between requests)
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 350));
      }
    }

    console.log(`[MAL] Fetched ${allEntries.length} anime entries`);
    return allEntries;
  } catch (err) {
    console.error('[MAL] Failed to fetch anime list:', err);
    return [];
  }
}

export async function fetchScoreDistribution(): Promise<MALScoreDistribution[]> {
  // Fetch all scored anime to build real distribution
  console.log('[MAL] Fetching score distribution...');
  const animeList = await fetchAnimeList();
  console.log('[MAL] Got', animeList.length, 'anime for score distribution');
  
  const distribution: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) {
    distribution[i] = 0;
  }

  let scoredCount = 0;
  for (const anime of animeList) {
    // Ensure score is a valid number between 1-10 before using it as an index
    if (typeof anime.score === 'number' && anime.score > 0 && anime.score <= 10) {
      const scoreKey = anime.score;
      distribution[scoreKey] = (distribution[scoreKey] || 0) + 1;
      scoredCount++;
    }
  }
  console.log('[MAL] Found', scoredCount, 'scored anime');

  return Object.entries(distribution).map(([score, count]) => ({
    score: parseInt(score),
    count,
  }));
}

// --- New Statistics Features ---

export interface StudioAnimeEntry {
  id: number;
  title: string;
  image: string;
  score: number;
  status: MALAnimeStatus;
}

export interface StudioAffinity {
  id: number;
  name: string;
  animeCount: number;
  averageScore: number;
  totalScored: number;
  anime: StudioAnimeEntry[];
}

export interface SeasonAnimeEntry {
  id: number;
  title: string;
  image: string;
  score: number;
  status: MALAnimeStatus;
  episodes_watched: number;
  total_episodes: number;
}

export interface SeasonalStats {
  year: number;
  season: 'winter' | 'spring' | 'summer' | 'fall';
  label: string;
  total: number;
  completed: number;
  completionRate: number;
  averageScore: number;
  anime: SeasonAnimeEntry[];
}

export interface FranchiseNode {
  id: number;
  title: string;
  image: string;
  status: MALAnimeStatus;
  score: number;
  relations: { targetId: number; type: string }[];
}

export interface RecommendationResult {
  id: number;
  title: string;
  image: string;
  mean_score: number;
  genres: MALGenre[];
  compatibility: number; // 0-100%
  reason: string;
}

// Fetch extended anime list with all fields for advanced stats
export async function fetchExtendedAnimeList(): Promise<MALAnimeEntry[]> {
  return fetchAnimeList(undefined, 1000, true);
}

// Calculate studio affinity scores
export async function fetchStudioAffinity(): Promise<StudioAffinity[]> {
  console.log('[MAL] Calculating studio affinity...');
  const animeList = await fetchExtendedAnimeList();
  
  const studioStats = new Map<number, { 
    name: string; 
    scores: number[]; 
    count: number;
    anime: StudioAnimeEntry[];
  }>();
  
  for (const anime of animeList) {
    if (!anime.studios || anime.studios.length === 0) continue;
    
    for (const studio of anime.studios) {
      const existing = studioStats.get(studio.id) || { 
        name: studio.name, 
        scores: [], 
        count: 0,
        anime: []
      };
      existing.count++;
      existing.anime.push({
        id: anime.id,
        title: anime.title,
        image: anime.image,
        score: anime.score,
        status: anime.status,
      });
      if (anime.score > 0) {
        existing.scores.push(anime.score);
      }
      studioStats.set(studio.id, existing);
    }
  }
  
  const results: StudioAffinity[] = [];
  for (const [id, data] of studioStats) {
    const avgScore = data.scores.length > 0 
      ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length 
      : 0;
    // Sort anime by score descending
    const sortedAnime = data.anime.sort((a, b) => b.score - a.score);
    results.push({
      id,
      name: data.name,
      animeCount: data.count,
      averageScore: Math.round(avgScore * 100) / 100,
      totalScored: data.scores.length,
      anime: sortedAnime,
    });
  }
  
  // Sort by average score (descending), then by count
  return results
    .filter(s => s.totalScored >= 2) // Need at least 2 scored anime
    .sort((a, b) => b.averageScore - a.averageScore || b.animeCount - a.animeCount);
}

// Calculate seasonal breakdown
export async function fetchSeasonalBreakdown(): Promise<SeasonalStats[]> {
  console.log('[MAL] Calculating seasonal breakdown...');
  const animeList = await fetchExtendedAnimeList();
  
  const seasonOrder = ['winter', 'spring', 'summer', 'fall'];
  const seasonLabels: Record<string, string> = {
    winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall'
  };
  
  const seasonStats = new Map<string, { 
    year: number; 
    season: 'winter' | 'spring' | 'summer' | 'fall';
    entries: MALAnimeEntry[] 
  }>();
  
  for (const anime of animeList) {
    if (!anime.start_season) continue;
    
    const key = `${anime.start_season.year}-${anime.start_season.season}`;
    const existing = seasonStats.get(key) || { 
      year: anime.start_season.year, 
      season: anime.start_season.season, 
      entries: [] 
    };
    existing.entries.push(anime);
    seasonStats.set(key, existing);
  }
  
  const results: SeasonalStats[] = [];
  for (const [_, data] of seasonStats) {
    const completed = data.entries.filter(e => e.status === 'completed').length;
    const scored = data.entries.filter(e => e.score > 0);
    const avgScore = scored.length > 0 
      ? scored.reduce((sum, e) => sum + e.score, 0) / scored.length 
      : 0;
    
    // Convert entries to SeasonAnimeEntry and sort by score
    const animeEntries: SeasonAnimeEntry[] = data.entries
      .map(e => ({
        id: e.id,
        title: e.title,
        image: e.image,
        score: e.score,
        status: e.status,
        episodes_watched: e.episodes_watched,
        total_episodes: e.total_episodes,
      }))
      .sort((a, b) => b.score - a.score);
    
    results.push({
      year: data.year,
      season: data.season,
      label: `${seasonLabels[data.season]} ${data.year}`,
      total: data.entries.length,
      completed,
      completionRate: Math.round((completed / data.entries.length) * 100),
      averageScore: Math.round(avgScore * 100) / 100,
      anime: animeEntries,
    });
  }
  
  // Sort by year (desc) then season order (desc)
  return results.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return seasonOrder.indexOf(b.season) - seasonOrder.indexOf(a.season);
  });
}

// Build franchise map data
export async function fetchFranchiseMap(): Promise<FranchiseNode[]> {
  console.log('[MAL] Building franchise map...');
  const animeList = await fetchExtendedAnimeList();
  
  // Build a set of anime IDs the user has
  const userAnimeIds = new Set(animeList.map(a => a.id));
  
  const nodes: FranchiseNode[] = [];
  
  for (const anime of animeList) {
    const relations: { targetId: number; type: string }[] = [];
    
    if (anime.related_anime) {
      for (const rel of anime.related_anime) {
        // Only include relations to anime the user also has
        if (userAnimeIds.has(rel.node.id)) {
          relations.push({
            targetId: rel.node.id,
            type: rel.relation_type_formatted || rel.relation_type,
          });
        }
      }
    }
    
    // Only include anime that have relations to other anime in the user's list
    if (relations.length > 0) {
      nodes.push({
        id: anime.id,
        title: anime.title,
        image: anime.image,
        status: anime.status,
        score: anime.score,
        relations,
      });
    }
  }
  
  console.log(`[MAL] Found ${nodes.length} anime with franchise relations`);
  return nodes;
}

// Generate smart recommendations based on user's watch history
export async function fetchRecommendations(): Promise<RecommendationResult[]> {
  console.log('[MAL] Generating recommendations...');
  const animeList = await fetchExtendedAnimeList();
  
  // Analyze user preferences
  const genreScores = new Map<number, { name: string; totalScore: number; count: number }>();
  const studioScores = new Map<number, { name: string; totalScore: number; count: number }>();
  
  const scoredAnime = animeList.filter(a => a.score >= 7); // Only consider anime rated 7+
  
  for (const anime of scoredAnime) {
    // Track genre preferences
    if (anime.genres) {
      for (const genre of anime.genres) {
        const existing = genreScores.get(genre.id) || { name: genre.name, totalScore: 0, count: 0 };
        existing.totalScore += anime.score;
        existing.count++;
        genreScores.set(genre.id, existing);
      }
    }
    
    // Track studio preferences
    if (anime.studios) {
      for (const studio of anime.studios) {
        const existing = studioScores.get(studio.id) || { name: studio.name, totalScore: 0, count: 0 };
        existing.totalScore += anime.score;
        existing.count++;
        studioScores.set(studio.id, existing);
      }
    }
  }
  
  // Find "plan to watch" anime and calculate compatibility
  const ptw = animeList.filter(a => a.status === 'plan_to_watch');
  const recommendations: RecommendationResult[] = [];
  
  for (const anime of ptw) {
    let compatibilityScore = 0;
    let reasons: string[] = [];
    
    // Genre matching (weighted by user's preference strength)
    if (anime.genres) {
      for (const genre of anime.genres) {
        const pref = genreScores.get(genre.id);
        if (pref && pref.count >= 2) {
          const avgScore = pref.totalScore / pref.count;
          compatibilityScore += (avgScore / 10) * 15; // Up to 15 points per matching genre
          if (avgScore >= 8) {
            reasons.push(`You love ${genre.name}`);
          }
        }
      }
    }
    
    // Studio matching
    if (anime.studios) {
      for (const studio of anime.studios) {
        const pref = studioScores.get(studio.id);
        if (pref && pref.count >= 2) {
          const avgScore = pref.totalScore / pref.count;
          compatibilityScore += (avgScore / 10) * 20; // Up to 20 points per matching studio
          if (avgScore >= 8) {
            reasons.push(`${studio.name} (${pref.count} watched)`);
          }
        }
      }
    }
    
    // Boost for high MAL scores
    if (anime.mean_score && anime.mean_score >= 8) {
      compatibilityScore += 10;
    }
    
    // Normalize to 0-100
    const compatibility = Math.min(100, Math.round(compatibilityScore));
    
    if (compatibility > 30) { // Only include if some compatibility
      recommendations.push({
        id: anime.id,
        title: anime.title,
        image: anime.image,
        mean_score: anime.mean_score || 0,
        genres: anime.genres || [],
        compatibility,
        reason: reasons.slice(0, 2).join(' • ') || 'In your plan to watch',
      });
    }
  }
  
  // Sort by compatibility score
  return recommendations.sort((a, b) => b.compatibility - a.compatibility).slice(0, 10);
}

// --- Public API Search (uses authenticated endpoint through IPC) ---
export async function searchAnime(query: string): Promise<any[]> {
  try {
    const data = await malFetch(`/anime?q=${encodeURIComponent(query)}&limit=10&fields=main_picture,num_episodes`);
    return data?.data || [];
  } catch (err) {
    console.error('[MAL] Search failed:', err);
    return [];
  }
}

export async function getAnimeById(id: number): Promise<any | null> {
  try {
    const data = await malFetch(`/anime/${id}?fields=title,main_picture,num_episodes,synopsis,mean,rank,studios,genres,start_season,status,my_list_status`);
    return data || null;
  } catch (err) {
    console.error('[MAL] Get anime failed:', err);
    return null;
  }
}

export interface StudioCompletionData {
  studioId: number;
  studioName: string;
  totalAnime: number;
  completed: number;
  watching: number;
  dropped: number;
  completionRate: number; // percentage 0-100
  anime: { id: number; title: string; image: string; status: MALAnimeStatus }[];
}

export async function fetchAnimeStudios(): Promise<StudioCompletionData[]> {
  console.log('[MAL] Calculating studio completion rates...');
  const animeList = await fetchExtendedAnimeList();

  const studioMap = new Map<number, StudioCompletionData>();

  for (const anime of animeList) {
    if (!anime.studios || anime.studios.length === 0) continue;

    for (const studio of anime.studios) {
      if (!studioMap.has(studio.id)) {
        studioMap.set(studio.id, {
          studioId: studio.id,
          studioName: studio.name,
          totalAnime: 0,
          completed: 0,
          watching: 0,
          dropped: 0,
          completionRate: 0,
          anime: []
        });
      }

      const data = studioMap.get(studio.id)!;
      data.totalAnime++;
      if (anime.status === 'completed') data.completed++;
      if (anime.status === 'watching') data.watching++;
      if (anime.status === 'dropped') data.dropped++;
      
      data.anime.push({
        id: anime.id,
        title: anime.title,
        image: anime.image,
        status: anime.status
      });
    }
  }

  const results = Array.from(studioMap.values()).map(data => {
    data.completionRate = data.totalAnime > 0 ? Math.round((data.completed / data.totalAnime) * 100) : 0;
    return data;
  });

  // Filter for relevance (e.g., at least 3 anime) and sort by completion rate
  return results
    .filter(s => s.totalAnime >= 3)
    .sort((a, b) => b.completionRate - a.completionRate || b.totalAnime - a.totalAnime);
}

export interface AnimeRelation {
  id: number;
  title: string;
  type: string;
  relation: string;
}

export async function fetchAnimeRelations(animeId: number): Promise<AnimeRelation[]> {
  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/relations`);
    if (!response.ok) throw new Error('Failed to fetch relations');
    
    const data = await response.json();
    const relations: AnimeRelation[] = [];
    
    if (data.data) {
      for (const group of data.data) {
        for (const entry of group.entry) {
          if (entry.type === 'anime') {
            relations.push({
              id: entry.mal_id,
              title: entry.name,
              type: entry.type,
              relation: group.relation,
            });
          }
        }
      }
    }
    return relations;
  } catch (err) {
    console.error('[MAL] Failed to fetch relations:', err);
    return [];
  }
}
