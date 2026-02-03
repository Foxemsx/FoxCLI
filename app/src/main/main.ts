import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, Notification } from 'electron';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { execFile } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as http from 'node:http';
import * as dns from 'node:dns/promises';
import * as net from 'node:net';
import { promisify } from 'node:util';
import RPC from 'discord-rpc';
import { settingsStore, malCredentialsStore, websiteSettingsStore, type AppSettings, type MalCredentials } from './store';
import { startApiServer, stopApiServer, setNowWatchingStateGetter } from './apiServer';
import { collectWebsiteData } from './dataExporter';

const execFileAsync = promisify(execFile);

/**
 * Safe command execution with input validation.
 * Only allows specific safe commands (powershell, cmd) with validation.
 */
async function safeExecFile(command: string, args?: string[], options?: any): Promise<{ stdout: Buffer; stderr: Buffer }> {
  // Whitelist of allowed commands
  const allowedCommands = ['powershell.exe', 'cmd.exe', 'powershell', 'cmd'];

  // Validate command
  const normalizedCmd = command.toLowerCase().trim();
  if (!allowedCommands.includes(normalizedCmd)) {
    throw new Error(`Command not allowed: ${command}. Only PowerShell and CMD are permitted.`);
  }

  const allowedArgs: string[] | undefined = options?.allowedArgs;

  // Validate args - reject dangerous characters and non-ASCII control chars
  if (args) {
    if (allowedArgs) {
      const matches = args.length === allowedArgs.length && args.every((arg, index) => arg === allowedArgs[index]);
      if (!matches) {
        throw new Error('Arguments do not match allowlist');
      }
    } else {
      const dangerousPatterns = /[;&|`$(){}[\]\\]/;
      for (const arg of args) {
        if (dangerousPatterns.test(arg) || /\p{C}/u.test(arg)) {
          throw new Error(`Potentially dangerous argument detected: ${arg}`);
        }
      }
    }
  }

  const execOptions = options ? { ...options } : undefined;
  if (execOptions && 'allowUnsafeArgs' in execOptions) {
    delete (execOptions as { allowUnsafeArgs?: boolean }).allowUnsafeArgs;
  }
  if (execOptions && 'allowedArgs' in execOptions) {
    delete (execOptions as { allowedArgs?: string[] }).allowedArgs;
  }

  return execFileAsync(command, args, execOptions);
}

// OAuth callback server
let oauthServer: http.Server | null = null;
const OAUTH_PORT = 7842;
let oauthState: string | null = null;

// Website API server
let apiServerRunning = false;

// Discord Client ID - can be overridden via environment variable
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1462140758181023936';
// Universal RPC Client ID - separate app for idle/chilling status
const UNIVERSAL_RPC_CLIENT_ID = '1467602990356762921';

// WebSocket server ports - must match extension/config.js WSS_PORTS
const WSS_PORTS = [3000, 3210];
let activeWssPort = WSS_PORTS[0];
const WSS_BIND_HOST = '127.0.0.1';
const API_BIND_HOST = '127.0.0.1';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const ALLOWED_STEAM_PROTOCOL_HOSTS = new Set(['run', 'rungameid', 'open', 'install']);
const ALLOWED_FETCH_HOSTS = new Set([
  'api.steampowered.com',
  'store.steampowered.com',
  'cdn.cloudflare.steamstatic.com',
  'www.cheapshark.com',
  'api.gg.deals',
  'www.eneba.com',
  'eneba.com',
  'loaded.com',
  'www.loaded.com'
]);
const MAX_FETCH_BYTES = 1_000_000;
const MAX_IPC_PAYLOAD_BYTES = 64 * 1024;

const ipv4ToInt = (ip: string): number | null => {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
};

const isPrivateIpv4 = (ip: string): boolean => {
  const value = ipv4ToInt(ip);
  if (value === null) return false;
  const inRange = (start: string, end: string) => {
    const startVal = ipv4ToInt(start);
    const endVal = ipv4ToInt(end);
    if (startVal === null || endVal === null) return false;
    return value >= startVal && value <= endVal;
  };
  return (
    inRange('0.0.0.0', '0.255.255.255') ||
    inRange('10.0.0.0', '10.255.255.255') ||
    inRange('100.64.0.0', '100.127.255.255') ||
    inRange('127.0.0.0', '127.255.255.255') ||
    inRange('169.254.0.0', '169.254.255.255') ||
    inRange('172.16.0.0', '172.31.255.255') ||
    inRange('192.168.0.0', '192.168.255.255')
  );
};

const isPrivateIpv6 = (ip: string): boolean => {
  const normalized = ip.toLowerCase();
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80')) return true;
  if (normalized.startsWith('::ffff:')) {
    return isPrivateIpv4(normalized.replace('::ffff:', ''));
  }
  return false;
};

const isPrivateIp = (ip: string): boolean => {
  const type = net.isIP(ip);
  if (type === 4) return isPrivateIpv4(ip);
  if (type === 6) return isPrivateIpv6(ip);
  return false;
};

const ensurePublicHost = async (hostname: string): Promise<void> => {
  const results = await dns.lookup(hostname, { all: true });
  if (!results.length) {
    throw new Error('Host resolution failed');
  }
  for (const result of results) {
    if (isPrivateIp(result.address)) {
      throw new Error('Blocked private address');
    }
  }
};
const getWssAuthToken = (): string => {
  const envToken = process.env.FOXCLI_WSS_AUTH_TOKEN || '';
  let token = settingsStore.get('wssAuthToken');
  if (!token && envToken) {
    token = envToken;
    settingsStore.set('wssAuthToken', token);
  }
  if (!token || token.length < 32) {
    token = crypto.randomBytes(32).toString('hex');
    settingsStore.set('wssAuthToken', token);
  }
  return token;
};

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let trayUpdateInterval: NodeJS.Timeout | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let rpcClient: any | null = null;
let rpcReady = false;
let rpcPaused = false; // RPC pause state - loaded from store on startup
let extensionConnected = false;
let lastPayload: PresencePayload | null = null;
let clearTimeoutId: NodeJS.Timeout | null = null;
const connectedClients = new Set<WebSocket>();

// Cache for Anime Data (Slug -> Data)
const animeCache = new Map<string, AnimeData>();
const ANIME_CACHE_MAX = 200;

// Steam detection state
let steamGameRunning = false;
let steamGameName: string | null = null;
let steamCheckInterval: NodeJS.Timeout | null = null;

// Universal RPC state
let universalRpcEnabled = false;
// Separate RPC client for Universal mode
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let universalRpcClient: any | null = null;
let universalRpcReady = false;

// Fox icon as base64 PNG (32x32) - fallback for tray
const FOX_ICON_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAADzklEQVRYhb2XW2wUVRjHf2d2Z3a73W5LobSlQChQtFxaQAggGhVFjRoTjUaNxsTERI2JDxofTPTBxEdjfPDBJ+ODxkTjJSYaL/GCGC9REYKCFChQKAXaLXS73e7szJyLD7Ozy9Jud4vxn0wye+Y73/n/z3e+c2YE/3NZP0cA/zYnBGzr6iY/6fJy31XqU+mcBLN8wVAyIQbhRwDfAJ8BwaJEEmOw5dAFaLjCDxB6gP3Ad0A/0I9xkxIqAojhyU3NLvdddWnpDwgDwx8A/cBJQGPwzUQB4K2aWXx0cSjx9sohk/7T3fLZw6EtIqvtEQbewjHsDoLQE4QeiTy1J3LW3PClFl/4gGMY9P1B9P2O4cjbe6sUAG8LJMoChIYvwB5A0HX8Qez9E+Hoe2tKALyloCwrAOBJIFkWIFQC2APo64sEARwFJMtLJcEwewPY2xd1fYnI/G/2ljQB4C2hZCLbJihdBwDPAtGKAEKlALJtAQ8vJPJuT8V2H8xILpsMYpUtFu8lArQBQ4AWQJYAMIRfAx8AR4H+IkRlV6DhJv/HzUmHp48HvIr9x2siJ0sF0dXWi4+lAMjnLxDPJjj0RIw2uxXPdqNnnxlgbVLXdAG/d0WD4Xd6osLrPxoWp4nNjWHTbYNSwlQpSgVBrgG0yASL17h2ILTAq/V79g3LvX/3yJ54VBwXWw/GDAn3QKGNskPIBUAvYJctliUl2l4B6itNRKiEBYC2YBgwLDq+S88Z0xCUPpEMB+YBIg/gIPAtMFJqHIVYIpgfqK/i5NJQUJ7rCkI5QLbNCcAQ4JoJj0mlwlOB0HfAZcDMi8MPgFcmOhaxuB7YNn6CMCsQ9SUSRVdFRFZgPeBmEOBsYPVE+xJWDhDQZ5K9EJpgqT2YqmLR1p9IVLAQnhxgc6Vt7JXEAgmQCHs2I/VchDNJJlvCQRmWkhAnOT0Y/LCCRtO0BqGJbp2Fln43YIcwjkBCz7SJdOI1bNKTCSmJNiD0DQDC2K3rAbfMJjK7B8O/AOzPSaTsADI0NYD8u05Q6oAQ0CvLJw+HRPFcMKr3JwLBBKT1lA8AdcC8f5zZGnx3XYmiPgaECk2LFgvw4fFweP+BKgWAXQJdAMDmBKT1bBhNJewDVNb4vLfVEwQ8QMhDJGsxWQG2AYbAAULkfXdUwNoEIL1rQFbj+d5wIHx4Z0SkG9APQR4Y8idh6blgpQEzBmIvB0In/94l8vpuBYJ8CIJxCGJpE+m5IEsBZBBknWR9JVx3uUuEzzVgUDQ5NRzIWvxFCGKpJoY+CQR3xGQQQv8CNoZD+yQ3TbEAAAAASUVORK5CYII=';
const isDev = !app.isPackaged;

// Get the proper icon path based on platform
const getIconPath = () => {
  // In development, __dirname is app/dist, so we go up 2 levels to project root
  // In production, icons should be bundled with the app in resourcesPath
  const basePath = isDev 
    ? path.join(__dirname, '..', '..', 'resources', 'icons')
    : path.join(process.resourcesPath, 'icons');
  
  if (process.platform === 'win32') {
    return path.join(basePath, 'win', 'icon.ico');
  } else if (process.platform === 'darwin') {
    return path.join(basePath, 'mac', 'icon.icns');
  } else {
    // Linux uses PNG
    return path.join(basePath, 'png', '256x256.png');
  }
};

type PresencePayload = {
  type: 'UPDATE' | 'META_UPDATE' | 'VIDEO_UPDATE' | 'UPDATE_ACTIVITY' | 'PING';
  anime?: string;
  episode?: string;
  state?: 'playing' | 'paused' | string;
  currentTime?: number;
  duration?: number;
  // New fields
  title?: string;
  image?: string;
  season?: string;
  details?: string;
  largeImageKey?: string;
  smallImageKey?: string;
  startTimestamp?: number;
};

type AnimeData = {
  title: string;
  image: string | null;
  totalEpisodes: number | null;
  season: string | null; // e.g. "Season 2"
};

type RpcStatus = {
  discordConnected: boolean;
  extensionConnected: boolean;
  rpcPaused: boolean;
  activity?: PresencePayload & { updatedAt?: number };
  universalRpcEnabled?: boolean;
  steamGameRunning?: boolean;
  steamGameName?: string;
  wss?: {
    port: number;
    host: string;
    token: string;
  };
};

const getRendererUrl = () => {
  if (!app.isPackaged) {
    return process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
  }
  return `file://${path.join(__dirname, '../dist/renderer/index.html')}`;
};

const createWindow = () => {
  const preloadPath = path.join(__dirname, 'preload.js');
  const iconPath = getIconPath();
  
  // Try to load high-res PNG first for better scaling, then fallback to ICO or base64
  const pngIconPath = isDev 
    ? path.join(__dirname, '..', '..', 'resources', 'icon.png')
    : path.join(process.resourcesPath, 'icon.png');

  let windowIcon: Electron.NativeImage;
  try {
    if (fs.existsSync(pngIconPath)) {
      windowIcon = nativeImage.createFromPath(pngIconPath);
      console.log('[FoxCLI] Loaded high-res PNG icon:', pngIconPath);
    } else if (fs.existsSync(iconPath)) {
      windowIcon = nativeImage.createFromPath(iconPath);
      console.log('[FoxCLI] Loaded icon from:', iconPath);
    } else {
      console.log('[FoxCLI] Icon file not found, using base64 fallback');
      windowIcon = nativeImage.createFromDataURL(FOX_ICON_BASE64);
    }
  } catch (err) {
    console.log('[FoxCLI] Error loading icon, using base64 fallback:', err);
    windowIcon = nativeImage.createFromDataURL(FOX_ICON_BASE64);
  }
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#202225',
    autoHideMenuBar: true,
    frame: false,
    icon: windowIcon,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadURL(getRendererUrl());

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Forward console logs to terminal
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // console.log(`[Renderer] ${message}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Close to tray behavior
  mainWindow.on('close', (event) => {
    if (!isQuitting && settingsStore.get('closeToTray')) {
      event.preventDefault();
      mainWindow?.hide();
      
      if (settingsStore.get('showNotifications')) {
        showNotification('FoxCLI', 'Minimized to tray. Discord RPC still active.');
      }
    }
  });

  // Fix focus issues when returning to window
  mainWindow.on('focus', () => {
    // Ensure the window contents are focusable
    mainWindow?.webContents.focus();
  });

  // Handle blur to reset any stuck states
  mainWindow.on('blur', () => {
    // Optional: could broadcast a blur event if needed
  });

  // Memory optimization: clear cache when minimized
  mainWindow.on('minimize', () => {
    console.log('[FoxCLI] Window minimized - clearing non-essential cache');
    // Keep only essential cached items (last 10)
    if (animeCache.size > 10) {
      const entries = Array.from(animeCache.entries());
      const toKeep = entries.slice(0, 10);
      animeCache.clear();
      toKeep.forEach(([k, v]) => animeCache.set(k, v));
    }
  });

  // Restore functionality when unminimized
  mainWindow.on('restore', () => {
    console.log('[FoxCLI] Window restored');
    mainWindow?.webContents.focus();
  });
};

const broadcastStatus = (status?: RpcStatus) => {
  if (!mainWindow) return;
  const payload: RpcStatus =
    status ??
    ({
      discordConnected: rpcReady,
      extensionConnected,
      rpcPaused,
      activity: lastPayload ? { ...lastPayload, updatedAt: Date.now() } : undefined,
      universalRpcEnabled,
      steamGameRunning,
      steamGameName: steamGameName || undefined
    } satisfies RpcStatus);

  mainWindow.webContents.send('rpc-status', payload);
};

const clearPresenceAfterDelay = () => {
  if (clearTimeoutId) {
    clearTimeout(clearTimeoutId);
  }

  clearTimeoutId = setTimeout(() => {
    lastPayload = null;
    if (rpcClient && rpcReady) {
      rpcClient.clearActivity();
    }
    broadcastStatus();
  }, 60_000);
};

// Helper to extract season from title
const extractSeason = (title: string): string => {
  const seasonMatch = title.match(/Season\s+(\d+)/i) || title.match(/(\d+)(?:st|nd|rd|th)\s+Season/i);
  if (seasonMatch) return `S${seasonMatch[1]}`;
  return 'S1';
};

// Pre-compiled regex patterns for title cleaning (performance optimization)
const TITLE_CLEANING_PATTERNS = [
  { regex: /^Anime\s+/i, replacement: '' },
  { regex: /^Watch\s+/i, replacement: '' },
  { regex: /Season\s+\d+/i, replacement: '' },
  { regex: /(\d+)(?:st|nd|rd|th)\s+Season/i, replacement: '' },
  { regex: /\s+Part\s+\d+/i, replacement: '' },
  { regex: /\s+Online\s+Free\b/i, replacement: '' },
  { regex: /\s+-\s*AnimeKAI\b/i, replacement: '' },
  { regex: /\s+-\s*AnimePahe\b/i, replacement: '' },
  { regex: /\s+-\s*GogoAnime\b/i, replacement: '' },
  { regex: /\s+-\s*9anime\b/i, replacement: '' },
  { regex: /\s+-\s*Zoro\b/i, replacement: '' },
  { regex: /\s+-\s*Aniwave\b/i, replacement: '' },
  { regex: /\s+-\s*HiAnime\b/i, replacement: '' },
  { regex: /\s*\|.*$/i, replacement: '' },
  { regex: /\s+-\s+.*$/i, replacement: '' },
  { regex: /\bAnime\s+Online\b/i, replacement: '' },
];

const cleanTitle = (title: string): string => {
  // Apply all pre-compiled patterns
  let cleaned = title;
  for (const pattern of TITLE_CLEANING_PATTERNS) {
    cleaned = cleaned.replace(pattern.regex, pattern.replacement);
  }
  // Clean up extra whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
};

const cleanSlug = (slug: string): string => {
  // Replace hyphens
  let clean = slug.replace(/-/g, ' ');
  
  // Trim first to ensure end-of-string regex works
  clean = clean.trim();

  // Heuristic: remove trailing short alphanumeric sequences that look like IDs (e.g. "1ljj")
  // Only remove if it's 2-6 chars long and at the end, separated by space
  const original = clean;
  clean = clean.replace(/\s[a-z0-9]{2,6}$/i, '');
  clean = clean.trim();
  
  if (original !== clean) {
    console.log(`[FoxCLI] Cleaned slug: "${slug}" -> "${clean}"`);
  }
  return clean;
};

// Rate limiting for Jikan API using a proper request queue to prevent race conditions
const MAX_JIKAN_QUEUE = 50;
class JikanRateLimiter {
  private queue: Array<() => void> = [];
  private isProcessing = false;
  private lastCallTime = 0;
  private readonly cooldownMs = 1200; // Jikan recommends 1 req/sec

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= MAX_JIKAN_QUEUE) {
        reject(new Error('Jikan queue overloaded'));
        return;
      }
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Wait for cooldown
      const now = Date.now();
      const timeSinceLast = now - this.lastCallTime;
      if (timeSinceLast < this.cooldownMs) {
        await new Promise(resolve => setTimeout(resolve, this.cooldownMs - timeSinceLast));
      }

      const task = this.queue.shift();
      if (task) {
        this.lastCallTime = Date.now();
        await task();
      }
    }

    this.isProcessing = false;
  }
}

