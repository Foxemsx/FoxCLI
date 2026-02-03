import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, Loader2, RefreshCw, Search, ExternalLink, AlertCircle } from 'lucide-react';
import MALConnect from './MALConnect';
import AnimeDetailModal from './AnimeDetailModal';
import {
  isAuthenticated,
  getUsername,
  fetchAnimeList as fetchMALAnimeList,
  MALAnimeEntry,
  MALAnimeStatus
} from '../services/malApi';

type AnimeStatus = 'all' | 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';

type AnimeEntry = {
  id: number;
  title: string;
  image: string;
  status: AnimeStatus | string;
  score: number;
  episodes_watched: number;
  total_episodes: number;
  url?: string;
};

const STATUS_TABS: { id: AnimeStatus; label: string; color: string }[] = [
  { id: 'all', label: 'All', color: 'var(--accent-primary)' },
  { id: 'watching', label: 'Watching', color: '#3BA55D' },
  { id: 'completed', label: 'Completed', color: '#5865F2' },
  { id: 'plan_to_watch', label: 'Plan to Watch', color: '#F0B132' },
  { id: 'on_hold', label: 'On Hold', color: '#9B59B6' },
  { id: 'dropped', label: 'Dropped', color: '#ED4245' },
];

function AnimeCard({ anime, index, onClick }: { anime: AnimeEntry; index: number; onClick: (anime: AnimeEntry) => void }) {
  const progress = anime.total_episodes > 0 
    ? (anime.episodes_watched / anime.total_episodes) * 100 
    : 0;

  const statusColor = STATUS_TABS.find(t => t.id === anime.status)?.color || 'var(--accent-primary)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.5) }}
      className="group relative rounded-xl overflow-hidden cursor-pointer"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
      onClick={() => onClick(anime)}
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        <img
          src={anime.image || 'https://cdn.myanimelist.net/images/qm_50.gif'}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://cdn.myanimelist.net/images/qm_50.gif';
          }}
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        
        {/* Score badge */}
        {anime.score > 0 && (
          <div 
            className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-bold backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFD700' }}
          >
            ★ {anime.score}
          </div>
        )}

        {/* Status indicator */}
        <div 
          className="absolute top-2 left-2 w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ExternalLink size={24} className="text-white" />
        </div>

        {/* Title & Progress */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight">
            {anime.title}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-white/70">
              {anime.episodes_watched} / {anime.total_episodes || '?'}
            </span>
            <span className="text-xs text-white/50">
              {Math.round(progress)}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1 rounded-full bg-white/20 overflow-hidden">
            <motion.div 
              className="h-full rounded-full"
              style={{ backgroundColor: statusColor }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AnimeLibrary() {
  const [activeTab, setActiveTab] = useState<AnimeStatus>('all');
  const [animeList, setAnimeList] = useState<AnimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isAuthed, setIsAuthed] = useState(() => isAuthenticated());
  const [username, setUsername] = useState(() => getUsername() || '');
  const [error, setError] = useState<string | null>(null);
  const [selectedAnime, setSelectedAnime] = useState<AnimeEntry | null>(null);

  const loadAnimeList = async () => {
    if (!isAuthenticated()) return;
    if (isLoading) return; // Prevent double-loading
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[MAL Library] Fetching anime list via official API...');
      const malList = await fetchMALAnimeList();
      
      // malList already returns flat entries, just map to our format
      const entries: AnimeEntry[] = malList.map((entry: MALAnimeEntry) => ({
        id: entry.id,
        title: entry.title,
        image: entry.image || '',
        status: entry.status,
        score: entry.score || 0,
        episodes_watched: entry.episodes_watched || 0,
        total_episodes: entry.total_episodes || 0,
        url: entry.url || `https://myanimelist.net/anime/${entry.id}`,
      }));
      
      console.log('[MAL Library] Loaded', entries.length, 'anime');
      setAnimeList(entries);
      setUsername(getUsername() || '');
      setIsLoading(false);
      
    } catch (err: any) {
      console.error('[MAL Library] Fetch error:', err);
      setError(err.message || 'Failed to fetch anime list');
      setIsLoading(false);
    }
  };

  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthed(authenticated);
    if (authenticated) {
      setUsername(getUsername() || '');
      // Only load if we don't have data yet
      if (animeList.length === 0) {
        loadAnimeList();
      }
    } else {
      setAnimeList([]);
      setUsername('');
    }
  };

  useEffect(() => {
    if (isAuthed && animeList.length === 0 && !isLoading) {
      loadAnimeList();
    }
  }, [isAuthed]);

  const filteredAnime = animeList.filter(anime => {
    const matchesTab = activeTab === 'all' || anime.status === activeTab;
    const matchesSearch = anime.title.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabCounts = STATUS_TABS.map(tab => ({
    ...tab,
    count: tab.id === 'all' 
      ? animeList.length 
      : animeList.filter(a => a.status === tab.id).length
  }));

  // Show login screen if not authenticated
  if (!isAuthed) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <motion.div
          className="w-full max-w-md text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div 
            className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary)20' }}
          >
            <Library size={40} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Connect MyAnimeList
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Sign in with your MAL account to view your complete anime library.
          </p>
          <MALConnect onAuthChange={handleAuthChange} />
        </motion.div>
      </div>
    );
  }

  // Show loading or error if no list yet
  if (animeList.length === 0 && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          {error ? (
            <div className="space-y-4">
              <div 
                className="p-4 rounded-lg flex items-center gap-2"
                style={{ backgroundColor: '#ED424520', color: '#ED4245' }}
              >
                <AlertCircle size={20} />
                {error}
              </div>
              <button
                onClick={loadAnimeList}
                className="px-6 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              >
                Retry
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Loading your anime library...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="p-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Anime Library
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {animeList.length} anime from <span style={{ color: 'var(--accent-primary)' }}>@{username}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAnimeList}
              disabled={isLoading}
              className="p-2.5 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
              title="Refresh"
            >
              <RefreshCw 
                size={20} 
                className={isLoading ? 'animate-spin' : ''}
                style={{ color: 'var(--text-secondary)' }} 
              />
            </button>
            <MALConnect compact onAuthChange={handleAuthChange} />
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 max-w-xs"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search anime..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div 
          className="flex gap-1 p-1 rounded-xl overflow-x-auto"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {tabCounts.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tab.color }}
              />
              {tab.label}
              <span 
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ 
                  backgroundColor: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
                  color: 'var(--text-muted)'
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : filteredAnime.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <Library size={48} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No anime found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredAnime.map((anime, index) => (
              <AnimeCard 
                key={anime.id} 
                anime={anime} 
                index={index} 
                onClick={(a) => setSelectedAnime(a)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedAnime && (
          <AnimeDetailModal 
            anime={selectedAnime as unknown as MALAnimeEntry} 
            onClose={() => setSelectedAnime(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
