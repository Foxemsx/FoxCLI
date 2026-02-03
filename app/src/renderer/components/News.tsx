import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Newspaper, Calendar, Clock, Play, Star, RefreshCw, 
  ChevronRight, ExternalLink, Bell, Tv, Film, Sparkles,
  CalendarClock, AlertCircle
} from 'lucide-react';
import { isAuthenticated, fetchAnimeList } from '../services/malApi';

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

interface NewsItem {
  mal_id: number;
  url: string;
  title: string;
  date: string;
  author_username: string;
  author_url: string;
  forum_url: string;
  images: {
    jpg: { image_url?: string };
  };
  comments: number;
  excerpt: string;
}

interface SequelAnime {
  id: number;
  title: string;
  image: string;
  broadcast?: string;
  nextEpisode?: string;
  episodes?: number;
  score?: number;
  season?: string;
  year?: number;
  relatedTo: string; // Title from user's list
  status: 'airing' | 'upcoming';
}

// Rate limiting for Jikan API
let lastJikanCall = 0;
const JIKAN_COOLDOWN = 350;

async function fetchWithRateLimit(url: string): Promise<any> {
  const now = Date.now();
  const timeSinceLast = now - lastJikanCall;
  if (timeSinceLast < JIKAN_COOLDOWN) {
    await new Promise(resolve => setTimeout(resolve, JIKAN_COOLDOWN - timeSinceLast));
  }
  lastJikanCall = Date.now();
  
  const response = await fetch(url);
  if (response.status === 429) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    lastJikanCall = Date.now();
    return fetch(url).then(r => r.json());
  }
  return response.json();
}

// Calculate next episode air time
function getNextEpisodeTime(broadcast?: { day?: string; time?: string; timezone?: string }): string | undefined {
  if (!broadcast?.day || !broadcast?.time) return undefined;
  
  const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const dayIndex = days.findIndex(d => broadcast.day?.includes(d.slice(0, -1)));
  if (dayIndex === -1) return undefined;
  
  const now = new Date();
  const currentDay = now.getDay();
  
  // Calculate days until next episode
  let daysUntil = dayIndex - currentDay;
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0) {
    // Check if it already aired today
    const [hours, minutes] = (broadcast.time || '00:00').split(':').map(Number);
    const jstOffset = 9 * 60; // JST is UTC+9
    const localOffset = now.getTimezoneOffset();
    const totalMinutesNow = now.getHours() * 60 + now.getMinutes();
    const broadcastMinutesLocal = hours * 60 + minutes - jstOffset - localOffset;
    
    if (totalMinutesNow > broadcastMinutesLocal) {
      daysUntil = 7; // Already aired, next week
    }
  }
  
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}

