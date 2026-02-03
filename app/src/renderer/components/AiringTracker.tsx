import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tv, Calendar, Clock, Play, Star, RefreshCw, 
  ChevronRight, ExternalLink, AlertCircle, Filter, Timer
} from 'lucide-react';
import { isAuthenticated, fetchAnimeList, MALAnimeEntry } from '../services/malApi';

// Jikan API types
interface JikanAnime {
  mal_id: number;
  title: string;
  title_english?: string;
  images: {
    jpg: { large_image_url?: string; image_url?: string };
  };
  episodes?: number;
  status: string;
  airing: boolean;
  aired: {
    from?: string;
    to?: string;
    prop: {
      from: { day?: number; month?: number; year?: number };
    };
  };
  broadcast?: {
    day?: string;
    time?: string;
    timezone?: string;
    string?: string;
  };
  score?: number;
  genres: { mal_id: number; name: string }[];
  season?: string;
  year?: number;
}

interface JikanResponse {
  data: JikanAnime[];
  pagination: {
    has_next_page: boolean;
    current_page: number;
    last_visible_page: number;
  };
}

// Rate limiting for Jikan API
let lastJikanCall = 0;
const JIKAN_COOLDOWN = 1000;

async function fetchWithRateLimit(url: string): Promise<any> {
  const now = Date.now();
  const timeSinceLast = now - lastJikanCall;
  if (timeSinceLast < JIKAN_COOLDOWN) {
    await new Promise(resolve => setTimeout(resolve, JIKAN_COOLDOWN - timeSinceLast));
  }
  lastJikanCall = Date.now();
  
  const response = await fetch(url);
  if (response.status === 429) {
    // Rate limited - wait and retry
    await new Promise(resolve => setTimeout(resolve, 2000));
    lastJikanCall = Date.now();
    return fetch(url).then(r => r.json());
  }
  return response.json();
}

type TabType = 'airing' | 'upcoming';

// Parse broadcast string like "Mondays at 00:00 (JST)" into next airing Date
function parseBroadcastToNextAiring(broadcast: string): Date | null {
  const dayMap: Record<string, number> = {
    'sunday': 0, 'sundays': 0,
    'monday': 1, 'mondays': 1,
    'tuesday': 2, 'tuesdays': 2,
    'wednesday': 3, 'wednesdays': 3,
    'thursday': 4, 'thursdays': 4,
    'friday': 5, 'fridays': 5,
    'saturday': 6, 'saturdays': 6,
  };
  
  const lower = broadcast.toLowerCase();
  const dayMatch = Object.entries(dayMap).find(([day]) => lower.includes(day));
  const timeMatch = lower.match(/(\d{1,2}):(\d{2})/);
  
  if (!dayMatch || !timeMatch) return null;
  
  const targetDay = dayMatch[1];
  const targetDayNum = dayMap[targetDay];
  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);
  
  // JST is UTC+9
  const isJST = lower.includes('jst');
  const jstOffset = isJST ? 9 : 0;
  
  // Calculate next airing in local time
  const now = new Date();
  const nowUtc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jstNow = new Date(nowUtc + 9 * 3600000);
  
  // Find next occurrence of target day
  let daysUntil = targetDayNum - jstNow.getDay();
  if (daysUntil < 0) daysUntil += 7;
  
  // Create the target date in JST
  const targetDate = new Date(jstNow);
  targetDate.setDate(jstNow.getDate() + daysUntil);
  targetDate.setHours(hour, minute, 0, 0);
  
  // If we're past this week's airing, add 7 days
  if (targetDate <= jstNow) {
    targetDate.setDate(targetDate.getDate() + 7);
  }
  
  // Convert back to local time
  const targetUtc = targetDate.getTime() - 9 * 3600000;
  return new Date(targetUtc);
}

// Format countdown duration
function formatCountdown(ms: number): { days: number; hours: number; minutes: number; seconds: number; text: string } {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, text: 'Airing Now!' };
  
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  
  let text = '';
  if (days > 0) text += `${days}d `;
  if (hours > 0 || days > 0) text += `${hours}h `;
  text += `${minutes}m ${seconds}s`;
  
  return { days, hours, minutes, seconds, text };
}

