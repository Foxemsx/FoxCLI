import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, Search, Clock, Play, Settings, RefreshCw, 
  Grid3X3, List, AlertCircle, X, Filter, Check,
  ChevronDown, Loader2, CloudOff, HardDrive, Cloud, Trophy, DollarSign
} from 'lucide-react';
import { FaSteam } from 'react-icons/fa';

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url: string;
  img_logo_url?: string;
  last_played?: number;
}

interface SteamSettings {
  apiKey: string;
  steamId: string;
  steamPath?: string;
}

type SteamPlayerAchievement = {
  apiname: string;
  achieved: number;
  unlocktime: number;
};

type SteamSchemaAchievement = {
  name: string;
  displayName: string;
  description?: string;
  hidden?: number;
  icon: string;
  icongray: string;
};

type AchievementView = {
  key: string;
  name: string;
  description?: string;
  achieved: boolean;
  unlockTime?: number;
  icon: string;
  icongray: string;
};

type SortOption = 'name' | 'playtime' | 'recent';
type ViewMode = 'grid' | 'list';
type FilterOption = 'all' | 'installed' | 'not-installed' | 'never-played' | 'recent';

const PRICE_OVERRIDES_KEY = 'foxcli-steam-price-paid-overrides';

async function fetchJson(url: string): Promise<any> {
  if (window.nexus?.fetchUrl) {
    return window.nexus.fetchUrl(url);
  }
  const response = await fetch(url);
  return response.json();
}

function buildWssUrl(status?: { wss?: { port: number; host: string; token: string } }): string | null {
  const wss = status?.wss;
  if (!wss) return null;
  const params = new URLSearchParams({ token: wss.token });
  return `ws://${wss.host}:${wss.port}/?${params.toString()}`;
}

function isFetchErrorResponse(payload: any): payload is { error: true; status?: number; message?: string; body?: string } {
  return Boolean(payload && typeof payload === 'object' && payload.error === true);
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatUnlockTime(unixSeconds?: number) {
  if (!unixSeconds) return undefined;
  try {
    return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return undefined;
  }
}

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 100) return `${hours}h`;
  return `${hours.toLocaleString()}h`;
}