const jikanRateLimiter = new JikanRateLimiter();
let consecutiveRateLimits = 0;
const MAX_RETRIES = 3;

// Debounce for presence updates to prevent UI lag
let pendingPayload: any = null;
let payloadDebounceTimer: NodeJS.Timeout | null = null;
const PAYLOAD_DEBOUNCE_MS = 150; // Debounce rapid updates

const fetchAnimeData = async (query: string): Promise<AnimeData> => {
  const normalizedQuery = query.toLowerCase().trim();
  if (animeCache.has(normalizedQuery)) {
    const cached = animeCache.get(normalizedQuery)!;
    animeCache.delete(normalizedQuery);
    animeCache.set(normalizedQuery, cached);
    return cached;
  }

  // Use rate limiter queue to prevent race conditions
  return jikanRateLimiter.enqueue(async () => {
    try {
      let response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);

      // Handle rate limiting with exponential backoff
      let retries = 0;
      while (response.status === 429 && retries < MAX_RETRIES) {
        consecutiveRateLimits++;
        const backoffTime = Math.min(2000 * Math.pow(2, retries), 10000); // 2s, 4s, 8s max 10s
        console.log(`[FoxCLI] Rate limited, waiting ${backoffTime / 1000}s (attempt ${retries + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        retries++;
      }

      if (response.status === 429) {
        console.log('[FoxCLI] Rate limit exceeded after retries, using fallback');
        return { title: query, image: null, totalEpisodes: null, season: 'S1' };
      }

      // Reset consecutive rate limit counter on success
      if (response.ok) consecutiveRateLimits = 0;

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data: any = await response.json();
      const result = data?.data?.[0];

      if (result) {
        const title = result.title_english ?? result.title;
        const imageUrl = result.images?.jpg?.large_image_url ?? result.images?.jpg?.image_url;
        const totalEpisodes = result.episodes;
        const season = extractSeason(title);

        const animeData: AnimeData = {
          title: title,
          image: imageUrl,
          totalEpisodes,
          season
        };

        animeCache.set(normalizedQuery, animeData);
        if (animeCache.size > ANIME_CACHE_MAX) {
          const oldestKey = animeCache.keys().next().value;
          if (oldestKey) {
            animeCache.delete(oldestKey);
          }
        }
        console.log(`[FoxCLI] Jikan found: ${title}`);
        return animeData;
      } else {
        console.log(`[FoxCLI] Jikan returned no results for: ${query}`);
      }
    } catch (err) {
      console.error('[FoxCLI] Failed to fetch anime data:', err);
    }

    // Fallback
    return {
      title: query,
      image: null,
      totalEpisodes: null,
      season: 'S1'
    };
  });
};

// --- State for Merging ---
let currentMeta: { title?: string; episode?: string; image?: string; season?: string } = {};
let currentVideo: { state?: string; currentTime?: number; duration?: number } = {};
let currentAnimeData: AnimeData | null = null;
let isProcessingPayload = false;

// Function to get current watching state for API server
const getCurrentWatchingState = () => {
  const isPlaying = currentVideo.state === 'playing';
  const hasTitle = Boolean(currentMeta.title);

  return {
    isWatching: isPlaying && hasTitle,
    title: currentMeta.title,
    episode: currentMeta.episode,
    season: currentMeta.season,
    image: currentMeta.image,
    progress: currentVideo.currentTime !== undefined && currentVideo.duration !== undefined
      ? {
          current: currentVideo.currentTime,
          duration: currentVideo.duration,
        }
      : undefined,
    source: 'extension',
    timestamp: new Date().toISOString(),
  };
};

// Queue payload processing - keep separate queues for META and VIDEO updates
let pendingMetaPayload: any = null;
let pendingVideoPayload: any = null;
const MAX_PENDING_META_BYTES = 64 * 1024;
const MAX_PENDING_VIDEO_BYTES = 32 * 1024;
const MAX_PENDING_OTHER_BYTES = 32 * 1024;

const queuePayload = (payload: any) => {
  try {
    const seen = new Set();
    const size = Buffer.byteLength(JSON.stringify(payload, (_, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    }), 'utf-8');
    if (payload.type === 'META_UPDATE' && size > MAX_PENDING_META_BYTES) return;
    if (payload.type === 'VIDEO_UPDATE' && size > MAX_PENDING_VIDEO_BYTES) return;
    if (!['META_UPDATE', 'VIDEO_UPDATE'].includes(payload.type) && size > MAX_PENDING_OTHER_BYTES) return;
  } catch {
    return;
  }
  // Store META_UPDATE and VIDEO_UPDATE separately so neither overwrites the other
  if (payload.type === 'META_UPDATE') {
    pendingMetaPayload = payload;
  } else if (payload.type === 'VIDEO_UPDATE') {
    pendingVideoPayload = payload;
  } else {
    pendingPayload = payload;
  }
  
  if (payloadDebounceTimer) {
    clearTimeout(payloadDebounceTimer);
  }
  
  payloadDebounceTimer = setTimeout(() => {
    if (!isProcessingPayload) {
      processAllPending();
    }
  }, PAYLOAD_DEBOUNCE_MS);
};

const processAllPending = async () => {
  if (isProcessingPayload) return;
  isProcessingPayload = true;
  
  try {
    // Process META_UPDATE first (so we have title/episode info)
    if (pendingMetaPayload) {
      const meta = pendingMetaPayload;
      pendingMetaPayload = null;
      await handlePayload(meta);
    }
    
    // Then process VIDEO_UPDATE (state/progress)
    if (pendingVideoPayload) {
      const video = pendingVideoPayload;
      pendingVideoPayload = null;
      await handlePayload(video);
    }
    
    // Handle any other payload types
    if (pendingPayload) {
      const other = pendingPayload;
      pendingPayload = null;
      await handlePayload(other);
    }
  } finally {
    isProcessingPayload = false;
    
    // Check if more payloads came in while processing
    if (pendingMetaPayload || pendingVideoPayload || pendingPayload) {
      if (payloadDebounceTimer) {
        clearTimeout(payloadDebounceTimer);
      }
      payloadDebounceTimer = setTimeout(() => processAllPending(), 50);
    }
  }
};

const handlePayload = async (payload: any) => {
  // Only reset the clear timer if video is playing (not paused)
  // This ensures Discord RPC clears when video is paused for extended periods
  if (currentVideo.state === 'playing') {
    clearPresenceAfterDelay();
  }

  if (!rpcClient || !rpcReady) {
    broadcastStatus();
    return;
  }

  // Debug incoming payload
  console.log('[FoxCLI] Payload received:', payload.type, payload.title || '', payload.episode || '');

  // 1. Update Internal State
  if (payload.type === 'META_UPDATE') {
    console.log('[FoxCLI] META_UPDATE received:', { 
      title: payload.title, 
      episode: payload.episode, 
      image: payload.image,
      season: payload.season,
      rawPayload: JSON.stringify(payload)
    });
    
    // Only update if we have valid data (not "Unknown Anime")
    const isValidTitle = payload.title && payload.title !== 'Unknown Anime' && payload.title.trim().length > 0;
    const isValidEpisode = payload.episode && payload.episode !== 'Episode ?';
    
    if (isValidTitle || isValidEpisode) {
      currentMeta = {
        title: isValidTitle ? payload.title : (currentMeta.title || payload.title),
        episode: isValidEpisode ? payload.episode : (currentMeta.episode || payload.episode),
        image: payload.image || currentMeta.image,
        season: payload.season || currentMeta.season
      };
      
      console.log('[FoxCLI] currentMeta updated:', currentMeta);
      
      if (isValidTitle) {
        const cleaned = cleanTitle(payload.title);
        console.log('[FoxCLI] Cleaned title for Jikan:', cleaned);
        
        // Fetch anime data in background, don't block
        fetchAnimeData(cleaned).then(data => {
          currentAnimeData = data;
          if (data?.image) {
            currentMeta.image = data.image;
            console.log('[FoxCLI] Anime image updated from Jikan:', data.image);
          }
          // Update RPC with new data
          updateDiscordRPC();
        }).catch(err => {
          console.error('[FoxCLI] Background fetch error:', err);
        });
        
        // Continue without waiting for API - use cached data if available
        if (currentAnimeData?.image) {
          currentMeta.image = currentAnimeData.image;
        }
      }
    } else {
      console.log('[FoxCLI] Skipping invalid META_UPDATE - keeping existing metadata');
    }
  } else if (payload.type === 'VIDEO_UPDATE') {
    currentVideo = {
      state: payload.state, // 'playing' | 'paused'
      currentTime: payload.currentTime,
      duration: payload.duration
    };
  } else if (payload.type === 'UPDATE_ACTIVITY') {
    // Fallback for legacy full-update
    handleLegacyPayload(payload);
    return;
  }

  // Update Discord RPC
  updateDiscordRPC();
  
  // Broadcast status immediately after processing to ensure UI updates
  broadcastStatus();
};

// Extracted RPC update logic for reuse
const updateDiscordRPC = () => {
  // Skip update if RPC is paused
  if (rpcPaused) {
    console.log('[FoxCLI] RPC update skipped - paused');
    return;
  }

  if (!rpcClient || !rpcReady) return;
  
  // Skip if Steam game is running (let the game have its own RPC)
  if (steamGameRunning) {
    console.log('[FoxCLI] RPC update skipped - Steam game is running');
    return;
  }
  
  // If universal RPC is enabled and video is paused/not playing, show universal RPC
  const isPaused = currentVideo.state === 'paused';
  const hasMetadata = currentMeta.title && currentMeta.title !== 'Unknown Anime';
  
  if (universalRpcEnabled && (isPaused || !hasMetadata)) {
    console.log('[FoxCLI] Switching to universal RPC mode');
    // Clear the anime RPC before showing universal RPC
    if (rpcClient && rpcReady) {
      rpcClient.clearActivity();
    }
    updateUniversalRPC();
    return;
  }
  
  // If no valid metadata and universal RPC is off, clear everything
  if (!hasMetadata) {
    console.log('[FoxCLI] No anime metadata - clearing RPC');
    rpcClient.clearActivity().catch(() => {});
    lastPayload = null;
    broadcastStatus();
    return;
  }

  const rawTitle = currentMeta.title || 'Unknown Anime';
  const episodeRaw = currentMeta.episode || '?';
  const imageKey = currentMeta.image || 'nexus-tools';
  // Use full title from animekai without season suffix
  const displayTitle = cleanTitle(rawTitle);
  const episodeMatch = episodeRaw.match(/(\d+)/);
  const episodeNum = episodeMatch ? Number(episodeMatch[1]) : null;
  const totalEpisodes = currentAnimeData?.totalEpisodes ?? null;
  
  const currentTime = currentVideo.currentTime || 0;
  const duration = currentVideo.duration || 0;

  // Calculate Progress
  let progressStr = '';
  let startTimestamp: number | undefined;

  if (duration > 0) {
    const pct = Math.floor((currentTime / duration) * 100);
    progressStr = ` (${pct}%)`;
    
    if (!isPaused && currentTime > 0) {
      startTimestamp = Math.floor(Date.now() / 1000) - Math.floor(currentTime);
    }
  }

  let episodeDisplay = '?';
  const hasValidTotal = Boolean(episodeNum && totalEpisodes && episodeNum <= (totalEpisodes ?? 0));
  if (hasValidTotal) {
    episodeDisplay = `${episodeNum}/${totalEpisodes}${progressStr}`;
  } else if (episodeNum) {
    episodeDisplay = `${episodeNum}${progressStr}`;
  } else if (episodeRaw) {
    episodeDisplay = `${episodeRaw}${progressStr}`;
  }

  let stateText = hasValidTotal
    ? `Episode ${episodeNum}/${totalEpisodes}${progressStr}`
    : episodeNum
      ? `Episode ${episodeNum}${progressStr}`
      : `${episodeRaw}${progressStr}`;

  // Discord RPC requires state to be at least 2 characters
  if (stateText.length < 2) {
    stateText = 'Watching';
  }

  // Send to Discord
  lastPayload = {
    ...currentMeta,
    ...currentVideo,
    type: 'UPDATE',
    anime: displayTitle,
    episode: episodeDisplay,
    state: currentVideo.state
  } as any;

  // Determine activity text based on pause state
  const smallImageKey = isPaused ? 'pause' : 'play';
  const smallImageText = isPaused ? 'Paused' : 'Playing';
  
  // When paused, show different state text
  const finalStateText = isPaused 
    ? `Paused - ${stateText}` 
    : stateText;

  // Clear universal RPC when anime RPC is active
  if (universalRpcClient && universalRpcReady) {
    universalRpcClient.clearActivity().catch(() => {});
  }

  rpcClient.setActivity({
    details: displayTitle,
    state: finalStateText,
    largeImageKey: imageKey,
    largeImageText: displayTitle,
    smallImageKey: smallImageKey,
    smallImageText: smallImageText,
    startTimestamp: startTimestamp,
    instance: false
  }).catch((err: any) => console.error('[FoxCLI] RPC Update Failed:', err));

  broadcastStatus();
};

const handleLegacyPayload = async (payload: any) => {
  // ... (Keep existing legacy logic here if needed, or simply map it to currentMeta/Video)
  // For now, let's map it to currentMeta/Video to unify the path
  currentMeta = {
    title: payload.details,
    episode: payload.state ? payload.state.split('(')[0].trim() : '?',
    image: payload.largeImageKey
  };
  // We can't easily extract exact time/duration from the formatted string of legacy payload
  // unless we pass raw values.
  // Assuming the legacy payload was updated to pass raw values in previous step:
  currentVideo = {
    state: payload.smallImageKey === 'pause' ? 'paused' : 'playing',
    currentTime: 0, // Legacy doesn't send raw time usually?
    duration: 0
  };
  
  // Actually, let's just use the unified path above.
};

const setupRpc = async () => {
  rpcClient = new RPC.Client({ transport: 'ipc' });
  rpcClient.on('ready', () => {
    rpcReady = true;
    console.log('[FoxCLI] Discord RPC Ready');
    broadcastStatus();
  });

  rpcClient.on('disconnected', () => {
    rpcReady = false;
    console.log('[FoxCLI] Discord RPC Disconnected');
    broadcastStatus();
  });

  rpcClient.on('error', (err: any) => {
    console.error('[FoxCLI] Discord RPC Error:', err);
    rpcReady = false;
    broadcastStatus();
  });

  try {
    await rpcClient.login({ clientId: CLIENT_ID });
  } catch (err) {
    console.error('[FoxCLI] Discord RPC Login Failed:', err);
    rpcReady = false;
    broadcastStatus();
  }
};

// Setup separate RPC client for Universal mode (uses different Discord app)
// Only connects when universal mode is enabled
const setupUniversalRpc = async () => {
  universalRpcClient = new RPC.Client({ transport: 'ipc' });
  
  universalRpcClient.on('ready', () => {
    universalRpcReady = true;
    console.log('[FoxCLI] Universal Discord RPC Ready');
    // If universal mode is enabled, update activity; otherwise clear it
    if (universalRpcEnabled) {
      updateUniversalRPC();
    } else {
      // Clear any lingering activity since we're not in universal mode
      universalRpcClient.clearActivity().catch(() => {});
    }
    broadcastStatus();
  });

  universalRpcClient.on('disconnected', () => {
    universalRpcReady = false;
    console.log('[FoxCLI] Universal Discord RPC Disconnected');
    broadcastStatus();
  });

  universalRpcClient.on('error', (err: any) => {
    console.error('[FoxCLI] Universal Discord RPC Error:', err);
    universalRpcReady = false;
    broadcastStatus();
  });

  try {
    await universalRpcClient.login({ clientId: UNIVERSAL_RPC_CLIENT_ID });
  } catch (err) {
    console.error('[FoxCLI] Universal Discord RPC Login Failed:', err);
    universalRpcReady = false;
    broadcastStatus();
  }
};

// Steam game detection - checks if any Steam game is currently running
const checkSteamGameRunning = async (): Promise<{ running: boolean; gameName?: string }> => {
  try {
    // Use PowerShell to get running processes and check for Steam games
    // This checks for processes that have "steam" in their path
    // Note: Using safeExecFile for PowerShell with static script
    const ps = `Get-Process | Where-Object { $_.Path -match 'steamapps' -or $_.Path -match 'SteamLibrary' } | Select-Object ProcessName, MainWindowTitle, Path | ConvertTo-Json -Compress`;
    
    const args = ['-NoProfile', '-Command', ps];
    const { stdout } = await safeExecFile('powershell.exe', args, { windowsHide: true, timeout: 5000, allowedArgs: args });
    const processes = JSON.parse(stdout.toString() || '[]');
    const processList = Array.isArray(processes) ? processes : processes ? [processes] : [];
    
    // Exclusion list - apps that run from Steam folder but aren't games
    const excludedProcesses = [
      'wallpaper32',      // Wallpaper Engine
      'wallpaper64',      // Wallpaper Engine 64-bit
      'wallpaperservice', // Wallpaper Engine service
      'steamwebhelper',   // Steam web browser
      'steamerrorreporter', // Steam error reporter
      'gameoverlayui',    // Steam overlay
      'steam',            // Steam client
    ];
    
    // Filter out Steam client itself and non-game apps
    const games = processList.filter((p: any) => {
      const name = p.ProcessName?.toLowerCase() || '';
      const title = p.MainWindowTitle || '';
      const pathStr = p.Path || '';
      
      // Exclude Steam client itself
      if (name === 'steam' && (title.includes('Steam') || title === '')) return false;
      
      // Exclude non-game applications
      if (excludedProcesses.includes(name)) return false;
      
      // Check if it's in a steamapps directory
      if (pathStr.includes('steamapps') || pathStr.includes('SteamLibrary')) return true;
      
      return false;
    });
    
    if (games.length > 0) {
      const game = games[0];
      return { 
        running: true, 
        gameName: game.MainWindowTitle || game.ProcessName 
      };
    }
    
    return { running: false };
  } catch (err) {
    console.error('[FoxCLI] Steam detection error:', err);
    return { running: false };
  }
};

// Start periodic Steam game detection
const startSteamDetection = () => {
  if (steamCheckInterval) {
    clearInterval(steamCheckInterval);
  }
  
  // Check immediately on start
  checkSteamGameRunning().then(status => {
    const wasRunning = steamGameRunning;
    steamGameRunning = status.running;
    steamGameName = status.gameName || null;
    
    if (wasRunning !== steamGameRunning) {
      console.log(`[FoxCLI] Steam game detection: ${steamGameRunning ? 'Game running - ' + steamGameName : 'No game running'}`);
      broadcastStatus();
      
      // If a Steam game started running and universal RPC is not active, clear anime RPC
      if (steamGameRunning && !universalRpcEnabled && rpcClient && rpcReady) {
        console.log('[FoxCLI] Steam game detected - pausing anime RPC to avoid interference');
        rpcClient.clearActivity();
      }
    }
  });
  
  // Check every 30 seconds
  steamCheckInterval = setInterval(async () => {
    try {
      const status = await checkSteamGameRunning();
      const wasRunning = steamGameRunning;
      steamGameRunning = status.running;
      steamGameName = status.gameName || null;
    
      if (wasRunning !== steamGameRunning) {
        console.log(`[FoxCLI] Steam game detection changed: ${steamGameRunning ? 'Game running - ' + steamGameName : 'No game running'}`);
        broadcastStatus();
      
      // Handle state change
      if (steamGameRunning && !universalRpcEnabled && rpcClient && rpcReady) {
        // Steam game started - clear anime RPC
        console.log('[FoxCLI] Steam game detected - clearing anime RPC');
        rpcClient.clearActivity();
      } else if (!steamGameRunning && !universalRpcEnabled && lastPayload && rpcClient && rpcReady) {
        // Steam game ended - resume anime RPC
        console.log('[FoxCLI] Steam game ended - resuming anime RPC');
        updateDiscordRPC();
      }
      }
    } catch (err) {
      console.error('[FoxCLI] Steam detection interval error:', err);
    }
  }, 30000);
  
  console.log('[FoxCLI] Steam game detection started');
};

// Stop Steam detection
const stopSteamDetection = () => {
  if (steamCheckInterval) {
    clearInterval(steamCheckInterval);
    steamCheckInterval = null;
    console.log('[FoxCLI] Steam game detection stopped');
  }
};

// Update Discord RPC with universal mode support - uses separate RPC client
const updateUniversalRPC = () => {
  if (!universalRpcClient || !universalRpcReady) return;
  if (rpcPaused) return;
  if (steamGameRunning) return; // Don't show universal RPC if Steam game is running
  
  // Force custom text - ignore old stored values
  const rpcText = 'Not doing anything atm';
  const buttonLabel = settingsStore.get('universalRpcButtonLabel') || 'Visit My Website';
  const buttonUrl = settingsStore.get('universalRpcButtonUrl') || 'https://foxems.vercel.app/';
  let safeButtonUrl = 'https://foxems.vercel.app/';
  try {
    const parsed = new URL(buttonUrl);
    if (parsed.protocol === 'https:' && !LOCAL_HOSTNAMES.has(parsed.hostname) && !parsed.hostname.endsWith('.localhost')) {
      safeButtonUrl = parsed.toString();
    }
  } catch (err) {
    console.warn('[FoxCLI] Failed to parse universal RPC button URL');
  }
  
  // Build activity with buttons
  // Discord RPC button requirements:
  // - label: max 32 characters
  // - url: must be valid HTTPS URL
  const activity: any = {
    details: rpcText,
    state: 'Taking a break ☕',
    largeImageKey: 'icon',
    largeImageText: 'FoxCLI',
    buttons: [
      { label: buttonLabel.substring(0, 32), url: safeButtonUrl }
    ],
    instance: false
  };
  
  console.log('[FoxCLI] Universal RPC Activity:', JSON.stringify(activity, null, 2));
  
  universalRpcClient.setActivity(activity).catch((err: any) => {
    console.error('[FoxCLI] Universal RPC Update Failed:', err);
  });
  
  // Update lastPayload for status display
  lastPayload = {
    type: 'UPDATE',
    anime: rpcText,
    episode: 'Taking a break ☕',
    state: 'idle'
  } as any;
  
  broadcastStatus();
};

const setupWebSocket = async () => {
  console.log('[FoxCLI] Starting WebSocket server...');
  let wss: WebSocketServer | null = null;
  for (const port of WSS_PORTS) {
    try {
      console.log(`[FoxCLI] Trying port ${port}...`);
      wss = await new Promise<WebSocketServer>((resolve, reject) => {
        const server = new WebSocketServer({ port, host: WSS_BIND_HOST });
        const handleListening = () => {
          server.off('error', handleError);
          console.log(`[FoxCLI] WebSocket server listening on ${WSS_BIND_HOST}:${port}`);
          resolve(server);
        };
        const handleError = (error: any) => {
          server.off('listening', handleListening);
          reject(error);
        };
        server.once('listening', handleListening);
        server.once('error', handleError);
      });
      activeWssPort = port;
      break;
    } catch (error: any) {
      console.log(`[FoxCLI] Port ${port} failed:`, error?.code ?? error);
      if (error?.code !== 'EADDRINUSE') {
        console.error('[FoxCLI] WebSocket error:', error);
      }
    }
  }

  if (!wss) {
    console.error('[FoxCLI] Unable to start WebSocket server on any port');
    return;
  }

  console.log(`[FoxCLI] WebSocket server active on port ${activeWssPort}`);

  wss.on('connection', (socket: WebSocket, req) => {
    const remoteAddress = req?.socket?.remoteAddress || '';
    if (!LOOPBACK_ADDRESSES.has(remoteAddress)) {
      try {
        socket.close(1008, 'Forbidden');
      } catch (err) {
        console.warn('[FoxCLI] Failed to close unauthorized socket');
      }
      return;
    }
    const url = new URL(req?.url || '/', `http://${WSS_BIND_HOST}`);
    const token = url.searchParams.get('token');
    if (!token || token !== getWssAuthToken()) {
      try {
        socket.close(1008, 'Unauthorized');
      } catch (err) {
        console.warn('[FoxCLI] Failed to close unauthorized socket');
      }
      return;
    }
    console.log('[FoxCLI] Extension connected!');
    connectedClients.add(socket);
    extensionConnected = true;
    broadcastStatus();

    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString()) as PresencePayload;
        
        // Handle ping from extension
        if (data.type === 'PING') {
          // Send pong back to confirm connection is working
          try {
            socket.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          } catch (err) {
            console.warn('[FoxCLI] Failed to send PONG');
          }
          return;
        }

        // Log all received messages for debugging
        console.log(`[FoxCLI] WS Received [${data.type}]:`, JSON.stringify(data));

        // Pass all other known types to the debounced handler to prevent UI lag
        if (['UPDATE', 'META_UPDATE', 'VIDEO_UPDATE', 'UPDATE_ACTIVITY'].includes(data.type)) {
          queuePayload(data);
          
          // Send acknowledgment back to extension so it knows data was received
          try {
            socket.send(JSON.stringify({ 
              type: 'ACK', 
              received: data.type,
              timestamp: Date.now(),
              foxcli: 'active'
            }));
          } catch (err) {
            console.warn('[FoxCLI] Failed to send ACK');
          }
        }
      } catch (err) {
        console.warn('[FoxCLI] Failed to parse WebSocket message');
        return;
      }
    });

    socket.on('close', () => {
      console.log('[FoxCLI] Extension disconnected');
      connectedClients.delete(socket);
      extensionConnected = connectedClients.size > 0;
      broadcastStatus();
      clearPresenceAfterDelay();
    });
  });

  wss.on('error', (error) => {
    console.error('[FoxCLI] WebSocket runtime error:', error);
  });
};