interface AiringAnimeCard {
  id: number;
  title: string;
  image: string;
  episodes?: number;
  broadcast?: string;
  nextAiring?: Date;
  score?: number;
  genres: string[];
  status: 'watching' | 'completed' | 'ptw' | 'none';
  isSequel?: boolean; // True if this is a sequel to something in user's list
  relatedTitle?: string; // The title from user's list that this is related to
  userScore?: number;
  airDate?: string;
  season?: string;
  year?: number;
}

// Countdown timer component with live updates
function CountdownTimer({ nextAiring }: { nextAiring: Date }) {
  const [countdown, setCountdown] = useState(() => formatCountdown(nextAiring.getTime() - Date.now()));
  
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = nextAiring.getTime() - Date.now();
      setCountdown(formatCountdown(remaining));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [nextAiring]);
  
  const isUrgent = countdown.days === 0 && countdown.hours < 2;
  const isToday = countdown.days === 0;
  
  return (
    <div 
      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg font-medium"
      style={{ 
        backgroundColor: isUrgent ? '#ED424520' : isToday ? '#F0B13220' : '#5865F220',
        color: isUrgent ? '#ED4245' : isToday ? '#F0B132' : '#5865F2'
      }}
    >
      <Timer size={12} />
      <span>{countdown.text}</span>
    </div>
  );
}

