export type RpcActivity = {
  anime?: string;
  episode?: string;
  state?: 'playing' | 'paused';
  updatedAt?: number;
  currentTime?: number;
  duration?: number;
  title?: string;
  image?: string;
  season?: string;
};

export type RpcStatus = {
  discordConnected: boolean;
  extensionConnected: boolean;
  rpcPaused: boolean;
  activity?: RpcActivity;
  universalRpcEnabled?: boolean;
  steamGameRunning?: boolean;
  steamGameName?: string;
  wss?: {
    port: number;
    host: string;
    token: string;
  };
};

export type AppSettings = {
  closeToTray: boolean;
  startMinimized: boolean;
  autoLaunch: boolean;
  showNotifications: boolean;
  rpcPaused: boolean;
  wssAuthToken: string;
  // Steam & Sales settings
  steamApiKey: string;
  steamId: string;
  ggDealsApiKey: string;
  ggDealsRegion: string;
  // Website settings
  websiteEnabled: boolean;
  websiteApiPort: number;
  websiteDisplayName: string;
  websiteBio: string;
  websiteAvatar: string;
  websiteDiscord: string;
  websiteTwitter: string;
  websiteMal: string;
  websiteGithub: string;
  websiteShowAnimeStats: boolean;
  websiteShowGamingStats: boolean;
  websiteShowTierList: boolean;
  websiteShowTop10: boolean;
  // Universal RPC settings
  universalRpcEnabled: boolean;
  universalRpcText: string;
  universalRpcButtonLabel: string;
  universalRpcButtonUrl: string;
  // Steam detection settings
  steamDetectionEnabled: boolean;
};

export type MalCredentials = {
  clientId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  username: string;
  userId: string;
};

declare global {
  interface Window {
    nexus?: {
      getStatus: () => Promise<RpcStatus>;
      onStatus: (callback: (status: RpcStatus) => void) => () => void;
      minimize?: () => void;
      maximize?: () => void;
      close?: () => void;
      // Settings
      getSettings?: () => Promise<AppSettings>;
      setSetting?: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<boolean>;
      setSettings?: (settings: Partial<AppSettings>) => Promise<boolean>;
      showWindow?: () => void;
      // RPC Pause control
      getRpcPaused?: () => Promise<boolean>;
      setRpcPaused?: (paused: boolean) => Promise<boolean>;
      // Memory profiler
      getMemoryUsage?: () => Promise<{ heapUsed: number; heapTotal: number; external: number; rss: number; arrayBuffers: number }>;
      // MAL OAuth
      malStartOAuth?: (authUrl: string) => Promise<boolean>;
      malOpenExternal?: (url: string) => Promise<boolean>;
      malExchangeToken?: (params: { clientId: string; code: string; codeVerifier: string }) => Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
      malRefreshToken?: (params: { clientId: string; refreshToken: string }) => Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
      malApiRequest?: (params: { endpoint: string; accessToken: string }) => Promise<any>;
      onMalOAuthCode?: (callback: (payload: { code: string; state?: string }) => void) => () => void;
      onMalOAuthError?: (callback: (error: string) => void) => () => void;
      // MAL Credentials (persisted to disk)
      getMalCredentials?: () => Promise<MalCredentials>;
      setMalCredentials?: (credentials: Partial<MalCredentials>) => Promise<boolean>;
      clearMalCredentials?: () => Promise<boolean>;
      // Generic URL fetch
      fetchUrl?: (url: string) => Promise<any>;
      // GG.deals API for keyshop prices
      getGGDealsPrice?: (params: { steamAppIds: number[] }) => Promise<{
        success: boolean;
        data: Record<string, {
          title: string;
          url: string;
          prices: {
            currentRetail: string | null;
            currentKeyshops: string | null;
            historicalRetail: string | null;
            historicalKeyshops: string | null;
            currency: string;
          };
        } | null>;
        error?: string;
      }>;  
      // Get installed Steam games
      getInstalledSteamGames?: () => Promise<number[]>;
      getSteamDiskInfo?: () => Promise<{
        drives: { drive: string; freeBytes: number; totalBytes: number }[];
        libraries: { drive: string; libraryPath: string; games: { appId: number; installDir?: string; sizeOnDiskBytes?: number }[] }[];
        updatedAt: number;
        error?: boolean;
        message?: string;
      }>;
      // Open external URL
      openExternal?: (url: string) => Promise<boolean>;
      // Website data export
      exportWebsiteData?: () => Promise<any>;
      getWebsiteData?: () => Promise<any>;
      // Tier list management
      saveTierLists?: (data: any) => Promise<boolean>;
      loadTierLists?: () => Promise<any>;
      clearTierLists?: () => Promise<boolean>;
      // Website API server control
      startWebsiteServer?: () => Promise<boolean>;
      stopWebsiteServer?: () => Promise<boolean>;
      getWebsiteServerStatus?: () => Promise<{ running: boolean; port: number }>;
      // Steam game detection
      getSteamGameStatus?: () => Promise<{ running: boolean; gameName?: string }>;
      onSteamGameStatus?: (callback: (status: { running: boolean; gameName?: string }) => void) => () => void;
      // Universal RPC control
      getUniversalRpcEnabled?: () => Promise<boolean>;
      setUniversalRpcEnabled?: (enabled: boolean) => Promise<boolean>;
    };
  }
}