ipcMain.handle('get-status', () => {
  const status = {
    discordConnected: rpcReady,
    extensionConnected,
    rpcPaused,
    activity: lastPayload ? { ...lastPayload, updatedAt: Date.now() } : undefined,
    wss: {
      port: activeWssPort ?? WSS_PORTS[0] ?? 3000,
      host: WSS_BIND_HOST,
      token: getWssAuthToken()
    }
  } satisfies RpcStatus;
  const logStatus = status.wss ? { ...status, wss: { ...status.wss, token: '***' } } : status;
  console.log('[FoxCLI] Renderer requested status:', JSON.stringify(logStatus));
  return status;
});

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

// --- MAL OAuth Handlers ---
ipcMain.handle('mal-start-oauth', async (_, authUrl: string) => {
  console.log('[FoxCLI] Starting MAL OAuth flow');

  try {
    const parsedAuthUrl = new URL(authUrl);
    if (parsedAuthUrl.protocol !== 'https:' || parsedAuthUrl.hostname !== 'myanimelist.net') {
      throw new Error('Invalid MAL OAuth URL');
    }
    const state = parsedAuthUrl.searchParams.get('state');
    if (!state || state.length < 8) {
      throw new Error('Missing OAuth state parameter');
    }
    oauthState = state;
  } catch (err: any) {
    console.error('[FoxCLI] Invalid OAuth URL:', err);
    throw err;
  }

  // Start OAuth callback server
  return new Promise((resolve, reject) => {
    if (oauthServer) {
      oauthServer.close(() => {
        oauthServer = null;
      });
    }

    // Track timeout for cleanup
    let oauthTimeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (oauthTimeoutId) {
        clearTimeout(oauthTimeoutId);
        oauthTimeoutId = null;
      }
      if (oauthServer) {
        oauthServer.close(() => {
          oauthServer = null;
        });
      }
      oauthState = null;
    };

    oauthServer = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${OAUTH_PORT}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('Referrer-Policy', 'no-referrer');
          const safeError = String(error).replace(/[&<>"']/g, (char) => {
            const map: Record<string, string> = {
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;'
            };
            return map[char] || char;
          });
          res.end(`
            <html>
              <head><title>Authorization Failed</title></head>
              <body style="background:#1a1b1e;color:#fff;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
                <div style="text-align:center;">
                  <h1 style="color:#ed4245;">Authorization Failed</h1>
                  <p>Error: ${safeError}</p>
                  <p>You can close this window.</p>
                </div>
              </body>
            </html>
          `);
          cleanup();
          mainWindow?.webContents.send('mal-oauth-error', error);
          reject(new Error(`OAuth error: ${error}`));
        } else if (code) {
          const returnedState = url.searchParams.get('state');
          if (!oauthState || returnedState !== oauthState) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('Referrer-Policy', 'no-referrer');
            res.end('Invalid OAuth state');
            cleanup();
            mainWindow?.webContents.send('mal-oauth-error', 'Invalid OAuth state');
            reject(new Error('Invalid OAuth state'));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('Referrer-Policy', 'no-referrer');
          res.end(`
            <html>
              <head><title>Authorization Successful</title></head>
              <body style="background:#1a1b1e;color:#fff;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
                <div style="text-align:center;">
                  <h1 style="color:#3ba55d;">✓ Authorization Successful!</h1>
                  <p>You can close this window and return to FoxCLI.</p>
                </div>
              </body>
            </html>
          `);
          cleanup();
          mainWindow?.webContents.send('mal-oauth-code', { code, state: returnedState || undefined });
          resolve(true);
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    oauthServer.listen(OAUTH_PORT, () => {
      console.log(`[FoxCLI] OAuth callback server listening on port ${OAUTH_PORT}`);
      // Open browser with auth URL
      shell.openExternal(authUrl);
    });

    oauthServer.on('error', (err) => {
      console.error('[FoxCLI] OAuth server error:', err);
      cleanup();
      reject(err);
    });

    // Timeout after 5 minutes
    oauthTimeoutId = setTimeout(() => {
      console.log('[FoxCLI] OAuth timeout reached');
      cleanup();
      mainWindow?.webContents.send('mal-oauth-error', 'Timeout');
      reject(new Error('OAuth timeout'));
    }, 5 * 60 * 1000);
  });
});