function formatLastPlayed(timestamp?: number): string {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function CustomSelect({ 
  value, 
  onChange, 
  options,
  icon: Icon
}: { 
  value: string; 
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ElementType;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
        style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          color: 'var(--text-primary)',
          border: '1px solid var(--bg-elevated)'
        }}
      >
        {Icon && <Icon size={14} style={{ color: 'var(--accent-primary)' }} />}
        <span>{selectedOption?.label}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-lg overflow-hidden shadow-xl"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-tertiary)' }}
            >
              {options.map(option => (
                <button
                  key={option.value}
                  onClick={() => { onChange(option.value); setIsOpen(false); }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ color: value === option.value ? 'var(--accent-primary)' : 'var(--text-primary)' }}
                >
                  {value === option.value && <Check size={12} />}
                  <span className={value === option.value ? 'font-medium' : ''}>{option.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({ 
  label, 
  active, 
  onClick, 
  count,
  icon: Icon
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void;
  count?: number;
  icon?: React.ElementType;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
      style={{
        backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-secondary)',
        color: active ? 'white' : 'var(--text-secondary)',
        border: active ? 'none' : '1px solid var(--bg-elevated)'
      }}
    >
      {Icon && <Icon size={12} />}
      <span>{label}</span>
      {count !== undefined && (
        <span 
          className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
          style={{ 
            backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'var(--bg-elevated)',
            color: active ? 'white' : 'var(--text-muted)'
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function GameLaunchOverlay({ game, onClose }: { game: SteamGame; onClose: () => void }) {
  const imageUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`;

  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.1, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="text-center"
      >
        <motion.img
          src={imageUrl}
          alt={game.name}
          className="w-80 h-auto rounded-xl shadow-2xl mb-6"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
        />
        <motion.h2 
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--text-primary)' }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {game.name}
        </motion.h2>
        <motion.div 
          className="flex items-center justify-center gap-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Loader2 className="animate-spin" size={20} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Launching via Steam...</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function GameCard({ game, viewMode, onLaunch, onShowAchievements }: { 
  game: SteamGame; 
  viewMode: ViewMode;
  onLaunch: (game: SteamGame) => void;
  onShowAchievements: (game: SteamGame) => void;
}) {
  const imageUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`;
  const [imageError, setImageError] = useState(false);
  const fallbackUrl = `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`;

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-3 rounded-xl transition-all group cursor-pointer"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        whileHover={{ backgroundColor: 'var(--bg-elevated)', scale: 1.005 }}
        onClick={() => onLaunch(game)}
      >
        <div className="relative w-24 h-12 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={imageError ? fallbackUrl : imageUrl}
            alt={game.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {game.name}
          </h3>
          <div className="flex items-center gap-4 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatPlaytime(game.playtime_forever)}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{formatLastPlayed(game.last_played)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {game.playtime_2weeks && game.playtime_2weeks > 0 && (
            <span 
              className="px-2 py-1 rounded-md text-xs font-medium"
              style={{ backgroundColor: 'var(--status-online)20', color: 'var(--status-online)' }}
            >
              {formatPlaytime(game.playtime_2weeks)} recently
            </span>
          )}
          <motion.button
            type="button"
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShowAchievements(game);
            }}
            title="View achievements"
          >
            <Trophy size={14} style={{ color: 'var(--accent-primary)' }} />
          </motion.button>
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'var(--accent-primary)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play size={14} className="text-white" />
            <span className="text-white text-sm">Play</span>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -4 }}
      className="rounded-xl overflow-hidden group cursor-pointer relative"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
      onClick={() => onLaunch(game)}
    >
      <div className="relative aspect-[460/215] overflow-hidden">
        <img
          src={imageError ? fallbackUrl : imageUrl}
          alt={game.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        
        <motion.div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.div
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium shadow-lg"
            style={{ backgroundColor: 'var(--accent-primary)' }}
            initial={{ scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Play size={16} className="text-white" />
            <span className="text-white">Play</span>
          </motion.div>
          <motion.button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium shadow-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}
            initial={{ scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShowAchievements(game);
            }}
            title="View achievements"
          >
            <Trophy size={16} className="text-white" />
            <span className="text-white">Achievements</span>
          </motion.button>
        </motion.div>

        {game.playtime_2weeks && game.playtime_2weeks > 0 && (
          <div 
            className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm"
            style={{ backgroundColor: 'var(--status-online)90', color: 'white' }}
          >
            {formatPlaytime(game.playtime_2weeks)} recent
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
          {game.name}
        </h3>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Clock size={11} />
            <span>{formatPlaytime(game.playtime_forever)}</span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatLastPlayed(game.last_played)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function SetupPrompt({ onConfigure }: { onConfigure: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <motion.div 
        className="w-full max-w-md text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div 
          className="mx-auto mb-6 w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
            boxShadow: '0 8px 32px var(--accent-primary)40'
          }}
          whileHover={{ scale: 1.05, rotate: 5 }}
        >
          <FaSteam size={40} className="text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Connect Your Steam Account
        </h2>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          View your game library, track playtime, and launch games directly from FoxCLI.
        </p>
        
        <div 
          className="mt-6 space-y-4 text-left p-5 rounded-xl"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-elevated)' }}
        >
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-white text-xs flex items-center justify-center">1</span>
              Get your Steam API Key
            </h4>
            <p className="mt-1 ml-7 text-xs" style={{ color: 'var(--text-muted)' }}>
              Visit <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noopener" className="text-[var(--accent-primary)] hover:underline">steamcommunity.com/dev/apikey</a>
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-white text-xs flex items-center justify-center">2</span>
              Find your Steam ID
            </h4>
            <p className="mt-1 ml-7 text-xs" style={{ color: 'var(--text-muted)' }}>
              Use <a href="https://steamid.io" target="_blank" rel="noopener" className="text-[var(--accent-primary)] hover:underline">steamid.io</a> to find your 64-bit Steam ID
            </p>
          </div>
        </div>

        <motion.button
          onClick={onConfigure}
          className="mt-6 px-8 py-3.5 rounded-xl font-semibold w-full transition-all shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
            color: 'white',
            boxShadow: '0 4px 16px var(--accent-primary)40'
          }}
          whileHover={{ scale: 1.02, boxShadow: '0 6px 24px var(--accent-primary)60' }}
          whileTap={{ scale: 0.98 }}
        >
          Configure Steam Settings
        </motion.button>
      </motion.div>
    </div>
  );
}

function SteamSettingsModal({ settings, onSave, onClose }: { 
  settings: SteamSettings;
  onSave: (settings: SteamSettings) => void;
  onClose: () => void;
}) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [steamId, setSteamId] = useState(settings.steamId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))' }}
        >
          <div className="flex items-center gap-3">
            <FaSteam size={24} className="text-white" />
            <h2 className="text-lg font-bold text-white">Steam Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/20">
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Steam API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Enter your Steam API key"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--bg-elevated)' }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Steam ID (64-bit)
            </label>
            <input
              type="text"
              value={steamId}
              onChange={e => setSteamId(e.target.value)}
              placeholder="e.g., 76561198012345678"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--bg-elevated)' }}
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
          <motion.button
            onClick={() => onSave({ apiKey, steamId })}
            className="flex-1 px-4 py-3 rounded-xl font-medium"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Save Settings
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AchievementsModal({ game, steamSettings, onClose }: { 
  game: SteamGame; 
  steamSettings: SteamSettings;
  onClose: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<AchievementView[]>([]);
  const [summary, setSummary] = useState<{ unlocked: number; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const achievementsUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamSettings.apiKey}&steamid=${steamSettings.steamId}&appid=${game.appid}`;
        const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${steamSettings.apiKey}&appid=${game.appid}`;

        const [playerRes, schemaRes] = await Promise.all([
          fetchJson(achievementsUrl),
          fetchJson(schemaUrl),
        ]);

        const playerAchievements: SteamPlayerAchievement[] = playerRes?.playerstats?.achievements || [];
        const schemaAchievements: SteamSchemaAchievement[] =
          schemaRes?.game?.availableGameStats?.achievements || [];

        const schemaMap = new Map<string, SteamSchemaAchievement>();
        for (const a of schemaAchievements) {
          if (a?.name) schemaMap.set(a.name, a);
        }

        const merged: AchievementView[] = playerAchievements.map((a) => {
          const schema = schemaMap.get(a.apiname);
          return {
            key: a.apiname,
            name: schema?.displayName || a.apiname,
            description: schema?.description,
            achieved: a.achieved === 1,
            unlockTime: a.unlocktime || undefined,
            icon: schema?.icon || '',
            icongray: schema?.icongray || '',
          };
        });

        const unlocked = merged.filter((a) => a.achieved).length;
        const total = merged.length;

        merged.sort((a, b) => {
          if (a.achieved !== b.achieved) return a.achieved ? -1 : 1;
          return (b.unlockTime || 0) - (a.unlockTime || 0);
        });

        if (!cancelled) {
          setAchievements(merged);
          setSummary({ unlocked, total });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load achievements');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [game.appid, steamSettings.apiKey, steamSettings.steamId]);

  const progressPercent = summary && summary.total > 0 ? Math.round((summary.unlocked / summary.total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Trophy size={22} className="text-white" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{game.name}</h2>
              <p className="text-xs text-white/80">
                {summary ? `${summary.unlocked}/${summary.total} unlocked (${progressPercent}%)` : 'Achievements'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/20">
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin" size={26} style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : error ? (
            <div
              className="p-4 rounded-xl flex items-center gap-3"
              style={{ backgroundColor: '#ED424515', border: '1px solid #ED424540' }}
            >
              <AlertCircle size={20} style={{ color: '#ED4245' }} />
              <span className="text-sm" style={{ color: '#ED4245' }}>{error}</span>
            </div>
          ) : achievements.length > 0 ? (
            <>
              {summary && summary.total > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
                    <span style={{ color: 'var(--text-muted)' }}>{progressPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ backgroundColor: 'var(--accent-primary)', width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2">
                {achievements.map((a) => (
                  <div
                    key={a.key}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <img
                      src={a.achieved ? a.icon : a.icongray || a.icon}
                      alt=""
                      className="w-10 h-10 rounded"
                      style={{ backgroundColor: 'var(--bg-elevated)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {a.name}
                        </p>
                        {a.achieved && (
                          <span
                            className="text-[10px] px-2 py-1 rounded-full font-bold"
                            style={{ backgroundColor: '#3BA55D20', color: '#3BA55D' }}
                          >
                            Unlocked
                          </span>
                        )}
                      </div>
                      {a.description && (
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                          {a.description}
                        </p>
                      )}
                      {a.achieved && a.unlockTime && (
                        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                          {formatUnlockTime(a.unlockTime)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Trophy size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                No achievements found
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PriceOverridesModal({ games, currency, overrides, onSave, onClose }: { 
  games: SteamGame[];
  currency: string;
  overrides: Record<string, number>;
  onSave: (overrides: Record<string, number>) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [newOverrides, setNewOverrides] = useState<Record<string, number>>({ ...overrides });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return games.slice(0, 50);
    return games.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 50);
  }, [games, search]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))' }}
        >
          <div className="flex items-center gap-3">
            <DollarSign size={22} className="text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Price Paid Overrides</h2>
              <p className="text-xs text-white/80">Optional. Used for collection value.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/20">
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search games to set price paid..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--bg-elevated)' }}
              />
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{currency}</span>
          </div>

          <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
            {filtered.map((game) => (
              <div key={game.appid} className="flex items-center gap-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {game.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AppID {game.appid}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    value={newOverrides[String(game.appid)] ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setNewOverrides((prev) => {
                        const next = { ...prev };
                        if (!raw) {
                          delete next[String(game.appid)];
                          return next;
                        }
                        const n = Number(raw);
                        if (!Number.isFinite(n) || n < 0) return prev;
                        next[String(game.appid)] = n;
                        return next;
                      });
                    }}
                    placeholder="0.00"
                    className="w-28 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--bg-elevated)' }}
                  />
                  <button
                    onClick={() => {
                      setNewOverrides((prev) => {
                        const next = { ...prev };
                        delete next[String(game.appid)];
                        return next;
                      });
                    }}
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
                    title="Clear override"
                  >
                    <X size={16} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
          <motion.button
            onClick={() => onSave(newOverrides)}
            className="flex-1 px-4 py-3 rounded-xl font-medium"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Save Overrides
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SteamLibrary() {
  const [games, setGames] = useState<SteamGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [launchingGame, setLaunchingGame] = useState<SteamGame | null>(null);
  const [steamSettings, setSteamSettings] = useState<SteamSettings>({ apiKey: '', steamId: '' });
  const [installedAppIds, setInstalledAppIds] = useState<Set<number>>(new Set());
  const [selectedAchievementsGame, setSelectedAchievementsGame] = useState<SteamGame | null>(null);
  const [showPriceOverrides, setShowPriceOverrides] = useState(false);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(PRICE_OVERRIDES_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
      return {};
    } catch {
      return {};
    }
  });
  const [collectionValue, setCollectionValue] = useState<{ total: number; currency: string; priced: number; missing: number } | null>(null);
  const [valueLoading, setValueLoading] = useState(false);
  const [valueError, setValueError] = useState<string | null>(null);
  const storePriceCache = useRef(new Map<number, { price: number; currency: string }>());
  const storePriceFetchFailed = useRef(new Set<number>());
  const storePriceLastError = useRef<{ status?: number; message?: string } | null>(null);

  // Fetch installed games from Steam folders
  useEffect(() => {
    const loadInstalledGames = async () => {
      if (window.nexus?.getInstalledSteamGames) {
        try {
          const appIds = await window.nexus.getInstalledSteamGames();
          setInstalledAppIds(new Set(appIds));
          console.log(`[Steam] Found ${appIds.length} installed games`);
        } catch (err) {
          console.error('Failed to get installed Steam games:', err);
        }
      }
    };
    loadInstalledGames();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('foxcli-steam-settings');
    if (saved) {
      try {
        setSteamSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse Steam settings:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (steamSettings.apiKey && steamSettings.steamId) {
      fetchGames();
    }
  }, [steamSettings.apiKey, steamSettings.steamId]);

  const savePriceOverrides = useCallback((next: Record<string, number>) => {
    setPriceOverrides(next);
    localStorage.setItem(PRICE_OVERRIDES_KEY, JSON.stringify(next));
  }, []);

  const fetchStorePrices = useCallback(async (appIds: number[]) => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < appIds.length; i++) {
      const id = appIds[i];
      if (typeof id !== 'number') {
        continue;
      }
      const url = `https://store.steampowered.com/api/appdetails?appids=${id}&cc=us&l=english`;

      try {
        const data = await fetchJson(url);

        if (isFetchErrorResponse(data)) {
          storePriceLastError.current = { status: data.status, message: data.message };
          storePriceFetchFailed.current.add(id);
        } else {
          const entry = data?.[String(id)];
          if (!entry?.success || !entry?.data) {
            storePriceFetchFailed.current.add(id);
          } else {
            const currency = entry.data.price_overview?.currency || 'USD';
            const final = entry.data.price_overview?.final;
            const isFree = entry.data.is_free === true;
            const price = typeof final === 'number' ? final / 100 : isFree ? 0 : 0;
            storePriceCache.current.set(id, { price, currency });
          }
        }
      } catch {
        storePriceFetchFailed.current.add(id);
      }

      if (i < appIds.length - 1) {
        await delay(100);
      }
    }
  }, []);

  const calculateCollectionValue = useCallback(async () => {
    if (games.length === 0) return;

    setValueLoading(true);
    setValueError(null);
    try {
      const appIdsToFetch = games
        .map((g) => g.appid)
        .filter((id) => !storePriceCache.current.has(id) && !storePriceFetchFailed.current.has(id));

      if (appIdsToFetch.length > 0) {
        await fetchStorePrices(appIdsToFetch);
      }

      let total = 0;
      let currency = 'USD';
      let priced = 0;
      let missing = 0;

      for (const g of games) {
        const override = priceOverrides[String(g.appid)];
        if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
          total += override;
          priced++;
          continue;
        }

        const cached = storePriceCache.current.get(g.appid);
        if (!cached) {
          missing++;
          continue;
        }
        currency = cached.currency || currency;
        total += cached.price;
        priced++;
      }

      if (priced === 0 && missing === games.length && storePriceFetchFailed.current.size > 0) {
        const status = storePriceLastError.current?.status;
        const msg = storePriceLastError.current?.message;
        setValueError(status ? `Steam Store price lookup failed (HTTP ${status}${msg ? ` ${msg}` : ''}). Try again later.` : 'Steam Store price lookup failed. Try again later.');
      }

      setCollectionValue({ total, currency, priced, missing });
    } catch (e: any) {
      const msg = e?.message || 'Failed to calculate value';
      setValueError(msg);
    } finally {
      setValueLoading(false);
    }
  }, [fetchStorePrices, games, priceOverrides]);

  const fetchGames = async () => {
    if (!steamSettings.apiKey || !steamSettings.steamId) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${steamSettings.apiKey}&steamid=${steamSettings.steamId}&include_appinfo=true&include_played_free_games=true&format=json`;
      
      let data;
      if (window.nexus?.fetchUrl) {
        data = await window.nexus.fetchUrl(url);
      } else {
        const response = await fetch(url);
        data = await response.json();
      }

      if (data?.response?.games) {
        const gamesWithDetails = data.response.games.map((game: any) => ({
          ...game,
          last_played: game.rtime_last_played || 0,
        }));
        setGames(gamesWithDetails);
      } else {
        throw new Error('Invalid response from Steam API');
      }
    } catch (err: any) {
      console.error('Steam API Error:', err);
      setError(err.message || 'Failed to fetch Steam library');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = (newSettings: SteamSettings) => {
    setSteamSettings(newSettings);
    localStorage.setItem('foxcli-steam-settings', JSON.stringify(newSettings));
    setShowSettings(false);
  };

  const handleLaunchGame = useCallback((game: SteamGame) => {
    setLaunchingGame(game);
    if (window.nexus?.openExternal) {
      window.nexus.openExternal(`steam://run/${game.appid}`).catch(() => {
        window.location.href = `steam://run/${game.appid}`;
      });
    } else {
      window.location.href = `steam://run/${game.appid}`;
    }
  }, []);

  const filterCounts = useMemo(() => {
    const now = Date.now() / 1000;
    const sevenDaysAgo = now - (7 * 24 * 60 * 60);
    
    return {
      all: games.length,
      installed: games.filter(g => installedAppIds.has(g.appid)).length,
      'not-installed': games.filter(g => !installedAppIds.has(g.appid)).length,
      'never-played': games.filter(g => g.playtime_forever === 0).length,
      recent: games.filter(g => g.last_played && g.last_played > sevenDaysAgo).length,
    };
  }, [games, installedAppIds]);

  const filteredAndSortedGames = useMemo(() => {
    let result = [...games];
    const now = Date.now() / 1000;
    const sevenDaysAgo = now - (7 * 24 * 60 * 60);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(g => g.name.toLowerCase().includes(query));
    }

    switch (filterBy) {
      case 'installed':
        result = result.filter(g => installedAppIds.has(g.appid));
        break;
      case 'not-installed':
        result = result.filter(g => !installedAppIds.has(g.appid));
        break;
      case 'never-played':
        result = result.filter(g => g.playtime_forever === 0);
        break;
      case 'recent':
        result = result.filter(g => g.last_played && g.last_played > sevenDaysAgo);
        break;
    }

    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'playtime':
        result.sort((a, b) => b.playtime_forever - a.playtime_forever);
        break;
      case 'recent':
        result.sort((a, b) => (b.last_played || 0) - (a.last_played || 0));
        break;
    }

    return result;
  }, [games, searchQuery, sortBy, filterBy]);

  const totalPlaytime = useMemo(() => games.reduce((sum, g) => sum + g.playtime_forever, 0), [games]);

  if (!steamSettings.apiKey || !steamSettings.steamId) {
    return (
      <>
        <SetupPrompt onConfigure={() => setShowSettings(true)} />
        <AnimatePresence>
          {showSettings && (
            <SteamSettingsModal settings={steamSettings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1b2838, #2a475e)' }}>
                <FaSteam size={20} className="text-white" />
              </div>
              Steam Library
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{games.length}</span> games
              <span className="mx-2">•</span>
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{formatPlaytime(totalPlaytime)}</span> total playtime
              {collectionValue && (
                <>
                  <span className="mx-2">•</span>
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(collectionValue.total, collectionValue.currency)}
                  </span>
                  <span className="ml-1" style={{ color: 'var(--text-muted)' }}>
                    value
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={fetchGames}
              disabled={isLoading}
              className="p-2.5 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} style={{ color: 'var(--text-muted)' }} />
            </motion.button>
            <motion.button
              onClick={() => {
                if (!collectionValue) {
                  calculateCollectionValue();
                } else {
                  setShowPriceOverrides(true);
                }
              }}
              disabled={valueLoading}
              className="p-2.5 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={collectionValue ? 'Edit price paid overrides' : 'Calculate collection value'}
            >
              <DollarSign size={18} className={valueLoading ? 'opacity-60' : ''} style={{ color: 'var(--text-muted)' }} />
            </motion.button>
            <motion.button
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings size={18} style={{ color: 'var(--text-muted)' }} />
            </motion.button>
          </div>
        </div>

        {(valueError || collectionValue) && (
          <div className="mb-4">
            {valueError ? (
              <div className="p-3 rounded-xl flex items-center gap-3" style={{ backgroundColor: '#ED424515', border: '1px solid #ED424540' }}>
                <AlertCircle size={18} style={{ color: '#ED4245' }} />
                <span className="text-sm" style={{ color: '#ED4245' }}>{valueError}</span>
              </div>
            ) : collectionValue ? (
              <div className="p-3 rounded-xl flex items-center justify-between gap-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-elevated)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Collection Value
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {collectionValue.priced} priced
                    {collectionValue.missing > 0 ? ` • ${collectionValue.missing} missing` : ''}
                    {' • '}
                    Store price estimate unless overridden
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => calculateCollectionValue()}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--bg-elevated)' }}
                    disabled={valueLoading}
                  >
                    Recalculate
                  </button>
                  <button
                    onClick={() => setShowPriceOverrides(true)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                  >
                    Edit Prices
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search your library..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--bg-elevated)' }}
            />
          </div>
          
          <CustomSelect
            value={sortBy}
            onChange={(val) => setSortBy(val as SortOption)}
            options={[
              { value: 'recent', label: 'Recently Played' },
              { value: 'playtime', label: 'Most Played' },
              { value: 'name', label: 'Name A-Z' },
            ]}
          />

          <div className="flex rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-elevated)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className="p-2.5 transition-colors"
              style={{ backgroundColor: viewMode === 'grid' ? 'var(--bg-elevated)' : 'transparent' }}
            >
              <Grid3X3 size={16} style={{ color: viewMode === 'grid' ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2.5 transition-colors"
              style={{ backgroundColor: viewMode === 'list' ? 'var(--bg-elevated)' : 'transparent' }}
            >
              <List size={16} style={{ color: viewMode === 'list' ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <FilterChip label="All Games" active={filterBy === 'all'} onClick={() => setFilterBy('all')} count={filterCounts.all} />
          <FilterChip label="Installed" active={filterBy === 'installed'} onClick={() => setFilterBy('installed')} count={filterCounts.installed} icon={HardDrive} />
          <FilterChip label="Not Installed" active={filterBy === 'not-installed'} onClick={() => setFilterBy('not-installed')} count={filterCounts['not-installed']} icon={Cloud} />
          <FilterChip label="Recently Played" active={filterBy === 'recent'} onClick={() => setFilterBy('recent')} count={filterCounts.recent} icon={Clock} />
          <FilterChip label="Never Played" active={filterBy === 'never-played'} onClick={() => setFilterBy('never-played')} count={filterCounts['never-played']} icon={CloudOff} />
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mx-6 mb-4">
            <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: '#ED424515', border: '1px solid #ED424540' }}>
              <AlertCircle size={20} style={{ color: '#ED4245' }} />
              <span className="text-sm flex-1" style={{ color: '#ED4245' }}>{error}</span>
              <button onClick={() => setError(null)}><X size={16} style={{ color: '#ED4245' }} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-6 pt-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <Gamepad2 size={48} style={{ color: 'var(--accent-primary)' }} />
            </motion.div>
            <span style={{ color: 'var(--text-muted)' }}>Loading your library...</span>
          </div>
        ) : filteredAndSortedGames.length === 0 ? (
          <div className="text-center py-16">
            <Gamepad2 size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {searchQuery ? 'No games match your search' : 'No games found'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAndSortedGames.map(game => (
              <GameCard key={game.appid} game={game} viewMode={viewMode} onLaunch={handleLaunchGame} onShowAchievements={setSelectedAchievementsGame} />
            ))}
          </motion.div>
        ) : (
          <div className="space-y-2">
            {filteredAndSortedGames.map(game => (
              <GameCard key={game.appid} game={game} viewMode={viewMode} onLaunch={handleLaunchGame} onShowAchievements={setSelectedAchievementsGame} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSettings && <SteamSettingsModal settings={steamSettings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAchievementsGame && (
          <AchievementsModal
            game={selectedAchievementsGame}
            steamSettings={steamSettings}
            onClose={() => setSelectedAchievementsGame(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPriceOverrides && (
          <PriceOverridesModal
            games={games}
            currency={collectionValue?.currency || 'USD'}
            overrides={priceOverrides}
            onSave={(next) => {
              savePriceOverrides(next);
              setShowPriceOverrides(false);
              calculateCollectionValue();
            }}
            onClose={() => setShowPriceOverrides(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {launchingGame && <GameLaunchOverlay game={launchingGame} onClose={() => setLaunchingGame(null)} />}
      </AnimatePresence>
    </div>
  );
}
