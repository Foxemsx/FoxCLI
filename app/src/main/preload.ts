import { contextBridge, ipcRenderer } from 'electron';

console.log('[FoxCLI] Preload script running');

contextBridge.exposeInMainWorld('nexus', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  onStatus: (callback: (status: any) => void) => {
    const listener = (_: unknown, status: unknown) => callback(status);
    ipcRenderer.on('rpc-status', listener);
    return () => ipcRenderer.removeListener('rpc-status', listener);
  },
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('set-setting', key, value),
  setSettings: (settings: Record<string, any>) => ipcRenderer.invoke('set-settings', settings),
  showWindow: () => ipcRenderer.send('show-window'),
  
  // RPC Pause control
  getRpcPaused: () => ipcRenderer.invoke('get-rpc-paused'),
  setRpcPaused: (paused: boolean) => ipcRenderer.invoke('set-rpc-paused', paused),
  
  // Memory profiler
  getMemoryUsage: () => ipcRenderer.invoke('get-memory-usage'),
  
  // MAL OAuth
  malStartOAuth: (authUrl: string) => ipcRenderer.invoke('mal-start-oauth', authUrl),
  malOpenExternal: (url: string) => ipcRenderer.invoke('mal-open-external', url),
  malExchangeToken: (params: { clientId: string; code: string; codeVerifier: string }) => 
    ipcRenderer.invoke('mal-exchange-token', params),
  malRefreshToken: (params: { clientId: string; refreshToken: string }) => 
    ipcRenderer.invoke('mal-refresh-token', params),
  malApiRequest: (params: { endpoint: string; accessToken: string }) => 
    ipcRenderer.invoke('mal-api-request', params),
  onMalOAuthCode: (callback: (payload: { code: string; state?: string }) => void) => {
    const listener = (_: unknown, payload: { code: string; state?: string }) => callback(payload);
    ipcRenderer.on('mal-oauth-code', listener);
    return () => ipcRenderer.removeListener('mal-oauth-code', listener);
  },
  onMalOAuthError: (callback: (error: string) => void) => {
    const listener = (_: unknown, error: string) => callback(error);
    ipcRenderer.on('mal-oauth-error', listener);
    return () => ipcRenderer.removeListener('mal-oauth-error', listener);
  },
  
  // MAL Credentials (persisted to disk - survives restarts)
  getMalCredentials: () => ipcRenderer.invoke('get-mal-credentials'),
  setMalCredentials: (credentials: Record<string, any>) => ipcRenderer.invoke('set-mal-credentials', credentials),
  clearMalCredentials: () => ipcRenderer.invoke('clear-mal-credentials'),
  
  // Generic URL fetch (bypasses CORS)
  fetchUrl: (url: string) => ipcRenderer.invoke('fetch-url', url),

  // GG.deals API for keyshop prices
  getGGDealsPrice: (params: { steamAppIds: number[] }) =>
    ipcRenderer.invoke('get-ggdeals-price', params),
  
  // Get installed Steam games (scans Steam folders)
  getInstalledSteamGames: () => ipcRenderer.invoke('get-installed-steam-games'),

  getSteamDiskInfo: () => ipcRenderer.invoke('get-steam-disk-info'),
  
  // Open external URL (for Steam protocol, etc)
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Website data export
  exportWebsiteData: () => ipcRenderer.invoke('export-website-data'),
  getWebsiteData: () => ipcRenderer.invoke('get-website-data'),

  // Tier list management
  saveTierLists: (data: any) => ipcRenderer.invoke('save-tier-lists', data),
  loadTierLists: () => ipcRenderer.invoke('load-tier-lists'),
  clearTierLists: () => ipcRenderer.invoke('clear-tier-lists'),

  // Website API server control
  startWebsiteServer: () => ipcRenderer.invoke('start-website-server'),
  stopWebsiteServer: () => ipcRenderer.invoke('stop-website-server'),
  getWebsiteServerStatus: () => ipcRenderer.invoke('get-website-server-status'),
  
  // Steam game detection
  getSteamGameStatus: () => ipcRenderer.invoke('get-steam-game-status'),
  onSteamGameStatus: (callback: (status: { running: boolean; gameName?: string }) => void) => {
    const listener = (_: unknown, status: unknown) => callback(status as { running: boolean; gameName?: string });
    ipcRenderer.on('steam-game-status', listener);
    return () => ipcRenderer.removeListener('steam-game-status', listener);
  },
  
  // Universal RPC control
  getUniversalRpcEnabled: () => ipcRenderer.invoke('get-universal-rpc-enabled'),
  setUniversalRpcEnabled: (enabled: boolean) => ipcRenderer.invoke('set-universal-rpc-enabled', enabled),
});