ipcMain.handle('mal-open-external', async (_, url: string) => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      console.warn('[FoxCLI] Blocked MAL openExternal protocol:', parsedUrl.protocol);
      return false;
    }
    if (parsedUrl.hostname !== 'myanimelist.net' && parsedUrl.hostname !== 'www.myanimelist.net') {
      console.warn('[FoxCLI] Blocked MAL openExternal host:', parsedUrl.hostname);
      return false;
    }
    if (LOCAL_HOSTNAMES.has(parsedUrl.hostname)) {
      console.warn('[FoxCLI] Blocked MAL openExternal localhost URL:', parsedUrl.hostname);
      return false;
    }
    await shell.openExternal(url);
    return true;
  } catch (err: any) {
    console.error('[FoxCLI] MAL openExternal error:', err);
    return false;
  }
});

// Token exchange - proxy through main process to avoid CORS
ipcMain.handle('mal-exchange-token', async (_, params: { clientId: string; code: string; codeVerifier: string }) => {
  console.log('[FoxCLI] Exchanging OAuth code for token');
  
  try {
    const response = await fetch('https://myanimelist.net/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: params.clientId,
        grant_type: 'authorization_code',
        code: params.code,
        code_verifier: params.codeVerifier,
        redirect_uri: 'http://localhost:7842/callback',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[FoxCLI] Token exchange failed:', response.status, error);
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[FoxCLI] Token exchange successful');
    return data;
  } catch (err: any) {
    console.error('[FoxCLI] Token exchange error:', err);
    throw err;
  }
});

// Refresh token - proxy through main process
ipcMain.handle('mal-refresh-token', async (_, params: { clientId: string; refreshToken: string }) => {
  console.log('[FoxCLI] Refreshing access token');
  
  try {
    const response = await fetch('https://myanimelist.net/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: params.clientId,
        grant_type: 'refresh_token',
        refresh_token: params.refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[FoxCLI] Token refresh failed:', response.status, error);
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[FoxCLI] Token refresh successful');
    return data;
  } catch (err: any) {
    console.error('[FoxCLI] Token refresh error:', err);
    throw err;
  }
});

// MAL API proxy - to avoid CORS issues
ipcMain.handle('mal-api-request', async (_, params: { endpoint: string; accessToken: string }) => {
  try {
    const response = await fetch(`https://api.myanimelist.net/v2${params.endpoint}`, {
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} - ${error}`);
    }

    return await response.json();
  } catch (err: any) {
    console.error('[FoxCLI] MAL API error:', err);
    throw err;
  }
});

// Settings IPC handlers
ipcMain.handle('get-settings', () => {
  return settingsStore.getAll();
});

ipcMain.handle('set-setting', (_, key: keyof AppSettings, value: any) => {
  try {
    const size = Buffer.byteLength(JSON.stringify({ key, value }), 'utf-8');
    if (size > MAX_IPC_PAYLOAD_BYTES) {
      throw new Error('Setting payload too large');
    }
  } catch (err) {
    throw new Error('Invalid setting payload');
  }
  settingsStore.set(key, value);
  
  // Handle auto-launch setting
  if (key === 'autoLaunch') {
    app.setLoginItemSettings({
      openAtLogin: value,
      args: value && settingsStore.get('startMinimized') ? ['--hidden'] : []
    });
  }
  
  return true;
});

ipcMain.handle('set-settings', (_, settings: Partial<AppSettings>) => {
  try {
    const size = Buffer.byteLength(JSON.stringify(settings), 'utf-8');
    if (size > MAX_IPC_PAYLOAD_BYTES) {
      throw new Error('Settings payload too large');
    }
  } catch (err) {
    throw new Error('Invalid settings payload');
  }
  settingsStore.setAll(settings);
  
  // Handle auto-launch if it was changed
  if ('autoLaunch' in settings) {
    app.setLoginItemSettings({
      openAtLogin: settings.autoLaunch ?? false,
      args: settings.autoLaunch && settingsStore.get('startMinimized') ? ['--hidden'] : []
    });
  }
  
  return true;
});

// RPC Pause IPC handlers
ipcMain.handle('get-rpc-paused', () => {
  return rpcPaused;
});

ipcMain.handle('set-rpc-paused', (_, paused: boolean) => {
  rpcPaused = paused;
  settingsStore.set('rpcPaused', paused);
  
  if (paused && rpcClient && rpcReady) {
    rpcClient.clearActivity();
    console.log('[FoxCLI] RPC paused via IPC - activity cleared');
  } else if (!paused && lastPayload) {
    updateDiscordRPC();
    console.log('[FoxCLI] RPC resumed via IPC');
  }
  
  broadcastStatus();
  return true;
});

// Steam game detection IPC handlers
ipcMain.handle('get-steam-game-status', () => {
  return {
    running: steamGameRunning,
    gameName: steamGameName
  };
});

// Universal RPC IPC handlers
ipcMain.handle('get-universal-rpc-enabled', () => {
  return universalRpcEnabled;
});

ipcMain.handle('set-universal-rpc-enabled', (_, enabled: boolean) => {
  universalRpcEnabled = enabled;
  settingsStore.set('universalRpcEnabled', enabled);
  
  if (enabled && universalRpcClient && universalRpcReady && !steamGameRunning) {
    // Switch to universal RPC - clear anime RPC first
    if (rpcClient && rpcReady) {
      rpcClient.clearActivity();
    }
    updateUniversalRPC();
    console.log('[FoxCLI] Universal RPC enabled');
  } else if (!enabled) {
    // Clear universal RPC and let normal anime RPC take over
    if (universalRpcClient && universalRpcReady) {
      universalRpcClient.clearActivity();
    }
    if (lastPayload && lastPayload.episode !== 'Universal RPC' && rpcClient && rpcReady) {
      updateDiscordRPC();
    }
    console.log('[FoxCLI] Universal RPC disabled');
  }
  
  broadcastStatus();
  return true;
});

// Memory profiler - get heap usage stats
ipcMain.handle('get-memory-usage', () => {
  try {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers,
    };
  } catch (err) {
    console.error('[FoxCLI] Failed to get memory usage:', err);
    throw new Error('Failed to retrieve memory usage statistics');
  }
});

// Generic URL fetch for Steam API and other external APIs (bypasses CORS)
// Request timeout: 30 seconds to prevent hanging connections
const FETCH_TIMEOUT_MS = 30000;

ipcMain.handle('fetch-url', async (_, url: string) => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      return { error: true, message: 'Unsupported URL protocol' };
    }
    if (!ALLOWED_FETCH_HOSTS.has(parsedUrl.hostname)) {
      return { error: true, message: 'Blocked URL host' };
    }
    if (LOCAL_HOSTNAMES.has(parsedUrl.hostname)) {
      return { error: true, message: 'Blocked localhost URL' };
    }
    if (parsedUrl.username || parsedUrl.password) {
      return { error: true, message: 'Blocked URL credentials' };
    }
    await ensurePublicHost(parsedUrl.hostname);

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    if (/^https?:\/\/store\.steampowered\.com\//i.test(url)) {
      headers.Referer = 'https://store.steampowered.com/';
      headers.Origin = 'https://store.steampowered.com';
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { headers, signal: controller.signal, redirect: 'error' });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let body = '';
      try {
        body = await response.text();
      } catch {
        body = '';
      }

      const snippet = body ? body.substring(0, 500) : '';
      console.error(`[FoxCLI] Fetch URL failed: ${response.status} ${response.statusText}`);
      if (snippet) {
        console.error(`[FoxCLI] Fetch URL response body (first 500 chars): ${snippet}`);
      }
      return { error: true, status: response.status, message: response.statusText, body: snippet };
    }

    const contentType = response.headers.get('content-type') || '';
    const lengthHeader = response.headers.get('content-length');
    if (lengthHeader && Number(lengthHeader) > MAX_FETCH_BYTES) {
      return { error: true, message: 'Response too large' };
    }
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf-8') > MAX_FETCH_BYTES) {
      return { error: true, message: 'Response too large' };
    }
    
    // Try to parse as JSON if content type indicates JSON or if it looks like JSON
    if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        console.error('[FoxCLI] JSON parse error:', parseErr);
        return { error: true, message: 'Invalid JSON response', raw: text.substring(0, 500) };
      }
    }
    
    // Return raw HTML/text for scraping purposes
    return { html: text };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[FoxCLI] Fetch URL timeout:', url);
      return { error: true, message: 'Request timeout - server took too long to respond' };
    }
    console.error('[FoxCLI] Fetch URL error:', err);
    return { error: true, message: err.message || 'Network error' };
  }
});

// GG.deals API - Fetch keyshop prices by Steam App ID
ipcMain.handle('get-ggdeals-price', async (_, { steamAppIds }: { steamAppIds: number[] }) => {
  try {
    const apiKey = settingsStore.get('ggDealsApiKey');
    const region = settingsStore.get('ggDealsRegion') || 'us';
    
    if (!apiKey) {
      return { success: false, data: {}, error: 'GG.deals API key not configured. Add it in Settings > Steam & Sales.' };
    }
    
    if (!steamAppIds || steamAppIds.length === 0) {
      return { success: false, data: {}, error: 'No Steam App IDs provided' };
    }
    
    // Limit to 100 IDs per request (API limit)
    const limitedIds = steamAppIds.slice(0, 100);
    const idsParam = limitedIds.join(',');
    
    const url = `https://api.gg.deals/v1/prices/by-steam-app-id/?ids=${idsParam}&key=${apiKey}&region=${region}`;
    
    console.log(`[GG.deals] Fetching prices for ${limitedIds.length} games (region: ${region})`);
    console.log(`[GG.deals] URL: https://api.gg.deals/v1/prices/by-steam-app-id/?ids=${idsParam}&key=***&region=${region}`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FoxCLI/1.0',
      },
    });
    
    if (!response.ok) {
      // Try to get error details from response body
      let errorDetails = '';
      try {
        const errorBody = await response.text();
        console.error(`[GG.deals] Error response body: ${errorBody}`);
        errorDetails = errorBody;
      } catch (err) {
        console.warn('[GG.deals] Failed to read error response');
      }
      
      if (response.status === 429) {
        return { success: false, data: {}, error: 'GG.deals rate limit exceeded. Try again later.' };
      }
      if (response.status === 401) {
        return { success: false, data: {}, error: 'Invalid GG.deals API key. Check your settings.' };
      }
      if (response.status === 400) {
        return { success: false, data: {}, error: `GG.deals API bad request: ${errorDetails || 'Unknown error'}` };
      }
      return { success: false, data: {}, error: `GG.deals API error: HTTP ${response.status}` };
    }
    
    const result = await response.json();
    
    if (!result.success) {
      return { success: false, data: {}, error: result.data?.message || 'Unknown API error' };
    }
    
    console.log(`[GG.deals] Got prices for ${Object.keys(result.data).length} games`);
    return { success: true, data: result.data };
    
  } catch (err: any) {
    console.error('[GG.deals] API error:', err);
    return { success: false, data: {}, error: err.message || 'Failed to fetch prices' };
  }
});

// Scan for installed Steam games
ipcMain.handle('get-installed-steam-games', async () => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Common Steam installation paths on Windows
    const steamPaths = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\Steam',
      'D:\\SteamLibrary',
      'E:\\Steam',
      'E:\\SteamLibrary',
    ];
    
    const installedAppIds = new Set<number>();
    
    for (const steamPath of steamPaths) {
      try {
        // Check steamapps folder for installed games
        const steamappsPath = path.join(steamPath, 'steamapps');
        const files = await fs.readdir(steamappsPath);
        
        for (const file of files) {
          if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
        const appId = parseInt(file.replace('appmanifest_', '').replace('.acf', ''), 10);
        if (Number.isFinite(appId) && appId > 0) {
          installedAppIds.add(appId);
        }
          }
        }
        
        // Also check libraryfolders.vdf for additional library locations
        const libFoldersPath = path.join(steamappsPath, 'libraryfolders.vdf');
        try {
          const libFoldersContent = await fs.readFile(libFoldersPath, 'utf-8');
          const pathMatches = libFoldersContent.match(/"path"\s+"([^"]+)"/gi);
          
          if (pathMatches) {
            for (const pathMatch of pathMatches) {
              const libPath = pathMatch.match(/"path"\s+"([^"]+)"/i)?.[1];
              if (libPath && libPath !== steamPath) {
                const libSteamapps = path.join(libPath.replace(/\\\\/g, '\\'), 'steamapps');
                try {
                  const libFiles = await fs.readdir(libSteamapps);
                  for (const file of libFiles) {
                    if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
                      const appId = parseInt(file.replace('appmanifest_', '').replace('.acf', ''), 10);
                      if (Number.isFinite(appId) && appId > 0) {
                        installedAppIds.add(appId);
                      }
                    }
                  }
                } catch (err) {
                  console.warn('[FoxCLI] Failed to read Steam library folder');
                }
              }
            }
          }
        } catch (err) {
          console.warn('[FoxCLI] Failed to read libraryfolders.vdf');
        }
      } catch (err) {
        // Path doesn't exist, continue to next
      }
    }
    
    return Array.from(installedAppIds);
  } catch (err: any) {
    console.error('[FoxCLI] Get installed games error:', err);
    return [];
  }
});