function AnimeCard({ anime, index }: { anime: AiringAnimeCard; index: number }) {
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    watching: { bg: '#5865F220', text: '#5865F2', label: 'Watching' },
    completed: { bg: '#3BA55D20', text: '#3BA55D', label: 'Completed' },
    ptw: { bg: '#F0B13220', text: '#F0B132', label: 'Plan to Watch' },
    none: { bg: 'var(--bg-elevated)', text: 'var(--text-muted)', label: 'Not in List' },
  };

  const statusConfig = anime.isSequel && anime.status === 'none'
    ? { bg: '#EB459E20', text: '#EB459E', label: 'Sequel' }
    : statusColors[anime.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex gap-4 p-4 rounded-xl cursor-pointer hover:scale-[1.01] transition-transform"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
      onClick={() => window.open(`https://myanimelist.net/anime/${anime.id}`, '_blank')}
    >
      <img
        src={anime.image}
        alt={anime.title}
        className="w-16 h-22 object-cover rounded-lg flex-shrink-0"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {anime.title}
          </h3>
          <ExternalLink size={14} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span 
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
          >
            {statusConfig.label}
          </span>
          
          {anime.score && anime.score > 0 && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Star size={10} fill="currentColor" /> {anime.score.toFixed(1)}
            </span>
          )}
          
          {anime.episodes && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {anime.episodes} eps
            </span>
          )}
        </div>

        {anime.broadcast && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={12} />
              {anime.broadcast}
            </div>
            {anime.nextAiring && (
              <CountdownTimer nextAiring={anime.nextAiring} />
            )}
          </div>
        )}

        {anime.airDate && (
          <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Calendar size={12} />
            {anime.airDate}
          </div>
        )}

        {anime.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {anime.genres.slice(0, 3).map(genre => (
              <span 
                key={genre}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AiringTracker() {
  const [activeTab, setActiveTab] = useState<TabType>('airing');
  const [airingAnime, setAiringAnime] = useState<AiringAnimeCard[]>([]);
  const [upcomingAnime, setUpcomingAnime] = useState<AiringAnimeCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAnimeIds, setUserAnimeIds] = useState<Map<number, { status: string; score: number; title: string }>>(new Map());
  const [userAnimeTitles, setUserAnimeTitles] = useState<string[]>([]);
  // Smart sequel detection: maps anime ID to the title of the prequel from user's list
  const [sequelMap, setSequelMap] = useState<Map<number, string>>(new Map());
  const [filter, setFilter] = useState<'all' | 'in-list'>('all');

  // Load user's anime list for cross-referencing (with extended fields for related_anime)
  useEffect(() => {
    const loadUserList = async () => {
      if (!isAuthenticated()) return;
      
      try {
        // Fetch with extended fields to get related_anime for sequel detection
        const list = await fetchAnimeList(undefined, 1000, true);
        const idMap = new Map<number, { status: string; score: number; title: string }>();
        const titles: string[] = [];
        const sequels = new Map<number, string>(); // Maps sequel ID -> prequel title
        
        for (const anime of list) {
          idMap.set(anime.id, { status: anime.status, score: anime.score, title: anime.title });
          
          // Store normalized title for fallback matching
          const normalizedTitle = anime.title
            .toLowerCase()
            .replace(/\s*(season|part|cour|s)\s*\d+/gi, '')
            .replace(/\s*(2nd|3rd|4th|5th|\d+th)\s*season/gi, '')
            .replace(/\s*[:\-]\s*.*$/, '') // Remove subtitles
            .replace(/[^a-z0-9\s]/g, '')
            .trim();
          if (normalizedTitle.length > 3) {
            titles.push(normalizedTitle);
          }
          
          // Build sequel map from related_anime field
          // If user has watched/completed something, mark its sequels
          if (anime.related_anime && (anime.status === 'completed' || anime.status === 'watching')) {
            for (const rel of anime.related_anime) {
              const relType = rel.relation_type.toLowerCase();
              // Mark sequels, side stories, and alternative versions as related
              if (relType === 'sequel' || relType === 'side_story' || relType === 'spin_off') {
                sequels.set(rel.node.id, anime.title);
              }
            }
          }
        }
        
        setUserAnimeIds(idMap);
        setUserAnimeTitles(titles);
        setSequelMap(sequels);
        console.log(`[AiringTracker] Built sequel map with ${sequels.size} entries`);
      } catch (err) {
        console.error('[AiringTracker] Failed to load user list:', err);
      }
    };

    loadUserList();
  }, []);

  // Helper to check if an anime is a sequel using MAL data (smart detection)
  const checkIsSequel = (animeId: number, animeTitle: string): { isSequel: boolean; relatedTitle?: string } => {
    // First check the smart sequel map (based on related_anime)
    const relatedTitle = sequelMap.get(animeId);
    if (relatedTitle) {
      return { isSequel: true, relatedTitle };
    }
    
    // Fallback to title-based heuristic matching
    const normalizedTitle = animeTitle
      .toLowerCase()
      .replace(/\s*(season|part|cour|s)\s*\d+/gi, '')
      .replace(/\s*(2nd|3rd|4th|5th|\d+th)\s*season/gi, '')
      .replace(/\s*[:\-]\s*.*$/, '') // Remove subtitles
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    
    if (normalizedTitle.length <= 3) return { isSequel: false };
    
    // Check if any user title is contained in or matches this title
    for (const userTitle of userAnimeTitles) {
      if (normalizedTitle.includes(userTitle) || userTitle.includes(normalizedTitle)) {
        return { isSequel: true, relatedTitle: userTitle };
      }
    }
    return { isSequel: false };
  };

  // Fetch airing/upcoming anime from Jikan
  useEffect(() => {
    const fetchSeasonalAnime = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch currently airing
        const airingData: JikanResponse = await fetchWithRateLimit(
          'https://api.jikan.moe/v4/seasons/now?filter=tv&limit=25'
        );

        // Safely handle undefined data from API
        const airingCards: AiringAnimeCard[] = (airingData?.data || []).map(anime => {
          const userData = userAnimeIds.get(anime.mal_id);
          let status: AiringAnimeCard['status'] = 'none';
          let isSequel = false;
          let relatedTitle: string | undefined;
          
          if (userData) {
            if (userData.status === 'watching') status = 'watching';
            else if (userData.status === 'completed') status = 'completed';
            else if (userData.status === 'plan_to_watch') status = 'ptw';
          } else {
            // Smart sequel detection using MAL related_anime data
            const animeFullTitle = anime.title_english || anime.title;
            const sequelCheck = checkIsSequel(anime.mal_id, animeFullTitle);
            isSequel = sequelCheck.isSequel;
            relatedTitle = sequelCheck.relatedTitle;
          }

          // Parse broadcast time to get next airing date
          const broadcastStr = anime.broadcast?.string;
          const nextAiring = broadcastStr ? parseBroadcastToNextAiring(broadcastStr) : undefined;

          return {
            id: anime.mal_id,
            title: anime.title_english || anime.title,
            image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
            episodes: anime.episodes,
            broadcast: anime.broadcast?.string,
            nextAiring: nextAiring || undefined,
            score: anime.score,
            genres: (anime.genres || []).map(g => g.name),
            status,
            userScore: userData?.score,
            season: anime.season,
            year: anime.year,
            isSequel,
            relatedTitle,
          };
        });

        setAiringAnime(airingCards);

        // Fetch upcoming
        const upcomingData: JikanResponse = await fetchWithRateLimit(
          'https://api.jikan.moe/v4/seasons/upcoming?filter=tv&limit=25'
        );

        // Safely handle undefined data from API
        const upcomingCards: AiringAnimeCard[] = (upcomingData?.data || []).map(anime => {
          const userData = userAnimeIds.get(anime.mal_id);
          let status: AiringAnimeCard['status'] = 'none';
          let isSequel = false;
          let relatedTitle: string | undefined;
          
          if (userData) {
            if (userData.status === 'watching') status = 'watching';
            else if (userData.status === 'completed') status = 'completed';
            else if (userData.status === 'plan_to_watch') status = 'ptw';
          } else {
            // Smart sequel detection using MAL related_anime data
            const animeFullTitle = anime.title_english || anime.title;
            const sequelCheck = checkIsSequel(anime.mal_id, animeFullTitle);
            isSequel = sequelCheck.isSequel;
            relatedTitle = sequelCheck.relatedTitle;
          }

          // Format air date
          let airDate: string | undefined;
          if (anime.aired?.prop?.from) {
            const { year, month, day } = anime.aired.prop.from;
            if (year) {
              const date = new Date(year, (month || 1) - 1, day || 1);
              airDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: day ? 'numeric' : undefined 
              });
            }
          }

          return {
            id: anime.mal_id,
            title: anime.title_english || anime.title,
            image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
            episodes: anime.episodes,
            score: anime.score,
            genres: (anime.genres || []).map(g => g.name),
            status,
            userScore: userData?.score,
            airDate,
            season: anime.season,
            year: anime.year,
            isSequel,
            relatedTitle,
          };
        });

        setUpcomingAnime(upcomingCards);
      } catch (err: any) {
        console.error('[AiringTracker] Fetch error:', err);
        setError(err.message || 'Failed to fetch seasonal anime');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeasonalAnime();
  }, [userAnimeIds, userAnimeTitles, sequelMap]);

  const tabs = [
    { id: 'airing' as const, label: 'Currently Airing', icon: Play },
    { id: 'upcoming' as const, label: 'Upcoming', icon: Calendar },
  ];

  const currentList = activeTab === 'airing' ? airingAnime : upcomingAnime;
  // Filter includes: anime in user's list OR sequels to anime in user's list
  const filteredList = filter === 'in-list' 
    ? currentList.filter(a => a.status !== 'none' || a.isSequel)
    : currentList;

  const inListCount = currentList.filter(a => a.status !== 'none' || a.isSequel).length;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <motion.header 
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: 'var(--accent-primary)20' }}
              >
                <Tv size={24} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Airing Tracker
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Track currently airing and upcoming anime
                </p>
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter(filter === 'all' ? 'in-list' : 'all')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{ 
                  backgroundColor: filter === 'in-list' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: filter === 'in-list' ? 'white' : 'var(--text-secondary)'
                }}
              >
                <Filter size={14} />
                {filter === 'in-list' ? 'In My List' : 'All Anime'}
                {filter === 'all' && inListCount > 0 && (
                  <span 
                    className="px-1.5 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}
                  >
                    {inListCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </motion.header>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'shadow-sm' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw size={32} style={{ color: 'var(--accent-primary)' }} />
            </motion.div>
            <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              Fetching seasonal anime...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div 
              className="p-4 rounded-lg flex items-center gap-2 mb-4"
              style={{ backgroundColor: '#ED424520', color: '#ED4245' }}
            >
              <AlertCircle size={20} />
              {error}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            >
              Retry
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + filter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {filteredList.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredList.map((anime, index) => (
                    <AnimeCard key={anime.id} anime={anime} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Tv size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>
                    {filter === 'in-list' 
                      ? 'No anime from your list found in this season'
                      : 'No anime found'}
                  </p>
                  {filter === 'in-list' && (
                    <button
                      onClick={() => setFilter('all')}
                      className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                    >
                      Show All Anime
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
