import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Clock, Film, Trophy, TrendingUp, Eye, Calendar, Star, AlertCircle, RefreshCw, Building2, Sparkles, GitBranch, ChevronRight, ChevronDown, Layers, X, ExternalLink, Tag, Mic2 } from 'lucide-react';
import MALConnect from './MALConnect';
import {
  isAuthenticated,
  getUsername,
  fetchUserStats,
  fetchScoreDistribution,
  fetchStudioAffinity,
  fetchSeasonalBreakdown,
  fetchFranchiseMap,
  fetchRecommendations,
  fetchExtendedAnimeList,
  MALUserStats,
  MALScoreDistribution,
  MALAnimeEntry,
  StudioAffinity,
  SeasonalStats,
  FranchiseNode,
  RecommendationResult,
  StudioAnimeEntry,
  SeasonAnimeEntry
} from '../services/malApi';

type UserStats = MALUserStats;
type GenreData = { name: string; count: number; percentage: number };
type ScoreData = MALScoreDistribution;

const GENRE_COLORS = [
  '#5865F2', '#3BA55D', '#ED4245', '#F0B132', 
  '#9B59B6', '#E67E73', '#00ADB5', '#EB459E'
];

function StatCard({ icon: Icon, label, value, sublabel, color, delay = 0 }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sublabel?: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl p-5 transition-all hover:scale-[1.02]"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
          <motion.p 
            className="mt-2 text-3xl font-bold"
            style={{ color: 'var(--text-primary)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
          >
            {value}
          </motion.p>
          {sublabel && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{sublabel}</p>
          )}
        </div>
        <div 
          className="p-3 rounded-xl"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}

function ProgressBar({ label, value, max, color, delay = 0 }: {
  label: string;
  value: number;
  max: number;
  color: string;
  delay?: number;
}) {
  const percentage = (value / max) * 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-muted)' }}>{value}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay, duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Taste DNA Radar Chart Component
function TasteDNAChart({ genreScores }: { genreScores: { name: string; avgScore: number; count: number }[] }) {
  const topGenres = genreScores.slice(0, 8); // Max 8 genres for radar
  const size = 300;
  const center = size / 2;
  const maxRadius = size / 2 - 40;
  const levels = 5; // Number of concentric rings
  
  if (topGenres.length < 3) return null;
  
  const angleStep = (2 * Math.PI) / topGenres.length;
  
  // Calculate points for the radar polygon
  const radarPoints = topGenres.map((genre, i) => {
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const normalizedScore = genre.avgScore / 10; // Normalize to 0-1
    const radius = normalizedScore * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      name: genre.name,
      score: genre.avgScore,
      count: genre.count,
      angle,
    };
  });
  
  const pathData = radarPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ') + ' Z';
  
  // DNA helix decoration points
  const dnaPoints = [];
  for (let i = 0; i < 20; i++) {
    const t = i / 20;
    const y = 20 + t * (size - 40);
    const amp = 15;
    const x1 = center - 120 + Math.sin(t * Math.PI * 4) * amp;
    const x2 = center + 120 - Math.sin(t * Math.PI * 4) * amp;
    dnaPoints.push({ x1, x2, y, opacity: 0.3 + Math.abs(Math.sin(t * Math.PI * 4)) * 0.4 });
  }

  return (
    <div className="flex items-center justify-center gap-6">
      {/* Left DNA strand decoration */}
      <div className="hidden lg:block">
        <svg width="30" height={size} className="opacity-60">
          {dnaPoints.map((p, i) => (
            <g key={i}>
              <circle cx={15 + Math.sin(i * 0.6) * 8} cy={p.y} r={2} fill="var(--accent-primary)" opacity={p.opacity} />
              <line 
                x1={15 + Math.sin(i * 0.6) * 8} 
                y1={p.y}
                x2={15 - Math.sin(i * 0.6) * 8}
                y2={p.y}
                stroke="var(--accent-primary)"
                strokeWidth={1}
                opacity={p.opacity * 0.5}
              />
            </g>
          ))}
        </svg>
      </div>
      
      {/* Radar Chart */}
      <svg width={size} height={size} className="overflow-visible">
        {/* Background levels */}
        {Array.from({ length: levels }).map((_, level) => {
          const levelRadius = ((level + 1) / levels) * maxRadius;
          const levelPoints = topGenres.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)}`;
          }).join(' ');
          return (
            <polygon
              key={level}
              points={levelPoints}
              fill="none"
              stroke="var(--bg-elevated)"
              strokeWidth={level === levels - 1 ? 2 : 1}
              opacity={0.5 + (level / levels) * 0.5}
            />
          );
        })}
        
        {/* Axis lines */}
        {radarPoints.map((p, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + maxRadius * Math.cos(p.angle)}
            y2={center + maxRadius * Math.sin(p.angle)}
            stroke="var(--bg-elevated)"
            strokeWidth={1}
            opacity={0.5}
          />
        ))}
        
        {/* Data polygon with gradient fill */}
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#9B59B6" stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.path
          d={pathData}
          fill="url(#radarGradient)"
          stroke="var(--accent-primary)"
          strokeWidth={2}
          filter="url(#glow)"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ transformOrigin: 'center' }}
        />
        
        {/* Data points */}
        {radarPoints.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5}
            fill="var(--accent-primary)"
            stroke="white"
            strokeWidth={2}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * i, duration: 0.3 }}
          />
        ))}
        
        {/* Labels */}
        {radarPoints.map((p, i) => {
          const labelRadius = maxRadius + 25;
          const labelX = center + labelRadius * Math.cos(p.angle);
          const labelY = center + labelRadius * Math.sin(p.angle);
          const isRight = Math.cos(p.angle) > 0;
          const isBottom = Math.sin(p.angle) > 0;
          
          return (
            <g key={`label-${i}`}>
              <text
                x={labelX}
                y={labelY}
                textAnchor={Math.abs(Math.cos(p.angle)) < 0.1 ? 'middle' : isRight ? 'start' : 'end'}
                dominantBaseline={Math.abs(Math.sin(p.angle)) < 0.1 ? 'middle' : isBottom ? 'hanging' : 'alphabetic'}
                fill="var(--text-secondary)"
                fontSize={11}
                fontWeight={500}
              >
                {p.name}
              </text>
              <text
                x={labelX}
                y={labelY + 14}
                textAnchor={Math.abs(Math.cos(p.angle)) < 0.1 ? 'middle' : isRight ? 'start' : 'end'}
                dominantBaseline={Math.abs(Math.sin(p.angle)) < 0.1 ? 'middle' : isBottom ? 'hanging' : 'alphabetic'}
                fill="var(--accent-primary)"
                fontSize={10}
                fontWeight={600}
              >
                {p.score.toFixed(1)}
              </text>
            </g>
          );
        })}
        
        {/* Center label */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize={14}
          fontWeight={700}
        >
          TASTE
        </text>
        <text
          x={center}
          y={center + 8}
          textAnchor="middle"
          fill="var(--accent-primary)"
          fontSize={14}
          fontWeight={700}
        >
          DNA
        </text>
      </svg>
      
      {/* Right DNA strand decoration */}
      <div className="hidden lg:block">
        <svg width="30" height={size} className="opacity-60">
          {dnaPoints.map((p, i) => (
            <g key={i}>
              <circle cx={15 - Math.sin(i * 0.6) * 8} cy={p.y} r={2} fill="#9B59B6" opacity={p.opacity} />
              <line 
                x1={15 - Math.sin(i * 0.6) * 8} 
                y1={p.y}
                x2={15 + Math.sin(i * 0.6) * 8}
                y2={p.y}
                stroke="#9B59B6"
                strokeWidth={1}
                opacity={p.opacity * 0.5}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function Statistics() {
  const [isAuthed, setIsAuthed] = useState(isAuthenticated());
  const [username, setUsername] = useState<string | null>(getUsername());
  const [stats, setStats] = useState<UserStats | null>(null);
  const [genres, setGenres] = useState<GenreData[]>([]);
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState<'all' | 'winter' | 'spring' | 'summer' | 'fall'>('all');
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New feature states
  const [studioAffinity, setStudioAffinity] = useState<StudioAffinity[]>([]);
  const [seasonalStats, setSeasonalStats] = useState<SeasonalStats[]>([]);
  const [franchiseNodes, setFranchiseNodes] = useState<FranchiseNode[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'studios' | 'seasons' | 'franchises' | 'genres' | 'gaps' | 'voices'>('overview');
  const [loadingExtended, setLoadingExtended] = useState(false);
  const [expandedStudios, setExpandedStudios] = useState<Set<number>>(new Set());
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [expandedVAs, setExpandedVAs] = useState<Set<number>>(new Set());
  
  // Interactive score modal
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [animeByScore, setAnimeByScore] = useState<MALAnimeEntry[]>([]);
  const [allAnimeList, setAllAnimeList] = useState<MALAnimeEntry[]>([]);
  
  // Genre score breakdown
  const [genreScores, setGenreScores] = useState<{ name: string; avgScore: number; count: number; diff: number }[]>([]);
  
  // Gap Analysis - popular anime in user's top genres they haven't watched
  interface GapAnime {
    id: number;
    title: string;
    image: string;
    score: number;
    genres: string[];
    matchingGenres: string[];
    relevanceScore: number;
  }
  const [gapAnalysis, setGapAnalysis] = useState<GapAnime[]>([]);
  
  // Voice Actor Tracker
  interface VoiceActorData {
    id: number;
    name: string;
    image: string;
    animeCount: number;
    characters: { name: string; anime: string; image: string }[];
  }
  const [voiceActors, setVoiceActors] = useState<VoiceActorData[]>([]);
  const [loadingVAs, setLoadingVAs] = useState(false);

  const loadStats = async () => {
    if (!isAuthenticated()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[MAL] Fetching stats via official API...');
      
      // Fetch user stats
      const userStats = await fetchUserStats();
      if (userStats) {
        setStats(userStats);
        console.log('[MAL] Stats loaded:', userStats);
      } else {
        throw new Error('Failed to fetch statistics');
      }

      // Fetch real score distribution
      const scoreData = await fetchScoreDistribution();
      if (scoreData.length > 0) {
        setScores(scoreData);
        console.log('[MAL] Score distribution loaded:', scoreData);
      }

      // Generate estimated genre distribution (API doesn't provide per-user genre data easily)
      if (userStats) {
        const estimatedGenres: GenreData[] = [
          { name: 'Action', count: Math.round(userStats.completed * 0.45), percentage: 100 },
          { name: 'Adventure', count: Math.round(userStats.completed * 0.38), percentage: 84 },
          { name: 'Comedy', count: Math.round(userStats.completed * 0.35), percentage: 78 },
          { name: 'Fantasy', count: Math.round(userStats.completed * 0.32), percentage: 71 },
          { name: 'Drama', count: Math.round(userStats.completed * 0.28), percentage: 62 },
          { name: 'Sci-Fi', count: Math.round(userStats.completed * 0.20), percentage: 44 },
          { name: 'Romance', count: Math.round(userStats.completed * 0.18), percentage: 40 },
          { name: 'Supernatural', count: Math.round(userStats.completed * 0.15), percentage: 33 },
        ];
        setGenres(estimatedGenres);
      }

      setUsername(getUsername());
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch MAL data');
      console.error('[MAL] Stats fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExtendedStats = async () => {
    if (!isAuthenticated() || loadingExtended) return;
    
    setLoadingExtended(true);
    try {
      console.log('[MAL] Loading extended statistics...');
      
      // Load all extended data in parallel
      const [studios, seasons, franchises, recs, animeList] = await Promise.all([
        fetchStudioAffinity(),
        fetchSeasonalBreakdown(),
        fetchFranchiseMap(),
        fetchRecommendations(),
        fetchExtendedAnimeList(),
      ]);
      
      setStudioAffinity(studios);
      setSeasonalStats(seasons);
      setFranchiseNodes(franchises);
      setRecommendations(recs);
      setAllAnimeList(animeList);
      
      // Calculate genre score breakdown
      const genreMap = new Map<string, { total: number; count: number; malTotal: number; malCount: number }>();
      for (const anime of animeList) {
        if (anime.score > 0 && anime.genres) {
          for (const genre of anime.genres) {
            const existing = genreMap.get(genre.name) || { total: 0, count: 0, malTotal: 0, malCount: 0 };
            existing.total += anime.score;
            existing.count++;
            if (anime.mean_score && anime.mean_score > 0) {
              existing.malTotal += anime.mean_score;
              existing.malCount++;
            }
            genreMap.set(genre.name, existing);
          }
        }
      }
      
      const genreScoreData = Array.from(genreMap.entries())
        .map(([name, data]) => {
          const avgScore = data.count > 0 ? data.total / data.count : 0;
          const malAvg = data.malCount > 0 ? data.malTotal / data.malCount : 0;
          return {
            name,
            avgScore: Math.round(avgScore * 100) / 100,
            count: data.count,
            diff: malAvg > 0 ? Math.round((avgScore - malAvg) * 100) / 100 : 0,
          };
        })
        .filter(g => g.count >= 3)
        .sort((a, b) => b.avgScore - a.avgScore);
      
      setGenreScores(genreScoreData);
      
      // Gap Analysis: Find popular anime in user's top genres they haven't watched
      try {
        // Get user's top 5 genres by score
        const topGenres = genreScoreData.slice(0, 5).map(g => g.name);
        const watchedIds = new Set(animeList.map(a => a.id));
        
        // Fetch top anime from Jikan
        const jikanResponse = await fetch('https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=100');
        if (!jikanResponse.ok) {
          console.warn(`[MAL] Gap analysis HTTP ${jikanResponse.status}`);
          throw new Error('Jikan API returned error');
        }
        const jikanText = await jikanResponse.text();
        let jikanData;
        try {
          jikanData = JSON.parse(jikanText);
        } catch {
          console.warn('[MAL] Gap analysis: Invalid JSON response');
          throw new Error('Invalid JSON from Jikan');
        }
        
        if (jikanData.data) {
          const gaps: GapAnime[] = [];
          
          for (const anime of jikanData.data) {
            if (watchedIds.has(anime.mal_id)) continue; // Skip watched
            if (!anime.genres || anime.genres.length === 0) continue;
            
            const animeGenres = anime.genres.map((g: any) => g.name);
            const matchingGenres = animeGenres.filter((g: string) => topGenres.includes(g));
            
            if (matchingGenres.length === 0) continue; // Skip if no genre overlap
            
            // Calculate relevance score based on genre match and MAL score
            const genreMatchScore = (matchingGenres.length / Math.min(topGenres.length, animeGenres.length)) * 50;
            const malScore = anime.score || 0;
            const relevanceScore = genreMatchScore + (malScore * 5); // Weight MAL score
            
            gaps.push({
              id: anime.mal_id,
              title: anime.title_english || anime.title,
              image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
              score: malScore,
              genres: animeGenres,
              matchingGenres,
              relevanceScore,
            });
          }
          
          // Sort by relevance and take top 20
          gaps.sort((a, b) => b.relevanceScore - a.relevanceScore);
          setGapAnalysis(gaps.slice(0, 20));
          console.log('[MAL] Gap analysis:', gaps.slice(0, 20).length, 'blind spots found');
        }
      } catch (gapErr) {
        console.error('[MAL] Gap analysis error:', gapErr);
      }
      
      console.log('[MAL] Extended stats loaded:', { studios: studios.length, seasons: seasons.length, franchises: franchises.length, recs: recs.length, genres: genreScoreData.length });
    } catch (err: any) {
      console.error('[MAL] Extended stats error:', err);
    } finally {
      setLoadingExtended(false);
    }
  };

  useEffect(() => {
    if (isAuthed) {
      loadStats();
    }
  }, [isAuthed]);

  // Load extended stats when switching to non-overview tabs
  useEffect(() => {
    if (isAuthed && activeTab !== 'overview' && studioAffinity.length === 0 && !loadingExtended) {
      loadExtendedStats();
    }
  }, [isAuthed, activeTab]);
  
  // Load voice actors when switching to voices tab
  const loadVoiceActors = async () => {
    if (!isAuthenticated() || loadingVAs || voiceActors.length > 0) return;
    
    setLoadingVAs(true);
    try {
      const animeList = allAnimeList.length > 0 ? allAnimeList : await fetchExtendedAnimeList();
      
      // Only fetch VA data for top 20 anime to avoid rate limiting
      const topAnime = animeList
        .filter(a => a.status === 'completed' || a.status === 'watching')
        .slice(0, 20);
      
      const vaMap = new Map<number, VoiceActorData>();
      
      for (let i = 0; i < topAnime.length; i++) {
        const anime = topAnime[i];
        
        // Rate limit Jikan API calls
        if (i > 0) await new Promise(r => setTimeout(r, 1200));
        
        try {
          const response = await fetch(`https://api.jikan.moe/v4/anime/${anime.id}/characters`);
          if (!response.ok) {
            console.warn(`[VA] HTTP ${response.status} for anime ${anime.id}`);
            continue;
          }
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            console.warn(`[VA] Invalid JSON for anime ${anime.id}`);
            continue;
          }
          
          if (data.data) {
            for (const char of data.data.slice(0, 5)) { // Top 5 characters per anime
              if (!char.voice_actors) continue;
              
              // Get Japanese VA
              const japaneseVA = char.voice_actors.find((va: any) => va.language === 'Japanese');
              if (!japaneseVA) continue;
              
              const vaId = japaneseVA.person.mal_id;
              const existing: VoiceActorData = vaMap.get(vaId) || {
                id: vaId,
                name: japaneseVA.person.name,
                image: japaneseVA.person.images?.jpg?.image_url || '',
                animeCount: 0,
                characters: [] as { name: string; anime: string; image: string }[],
              };
              
              existing.animeCount++;
              existing.characters.push({
                name: char.character.name,
                anime: anime.title,
                image: char.character.images?.jpg?.image_url || '',
              });
              
              vaMap.set(vaId, existing);
            }
          }
        } catch (err) {
          console.error(`[VA] Error fetching characters for ${anime.title}:`, err);
        }
      }
      
      // Sort by anime count and take top 15
      const sortedVAs = Array.from(vaMap.values())
        .sort((a, b) => b.animeCount - a.animeCount)
        .slice(0, 15);
      
      setVoiceActors(sortedVAs);
      console.log('[VA] Loaded', sortedVAs.length, 'voice actors');
    } catch (err) {
      console.error('[VA] Error loading voice actors:', err);
    } finally {
      setLoadingVAs(false);
    }
  };
  
  useEffect(() => {
    if (isAuthed && activeTab === 'voices' && voiceActors.length === 0 && !loadingVAs) {
      loadVoiceActors();
    }
  }, [isAuthed, activeTab]);

  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthed(authenticated);
    if (authenticated) {
      setUsername(getUsername());
    } else {
      setStats(null);
      setScores([]);
      setGenres([]);
      setUsername(null);
    }
  };

  const formatWatchTime = (days: number) => {
    if (days < 1) return `${Math.round(days * 24)}h`;
    if (days < 30) return `${days.toFixed(1)} days`;
    const months = days / 30;
    return `${months.toFixed(1)} months`;
  };

  // Not authenticated - show login
  if (!isAuthed) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div 
              className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-primary)20' }}
            >
              <BarChart3 size={32} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              View Your Anime Statistics
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Connect your MyAnimeList account to see your stats, score distribution, and more.
            </p>
          </div>
          <MALConnect onAuthChange={handleAuthChange} />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <BarChart3 size={48} style={{ color: 'var(--accent-primary)' }} />
          </motion.div>
          <p style={{ color: 'var(--text-muted)' }}>Loading statistics from MAL...</p>
        </div>
      </div>
    );
  }

  // Show loading message if authenticated but no stats yet
  if (!stats) {
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
                onClick={loadStats}
                className="px-6 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              >
                Retry
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Loading your statistics...</p>
          )}
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...scores.map(s => s.count), 1);

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'genres', label: 'Genres', icon: Tag },
    { id: 'recommendations', label: 'For You', icon: Sparkles },
    { id: 'gaps', label: 'Blind Spots', icon: Eye },
    { id: 'voices', label: 'VAs', icon: Mic2 },
    { id: 'studios', label: 'Studios', icon: Building2 },
    { id: 'seasons', label: 'Seasons', icon: Calendar },
    { id: 'franchises', label: 'Franchises', icon: GitBranch },
  ] as const;
  
  // Get anime for selected score
  const getAnimeByScore = (score: number) => {
    return allAnimeList.filter(a => a.score === score);
  };
  
  // Handle score bar click
  const handleScoreClick = (score: number) => {
    const anime = getAnimeByScore(score);
    if (anime.length > 0) {
      setAnimeByScore(anime);
      setSelectedScore(score);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <motion.header 
          className="mb-4 flex items-start justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Your Anime Statistics
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Connected to <span style={{ color: 'var(--accent-primary)' }}>@{stats.username}</span> on MyAnimeList
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { loadStats(); if (activeTab !== 'overview') loadExtendedStats(); }}
              disabled={isLoading || loadingExtended}
              className="p-2 rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
              title="Refresh statistics"
            >
              <RefreshCw 
                size={18} 
                className={(isLoading || loadingExtended) ? 'animate-spin' : ''} 
                style={{ color: 'var(--text-secondary)' }} 
              />
            </button>
            <MALConnect compact onAuthChange={handleAuthChange} />
          </div>
        </motion.header>

        {/* Tab Navigation - Scrollable on mobile */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto scrollbar-hide" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'shadow-sm' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Film}
            label="Total Anime"
            value={stats.total_anime}
            sublabel={`${stats.completed} completed`}
            color="#5865F2"
            delay={0}
          />
          <StatCard
            icon={Eye}
            label="Episodes Watched"
            value={stats.total_episodes.toLocaleString()}
            color="#3BA55D"
            delay={0.1}
          />
          <StatCard
            icon={Clock}
            label="Time Spent"
            value={formatWatchTime(stats.days_watched)}
            sublabel={`${stats.days_watched.toFixed(1)} days`}
            color="#F0B132"
            delay={0.2}
          />
          <StatCard
            icon={Star}
            label="Mean Score"
            value={stats.mean_score.toFixed(2)}
            sublabel="out of 10"
            color="#EB459E"
            delay={0.3}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Genre Breakdown */}
          <motion.div 
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
              Top Genres
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Estimated based on anime community trends</p>
            <div className="space-y-1">
              {genres.map((genre, i) => (
                <ProgressBar
                  key={genre.name}
                  label={genre.name}
                  value={genre.count}
                  max={genres[0].count}
                  color={GENRE_COLORS[i % GENRE_COLORS.length]}
                  delay={0.5 + i * 0.05}
                />
              ))}
            </div>
          </motion.div>

          {/* Score Distribution */}
          <motion.div 
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} />
              Score Distribution
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {scores.some(s => s.count > 0) 
                ? `Based on ${scores.reduce((sum, s) => sum + s.count, 0)} scored anime`
                : 'No scored anime found'
              }
            </p>
            <div className="flex items-end justify-between h-40 gap-1">
              {scores.map((item, i) => {
                // Use pixel-based height calculation for proper bar scaling
                // h-40 = 160px, subtract 20px for the label at bottom
                const maxBarHeight = 140; // pixels
                const barHeightPx = maxScore > 0 ? Math.round((item.count / maxScore) * maxBarHeight) : 0;
                const hasCount = item.count > 0;
                return (
                  <div 
                    key={item.score} 
                    className={`flex-1 flex flex-col items-center justify-end gap-1 group relative ${hasCount ? 'cursor-pointer' : ''}`}
                    onClick={() => hasCount && handleScoreClick(item.score)}
                  >
                    {/* Tooltip on hover */}
                    {hasCount && (
                      <div 
                        className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
                        style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                      >
                        {item.count} anime • Click to view
                      </div>
                    )}
                    <motion.div
                      className={`w-full rounded-t-md relative ${hasCount ? 'group-hover:opacity-80 transition-opacity' : ''}`}
                      style={{ 
                        backgroundColor: hasCount 
                          ? (item.score >= 7 ? 'var(--accent-primary)' : 'var(--bg-elevated)')
                          : 'transparent',
                        minHeight: hasCount ? '4px' : '2px',
                        // Show a subtle baseline for empty scores
                        borderBottom: !hasCount ? '2px dashed var(--bg-elevated)' : 'none'
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: hasCount ? `${barHeightPx}px` : '2px' }}
                      transition={{ delay: 0.6 + i * 0.05, duration: 0.5 }}
                    />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.score}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Lowest</span>
              <span>Click a bar to see anime</span>
              <span>Highest</span>
            </div>
          </motion.div>
        </div>

        {/* Status Breakdown */}
        <motion.div 
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
            List Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Watching', value: stats.watching, color: '#3BA55D' },
              { label: 'Completed', value: stats.completed, color: '#5865F2' },
              { label: 'Plan to Watch', value: stats.plan_to_watch, color: '#F0B132' },
              { label: 'On Hold', value: stats.on_hold, color: '#9B59B6' },
              { label: 'Dropped', value: stats.dropped, color: '#ED4245' },
            ].map((item, i) => (
              <motion.div 
                key={item.label} 
                className="text-center p-4 rounded-xl"
                style={{ backgroundColor: 'var(--bg-primary)' }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.05 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div 
                  className="text-3xl font-bold"
                  style={{ color: item.color }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.05 }}
                >
                  {item.value}
                </motion.div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Fun Stats */}
        <motion.div 
          className="mt-6 p-4 rounded-xl border-l-4"
          style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            borderColor: 'var(--accent-primary)' 
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            🎉 You've spent <strong style={{ color: 'var(--accent-primary)' }}>{stats.days_watched.toFixed(1)} days</strong> watching anime! 
            That's equivalent to binge-watching <strong style={{ color: 'var(--text-primary)' }}>
            {Math.round(stats.total_episodes / 12)} seasons</strong> back-to-back.
          </p>
        </motion.div>

        {/* Anime Length Preferences */}
        {(() => {
          const lengthCategories = [
            { label: 'Short', range: '1-12 eps', min: 1, max: 12, color: '#3BA55D' },
            { label: 'Standard', range: '13-26 eps', min: 13, max: 26, color: '#5865F2' },
            { label: 'Long', range: '27-50 eps', min: 27, max: 50, color: '#F0B132' },
            { label: 'Epic', range: '50+ eps', min: 51, max: Infinity, color: '#EB459E' },
          ];
          
          const categorizedAnime = lengthCategories.map(cat => {
            const anime = allAnimeList.filter(a => 
              a.total_episodes >= cat.min && a.total_episodes <= cat.max && a.total_episodes > 0
            );
            const scoredAnime = anime.filter(a => a.score > 0);
            const avgScore = scoredAnime.length > 0 
              ? scoredAnime.reduce((sum, a) => sum + a.score, 0) / scoredAnime.length 
              : 0;
            return { ...cat, count: anime.length, avgScore };
          });
          
          const totalCategorized = categorizedAnime.reduce((sum, c) => sum + c.count, 0);
          const mostWatched = categorizedAnime.reduce((max, c) => c.count > max.count ? c : max, categorizedAnime[0]);
          
          return (
            <motion.div 
              className="rounded-xl p-5 mt-6"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Layers size={18} style={{ color: 'var(--accent-primary)' }} />
                Anime Length Preferences
              </h3>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                Episode count breakdown
              </p>
              
              {totalCategorized > 0 ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {categorizedAnime.map((cat, i) => {
                      const percentage = totalCategorized > 0 ? ((cat.count / totalCategorized) * 100).toFixed(1) : '0';
                      const isMostWatched = cat.label === mostWatched.label && cat.count > 0;
                      return (
                        <motion.div
                          key={cat.label}
                          className="p-4 rounded-xl relative overflow-hidden"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)',
                            border: isMostWatched ? `2px solid ${cat.color}` : '2px solid transparent'
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.1 + i * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          {isMostWatched && (
                            <div 
                              className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold"
                              style={{ backgroundColor: cat.color, color: 'white' }}
                            >
                              FAVORITE
                            </div>
                          )}
                          <div className="text-xs font-medium mb-1" style={{ color: cat.color }}>
                            {cat.label}
                          </div>
                          <div className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
                            {cat.range}
                          </div>
                          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {cat.count}
                          </div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {percentage}% of list
                          </div>
                          {cat.avgScore > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              <Star size={10} fill="currentColor" style={{ color: cat.color }} />
                              <span>Avg: {cat.avgScore.toFixed(2)}</span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  
                  {mostWatched.count > 0 && (
                    <motion.p 
                      className="text-xs mt-4 text-center"
                      style={{ color: 'var(--text-muted)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.3 }}
                    >
                      You prefer <span style={{ color: mostWatched.color, fontWeight: 600 }}>{mostWatched.label}</span> anime ({mostWatched.range})
                    </motion.p>
                  )}
                </>
              ) : (
                <div className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  <Layers size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No anime with episode data found</p>
                </div>
              )}
            </motion.div>
          );
        })()}
        </motion.div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <motion.div
              key="recommendations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
                  Smart Recommendations
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Personalized picks from your Plan to Watch based on your taste profile
                </p>
                
                {loadingExtended ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {recommendations.map((rec, i) => (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex gap-3 p-3 rounded-lg hover:scale-[1.01] transition-transform cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-primary)' }}
                        onClick={() => window.open(`https://myanimelist.net/anime/${rec.id}`, '_blank')}
                      >
                        <img
                          src={rec.image}
                          alt={rec.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                              {rec.title}
                            </h4>
                            <div 
                              className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ 
                                backgroundColor: rec.compatibility >= 70 ? '#3BA55D20' : rec.compatibility >= 50 ? '#F0B13220' : 'var(--bg-elevated)',
                                color: rec.compatibility >= 70 ? '#3BA55D' : rec.compatibility >= 50 ? '#F0B132' : 'var(--text-muted)'
                              }}
                            >
                              {rec.compatibility}% match
                            </div>
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {rec.reason}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {rec.mean_score > 0 && (
                              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                <Star size={10} fill="currentColor" /> {rec.mean_score.toFixed(1)}
                              </span>
                            )}
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {rec.genres.slice(0, 3).map(g => g.name).join(' • ')}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} className="self-center flex-shrink-0" />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No recommendations yet</p>
                    <p className="text-xs mt-1">Add anime to your Plan to Watch list to get personalized picks!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Blind Spots / Gap Analysis Tab */}
          {activeTab === 'gaps' && (
            <motion.div
              key="gaps"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Eye size={18} style={{ color: 'var(--accent-primary)' }} />
                  Blind Spot Analysis
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Popular anime in your favorite genres that you haven't watched yet
                </p>
                
                {loadingExtended ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : gapAnalysis.length > 0 ? (
                  <div className="space-y-3">
                    {gapAnalysis.map((anime, i) => (
                      <motion.div
                        key={anime.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex gap-3 p-3 rounded-lg hover:scale-[1.01] transition-transform cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-primary)' }}
                        onClick={() => window.open(`https://myanimelist.net/anime/${anime.id}`, '_blank')}
                      >
                        <img
                          src={anime.image}
                          alt={anime.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                              {anime.title}
                            </h4>
                            {anime.score > 0 && (
                              <span 
                                className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                                style={{ 
                                  backgroundColor: anime.score >= 8 ? '#3BA55D20' : '#F0B13220',
                                  color: anime.score >= 8 ? '#3BA55D' : '#F0B132'
                                }}
                              >
                                <Star size={10} fill="currentColor" /> {anime.score.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {anime.matchingGenres.map(genre => (
                              <span 
                                key={genre}
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}
                              >
                                {genre}
                              </span>
                            ))}
                            {anime.genres.filter(g => !anime.matchingGenres.includes(g)).slice(0, 2).map(genre => (
                              <span 
                                key={genre}
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} className="self-center flex-shrink-0" />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <Eye size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No blind spots found</p>
                    <p className="text-xs mt-1">You've watched most popular anime in your favorite genres!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Voice Actors Tab */}
          {activeTab === 'voices' && (
            <motion.div
              key="voices"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Mic2 size={18} style={{ color: 'var(--accent-primary)' }} />
                  Voice Actor Tracker
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Voice actors you've heard the most across your watched anime
                </p>
                
                {loadingVAs ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--text-muted)' }} />
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                      Loading voice actors (this may take a moment)...
                    </p>
                  </div>
                ) : voiceActors.length > 0 ? (
                  <div className="space-y-2">
                    {voiceActors.map((va, i) => {
                      const isExpanded = expandedVAs.has(va.id);
                      return (
                      <motion.div
                        key={va.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="rounded-lg overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-primary)' }}
                      >
                        <div
                          className="flex gap-3 p-3 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            const newExpanded = new Set(expandedVAs);
                            if (isExpanded) {
                              newExpanded.delete(va.id);
                            } else {
                              newExpanded.add(va.id);
                            }
                            setExpandedVAs(newExpanded);
                          }}
                        >
                          <img
                            src={va.image}
                            alt={va.name}
                            className="w-12 h-16 object-cover rounded flex-shrink-0"
                            style={{ backgroundColor: 'var(--bg-elevated)' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                {va.name}
                              </h4>
                              <span 
                                className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold"
                                style={{ 
                                  backgroundColor: va.animeCount >= 5 ? '#3BA55D20' : va.animeCount >= 3 ? '#F0B13220' : 'var(--bg-elevated)',
                                  color: va.animeCount >= 5 ? '#3BA55D' : va.animeCount >= 3 ? '#F0B132' : 'var(--text-muted)'
                                }}
                              >
                                {va.animeCount} anime
                              </span>
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                              Click to {isExpanded ? 'hide' : 'show'} characters
                            </p>
                          </div>
                          <motion.div 
                            className="self-center flex-shrink-0"
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                          </motion.div>
                        </div>
                        
                        {/* Expanded character list */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 pt-1 space-y-2 border-t" style={{ borderColor: 'var(--bg-elevated)' }}>
                                {va.characters.map((char, ci) => (
                                  <div 
                                    key={ci}
                                    className="flex items-center gap-2 p-2 rounded-lg"
                                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                                  >
                                    {char.image && (
                                      <img
                                        src={char.image}
                                        alt={char.name}
                                        className="w-8 h-10 object-cover rounded flex-shrink-0"
                                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                        {char.name}
                                      </p>
                                      <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                                        in {char.anime}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`https://myanimelist.net/people/${va.id}`, '_blank');
                                  }}
                                  className="w-full mt-2 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                                  style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}
                                >
                                  <ExternalLink size={12} />
                                  View on MyAnimeList
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );})}
                  </div>
                ) : (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <Mic2 size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No voice actor data yet</p>
                    <p className="text-xs mt-1">Complete more anime to see your most-heard VAs!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Studios Tab */}
          {activeTab === 'studios' && (
            <motion.div
              key="studios"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Building2 size={18} style={{ color: 'var(--accent-primary)' }} />
                  Studio Affinity Score
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Your favorite animation studios based on your scores (min. 2 scored anime)
                </p>
                
                {loadingExtended ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : studioAffinity.length > 0 ? (
                  <div className="space-y-2">
                    {studioAffinity.slice(0, 15).map((studio, i) => {
                      const isExpanded = expandedStudios.has(studio.id);
                      return (
                        <motion.div
                          key={studio.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="rounded-lg overflow-hidden"
                          style={{ backgroundColor: 'var(--bg-primary)' }}
                        >
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedStudios);
                              if (isExpanded) {
                                newExpanded.delete(studio.id);
                              } else {
                                newExpanded.add(studio.id);
                              }
                              setExpandedStudios(newExpanded);
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:opacity-90 transition-opacity"
                          >
                            <div className="w-6 text-center flex-shrink-0">
                              <span 
                                className="text-sm font-bold"
                                style={{ color: i < 3 ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                              >
                                #{i + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                  {studio.name}
                                </span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {studio.totalScored}/{studio.animeCount} scored
                                  </span>
                                  <span 
                                    className="text-sm font-bold px-2 py-0.5 rounded"
                                    style={{ 
                                      backgroundColor: studio.averageScore >= 8 ? '#3BA55D20' : studio.averageScore >= 7 ? '#F0B13220' : 'var(--bg-elevated)',
                                      color: studio.averageScore >= 8 ? '#3BA55D' : studio.averageScore >= 7 ? '#F0B132' : 'var(--text-secondary)'
                                    }}
                                  >
                                    {studio.averageScore.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: i < 3 ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(studio.averageScore / 10) * 100}%` }}
                                  transition={{ delay: i * 0.03 + 0.2, duration: 0.5 }}
                                />
                              </div>
                            </div>
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex-shrink-0"
                            >
                              <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                            </motion.div>
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: 'var(--bg-elevated)' }}>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                                    {studio.anime.map((anime) => {
                                      const statusColors: Record<string, string> = {
                                        completed: '#3BA55D',
                                        watching: '#5865F2',
                                        plan_to_watch: '#F0B132',
                                        on_hold: '#9B59B6',
                                        dropped: '#ED4245',
                                      };
                                      return (
                                        <div
                                          key={anime.id}
                                          className="flex items-center gap-2 p-2 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                          style={{ backgroundColor: 'var(--bg-secondary)' }}
                                          onClick={() => window.open(`https://myanimelist.net/anime/${anime.id}`, '_blank')}
                                          title={anime.title}
                                        >
                                          <img
                                            src={anime.image}
                                            alt={anime.title}
                                            className="w-10 h-14 object-cover rounded flex-shrink-0"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                              {anime.title}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1">
                                              <div 
                                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: statusColors[anime.status] || 'var(--text-muted)' }}
                                              />
                                              {anime.score > 0 ? (
                                                <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                                                  <Star size={10} fill="currentColor" /> {anime.score}
                                                </span>
                                              ) : (
                                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Unrated</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No studio data available</p>
                    <p className="text-xs mt-1">Rate more anime to see your studio preferences!</p>
                  </div>
                )}
              </div>

              {/* Studio Discovery Section */}
              {studioAffinity.length > 0 && (
                <motion.div 
                  className="rounded-xl p-5 mt-4"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Sparkles size={18} style={{ color: '#F0B132' }} />
                    Studios to Discover
                  </h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    Studios similar to your favorites that you haven't explored much
                  </p>
                  
                  {(() => {
                    // Find studios with only 1 anime (not enough for affinity) that might match user's taste
                    const lowCountStudios = studioAffinity
                      .filter(s => s.animeCount >= 1 && s.animeCount <= 2 && s.totalScored >= 1 && s.averageScore >= 7)
                      .slice(0, 5);
                    
                    if (lowCountStudios.length === 0) return (
                      <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                        You've already explored most studios! Keep watching to discover more.
                      </p>
                    );
                    
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {lowCountStudios.map((studio, i) => (
                          <motion.div
                            key={studio.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + i * 0.05 }}
                            className="p-3 rounded-lg text-center cursor-pointer hover:scale-[1.02] transition-transform"
                            style={{ backgroundColor: 'var(--bg-primary)' }}
                            onClick={() => window.open(`https://myanimelist.net/anime/producer/${studio.id}`, '_blank')}
                          >
                            <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                              {studio.name}
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {studio.animeCount} watched
                              </span>
                              <span className="text-xs flex items-center gap-0.5" style={{ color: '#3BA55D' }}>
                                <Star size={10} fill="currentColor" /> {studio.averageScore}
                              </span>
                            </div>
                            <p className="text-xs mt-2" style={{ color: 'var(--accent-primary)' }}>
                              Explore more →
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Seasons Tab */}
          {activeTab === 'seasons' && (
            <motion.div
              key="seasons"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
                    Seasonal Breakdown
                  </h3>
                  {/* Custom Filters */}
                  {seasonalStats.length > 0 && (
                    <div className="flex items-center gap-2">
                      {/* Season Filter Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => { setSeasonDropdownOpen(!seasonDropdownOpen); setYearDropdownOpen(false); }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)', 
                            color: 'var(--text-primary)',
                            border: '1px solid var(--bg-elevated)'
                          }}
                        >
                          <span>
                            {selectedSeasonFilter === 'all' ? '🌐 All Seasons' : 
                             selectedSeasonFilter === 'winter' ? '❄️ Winter' :
                             selectedSeasonFilter === 'spring' ? '🌸 Spring' :
                             selectedSeasonFilter === 'summer' ? '☀️ Summer' : '🍂 Fall'}
                          </span>
                          <ChevronDown size={14} className={`transition-transform ${seasonDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {seasonDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="absolute right-0 top-full mt-1 z-20 rounded-lg shadow-lg overflow-hidden min-w-[140px]"
                              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-tertiary)' }}
                            >
                              {([['all', '🌐 All Seasons'], ['winter', '❄️ Winter'], ['spring', '🌸 Spring'], ['summer', '☀️ Summer'], ['fall', '🍂 Fall']] as const).map(([value, label]) => (
                                <button
                                  key={value}
                                  onClick={() => { setSelectedSeasonFilter(value); setSeasonDropdownOpen(false); }}
                                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:opacity-80 transition-opacity ${selectedSeasonFilter === value ? 'font-medium' : ''}`}
                                  style={{ 
                                    backgroundColor: selectedSeasonFilter === value ? 'var(--accent-primary)20' : 'transparent',
                                    color: selectedSeasonFilter === value ? 'var(--accent-primary)' : 'var(--text-primary)'
                                  }}
                                >
                                  {label}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {/* Year Filter Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => { setYearDropdownOpen(!yearDropdownOpen); setSeasonDropdownOpen(false); }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)', 
                            color: 'var(--text-primary)',
                            border: '1px solid var(--bg-elevated)'
                          }}
                        >
                          <Calendar size={14} />
                          <span>{selectedYear === 'all' ? 'All Years' : selectedYear}</span>
                          <ChevronDown size={14} className={`transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {yearDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="absolute right-0 top-full mt-1 z-20 rounded-lg shadow-lg overflow-hidden max-h-[200px] overflow-y-auto min-w-[120px]"
                              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-tertiary)' }}
                            >
                              <button
                                onClick={() => { setSelectedYear('all'); setYearDropdownOpen(false); }}
                                className={`w-full px-3 py-2 text-left text-sm hover:opacity-80 transition-opacity ${selectedYear === 'all' ? 'font-medium' : ''}`}
                                style={{ 
                                  backgroundColor: selectedYear === 'all' ? 'var(--accent-primary)20' : 'transparent',
                                  color: selectedYear === 'all' ? 'var(--accent-primary)' : 'var(--text-primary)'
                                }}
                              >
                                All Years
                              </button>
                              {Array.from(new Set(seasonalStats.map(s => s.year)))
                                .sort((a, b) => b - a)
                                .map(year => (
                                  <button
                                    key={year}
                                    onClick={() => { setSelectedYear(year); setYearDropdownOpen(false); }}
                                    className={`w-full px-3 py-2 text-left text-sm hover:opacity-80 transition-opacity ${selectedYear === year ? 'font-medium' : ''}`}
                                    style={{ 
                                      backgroundColor: selectedYear === year ? 'var(--accent-primary)20' : 'transparent',
                                      color: selectedYear === year ? 'var(--accent-primary)' : 'var(--text-primary)'
                                    }}
                                  >
                                    {year}
                                  </button>
                                ))
                              }
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Your completion rate and average score per anime season
                </p>
                
                {loadingExtended ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : seasonalStats.length > 0 ? (
                  (() => {
                    let filteredSeasons = selectedYear === 'all' 
                      ? seasonalStats 
                      : seasonalStats.filter(s => s.year === selectedYear);
                    
                    // Apply season filter
                    if (selectedSeasonFilter !== 'all') {
                      filteredSeasons = filteredSeasons.filter(s => s.season === selectedSeasonFilter);
                    }
                    
                    // Compute aggregated seasonal comparison stats
                    const seasonAggregates = (['winter', 'spring', 'summer', 'fall'] as const).map(seasonType => {
                      const seasonsOfType = seasonalStats.filter(s => s.season === seasonType);
                      const totalCount = seasonsOfType.reduce((sum, s) => sum + s.total, 0);
                      const allAnime = seasonsOfType.flatMap(s => s.anime || []);
                      const scoredAnime = allAnime.filter(a => a.score && a.score > 0);
                      const avgScore = scoredAnime.length > 0 
                        ? scoredAnime.reduce((sum, a) => sum + (a.score || 0), 0) / scoredAnime.length 
                        : 0;
                      return { season: seasonType, count: totalCount, avgScore };
                    });
                    const maxSeasonCount = Math.max(...seasonAggregates.map(s => s.count), 1);
                    const favoriteSeason = seasonAggregates.reduce((a, b) => a.count > b.count ? a : b);
                    
                    const seasonColors: Record<string, string> = {
                      winter: '#5865F2',
                      spring: '#3BA55D',
                      summer: '#F0B132',
                      fall: '#ED4245',
                    };
                    const seasonEmojis: Record<string, string> = {
                      winter: '❄️',
                      spring: '🌸',
                      summer: '☀️',
                      fall: '🍂',
                    };
                    const seasonLabels: Record<string, string> = {
                      winter: 'Winter',
                      spring: 'Spring',
                      summer: 'Summer',
                      fall: 'Fall',
                    };
                    
                    if (filteredSeasons.length === 0) {
                      return (
                        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                          <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                          <p>No anime found for {selectedSeasonFilter !== 'all' ? `${selectedSeasonFilter} ` : ''}{selectedYear !== 'all' ? selectedYear : 'these filters'}</p>
                        </div>
                      );
                    }
                    
                    return (
                  <>
                    {/* Seasonal Comparison Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl p-5 mb-4"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      <h4 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <TrendingUp size={16} style={{ color: 'var(--accent-primary)' }} />
                        Your Seasonal Pattern
                      </h4>
                      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                        Which season you watch the most anime — aggregated across all years
                      </p>
                      
                      <div className="space-y-3">
                        {seasonAggregates.map((s, i) => {
                          const percentage = (s.count / maxSeasonCount) * 100;
                          const isFavorite = s.season === favoriteSeason.season && s.count > 0;
                          return (
                            <motion.div
                              key={s.season}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                            >
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                  <span>{seasonEmojis[s.season]}</span>
                                  <span className="font-medium">{seasonLabels[s.season]}</span>
                                  {isFavorite && (
                                    <span 
                                      className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                      style={{ backgroundColor: `${seasonColors[s.season]}20`, color: seasonColors[s.season] }}
                                    >
                                      FAVORITE
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {s.count} anime
                                  </span>
                                  {s.avgScore > 0 && (
                                    <span className="text-xs flex items-center gap-1" style={{ color: seasonColors[s.season] }}>
                                      <Star size={10} fill="currentColor" />
                                      {s.avgScore.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: seasonColors[s.season] }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ delay: i * 0.1 + 0.2, duration: 0.6, ease: 'easeOut' }}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                      
                      {favoriteSeason.count > 0 && (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6 }}
                          className="text-xs mt-4 pt-3 border-t text-center"
                          style={{ color: 'var(--text-secondary)', borderColor: 'var(--bg-elevated)' }}
                        >
                          You tend to watch the most anime during <span style={{ color: seasonColors[favoriteSeason.season], fontWeight: 600 }}>{seasonEmojis[favoriteSeason.season]} {seasonLabels[favoriteSeason.season]}</span> seasons!
                        </motion.p>
                      )}
                    </motion.div>
                    
                  <div className="space-y-2">
                    {filteredSeasons.map((season, i) => {
                      const seasonColors: Record<string, string> = {
                        winter: '#5865F2',
                        spring: '#3BA55D',
                        summer: '#F0B132',
                        fall: '#ED4245',
                      };
                      const seasonEmojis: Record<string, string> = {
                        winter: '❄️',
                        spring: '🌸',
                        summer: '☀️',
                        fall: '🍂',
                      };
                      const seasonKey = season.label;
                      const isExpanded = expandedSeasons.has(seasonKey);
                      
                      return (
                        <motion.div
                          key={season.label}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="rounded-lg overflow-hidden"
                          style={{ backgroundColor: 'var(--bg-primary)' }}
                        >
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedSeasons);
                              if (isExpanded) {
                                newExpanded.delete(seasonKey);
                              } else {
                                newExpanded.add(seasonKey);
                              }
                              setExpandedSeasons(newExpanded);
                            }}
                            className="w-full p-4 hover:opacity-90 transition-opacity text-left"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                {seasonEmojis[season.season]} {season.label}
                              </span>
                              <div className="flex items-center gap-2">
                                <span 
                                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ 
                                    backgroundColor: `${seasonColors[season.season]}20`,
                                    color: seasonColors[season.season]
                                  }}
                                >
                                  {season.total} anime
                                </span>
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                                </motion.div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span style={{ color: 'var(--text-muted)' }}>Completion</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{season.completionRate}%</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: seasonColors[season.season] }}
                                initial={{ width: 0 }}
                                animate={{ width: `${season.completionRate}%` }}
                                transition={{ delay: i * 0.03 + 0.2, duration: 0.5 }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span style={{ color: 'var(--text-muted)' }}>Avg Score</span>
                              <span 
                                className="font-medium flex items-center gap-1"
                                style={{ color: season.averageScore >= 8 ? '#3BA55D' : season.averageScore >= 7 ? '#F0B132' : 'var(--text-secondary)' }}
                              >
                                <Star size={10} fill="currentColor" /> {season.averageScore > 0 ? season.averageScore.toFixed(1) : 'N/A'}
                              </span>
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: 'var(--bg-elevated)' }}>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                    {season.anime.map((anime) => {
                                      const statusColors: Record<string, string> = {
                                        completed: '#3BA55D',
                                        watching: '#5865F2',
                                        plan_to_watch: '#F0B132',
                                        on_hold: '#9B59B6',
                                        dropped: '#ED4245',
                                      };
                                      const statusLabels: Record<string, string> = {
                                        completed: 'Completed',
                                        watching: 'Watching',
                                        plan_to_watch: 'PTW',
                                        on_hold: 'On Hold',
                                        dropped: 'Dropped',
                                      };
                                      return (
                                        <div
                                          key={anime.id}
                                          className="flex items-center gap-3 p-2 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                          style={{ backgroundColor: 'var(--bg-secondary)' }}
                                          onClick={() => window.open(`https://myanimelist.net/anime/${anime.id}`, '_blank')}
                                          title={anime.title}
                                        >
                                          <img
                                            src={anime.image}
                                            alt={anime.title}
                                            className="w-10 h-14 object-cover rounded flex-shrink-0"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                              {anime.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span 
                                                className="text-xs px-1.5 py-0.5 rounded"
                                                style={{ 
                                                  backgroundColor: `${statusColors[anime.status]}20`,
                                                  color: statusColors[anime.status]
                                                }}
                                              >
                                                {statusLabels[anime.status] || anime.status}
                                              </span>
                                              {anime.score > 0 && (
                                                <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                                                  <Star size={10} fill="currentColor" /> {anime.score}
                                                </span>
                                              )}
                                            </div>
                                            {anime.total_episodes > 0 && (
                                              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                {anime.episodes_watched}/{anime.total_episodes} eps
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                  </>
                    );
                  })()
                ) : (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No seasonal data available</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Franchises Tab */}
          {activeTab === 'franchises' && (
            <motion.div
              key="franchises"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <GitBranch size={18} style={{ color: 'var(--accent-primary)' }} />
                  Franchise Map
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Connected anime in your list (sequels, prequels, spin-offs)
                </p>
                
                {loadingExtended ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : franchiseNodes.length > 0 ? (
                  <div className="space-y-4">
                    {/* Group franchises by finding connected clusters */}
                    {(() => {
                      // Build adjacency and find franchise clusters
                      const clusters: FranchiseNode[][] = [];
                      const visited = new Set<number>();
                      const nodeMap = new Map(franchiseNodes.map(n => [n.id, n]));
                      
                      const dfs = (nodeId: number, cluster: FranchiseNode[]) => {
                        if (visited.has(nodeId)) return;
                        visited.add(nodeId);
                        const node = nodeMap.get(nodeId);
                        if (node) {
                          cluster.push(node);
                          for (const rel of node.relations) {
                            dfs(rel.targetId, cluster);
                          }
                        }
                      };
                      
                      for (const node of franchiseNodes) {
                        if (!visited.has(node.id)) {
                          const cluster: FranchiseNode[] = [];
                          dfs(node.id, cluster);
                          if (cluster.length >= 2) {
                            clusters.push(cluster);
                          }
                        }
                      }
                      
                      // Sort clusters by size
                      clusters.sort((a, b) => b.length - a.length);
                      
                      return clusters.slice(0, 8).map((cluster, clusterIdx) => {
                        // Find a representative title (shortest)
                        const sorted = [...cluster].sort((a, b) => a.title.length - b.title.length);
                        const mainTitle = sorted[0].title.split(':')[0].split(' -')[0].trim();
                        
                        return (
                          <motion.div
                            key={clusterIdx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: clusterIdx * 0.05 }}
                            className="p-4 rounded-lg"
                            style={{ backgroundColor: 'var(--bg-primary)' }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                {mainTitle}
                              </h4>
                              <span 
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}
                              >
                                {cluster.length} entries
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {cluster.map((node) => {
                                const statusColors: Record<string, string> = {
                                  completed: '#3BA55D',
                                  watching: '#5865F2',
                                  plan_to_watch: '#F0B132',
                                  on_hold: '#9B59B6',
                                  dropped: '#ED4245',
                                };
                                return (
                                  <div
                                    key={node.id}
                                    className="flex items-center gap-2 p-2 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                                    onClick={() => window.open(`https://myanimelist.net/anime/${node.id}`, '_blank')}
                                    title={node.title}
                                  >
                                    <img
                                      src={node.image}
                                      alt={node.title}
                                      className="w-8 h-10 object-cover rounded"
                                    />
                                    <div className="max-w-[120px]">
                                      <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                                        {node.title.split(':')[0].split(' -')[0]}
                                      </p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <div 
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ backgroundColor: statusColors[node.status] || 'var(--text-muted)' }}
                                        />
                                        {node.score > 0 && (
                                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {node.score}/10
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <GitBranch size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No franchise connections found</p>
                    <p className="text-xs mt-1">Watch more anime from the same series to see connections!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Genres Tab */}
          {activeTab === 'genres' && (
            <motion.div
              key="genres"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Taste DNA Radar Chart */}
              <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
                  Your Taste DNA
                </h3>
                <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                  Genre ratings visualized
                </p>
                
                {loadingExtended ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : genreScores.length >= 3 ? (
                  <TasteDNAChart genreScores={genreScores} />
                ) : (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Not enough genre data</p>
                    <p className="text-xs mt-1">Rate at least 3 anime in different genres to see your Taste DNA!</p>
                  </div>
                )}
              </div>

              {/* Genre Score Breakdown */}
              <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Tag size={18} style={{ color: 'var(--accent-primary)' }} />
                  Genre Score Breakdown
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Your average score per genre compared to MAL community average (min. 3 anime)
                </p>
                
                {loadingExtended ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : genreScores.length > 0 ? (
                  <div className="space-y-3">
                    {genreScores.map((genre, i) => {
                      const isPositive = genre.diff >= 0;
                      return (
                        <motion.div
                          key={genre.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="p-3 rounded-lg"
                          style={{ backgroundColor: 'var(--bg-primary)' }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                {genre.name}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                                {genre.count} anime
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {genre.diff !== 0 && (
                                <span 
                                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                                  style={{ 
                                    backgroundColor: isPositive ? '#3BA55D20' : '#ED424520',
                                    color: isPositive ? '#3BA55D' : '#ED4245'
                                  }}
                                >
                                  {isPositive ? '+' : ''}{genre.diff.toFixed(2)} vs MAL
                                </span>
                              )}
                              <span 
                                className="text-sm font-bold flex items-center gap-1"
                                style={{ color: genre.avgScore >= 8 ? '#3BA55D' : genre.avgScore >= 7 ? '#F0B132' : 'var(--text-secondary)' }}
                              >
                                <Star size={12} fill="currentColor" /> {genre.avgScore.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ 
                                backgroundColor: genre.avgScore >= 8 ? '#3BA55D' : genre.avgScore >= 7 ? '#F0B132' : 'var(--accent-primary)'
                              }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(genre.avgScore / 10) * 100}%` }}
                              transition={{ delay: i * 0.03 + 0.2, duration: 0.5 }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <Tag size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No genre data available</p>
                    <p className="text-xs mt-1">Rate more anime to see your genre preferences!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score Detail Modal */}
        <AnimatePresence>
          {selectedScore !== null && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedScore(null)}
            >
              <motion.div
                className="relative w-[600px] max-h-[80vh] overflow-hidden rounded-xl shadow-2xl"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--bg-elevated)' }}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
                      style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                    >
                      {selectedScore}
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Anime Rated {selectedScore}/10
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {animeByScore.length} anime with this score
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedScore(null)}
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
                  >
                    <X size={18} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>

                {/* Anime List */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {animeByScore.map((anime, i) => (
                      <motion.div
                        key={anime.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: 'var(--bg-primary)' }}
                        onClick={() => window.open(`https://myanimelist.net/anime/${anime.id}`, '_blank')}
                      >
                        <img
                          src={anime.image}
                          alt={anime.title}
                          className="w-12 h-16 object-cover rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                            {anime.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                              <Star size={10} fill="currentColor" /> {anime.score}
                            </span>
                            {anime.mean_score && anime.mean_score > 0 && (
                              <span 
                                className="text-xs"
                                style={{ 
                                  color: anime.score > anime.mean_score ? '#3BA55D' : 
                                         anime.score < anime.mean_score ? '#ED4245' : 'var(--text-muted)'
                                }}
                              >
                                {anime.score > anime.mean_score ? '↑' : anime.score < anime.mean_score ? '↓' : '='} MAL: {anime.mean_score.toFixed(1)}
                              </span>
                            )}
                          </div>
                          {anime.genres && anime.genres.length > 0 && (
                            <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                              {anime.genres.slice(0, 3).map(g => g.name).join(' • ')}
                            </p>
                          )}
                        </div>
                        <ExternalLink size={14} className="flex-shrink-0 self-center" style={{ color: 'var(--text-muted)' }} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
