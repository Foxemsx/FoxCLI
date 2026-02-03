import { motion } from 'framer-motion';
import { X, Settings, Palette, ChevronRight, Gamepad2, Activity, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme, ACCENTS, BACKGROUNDS, AccentKey, BackgroundKey } from '../hooks/useTheme';
import type { AppSettings } from '../renderer.d';

type SettingsModalProps = {
  onClose: () => void;
};

type SettingsTab = 'general' | 'palette' | 'steam' | 'profiler' | 'website';

// Simple Toggle Component
function Toggle({ label, description, checked, onChange }: { 
  label: string; 
  description?: string;
  checked: boolean; 
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex flex-col">
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
        {description && (
          <span className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</span>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors duration-200`}
        style={{ backgroundColor: checked ? 'var(--status-online)' : 'var(--text-muted)' }}
      >
        <div
          className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// Sidebar navigation item
function NavItem({ icon: Icon, label, active, onClick }: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center justify-between rounded-md px-3 py-2 mb-1 transition-all duration-150`}
      style={{
        backgroundColor: active ? 'var(--bg-elevated)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span className="font-medium text-sm">{label}</span>
      </div>
      <ChevronRight 
        size={14} 
        className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}
      />
    </button>
  );
}

// Color swatch for accent selection
function AccentSwatch({ accentKey, active, onClick }: {
  accentKey: AccentKey;
  active: boolean;
  onClick: () => void;
}) {
  const accent = ACCENTS[accentKey];
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`group relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-150`}
      style={{
        backgroundColor: active ? 'var(--bg-elevated)' : 'transparent',
        border: active ? `2px solid ${accent.primary}` : '2px solid transparent',
      }}
    >
      <div
        className="w-12 h-12 rounded-full shadow-lg transition-transform group-hover:scale-110"
        style={{ backgroundColor: accent.primary }}
      />
      <span 
        className="text-xs font-medium capitalize"
        style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        {accentKey}
      </span>
      {active && (
        <div
          className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: accent.primary }}
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </button>
  );
}

// Background theme card
function BackgroundCard({ bgKey, active, onClick }: {
  bgKey: BackgroundKey;
  active: boolean;
  onClick: () => void;
}) {
  const bg = BACKGROUNDS[bgKey];
  
  const getPreviewStyle = (): React.CSSProperties => {
    switch (bgKey) {
      case 'solid':
        return { background: '#1e1f22' };
      case 'glass':
        return { background: 'linear-gradient(135deg, rgba(30, 31, 34, 0.9), rgba(43, 45, 49, 0.85))' };
      case 'oled':
        return { background: '#000000' };
      case 'mesh':
        return { 
          background: `radial-gradient(at 40% 20%, var(--accent-primary) 0px, transparent 50%),
                       radial-gradient(at 80% 0%, rgba(88, 101, 242, 0.15) 0px, transparent 50%),
                       #1e1f22`
        };
      default:
        return { background: '#1e1f22' };
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`group flex flex-col gap-2 p-2 rounded-lg transition-all duration-150`}
      style={{
        border: active ? '2px solid var(--accent-primary)' : '2px solid var(--bg-elevated)',
      }}
    >
      <div
        className="w-full h-20 rounded-md transition-transform group-hover:scale-[1.02]"
        style={getPreviewStyle()}
      />
      <span 
        className="text-xs font-medium"
        style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        {bg.label}
      </span>
    </button>
  );
}