ipcMain.handle('get-steam-disk-info', async () => {
  try {
    const fsPromises = await import('fs/promises');
    const pathMod = await import('path');

    const steamPaths = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\Steam',
      'D:\\SteamLibrary',
      'E:\\Steam',
      'E:\\SteamLibrary',
    ];

    const libraryRoots = new Set<string>();

    for (const steamPath of steamPaths) {
      try {
        const steamappsPath = pathMod.join(steamPath, 'steamapps');
        await fsPromises.access(steamappsPath);
        libraryRoots.add(steamPath);

        const libFoldersPath = pathMod.join(steamappsPath, 'libraryfolders.vdf');
        try {
          const libFoldersContent = await fsPromises.readFile(libFoldersPath, 'utf-8');
          const pathMatches = libFoldersContent.match(/"path"\s+"([^"]+)"/gi);
          if (pathMatches) {
            for (const pathMatch of pathMatches) {
              const libPath = pathMatch.match(/"path"\s+"([^"]+)"/i)?.[1];
              if (libPath) {
                const normalized = libPath.replace(/\\\\/g, '\\');
                libraryRoots.add(normalized);
              }
            }
          }
        } catch (err) {
          console.warn('[SteamDisk] Failed to read libraryfolders.vdf');
        }
      } catch (err) {
      }
    }

    const driveStats = new Map<string, { totalBytes: number; freeBytes: number }>();
    try {
      // SECURITY NOTE: This PowerShell command uses a static, hardcoded script with no user input.
      // The command only reads system drive information and cannot be injected with malicious input.
      // execFile is used (not exec) which prevents shell injection attacks.
      // safeExecFile adds additional input validation for defense in depth.
      const ps = 'Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,FreeSpace,Size | ConvertTo-Json';
      const args = ['-NoProfile', '-Command', ps];
      const { stdout } = await safeExecFile('powershell.exe', args, { windowsHide: true, allowedArgs: args });
      const parsed = JSON.parse(stdout.toString() || '[]');
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      for (const row of rows) {
        const deviceId = String(row?.DeviceID || '').toUpperCase();
        const freeBytes = Number(row?.FreeSpace || 0);
        const totalBytes = Number(row?.Size || 0);
        if (deviceId) {
          driveStats.set(deviceId, {
            freeBytes: Number.isFinite(freeBytes) ? freeBytes : 0,
            totalBytes: Number.isFinite(totalBytes) ? totalBytes : 0,
          });
        }
      }
    } catch (err) {
      console.warn('[SteamDisk] Failed to read drive stats:', err);
    }

    const libraries: Array<{
      drive: string;
      libraryPath: string;
      games: Array<{ appId: number; installDir?: string; sizeOnDiskBytes?: number }>;
    }> = [];

    for (const rootPath of libraryRoots) {
      try {
        const steamappsPath = pathMod.join(rootPath, 'steamapps');
        const files = await fsPromises.readdir(steamappsPath);
        const drive = (pathMod.parse(rootPath).root || '').replace(/\\+$/g, '').toUpperCase() || rootPath.substring(0, 2).toUpperCase();
        const games: Array<{ appId: number; installDir?: string; sizeOnDiskBytes?: number }> = [];

        for (const file of files) {
          if (!file.startsWith('appmanifest_') || !file.endsWith('.acf')) continue;
          const appId = parseInt(file.replace('appmanifest_', '').replace('.acf', ''), 10);
          if (Number.isNaN(appId)) continue;

          try {
            const content = await fsPromises.readFile(pathMod.join(steamappsPath, file), 'utf-8');
            const installDir = content.match(/"installdir"\s+"([^"]+)"/i)?.[1];
            const sizeRaw = content.match(/"SizeOnDisk"\s+"(\d+)"/i)?.[1];
            const sizeOnDiskBytes = sizeRaw ? Number(sizeRaw) : undefined;
            games.push({ appId, installDir, sizeOnDiskBytes: Number.isFinite(sizeOnDiskBytes as number) ? sizeOnDiskBytes : undefined });
          } catch (err) {
            games.push({ appId });
          }
        }

        libraries.push({ drive, libraryPath: rootPath, games });
      } catch (err) {
        console.warn('[SteamDisk] Failed to read Steam library');
      }
    }

    return {
      drives: Array.from(driveStats.entries()).map(([drive, s]) => ({
        drive,
        freeBytes: s.freeBytes,
        totalBytes: s.totalBytes,
      })),
      libraries,
      updatedAt: Date.now(),
    };
  } catch (err: any) {
    console.error('[SteamDisk] IPC error:', err);
    return { error: true, message: err?.message || 'Failed to read Steam disk info' };
  }
});

