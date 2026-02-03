import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { app, safeStorage } from 'electron';

/**
 * Atomically write data to a file by writing to a temp file first, then renaming.
 * This prevents data corruption if the app crashes during write.
 */
function writeFileAtomic(filePath: string, data: string): void {
  const dir = path.dirname(filePath);
  const tempName = `.tmp-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const tempPath = path.join(dir, tempName);

  try {
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to temp file
    fs.writeFileSync(tempPath, data, { encoding: 'utf-8', flag: 'wx' });

    // Rename temp file to target (atomic operation on most filesystems)
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { force: true });
      }
    } catch (err) {
      console.warn('[FoxCLI] Failed to clean up temp settings file');
    }
    throw err;
  } finally {
    try {
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { force: true });
      }
    } catch (err) {
      console.warn('[FoxCLI] Failed to clean up temp settings file');
    }
  }
}

const SENSITIVE_SETTINGS_KEYS = ['steamApiKey', 'ggDealsApiKey', 'wssAuthToken'] as const;
type SensitiveSettingKey = typeof SENSITIVE_SETTINGS_KEYS[number];

const ENCRYPTED_PREFIX = 'enc:';

function encryptIfAvailable(value: string): string {
  if (!value) return '';
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[FoxCLI] Safe storage unavailable; not persisting sensitive value');
    return '';
  }
  try {
    const encrypted = safeStorage.encryptString(value);
    return `${ENCRYPTED_PREFIX}${encrypted.toString('base64')}`;
  } catch (err) {
    console.warn('[FoxCLI] Failed to encrypt value; not persisting sensitive value');
    return '';
  }
}

function decryptIfNeeded(value: string): string {
  if (!value) return '';
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
  if (!safeStorage.isEncryptionAvailable()) return '';
  try {
    const raw = value.slice(ENCRYPTED_PREFIX.length);
    return safeStorage.decryptString(Buffer.from(raw, 'base64'));
  } catch (err) {
    console.warn('[FoxCLI] Failed to decrypt value');
    return '';
  }
}

function serializeSettings(settings: AppSettings): AppSettings {
  const serialized: AppSettings = { ...settings };
  for (const key of SENSITIVE_SETTINGS_KEYS) {
    const value = String(serialized[key] || '');
    serialized[key] = encryptIfAvailable(value) as AppSettings[SensitiveSettingKey];
  }
  return serialized;
}

function deserializeSettings(settings: AppSettings): AppSettings {
  const deserialized: AppSettings = { ...settings };
  for (const key of SENSITIVE_SETTINGS_KEYS) {
    const value = String(deserialized[key] || '');
    deserialized[key] = decryptIfNeeded(value) as AppSettings[SensitiveSettingKey];
  }
  return deserialized;
}

export interface AppSettings {
  closeToTray: boolean;
  startMinimized: boolean;
  autoLaunch: boolean;
  showNotifications: boolean;
  rpcPaused: boolean; // Discord RPC pause state
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
}

export interface WebsiteSettings {
  enabled: boolean;
  apiPort: number;
  displayName: string;
  bio: string;
  avatar: string;
  socials: {
    discord?: string;
    twitter?: string;
    mal?: string;
    github?: string;
  };
  showAnimeStats: boolean;
  showGamingStats: boolean;
  showTierList: boolean;
  showTop10: boolean;
}

const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  enabled: true,
  apiPort: 8765,
  displayName: 'Foxems',
  bio: '',
  avatar: '',
  socials: {},
  showAnimeStats: true,
  showGamingStats: true,
  showTierList: true,
  showTop10: true,
};

export interface MalCredentials {
  clientId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  username: string;
  userId: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  closeToTray: true,
  startMinimized: false,
  autoLaunch: false,
  showNotifications: true,
  rpcPaused: false, // RPC enabled by default
  wssAuthToken: '',
  // Steam & Sales defaults
  steamApiKey: '',
  steamId: '',
  ggDealsApiKey: '',
  ggDealsRegion: 'us',
  // Website defaults
  websiteEnabled: true,
  websiteApiPort: 8765,
  websiteDisplayName: 'Foxems',
  websiteBio: '',
  websiteAvatar: '',
  websiteDiscord: '',
  websiteTwitter: '',
  websiteMal: '',
  websiteGithub: '',
  websiteShowAnimeStats: true,
  websiteShowGamingStats: true,
  websiteShowTierList: true,
  websiteShowTop10: true,
  // Universal RPC defaults
  universalRpcEnabled: false,
  universalRpcText: "Chilling",
  universalRpcButtonLabel: "Visit My Website",
  universalRpcButtonUrl: "https://foxems.vercel.app/",
  // Steam detection defaults
  steamDetectionEnabled: true,
};

const DEFAULT_MAL_CREDENTIALS: MalCredentials = {
  clientId: '',
  accessToken: '',
  refreshToken: '',
  tokenExpiry: 0,
  username: '',
  userId: '',
};

class SettingsStore {
  private settings: AppSettings;
  private _filePath: string | null = null;
  private saveQueue: Promise<void> = Promise.resolve();

  constructor() {
    // Lazy initialization of settings - will be loaded on first access
    this.settings = { ...DEFAULT_SETTINGS };
  }

  /**
   * Get the file path for settings storage.
   * Uses lazy initialization to avoid accessing app.getPath before app is ready.
   */
  private get filePath(): string {
    if (!this._filePath) {
      const userDataPath = app.getPath('userData');
      this._filePath = path.join(userDataPath, 'settings.json');
    }
    return this._filePath;
  }

  private loadSettings(): AppSettings {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(data);
        // Merge with defaults to ensure all keys exist
        return deserializeSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (err) {
      console.error('[FoxCLI] Failed to load settings:', err);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        const payload = serializeSettings(this.settings);
        writeFileAtomic(this.filePath, JSON.stringify(payload, null, 2));
        console.log('[FoxCLI] Settings saved');
      } catch (err) {
        console.error('[FoxCLI] Failed to save settings:', err);
      }
    });
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    // Lazy load settings on first access
    if (!this._filePath) {
      this.settings = this.loadSettings();
    }
    return this.settings[key];
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    // Lazy load settings on first access
    if (!this._filePath) {
      this.settings = this.loadSettings();
    }
    // Runtime validation to prevent invalid keys
    if (!(key in DEFAULT_SETTINGS)) {
      throw new Error(`Invalid setting key: ${String(key)}`);
    }
    this.settings[key] = value;
    this.saveSettings();
  }

  getAll(): AppSettings {
    // Lazy load settings on first access
    if (!this._filePath) {
      this.settings = this.loadSettings();
    }
    return { ...this.settings };
  }

  setAll(newSettings: Partial<AppSettings>): void {
    // Lazy load settings on first access
    if (!this._filePath) {
      this.settings = this.loadSettings();
    }
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }
}

// Singleton instance
export const settingsStore = new SettingsStore();

// MAL Credentials Store (separate file for security)
class MalCredentialsStore {
  private credentials: MalCredentials;
  private _filePath: string | null = null;

  constructor() {
    // Lazy initialization of credentials - will be loaded on first access
    this.credentials = { ...DEFAULT_MAL_CREDENTIALS };
  }

  /**
   * Get the file path for credentials storage.
   * Uses lazy initialization to avoid accessing app.getPath before app is ready.
   */
  private get filePath(): string {
    if (!this._filePath) {
      const userDataPath = app.getPath('userData');
      this._filePath = path.join(userDataPath, 'mal-credentials.json');
    }
    return this._filePath;
  }

  private loadCredentials(): MalCredentials {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && typeof parsed.encrypted === 'string') {
          if (!safeStorage.isEncryptionAvailable()) {
            console.warn('[FoxCLI] Safe storage unavailable, cannot decrypt MAL credentials');
            return { ...DEFAULT_MAL_CREDENTIALS };
          }
          try {
            const decrypted = safeStorage.decryptString(Buffer.from(parsed.encrypted, 'base64'));
            const parsedCredentials = JSON.parse(decrypted);
            return { ...DEFAULT_MAL_CREDENTIALS, ...parsedCredentials };
          } catch (err) {
            console.error('[FoxCLI] Failed to decrypt MAL credentials:', err);
            return { ...DEFAULT_MAL_CREDENTIALS };
          }
        }
        const merged = { ...DEFAULT_MAL_CREDENTIALS, ...parsed };
        if (safeStorage.isEncryptionAvailable()) {
          this.credentials = merged;
          this.saveCredentials();
        }
        return merged;
      }
    } catch (err) {
      console.error('[FoxCLI] Failed to load MAL credentials:', err);
    }
    return { ...DEFAULT_MAL_CREDENTIALS };
  }

  private saveCredentials(): void {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('[FoxCLI] Safe storage unavailable; refusing to persist MAL credentials');
        try {
          if (fs.existsSync(this.filePath)) {
            fs.rmSync(this.filePath, { force: true });
          }
        } catch (err) {
          console.warn('[FoxCLI] Failed to remove legacy credentials file');
        }
        return;
      }
      const encrypted = safeStorage.encryptString(JSON.stringify(this.credentials));
      writeFileAtomic(this.filePath, JSON.stringify({ encrypted: encrypted.toString('base64') }, null, 2));
      console.log('[FoxCLI] MAL credentials saved');
    } catch (err) {
      console.error('[FoxCLI] Failed to save MAL credentials:', err);
    }
  }

  get<K extends keyof MalCredentials>(key: K): MalCredentials[K] {
    // Lazy load credentials on first access
    if (!this._filePath) {
      this.credentials = this.loadCredentials();
    }
    return this.credentials[key];
  }

  set<K extends keyof MalCredentials>(key: K, value: MalCredentials[K]): void {
    // Lazy load credentials on first access
    if (!this._filePath) {
      this.credentials = this.loadCredentials();
    }
    // Runtime validation to prevent invalid keys
    if (!(key in DEFAULT_MAL_CREDENTIALS)) {
      throw new Error(`Invalid credentials key: ${String(key)}`);
    }
    this.credentials[key] = value;
    this.saveCredentials();
  }

  getAll(): MalCredentials {
    // Lazy load credentials on first access
    if (!this._filePath) {
      this.credentials = this.loadCredentials();
    }
    return { ...this.credentials };
  }

  setAll(newCredentials: Partial<MalCredentials>): void {
    // Lazy load credentials on first access
    if (!this._filePath) {
      this.credentials = this.loadCredentials();
    }
    this.credentials = { ...this.credentials, ...newCredentials };
    this.saveCredentials();
  }

  clear(): void {
    // Lazy load credentials on first access
    if (!this._filePath) {
      this.credentials = this.loadCredentials();
    }
    this.credentials = { ...DEFAULT_MAL_CREDENTIALS };
    this.saveCredentials();
  }
}

export const malCredentialsStore = new MalCredentialsStore();

// Website Settings Store
class WebsiteSettingsStore {
  private settings: WebsiteSettings;
  private _filePath: string | null = null;

  constructor() {
    this.settings = { ...DEFAULT_WEBSITE_SETTINGS };
  }

  private get filePath(): string {
    if (!this._filePath) {
      const userDataPath = app.getPath('userData');
      this._filePath = path.join(userDataPath, 'website-settings.json');
    }
    return this._filePath;
  }

  private loadSettings(): WebsiteSettings {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(data);
        return { ...DEFAULT_WEBSITE_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.error('[FoxCLI] Failed to load website settings:', err);
    }
    return { ...DEFAULT_WEBSITE_SETTINGS };
  }

  private saveSettings(): void {
    try {
      writeFileAtomic(this.filePath, JSON.stringify(this.settings, null, 2));
      console.log('[FoxCLI] Website settings saved');
    } catch (err) {
      console.error('[FoxCLI] Failed to save website settings:', err);
    }
  }

  get<K extends keyof WebsiteSettings>(key: K): WebsiteSettings[K] {
    if (!this._filePath) {
      this.settings = this.loadSettings();
    }
    return this.settings[key];
  }

  set<K extends keyof WebsiteSettings>(key: K, value: WebsiteSettings[K]): void {
    if (!this._filePath) {
      this.settings = this.loadSettings();
    }
    if (!(key in DEFAULT_WEBSITE_SETTINGS)) {
      throw new Error(`Invalid website setting key: ${String(key)}`);
    }
    this.settings[key] = value;
    this.saveSettings();
  }

  getAll(): WebsiteSettings {
    if (!this._filePath) {
      this.settings = this.loadSettings();
    }
    return { ...this.settings };
  }

  setAll(newSettings: Partial<WebsiteSettings>): void {
    if (!this._filePath) {
      this.settings = this.loadSettings();
    }
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }
}

export const websiteSettingsStore = new WebsiteSettingsStore();
