import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Clock, CheckCircle2, Calendar, Star, TrendingUp,
  Tv, Film, Heart, Sparkles, ArrowRight, ExternalLink,
  Bell, Zap, Coffee, Sun, Moon, Sunset, Timer, Crown, Award
} from 'lucide-react';
import { isAuthenticated, fetchUserStats, fetchAnimeList } from '../services/malApi';
import type { MALUserStats } from '../services/malApi';

interface QuickStat {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface WatchingAnime {
  id: number;
  title: string;
  image: string;
  progress: number;
  total: number;
  score?: number;
}

interface AiringToday {
  id: number;
  title: string;
  image: string;
  time?: string;
  episode?: number;
}

interface Top10Anime {
  id: number;
  title: string;
  image: string;
  rank: number;
}

const TOP10_STORAGE_KEY = 'foxcli-anime-tierlist';

// Greeting based on time of day
function getGreeting(): { text: string; icon: React.ElementType; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Night owl?', icon: Moon, emoji: '🌙' };
  if (hour < 12) return { text: 'Good morning', icon: Sun, emoji: '☀️' };
  if (hour < 17) return { text: 'Good afternoon', icon: Coffee, emoji: '☕' };
  if (hour < 21) return { text: 'Good evening', icon: Sunset, emoji: '🌅' };
  return { text: 'Late night session?', icon: Moon, emoji: '🌙' };
}

// Motivational anime quotes
const QUOTES = [
  { text: "I'll take a potato chip... and eat it!", anime: "Death Note" },
  { text: "Believe in the me that believes in you!", anime: "Gurren Lagann" },
  { text: "People die when they are killed.", anime: "Fate/stay night" },
  { text: "The only ones who should kill are those prepared to be killed.", anime: "Code Geass" },
  { text: "It's not the face that makes someone a monster, it's the choices they make.", anime: "Naruto" },
  { text: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", anime: "Fullmetal Alchemist" },
  { text: "The world isn't perfect. But it's there for us, doing the best it can.", anime: "Fullmetal Alchemist" },
  { text: "A lesson without pain is meaningless.", anime: "Fullmetal Alchemist: Brotherhood" },
  { text: "Power comes in response to a need, not a desire.", anime: "Dragon Ball Z" },
  { text: "Fear is not evil. It tells you what your weakness is.", anime: "Fairy Tail" },
];

function StatCard({ stat, index }: { stat: QuickStat; index: number }) {
  const Icon = stat.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
      className="relative p-4 rounded-2xl overflow-hidden group cursor-pointer"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      {/* Background gradient accent */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ 
          background: `linear-gradient(135deg, ${stat.bgColor}20 0%, transparent 60%)` 
        }}
      />
      
      <div className="relative flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ backgroundColor: stat.bgColor }}
        >
          <Icon size={22} style={{ color: stat.color }} />
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {stat.value.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {stat.label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function WatchingCard({ anime, index, onNavigate }: { 
  anime: WatchingAnime; 
  index: number;
  onNavigate: () => void;
}) {
  const progress = anime.total > 0 ? (anime.progress / anime.total) * 100 : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex gap-3 p-3 rounded-xl cursor-pointer group"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
      whileHover={{ scale: 1.01, x: 4 }}
      onClick={() => window.open(`https://myanimelist.net/anime/${anime.id}`, '_blank')}
    >
      <div className="relative">
        <img
          src={anime.image}
          alt={anime.title}
          className="w-14 h-20 object-cover rounded-lg"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        />
        <div 
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <Play size={20} fill="white" color="white" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h4 className="font-medium text-sm truncate group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-primary)' }}>
            {anime.title}
          </h4>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Episode {anime.progress} of {anime.total || '?'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <motion.div 
              className="h-full rounded-full"
              style={{ backgroundColor: 'var(--accent-primary)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
            />
          </div>
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function QuickAction({ icon: Icon, label, color, onClick }: {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </motion.button>
  );
}

export default function Home({ onNavigate }: { onNavigate: (tool: string) => void }) {
  const [stats, setStats] = useState<MALUserStats | null>(null);
  const [watching, setWatching] = useState<WatchingAnime[]>([]);
  const [top10, setTop10] = useState<Top10Anime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const greeting = useMemo(() => getGreeting(), []);
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  // Load Top 10 from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOP10_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTop10(parsed.slice(0, 5).map((item: any, idx: number) => ({
            id: item.id,
            title: item.title,
            image: item.image,
            rank: idx + 1
          })));
        }
      }
    } catch (err) {
      console.error('Failed to load top 10:', err);
    }
  }, []);

  // Load user data
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      try {
        const [userStats, animeList] = await Promise.all([
          fetchUserStats(),
          fetchAnimeList('watching', 100, false)
        ]);

        setStats(userStats);

        // Transform watching list
        const watchingAnime: WatchingAnime[] = animeList
          .filter(a => a.status === 'watching')
          .slice(0, 6)
          .map(a => ({
            id: a.id,
            title: a.title,
            image: a.image,
            progress: a.episodes_watched,
            total: a.total_episodes,
            score: a.score
          }));

        setWatching(watchingAnime);
      } catch (err) {
        console.error('[Home] Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Quick stats
  const quickStats: QuickStat[] = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Watching', value: stats.watching, icon: Play, color: '#5865F2', bgColor: '#5865F220' },
      { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: '#3BA55D', bgColor: '#3BA55D20' },
      { label: 'Plan to Watch', value: stats.plan_to_watch, icon: Calendar, color: '#F0B132', bgColor: '#F0B13220' },
      { label: 'Total Anime', value: stats.total_anime, icon: Film, color: '#EB459E', bgColor: '#EB459E20' },
    ];
  }, [stats]);

  // Calculate watch time
  const watchTime = useMemo(() => {
    if (!stats) return { hours: 0, days: 0 };
    const hours = stats.total_episodes * 24 / 60; // Assuming ~24 min per episode
    return {
      hours: Math.round(hours),
      days: (hours / 24).toFixed(1)
    };
  }, [stats]);

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto" style={{ backgroundColor: '#1e1f22' }}>
      <div className="p-6 max-w-5xl mx-auto w-full">
        {/* Hero Section - Always visible */}
        <motion.div 
          className="relative rounded-3xl p-8 mb-6 overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, #5865F2 0%, #EB459E 100%)'
          }}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" 
            style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10" 
            style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <motion.div 
                  className="flex items-center gap-2 text-white/80 text-sm mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Clock size={14} />
                  {formattedTime} • {formattedDate}
                </motion.div>
                <motion.h1 
                  className="text-3xl font-bold text-white flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {greeting.emoji} {greeting.text}
                  {stats?.username && (
                    <span className="text-white/90">, {stats.username}!</span>
                  )}
                </motion.h1>
              </div>
              
              {stats && (
                <motion.div 
                  className="text-right hidden sm:block"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-white/70 text-xs">Total watch time</p>
                  <p className="text-2xl font-bold text-white">{watchTime.days} days</p>
                  <p className="text-white/70 text-xs">{watchTime.hours.toLocaleString()} hours</p>
                </motion.div>
              )}
            </div>

            {/* Quote */}
            <motion.div 
              className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Sparkles size={18} className="text-white/80 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm italic">"{quote.text}"</p>
                <p className="text-white/60 text-xs mt-1">— {quote.anime}</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Not authenticated state */}
        {!isAuthenticated() && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center py-12 rounded-2xl mb-6"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--accent-primary)20' }}
            >
              <Heart size={36} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Welcome to FoxCLI
            </h2>
            <p className="text-sm mb-4 max-w-md" style={{ color: 'var(--text-secondary)' }}>
              Connect your MyAnimeList account to see your personalized stats, 
              currently watching anime, and more!
            </p>
            <button
              onClick={() => onNavigate('anime-library')}
              className="px-6 py-2 rounded-xl font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            >
              Get Started
            </button>
          </motion.div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {quickStats.map((stat, i) => (
              <StatCard key={stat.label} stat={stat} index={i} />
            ))}
          </div>
        )}

        {/* Your Top Picks - Show top 5 from tier list */}
        {top10.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-yellow-500" />
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Your Top Picks
                </h2>
              </div>
              <button 
                onClick={() => onNavigate('anime-tier-list')}
                className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--accent-primary)' }}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2">
              {top10.map((anime, i) => (
                <motion.div
                  key={anime.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex-shrink-0 relative group cursor-pointer"
                  onClick={() => window.open(`https://myanimelist.net/anime/${anime.id}`, '_blank')}
                >
                  <div className="relative w-20 h-28 rounded-xl overflow-hidden shadow-lg">
                    <img
                      src={anime.image}
                      alt={anime.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    {/* Rank badge */}
                    <div 
                      className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-500 text-black' :
                        i === 1 ? 'bg-gray-300 text-black' :
                        i === 2 ? 'bg-amber-600 text-white' :
                        'bg-violet-500 text-white'
                      }`}
                    >
                      {anime.rank}
                    </div>
                    
                    {/* Title */}
                    <div className="absolute bottom-0 left-0 right-0 p-1.5">
                      <p className="text-[9px] font-medium text-white line-clamp-2 leading-tight">
                        {anime.title}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Add more prompt */}
              {top10.length < 5 && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => onNavigate('anime-tier-list')}
                  className="flex-shrink-0 w-20 h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1"
                  style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                >
                  <Crown size={20} />
                  <span className="text-[10px]">Add more</span>
                </motion.button>
              )}
            </div>
          </motion.section>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Currently Watching */}
          {watching.length > 0 && (
            <motion.section 
              className="lg:col-span-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Play size={18} style={{ color: 'var(--accent-primary)' }} />
                  <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Continue Watching
                  </h2>
                </div>
                <button 
                  onClick={() => onNavigate('anime-library')}
                  className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  View All <ArrowRight size={14} />
                </button>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-3">
                {watching.map((anime, i) => (
                  <WatchingCard 
                    key={anime.id} 
                    anime={anime} 
                    index={i}
                    onNavigate={() => onNavigate('anime-library')}
                  />
                ))}
              </div>
            </motion.section>
          )}

          {/* Quick Actions */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} style={{ color: 'var(--text-muted)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Quick Actions
              </h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <QuickAction 
                icon={Crown} 
                label="Top 10" 
                color="#FFD700"
                onClick={() => onNavigate('anime-tier-list')}
              />
              <QuickAction 
                icon={Award} 
                label="Tier List" 
                color="#FF6B6B"
                onClick={() => onNavigate('sf-tier-list')}
              />
              <QuickAction 
                icon={Tv} 
                label="Airing" 
                color="#3BA55D"
                onClick={() => onNavigate('airing-tracker')}
              />
              <QuickAction 
                icon={TrendingUp} 
                label="Stats" 
                color="#EB459E"
                onClick={() => onNavigate('statistics')}
              />
            </div>

            {/* Mean Score */}
            {stats && stats.mean_score > 0 && (
              <motion.div 
                className="mt-4 p-4 rounded-xl"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Your Mean Score</span>
                  <div className="flex items-center gap-1">
                    <Star size={14} fill="#F0B132" color="#F0B132" />
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {stats.mean_score.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <motion.div 
                    className="h-full rounded-full"
                    style={{ backgroundColor: '#F0B132' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.mean_score / 10) * 100}%` }}
                    transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            )}

            {/* Episodes Watched */}
            {stats && (
              <motion.div 
                className="mt-3 p-4 rounded-xl flex items-center gap-3"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-primary)20' }}
                >
                  <Timer size={18} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {stats.total_episodes.toLocaleString()}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Episodes watched
                  </p>
                </div>
              </motion.div>
            )}
          </motion.section>
        </div>

        {/* Loading state */}
        {isLoading && isAuthenticated() && (
          <div className="flex items-center justify-center py-12">
            <motion.div 
              className="w-8 h-8 border-2 rounded-full"
              style={{ 
                borderColor: 'var(--accent-primary)',
                borderTopColor: 'transparent'
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