// Show window from tray
ipcMain.on('show-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// Open external URL (for steam:// protocol, etc)
ipcMain.handle('open-external', async (_, url: string) => {
  try {
    const parsedUrl = new URL(url);
    const allowedProtocols = new Set(['https:', 'steam:']);
    if (!allowedProtocols.has(parsedUrl.protocol)) {
      console.warn('[FoxCLI] Blocked openExternal protocol:', parsedUrl.protocol);
      return false;
    }
    if (parsedUrl.protocol === 'https:' && LOCAL_HOSTNAMES.has(parsedUrl.hostname)) {
      console.warn('[FoxCLI] Blocked openExternal localhost URL:', parsedUrl.hostname);
      return false;
    }
    if (parsedUrl.protocol === 'steam:') {
      const host = ((parsedUrl.host || parsedUrl.pathname || '').replace(/^\/+/, '').split('/')[0]) || '';
      if (!ALLOWED_STEAM_PROTOCOL_HOSTS.has(host)) {
        console.warn('[FoxCLI] Blocked openExternal steam host:', host);
        return false;
      }
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const appId = pathParts[1] ? pathParts[1] : pathParts[0];
      if (['run', 'rungameid', 'install'].includes(host)) {
        if (!appId || !/^\d+$/.test(appId)) {
          console.warn('[FoxCLI] Blocked openExternal steam appId');
          return false;
        }
      }
    }
    await shell.openExternal(url);
    return true;
  } catch (err: any) {
    console.error('[FoxCLI] Open external error:', err);
    return false;
  }
});

// MAL Credentials IPC handlers (persisted to disk)
ipcMain.handle('get-mal-credentials', () => {
  return malCredentialsStore.getAll();
});

ipcMain.handle('set-mal-credentials', (_, credentials: Partial<MalCredentials>) => {
  malCredentialsStore.setAll(credentials);
  return true;
});

ipcMain.handle('clear-mal-credentials', () => {
  malCredentialsStore.clear();
  return true;
});

// Website data export IPC handlers
ipcMain.handle('export-website-data', async () => {
  try {
    const data = await exportWebsiteDataToFile();
    return { success: true, data };
  } catch (err: any) {
    console.error('[FoxCLI] Failed to export website data:', err);
    throw new Error(`Failed to export website data: ${err.message}`);
  }
});

ipcMain.handle('get-website-data', async () => {
  try {
    return await collectWebsiteData();
  } catch (err: any) {
    console.error('[FoxCLI] Failed to get website data:', err);
    throw new Error(`Failed to get website data: ${err.message}`);
  }
});

// Tier list IPC handlers
ipcMain.handle('save-tier-lists', async (_, data: any) => {
  try {
    const userDataPath = app.getPath('userData');
    const tierListPath = path.join(userDataPath, 'tier-lists.json');

    // Atomic write: write to temp file, then rename
    const dir = path.dirname(tierListPath);
    const tempPath = path.join(dir, `.tmp-tierlists-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const serialized = JSON.stringify(data, null, 2);
    const maxBytes = 5 * 1024 * 1024;
    if (Buffer.byteLength(serialized, 'utf-8') > maxBytes) {
      throw new Error('Tier list data too large');
    }
    fs.writeFileSync(tempPath, serialized, 'utf-8');
    fs.renameSync(tempPath, tierListPath);

    console.log('[FoxCLI] Tier lists saved to:', tierListPath);

    return true;
  } catch (err: any) {
    console.error('[FoxCLI] Failed to save tier lists:', err);
    throw new Error(`Failed to save tier lists: ${err.message}`);
  }
});

ipcMain.handle('load-tier-lists', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const tierListPath = path.join(userDataPath, 'tier-lists.json');
    
    if (fs.existsSync(tierListPath)) {
      const data = fs.readFileSync(tierListPath, 'utf-8');
      try {
        return JSON.parse(data);
      } catch {
        console.error('[FoxCLI] Tier lists JSON is invalid');
        return null;
      }
    }
    
    return null;
  } catch (err: any) {
    console.error('[FoxCLI] Failed to load tier lists:', err);
    return null;
  }
});

ipcMain.handle('clear-tier-lists', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const tierListPath = path.join(userDataPath, 'tier-lists.json');
    
    if (fs.existsSync(tierListPath)) {
      fs.unlinkSync(tierListPath);
      console.log('[FoxCLI] Tier lists cleared');
    }
    
    return true;
  } catch (err: any) {
    console.error('[FoxCLI] Failed to clear tier lists:', err);
    throw new Error(`Failed to clear tier lists: ${err.message}`);
  }
});

// Website data export to file
const exportWebsiteDataToFile = async () => {
  try {
    console.log('[FoxCLI] Starting website data export...');
    console.log('[FoxCLI] Collecting data from MAL, Steam, tier lists...');
    const data = await collectWebsiteData();
    console.log('[FoxCLI] Data collected successfully');
    console.log('[FoxCLI] Profile:', data.profile.displayName);
    console.log('[FoxCLI] Anime stats:', data.anime.stats ? 'Present' : 'Null');
    console.log('[FoxCLI] Gaming stats:', data.gaming.stats ? 'Present' : 'Null');
    console.log('[FoxCLI] Searching for website folder...');
    console.log('[FoxCLI] __dirname:', __dirname);
    console.log('[FoxCLI] process.cwd():', process.cwd());
    
    // Try to find the website public folder from various possible locations
    // __dirname is: C:\...\Electron\app\dist (compiled output folder)
    // Target is:    C:\...\Electron\website\public\data.json
    // So we need to go up 2 levels from __dirname to reach Electron/
    const possiblePaths = [
      // From app/dist/ go up 2 levels to Electron/, then to website/
      path.join(__dirname, '..', '..', 'website', 'public', 'data.json'),
      // From cwd (should be Electron/ folder)
      path.join(process.cwd(), 'website', 'public', 'data.json'),
      // Fallback to userData
      path.join(app.getPath('userData'), 'website-data.json'),
    ];
    
    let written = false;
    let lastError: Error | null = null;
    
    for (const dataPath of possiblePaths) {
      try {
        console.log('[FoxCLI] Trying path:', dataPath);
        const dir = path.dirname(dataPath);
        
        // Check if directory exists or can be created
        if (!fs.existsSync(dir)) {
          console.log('[FoxCLI] Creating directory:', dir);
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Try to write the file
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        console.log('[FoxCLI] ✓ Website data successfully exported to:', dataPath);
        written = true;
        break;
      } catch (err: any) {
        console.log('[FoxCLI] ✗ Failed to write to:', dataPath, '-', err.message);
        lastError = err;
      }
    }
    
    if (!written) {
      throw new Error(`Could not write to any known path. Last error: ${lastError?.message}`);
    }
    
    return data;
  } catch (err: any) {
    console.error('[FoxCLI] Failed to export website data:', err);
    throw err;
  }
};

// API server management - uses functions from apiServer.ts
const startApiServerInternal = async () => {
  if (apiServerRunning) {
    console.log('[FoxCLI] API server already running');
    return;
  }

  const port = websiteSettingsStore.get('apiPort');
  try {
    await startApiServer(port, API_BIND_HOST);
    apiServerRunning = true;
    console.log(`[FoxCLI] Website API server started on port ${port}`);
  } catch (err: any) {
    console.error('[FoxCLI] Failed to start API server:', err);
    throw new Error(`Failed to start API server: ${err.message}`);
  }
};

const stopApiServerInternal = () => {
  stopApiServer();
  apiServerRunning = false;
  console.log('[FoxCLI] Website API server stopped');
};

ipcMain.handle('start-website-server', async () => {
  try {
    await startApiServerInternal();
    return true;
  } catch (err: any) {
    console.error('[FoxCLI] Failed to start website server:', err);
    throw err;
  }
});

ipcMain.handle('stop-website-server', () => {
  stopApiServerInternal();
  return true;
});

ipcMain.handle('get-website-server-status', () => {
  return {
    running: apiServerRunning,
    port: websiteSettingsStore.get('apiPort'),
  };
});

// Notification helper
function showNotification(title: string, body: string) {
  if (!settingsStore.get('showNotifications')) return;
  
  new Notification({ title, body }).show();
}

// Create system tray
function createTray() {
  // Try to use the proper icon file, fallback to base64
  let trayIcon: Electron.NativeImage;
  const iconPath = getIconPath();
  
  try {
    // For tray, we need a smaller icon - use the 16x16 PNG
    const trayIconPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'icons', 'png', '16x16.png')
      : path.join(__dirname, '..', '..', 'resources', 'icons', 'png', '16x16.png');
    
    if (fs.existsSync(trayIconPath)) {
      trayIcon = nativeImage.createFromPath(trayIconPath);
    } else if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    } else {
      trayIcon = nativeImage.createFromDataURL(FOX_ICON_BASE64).resize({ width: 16, height: 16 });
    }
  } catch (err) {
    trayIcon = nativeImage.createFromDataURL(FOX_ICON_BASE64).resize({ width: 16, height: 16 });
  }
  
  tray = new Tray(trayIcon);
  
  tray.setToolTip('FoxCLI - Discord RPC Active');
  
  const updateContextMenu = () => {
    const rpcStatus = rpcReady ? 'Discord: Connected' : 'Discord: Disconnected';
    const extStatus = extensionConnected ? 'Extension: Connected' : 'Extension: Disconnected';
    const currentAnime = lastPayload?.anime ? `Watching: ${lastPayload.anime}` : 'Idle';
    const pauseLabel = rpcPaused ? '⏸ RPC Paused' : 'Pause RPC';
    const steamStatus = steamGameRunning 
      ? `🎮 Playing: ${steamGameName || 'Steam Game'}` 
      : 'Steam: No game running';
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'FoxCLI', enabled: false },
      { type: 'separator' },
      { label: rpcStatus, enabled: false },
      { label: extStatus, enabled: false },
      { label: steamStatus, enabled: false },
      { label: rpcPaused ? '⏸ RPC is PAUSED' : (steamGameRunning ? '🎮 Steam RPC Active' : currentAnime), enabled: false },
      { type: 'separator' },
      { 
        label: 'Show FoxCLI', 
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            // Force window to front on Windows
            mainWindow.setAlwaysOnTop(true);
            mainWindow.setAlwaysOnTop(false);
          }
        }
      },
      {
        label: pauseLabel,
        type: 'checkbox',
        checked: rpcPaused,
        click: (menuItem) => {
          rpcPaused = menuItem.checked;
          settingsStore.set('rpcPaused', rpcPaused);
          
          if (rpcPaused && rpcClient && rpcReady) {
            rpcClient.clearActivity();
            console.log('[FoxCLI] RPC paused - activity cleared');
          } else if (!rpcPaused && lastPayload) {
            // Re-apply last payload when unpaused
            updateDiscordRPC();
            console.log('[FoxCLI] RPC resumed');
          }
          
          // Notify renderer of pause state change
          broadcastStatus();
          // Update tray menu to show new state
          updateContextMenu();
        }
      },
      { type: 'separator' },
      { 
        label: 'Quit', 
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);
    
    tray?.setContextMenu(contextMenu);
    
    // Update tooltip to show Steam game status
    if (steamGameRunning) {
      tray?.setToolTip(`FoxCLI - Playing ${steamGameName || 'Steam Game'}`);
    } else if (universalRpcEnabled) {
      tray?.setToolTip('FoxCLI - Universal RPC Active');
    } else {
      tray?.setToolTip('FoxCLI - Discord RPC Active');
    }
  };
  
  // Update menu periodically to reflect current status
  updateContextMenu();
  if (trayUpdateInterval) {
    clearInterval(trayUpdateInterval);
  }
  trayUpdateInterval = setInterval(updateContextMenu, 5000);
  
  // Single click on tray icon brings window to front
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
      // Force window to front on Windows
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
    }
  });
  
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
    }
  });
}

app.whenReady().then(async () => {
  // Check if started with --hidden flag
  const startHidden = process.argv.includes('--hidden') || settingsStore.get('startMinimized');
  
  // Load RPC pause state from store
  rpcPaused = settingsStore.get('rpcPaused') ?? false;
  console.log(`[FoxCLI] RPC pause state loaded: ${rpcPaused}`);
  
  // Set up the now watching state getter for the API server
  setNowWatchingStateGetter(getCurrentWatchingState);
  console.log('[FoxCLI] Now watching state getter registered');
  
  createWindow();
  createTray();
  await setupWebSocket();
  
  // Load universal RPC state from store BEFORE setting up RPC clients
  universalRpcEnabled = settingsStore.get('universalRpcEnabled') ?? false;
  console.log(`[FoxCLI] Universal RPC state loaded: ${universalRpcEnabled}`);
  
  await setupRpc();
  await setupUniversalRpc();
  
  // Start Steam game detection if enabled
  const steamDetectionEnabled = settingsStore.get('steamDetectionEnabled') ?? true;
  if (steamDetectionEnabled) {
    startSteamDetection();
  }
  
  // If universal RPC is enabled on startup, set it up
  if (universalRpcEnabled && universalRpcClient && universalRpcReady) {
    updateUniversalRPC();
  }
  
  // Auto-start website API server if enabled
  const websiteEnabled = settingsStore.get('websiteEnabled');
  if (websiteEnabled) {
    try {
      await startApiServerInternal();
      console.log('[FoxCLI] Website API server auto-started');
    } catch (err: any) {
      console.error('[FoxCLI] Failed to auto-start website API server:', err.message);
    }
  }
  
  // Export website data to data.json on startup
  console.log('[FoxCLI] Preparing to export website data...');
  try {
    await exportWebsiteDataToFile();
    console.log('[FoxCLI] ✓ Website data export complete');
  } catch (err: any) {
    console.error('[FoxCLI] ✗ Failed to export website data:', err.message || err);
    console.error('[FoxCLI] Stack:', err.stack);
  }
  
  // Hide window if starting minimized
  if (startHidden && mainWindow) {
    mainWindow.hide();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

// Prevent window-all-closed from quitting when using tray
app.on('window-all-closed', () => {
  // Only quit if not using tray mode or if explicitly quitting
  if (!settingsStore.get('closeToTray') || isQuitting) {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }
});

// Clean up before quit
app.on('before-quit', () => {
  isQuitting = true;

  if (trayUpdateInterval) {
    clearInterval(trayUpdateInterval);
    trayUpdateInterval = null;
  }

  // Clean up OAuth server
  if (oauthServer) {
    console.log('[FoxCLI] Closing OAuth server...');
    oauthServer.close();
    oauthServer = null;
  }

  // Clean up API server
  if (apiServerRunning) {
    console.log('[FoxCLI] Closing API server...');
    stopApiServerInternal();
  }
  
  // Stop Steam detection
  stopSteamDetection();
});