// Steam Settings Content Component
function SteamSettingsContent({ settings, updateSetting }: { 
  settings: AppSettings; 
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}) {
  const [saved, setSaved] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    steamApiKey: settings.steamApiKey || '',
    steamId: settings.steamId || '',
    ggDealsApiKey: settings.ggDealsApiKey || '',
    ggDealsRegion: settings.ggDealsRegion || 'us',
  });

  // Sync local state when settings prop changes
  useEffect(() => {
    setLocalSettings({
      steamApiKey: settings.steamApiKey || '',
      steamId: settings.steamId || '',
      ggDealsApiKey: settings.ggDealsApiKey || '',
      ggDealsRegion: settings.ggDealsRegion || 'us',
    });
  }, [settings]);

  const handleSave = async () => {
    updateSetting('steamApiKey', localSettings.steamApiKey);
    updateSetting('steamId', localSettings.steamId);
    updateSetting('ggDealsApiKey', localSettings.ggDealsApiKey);
    updateSetting('ggDealsRegion', localSettings.ggDealsRegion);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const regions = [
    { code: 'us', label: 'United States (USD)' },
    { code: 'eu', label: 'Europe (EUR)' },
    { code: 'gb', label: 'United Kingdom (GBP)' },
    { code: 'de', label: 'Germany (EUR)' },
    { code: 'pl', label: 'Poland (PLN)' },
    { code: 'au', label: 'Australia (AUD)' },
    { code: 'ca', label: 'Canada (CAD)' },
    { code: 'br', label: 'Brazil (BRL)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <section className="mb-8">
        <h3 
          className="mb-1 text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          Steam Integration
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Configure your Steam account to access your game library and wishlist
        </p>

        <div className="space-y-4">
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Steam API Key
            </label>
            <input
              type="password"
              value={localSettings.steamApiKey}
              onChange={e => setLocalSettings(prev => ({ ...prev, steamApiKey: e.target.value }))}
              placeholder="Enter your Steam API key"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
              style={{ 
                backgroundColor: 'var(--bg-primary)', 
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-elevated)'
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Get your API key from <a href="https://steamcommunity.com/dev/apikey" target="_blank" className="text-[var(--accent-primary)] hover:underline">steamcommunity.com/dev/apikey</a>
            </p>
          </div>

          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Steam ID (64-bit)
            </label>
            <input
              type="text"
              value={localSettings.steamId}
              onChange={e => setLocalSettings(prev => ({ ...prev, steamId: e.target.value }))}
              placeholder="e.g., 76561198012345678"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
              style={{ 
                backgroundColor: 'var(--bg-primary)', 
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-elevated)'
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Find your Steam ID at <a href="https://steamid.io" target="_blank" className="text-[var(--accent-primary)] hover:underline">steamid.io</a>
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 
          className="mb-1 text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          GG.deals Price Comparison
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Get real-time prices from keyshops (Eneba, GAMIVO, G2A, etc.) using the GG.deals API
        </p>

        <div className="space-y-4">
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              GG.deals API Key
            </label>
            <input
              type="password"
              value={localSettings.ggDealsApiKey}
              onChange={e => setLocalSettings(prev => ({ ...prev, ggDealsApiKey: e.target.value }))}
              placeholder="Enter your GG.deals API key"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
              style={{ 
                backgroundColor: 'var(--bg-primary)', 
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-elevated)'
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Get your free API key from <a href="https://gg.deals/settings/" target="_blank" className="text-[var(--accent-primary)] hover:underline">gg.deals/settings</a> (requires account)
            </p>
          </div>

          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Price Region
            </label>
            <select
              value={localSettings.ggDealsRegion}
              onChange={e => setLocalSettings(prev => ({ ...prev, ggDealsRegion: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
              style={{ 
                backgroundColor: 'var(--bg-primary)', 
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-elevated)'
              }}
            >
              {regions.map(r => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 
          className="mb-1 text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          Supported Price Sources
        </h3>

        <div 
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-elevated)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-primary)20' }}>
              <Gamepad2 size={16} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Official Stores (CheapShark)</h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Free, no API key required</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Steam', 'GOG', 'Humble Store', 'Epic Games', 'Fanatical', 'GreenManGaming'].map(store => (
              <span 
                key={store}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                {store}
              </span>
            ))}
          </div>
          
          <div className="flex items-center gap-3 mb-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--bg-elevated)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ff6b0020' }}>
              <Gamepad2 size={16} style={{ color: '#ff6b00' }} />
            </div>
            <div>
              <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Keyshops (GG.deals API)</h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Requires free API key</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Eneba', 'GAMIVO', 'G2A', 'Kinguin', 'CDKeys', 'Instant Gaming'].map(store => (
              <span 
                key={store}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: '#ff6b0015', color: '#ff6b00' }}
              >
                {store}
              </span>
            ))}
          </div>
        </div>
      </section>

      <button
        onClick={handleSave}
        className="px-6 py-2.5 rounded-lg font-medium text-sm transition-all"
        style={{ 
          backgroundColor: saved ? 'var(--status-online)' : 'var(--accent-primary)', 
          color: 'white' 
        }}
      >
        {saved ? '✓ Settings Saved!' : 'Save All Settings'}
      </button>
    </motion.div>
  );
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<AppSettings>({
    closeToTray: true,
    startMinimized: false,
    autoLaunch: false,
    showNotifications: true,
    rpcPaused: false,
    wssAuthToken: '',
    steamApiKey: '',
    steamId: '',
    ggDealsApiKey: '',
    ggDealsRegion: 'us',
    websiteEnabled: false,
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
    universalRpcEnabled: false,
    universalRpcText: 'Chilling',
    universalRpcButtonLabel: 'Visit My Website',
    universalRpcButtonUrl: 'https://foxems.vercel.app/',
    steamDetectionEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Memory profiler state
  interface MemoryStats {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    arrayBuffers: number;
  }
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [memoryHistory, setMemoryHistory] = useState<{ time: number; used: number }[]>([]);
  
  const { accent, background, setAccent, setBackground } = useTheme();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await window.nexus?.getSettings?.();
        if (loadedSettings) {
          setSettings(loadedSettings);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);
  
  // Memory profiler - poll memory stats when tab is active
  useEffect(() => {
    if (activeTab !== 'profiler') return;
    
    const updateMemory = async () => {
      try {
        const stats = await window.nexus?.getMemoryUsage?.();
        if (stats) {
          setMemoryStats(stats);
          setMemoryHistory(prev => {
            const newHistory = [...prev, { time: Date.now(), used: stats.heapUsed }];
            // Keep last 30 data points (30 seconds)
            return newHistory.slice(-30);
          });
        }
      } catch (err) {
        console.error('Failed to get memory stats:', err);
      }
    };
    
    updateMemory(); // Initial load
    const interval = setInterval(updateMemory, 1000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  // Update a single setting
  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      await window.nexus?.setSetting?.(key, value);
    } catch (err) {
      console.error(`Failed to save setting ${key}:`, err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        className="relative flex w-[800px] h-[560px] overflow-hidden rounded-xl shadow-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', duration: 0.35 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar */}
        <div 
          className="w-[200px] flex flex-col p-3"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <div className="mb-4">
            <h3 
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Settings
            </h3>
          </div>
          
          <nav className="flex-1">
            <NavItem 
              icon={Settings} 
              label="General" 
              active={activeTab === 'general'} 
              onClick={() => setActiveTab('general')} 
            />
            <NavItem 
              icon={Palette} 
              label="Appearance" 
              active={activeTab === 'palette'} 
              onClick={() => setActiveTab('palette')} 
            />
            <NavItem 
              icon={Gamepad2} 
              label="Steam & Games" 
              active={activeTab === 'steam'} 
              onClick={() => setActiveTab('steam')} 
            />
            <NavItem 
              icon={Activity} 
              label="Performance" 
              active={activeTab === 'profiler'} 
              onClick={() => setActiveTab('profiler')} 
            />
            <NavItem 
              icon={Globe} 
              label="Website" 
              active={activeTab === 'website'} 
              onClick={() => setActiveTab('website')} 
            />
          </nav>

          <div 
            className="mt-auto pt-3 border-t text-xs"
            style={{ borderColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            <span style={{ color: 'var(--accent-primary)' }} className="font-semibold">FoxCLI</span>
            <span className="ml-1">v0.2.0</span>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div 
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'var(--bg-elevated)' }}
          >
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {activeTab === 'general' ? 'General Settings' : 
               activeTab === 'palette' ? 'Appearance' : 
               activeTab === 'website' ? 'Personal Website' :
               'Steam & Games'}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {activeTab === 'general' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <section className="mb-8">
                  <h3 
                    className="mb-1 text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Startup
                  </h3>
                  <div className="divide-y" style={{ borderColor: 'var(--bg-elevated)' }}>
                    <Toggle 
                      label="Auto-Launch on Startup" 
                      description="Start Nexus Tools when your computer boots"
                      checked={settings.autoLaunch} 
                      onChange={(val) => updateSetting('autoLaunch', val)} 
                    />
                    <Toggle 
                      label="Start Minimized" 
                      description="Launch directly to system tray"
                      checked={settings.startMinimized} 
                      onChange={(val) => updateSetting('startMinimized', val)} 
                    />
                    <Toggle 
                      label="Close to Tray" 
                      description="Keep running in system tray when window is closed"
                      checked={settings.closeToTray} 
                      onChange={(val) => updateSetting('closeToTray', val)} 
                    />
                    <Toggle 
                      label="Show Notifications" 
                      description="Display desktop notifications for status changes"
                      checked={settings.showNotifications} 
                      onChange={(val) => updateSetting('showNotifications', val)} 
                    />
                  </div>
                </section>

              </motion.div>
            )}

            {activeTab === 'palette' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Accent Colors */}
                <section className="mb-8">
                  <h3 
                    className="mb-1 text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Accent Color
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Choose your primary accent color for buttons and highlights
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
                      <AccentSwatch
                        key={key}
                        accentKey={key}
                        active={accent === key}
                        onClick={() => setAccent(key)}
                      />
                    ))}
                  </div>
                </section>

                {/* Background Themes */}
                <section className="mb-8">
                  <h3 
                    className="mb-1 text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Background Theme
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Select a background style for the application
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(BACKGROUNDS) as BackgroundKey[]).map((key) => (
                      <BackgroundCard
                        key={key}
                        bgKey={key}
                        active={background === key}
                        onClick={() => setBackground(key)}
                      />
                    ))}
                  </div>
                </section>

                {/* Preview */}
                <section 
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-primary)' }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    >
                      F
                    </div>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        Theme Preview
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        This is how your accent color looks
                      </div>
                    </div>
                    <button
                      className="ml-auto px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    >
                      Sample Button
                    </button>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'steam' && (
              <SteamSettingsContent settings={settings} updateSetting={updateSetting} />
            )}

            {activeTab === 'profiler' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Memory Usage
                  </h3>
                  
                  {memoryStats ? (
                    <div className="space-y-4">
                      {/* Memory bars */}
                      <div className="space-y-3">
                        <MemoryBar 
                          label="Heap Used" 
                          value={memoryStats.heapUsed} 
                          max={memoryStats.heapTotal}
                          color="var(--accent-primary)"
                        />
                        <MemoryBar 
                          label="Heap Total" 
                          value={memoryStats.heapTotal} 
                          max={memoryStats.rss}
                          color="#F0B132"
                        />
                        <MemoryBar 
                          label="RSS (Resident Set)" 
                          value={memoryStats.rss} 
                          max={memoryStats.rss * 1.5}
                          color="#3BA55D"
                        />
                        <MemoryBar 
                          label="External" 
                          value={memoryStats.external} 
                          max={memoryStats.heapTotal}
                          color="#EB459E"
                        />
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <StatBox label="Heap Used" value={formatBytes(memoryStats.heapUsed)} />
                        <StatBox label="Heap Total" value={formatBytes(memoryStats.heapTotal)} />
                        <StatBox label="RSS" value={formatBytes(memoryStats.rss)} />
                        <StatBox label="External" value={formatBytes(memoryStats.external)} />
                      </div>

                      {/* Memory trend mini-chart */}
                      {memoryHistory.length > 1 && (
                        <div className="mt-4">
                          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                            Heap Usage Trend (last 30s)
                          </p>
                          <div 
                            className="h-20 rounded-lg flex items-end gap-0.5 p-2"
                            style={{ backgroundColor: 'var(--bg-primary)' }}
                          >
                            {memoryHistory.map((point, i) => {
                              const maxUsed = Math.max(...memoryHistory.map(p => p.used));
                              const heightPercent = (point.used / maxUsed) * 100;
                              return (
                                <div
                                  key={i}
                                  className="flex-1 rounded-sm transition-all duration-300"
                                  style={{ 
                                    height: `${heightPercent}%`,
                                    backgroundColor: 'var(--accent-primary)',
                                    opacity: 0.5 + (i / memoryHistory.length) * 0.5,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => (window as Window & { gc?: () => void }).gc?.()}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                        >
                          Force GC
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      <Activity size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Loading memory stats...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'website' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <section className="mb-8">
                  <h3 
                    className="mb-1 text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Server Settings
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Configure the API server that powers your personal website
                  </p>

                  <div className="space-y-4">
                    <Toggle 
                      label="Enable API Server" 
                      description="Start the HTTP server for your website"
                      checked={settings.websiteEnabled ?? false} 
                      onChange={(val) => updateSetting('websiteEnabled', val)} 
                    />

                    <div>
                      <label 
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        API Port
                      </label>
                      <input 
                        type="text" 
                        value={settings.websiteApiPort ?? 8765}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          const parsed = Number(raw);
                          const port = Number.isInteger(parsed) && parsed >= 1024 && parsed <= 65535 ? parsed : 8765;
                          updateSetting('websiteApiPort', port);
                        }}
                        className="w-full max-w-[200px] rounded-md px-3 py-2 text-sm outline-none transition-all"
                        style={{ 
                          backgroundColor: 'var(--bg-primary)', 
                          color: 'var(--text-primary)',
                          border: '1px solid var(--bg-elevated)'
                        }}
                      />
                    </div>
                  </div>
                </section>

                <section className="mb-8">
                  <h3 
                    className="mb-1 text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Profile Settings
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Customize your personal information displayed on the website
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label 
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Display Name
                      </label>
                      <input 
                        type="text" 
                        value={settings.websiteDisplayName ?? 'Foxems'}
                        onChange={(e) => updateSetting('websiteDisplayName', e.target.value)}
                        placeholder="Foxems"
                        className="w-full rounded-md px-3 py-2 text-sm outline-none transition-all"
                        style={{ 
                          backgroundColor: 'var(--bg-primary)', 
                          color: 'var(--text-primary)',
                          border: '1px solid var(--bg-elevated)'
                        }}
                      />
                    </div>

                    <div>
                      <label 
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Bio
                      </label>
                      <textarea
                        value={settings.websiteBio ?? ''}
                        onChange={(e) => updateSetting('websiteBio', e.target.value)}
                        placeholder="Tell visitors about yourself..."
                        rows={3}
                        className="w-full rounded-md px-3 py-2 text-sm outline-none transition-all resize-none"
                        style={{ 
                          backgroundColor: 'var(--bg-primary)', 
                          color: 'var(--text-primary)',
                          border: '1px solid var(--bg-elevated)'
                        }}
                      />
                    </div>

                    <div>
                      <label 
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Avatar URL
                      </label>
                      <input 
                        type="text" 
                        value={settings.websiteAvatar ?? ''}
                        onChange={(e) => updateSetting('websiteAvatar', e.target.value)}
                        placeholder="https://example.com/avatar.png"
                        className="w-full rounded-md px-3 py-2 text-sm outline-none transition-all"
                        style={{ 
                          backgroundColor: 'var(--bg-primary)', 
                          color: 'var(--text-primary)',
                          border: '1px solid var(--bg-elevated)'
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label 
                          className="block text-sm font-medium mb-2"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Discord
                        </label>
                        <input 
                          type="text" 
                          value={settings.websiteDiscord ?? ''}
                          onChange={(e) => updateSetting('websiteDiscord', e.target.value)}
                          placeholder="username#0000"
                          className="w-full rounded-md px-3 py-2 text-sm outline-none transition-all"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)', 
                            color: 'var(--text-primary)',
                            border: '1px solid var(--bg-elevated)'
                          }}
                        />
                      </div>

                      <div>
                        <label 
                          className="block text-sm font-medium mb-2"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Twitter
                        </label>
                        <input 
                          type="text" 
                          value={settings.websiteTwitter ?? ''}
                          onChange={(e) => updateSetting('websiteTwitter', e.target.value)}
                          placeholder="@username"
                          className="w-full rounded-md px-3 py-2 text-sm outline-none transition-all"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)', 
                            color: 'var(--text-primary)',
                            border: '1px solid var(--bg-elevated)'
                          }}
                        />
                      </div>

                      <div>
                        <label 
                          className="block text-sm font-medium mb-2"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          MyAnimeList
                        </label>
                        <input 
                          type="text" 
                          value={settings.websiteMal ?? ''}
                          onChange={(e) => updateSetting('websiteMal', e.target.value)}
                          placeholder="username"
                          className="w-full rounded-md px-3 py-2 text-sm outline-none transition-all"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)', 
                            color: 'var(--text-primary)',
                            border: '1px solid var(--bg-elevated)'
                          }}
                        />
                      </div>

                      <div>
                        <label 
                          className="block text-sm font-medium mb-2"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          GitHub
                        </label>
                        <input 
                          type="text" 
                          value={settings.websiteGithub ?? ''}
                          onChange={(e) => updateSetting('websiteGithub', e.target.value)}
                          placeholder="username"
                          className="w-full rounded-md px-3 py-2 text-sm outline-none transition-all"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)', 
                            color: 'var(--text-primary)',
                            border: '1px solid var(--bg-elevated)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mb-8">
                  <h3 
                    className="mb-1 text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Visibility Settings
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Control which sections are displayed on your website
                  </p>

                  <div className="divide-y" style={{ borderColor: 'var(--bg-elevated)' }}>
                    <Toggle 
                      label="Show Anime Statistics" 
                      description="Display MAL stats on the website"
                      checked={settings.websiteShowAnimeStats ?? true} 
                      onChange={(val) => updateSetting('websiteShowAnimeStats', val)} 
                    />
                    <Toggle 
                      label="Show Gaming Statistics" 
                      description="Display Steam stats on the website"
                      checked={settings.websiteShowGamingStats ?? true} 
                      onChange={(val) => updateSetting('websiteShowGamingStats', val)} 
                    />
                    <Toggle 
                      label="Show Tier List" 
                      description="Display S-F tier rankings"
                      checked={settings.websiteShowTierList ?? true} 
                      onChange={(val) => updateSetting('websiteShowTierList', val)} 
                    />
                    <Toggle 
                      label="Show Top 10" 
                      description="Display top 10 anime list"
                      checked={settings.websiteShowTop10 ?? true} 
                      onChange={(val) => updateSetting('websiteShowTop10', val)} 
                    />
                  </div>
                </section>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper components for memory profiler
function MemoryBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-muted)' }}>{formatBytes(value)}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