function SequelCard({ anime }: { anime: SequelAnime }) {
  const isAiringNow = anime.status === 'airing';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 p-4 rounded-xl cursor-pointer hover:scale-[1.01] transition-transform relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
      onClick={() => window.open(`https://myanimelist.net/anime/${anime.id}`, '_blank')}
    >
      {/* Highlight border for today's episodes */}
      {anime.nextEpisode === 'Today' && (
        <div 
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ 
            border: '2px solid var(--accent-primary)',
            boxShadow: '0 0 20px var(--accent-primary)40'
          }}
        />
      )}
      
      <div className="relative">
        <img
          src={anime.image}
          alt={anime.title}
          className="w-16 h-22 object-cover rounded-lg flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        />
        {isAiringNow && (
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: '#ED4245' }}
          />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {anime.title}
          </h3>
          <ExternalLink size={14} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        </div>
        
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
          Sequel to {anime.relatedTo}
        </p>
        
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span 
            className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
            style={{ 
              backgroundColor: isAiringNow ? '#3BA55D20' : '#F0B13220',
              color: isAiringNow ? '#3BA55D' : '#F0B132'
            }}
          >
            {isAiringNow ? <Play size={10} /> : <Calendar size={10} />}
            {isAiringNow ? 'Airing' : 'Upcoming'}
          </span>
          
          {anime.nextEpisode && (
            <span 
              className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
              style={{ 
                backgroundColor: anime.nextEpisode === 'Today' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: anime.nextEpisode === 'Today' ? 'white' : 'var(--text-secondary)'
              }}
            >
              <Bell size={10} />
              {anime.nextEpisode}
            </span>
          )}
          
          {anime.score && anime.score > 0 && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Star size={10} fill="currentColor" />
              {anime.score.toFixed(1)}
            </span>
          )}
        </div>
        
        {anime.broadcast && (
          <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Clock size={10} />
            {anime.broadcast}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-xl cursor-pointer hover:scale-[1.01] transition-transform"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
      onClick={() => window.open(item.url, '_blank')}
    >
      <div className="flex gap-4">
        {item.images.jpg.image_url && (
          <img
            src={item.images.jpg.image_url}
            alt=""
            className="w-20 h-14 object-cover rounded-lg flex-shrink-0"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-2" style={{ color: 'var(--text-primary)' }}>
            {item.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{item.comments} comments</span>
          </div>
        </div>
        <ExternalLink size={14} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
      </div>
      
      {item.excerpt && (
        <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {item.excerpt}
        </p>
      )}
    </motion.div>
  );
}

export default function News() {
  const [sequels, setSequels] = useState<SequelAnime[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAnimeTitles, setUserAnimeTitles] = useState<Map<string, string>>(new Map());

  // Load user's anime list and create title map
  useEffect(() => {
    const loadUserList = async () => {
      if (!isAuthenticated()) return;
      
      try {
        const list = await fetchAnimeList(undefined, 1000, false);
        const titleMap = new Map<string, string>();
        
        for (const anime of list) {
          // Only include watched/watching/PTW anime
          if (['completed', 'watching', 'plan_to_watch'].includes(anime.status)) {
            // Normalize title for matching
            const normalized = anime.title
              .toLowerCase()
              .replace(/\s*(season|part|cour|s)\s*\d+/gi, '')
              .replace(/\s*(2nd|3rd|4th|5th|\d+th)\s*season/gi, '')
              .replace(/\s*(ii|iii|iv|v)$/gi, '')
              .replace(/\s*[:\-]\s*.*$/, '')
              .replace(/[^a-z0-9\s]/g, '')
              .trim();
            
            if (normalized.length > 3) {
              titleMap.set(normalized, anime.title);
            }
          }
        }
        
        setUserAnimeTitles(titleMap);
      } catch (err) {
        console.error('[News] Failed to load user list:', err);
      }
    };

    loadUserList();
  }, []);

  // Find related title from user's list
  const findRelatedTitle = (animeTitle: string): string | undefined => {
    const normalized = animeTitle
      .toLowerCase()
      .replace(/\s*(season|part|cour|s)\s*\d+/gi, '')
      .replace(/\s*(2nd|3rd|4th|5th|\d+th)\s*season/gi, '')
      .replace(/\s*(ii|iii|iv|v)$/gi, '')
      .replace(/\s*[:\-]\s*.*$/, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    
    if (normalized.length <= 3) return undefined;
    
    for (const [userTitle, originalTitle] of userAnimeTitles.entries()) {
      if (normalized.includes(userTitle) || userTitle.includes(normalized)) {
        return originalTitle;
      }
    }
    return undefined;
  };

  // Fetch seasonal anime and news
  useEffect(() => {
    const fetchData = async () => {
      if (userAnimeTitles.size === 0) return;
      
      setIsLoading(true);
      setError(null);

      try {
        // Fetch currently airing
        const airingData = await fetchWithRateLimit(
          'https://api.jikan.moe/v4/seasons/now?filter=tv&limit=25'
        );

        // Fetch upcoming
        const upcomingData = await fetchWithRateLimit(
          'https://api.jikan.moe/v4/seasons/upcoming?filter=tv&limit=25'
        );

        // Find sequels from both lists
        const foundSequels: SequelAnime[] = [];
        
        for (const anime of [...(airingData.data || []), ...(upcomingData.data || [])]) {
          const relatedTo = findRelatedTitle(anime.title_english || anime.title);
          if (relatedTo) {
            // Avoid duplicates
            if (!foundSequels.find(s => s.id === anime.mal_id)) {
              const isAiring = anime.airing || anime.status === 'Currently Airing';
              foundSequels.push({
                id: anime.mal_id,
                title: anime.title_english || anime.title,
                image: anime.images.jpg.large_image_url || anime.images.jpg.image_url || '',
                broadcast: anime.broadcast?.string,
                nextEpisode: isAiring ? getNextEpisodeTime(anime.broadcast) : undefined,
                episodes: anime.episodes,
                score: anime.score,
                season: anime.season,
                year: anime.year,
                relatedTo,
                status: isAiring ? 'airing' : 'upcoming'
              });
            }
          }
        }

        // Sort: Today first, then by status (airing before upcoming)
        foundSequels.sort((a, b) => {
          if (a.nextEpisode === 'Today' && b.nextEpisode !== 'Today') return -1;
          if (b.nextEpisode === 'Today' && a.nextEpisode !== 'Today') return 1;
          if (a.nextEpisode === 'Tomorrow' && b.nextEpisode !== 'Tomorrow' && b.nextEpisode !== 'Today') return -1;
          if (b.nextEpisode === 'Tomorrow' && a.nextEpisode !== 'Tomorrow' && a.nextEpisode !== 'Today') return 1;
          if (a.status === 'airing' && b.status !== 'airing') return -1;
          if (b.status === 'airing' && a.status !== 'airing') return 1;
          return 0;
        });

        setSequels(foundSequels);

        // Fetch MAL news
        const newsData = await fetchWithRateLimit(
          'https://api.jikan.moe/v4/anime/1/news' // Top anime news
        );
        
        // Also fetch general anime news if available
        let generalNews: NewsItem[] = [];
        try {
          const moreNews = await fetchWithRateLimit(
            'https://api.jikan.moe/v4/anime/5114/news' // FMA:B news as backup
          );
          generalNews = moreNews.data || [];
        } catch {
          // Ignore
        }

        // Combine and dedupe news
        const allNews = [...(newsData.data || []), ...generalNews];
        const uniqueNews = allNews.filter((item, index, self) => 
          index === self.findIndex(n => n.mal_id === item.mal_id)
        ).slice(0, 10);

        setNews(uniqueNews);

      } catch (err: any) {
        console.error('[News] Fetch error:', err);
        setError(err.message || 'Failed to fetch news');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userAnimeTitles]);

  // Stats
  const todayCount = sequels.filter(s => s.nextEpisode === 'Today').length;
  const airingCount = sequels.filter(s => s.status === 'airing').length;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <motion.header 
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'var(--accent-primary)20' }}
            >
              <Newspaper size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Anime News
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Your personalized anime updates
              </p>
            </div>
          </div>
        </motion.header>

        {/* Quick Stats */}
        {!isLoading && sequels.length > 0 && (
          <motion.div 
            className="grid grid-cols-2 gap-4 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: todayCount > 0 ? 'var(--accent-primary)' : 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-2">
                <Bell size={18} style={{ color: todayCount > 0 ? 'white' : 'var(--text-muted)' }} />
                <span 
                  className="text-2xl font-bold"
                  style={{ color: todayCount > 0 ? 'white' : 'var(--text-primary)' }}
                >
                  {todayCount}
                </span>
              </div>
              <p 
                className="text-xs mt-1"
                style={{ color: todayCount > 0 ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}
              >
                Episodes Today
              </p>
            </div>
            
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-2">
                <Tv size={18} style={{ color: 'var(--text-muted)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {airingCount}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Sequels Airing
              </p>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={32} className="animate-spin mb-4" style={{ color: 'var(--accent-primary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading your news...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 rounded-xl mb-6"
            style={{ backgroundColor: '#ED424520' }}
          >
            <AlertCircle size={20} style={{ color: '#ED4245' }} />
            <p style={{ color: '#ED4245' }}>{error}</p>
          </motion.div>
        )}

        {/* Not authenticated */}
        {!isAuthenticated() && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center py-20"
          >
            <Newspaper size={48} style={{ color: 'var(--text-muted)' }} className="mb-4" />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Connect MAL to see your news
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Link your MyAnimeList account to see personalized sequel notifications
            </p>
          </motion.div>
        )}

        {/* Sequels Section */}
        {!isLoading && sequels.length > 0 && (
          <motion.section 
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Sequels You're Waiting For
              </h2>
            </div>
            
            <div className="grid gap-3">
              {sequels.map((anime, i) => (
                <SequelCard key={anime.id} anime={anime} />
              ))}
            </div>
          </motion.section>
        )}

        {/* No sequels found */}
        {!isLoading && isAuthenticated() && sequels.length === 0 && userAnimeTitles.size > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center py-12 mb-8 rounded-xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <Tv size={40} style={{ color: 'var(--text-muted)' }} className="mb-3" />
            <h3 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              No sequels found
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              None of your watched anime have sequels airing or upcoming right now
            </p>
          </motion.div>
        )}

        {/* MAL News Section */}
        {!isLoading && news.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Newspaper size={18} style={{ color: 'var(--text-muted)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Latest Anime News
              </h2>
            </div>
            
            <div className="grid gap-3">
              {news.map((item, i) => (
                <NewsCard key={item.mal_id} item={item} index={i} />
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
