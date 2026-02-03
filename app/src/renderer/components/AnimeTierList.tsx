import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  GripVertical, 
  Search, 
  Plus, 
  X, 
  Crown, 
  Medal, 
  Award, 
  Star,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Flame,
  Zap,
  Music,
  Swords,
  Heart
} from 'lucide-react';
import {
  isAuthenticated,
  fetchAnimeList,
  MALAnimeEntry,
} from '../services/malApi';

type PeakBadge = {
  icon: 'flame' | 'zap' | 'music' | 'swords' | 'heart';
  label: string;
  color: string;
};

type TierAnime = {
  id: number;
  title: string;
  image: string;
  score: number;
  rank: number;
  peakBadge?: PeakBadge; // Optional peak arc badge for top 5
};

const TIER_COLORS = [
  { rank: 1, gradient: 'from-yellow-500 via-amber-400 to-yellow-300', glow: 'shadow-yellow-500/50', icon: Crown, label: '#1' },
  { rank: 2, gradient: 'from-gray-300 via-slate-200 to-gray-100', glow: 'shadow-gray-300/50', icon: Medal, label: '#2' },
  { rank: 3, gradient: 'from-amber-600 via-orange-500 to-amber-400', glow: 'shadow-amber-500/50', icon: Award, label: '#3' },
  { rank: 4, gradient: 'from-violet-500 to-purple-400', glow: 'shadow-violet-500/30', icon: Star, label: '#4' },
  { rank: 5, gradient: 'from-blue-500 to-cyan-400', glow: 'shadow-blue-500/30', icon: Star, label: '#5' },
  { rank: 6, gradient: 'from-emerald-500 to-teal-400', glow: 'shadow-emerald-500/30', icon: Star, label: '#6' },
  { rank: 7, gradient: 'from-pink-500 to-rose-400', glow: 'shadow-pink-500/30', icon: Star, label: '#7' },
  { rank: 8, gradient: 'from-indigo-500 to-blue-400', glow: 'shadow-indigo-500/30', icon: Star, label: '#8' },
  { rank: 9, gradient: 'from-orange-500 to-red-400', glow: 'shadow-orange-500/30', icon: Star, label: '#9' },
  { rank: 10, gradient: 'from-slate-500 to-gray-400', glow: 'shadow-slate-500/30', icon: Star, label: '#10' },
];

// Peak badges for top 5 - lets you indicate "this has a peak arc/moment"
const PEAK_BADGES: PeakBadge[] = [
  { icon: 'flame', label: 'Peak Arc', color: '#FF6B6B' },
  { icon: 'zap', label: 'Peak Animation', color: '#FFD93D' },
  { icon: 'music', label: 'Peak OST', color: '#6BCB77' },
  { icon: 'swords', label: 'Peak Fights', color: '#4D96FF' },
  { icon: 'heart', label: 'Peak Emotional', color: '#FF78C4' },
];

const getBadgeIcon = (iconName: string) => {
  switch (iconName) {
    case 'flame': return Flame;
    case 'zap': return Zap;
    case 'music': return Music;
    case 'swords': return Swords;
    case 'heart': return Heart;
    default: return Flame;
  }
};

const STORAGE_KEY = 'foxcli-anime-tierlist';

type TierCardProps = {
  anime: TierAnime; 
  rank: number;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragTarget: boolean;
  isDragging: boolean;
  onSetBadge?: (badge: PeakBadge | undefined) => void;
};

const TierCard = forwardRef<HTMLDivElement, TierCardProps>(({ 
  anime, 
  rank, 
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget,
  isDragging,
  onSetBadge,
}, ref) => {
  const tier = TIER_COLORS[rank - 1];
  const IconComponent = tier?.icon || Star;
  const [showBadgeMenu, setShowBadgeMenu] = useState(false);
  const isTop5 = rank <= 5;

  return (
    <div
      ref={ref}
      className={`relative group ${isDragTarget ? 'z-10' : ''}`}
      draggable
      onDragStart={(e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', anime.id.toString());
        onDragStart();
      }}
      onDragOver={(e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(e);
      }}
      onDrop={(e: React.DragEvent) => {
        e.preventDefault();
        onDrop();
      }}
      onDragLeave={() => {}}
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: isDragging ? 0.5 : 1, 
          scale: isDragTarget ? 1.05 : 1,
        }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div
          className={`relative rounded-xl overflow-hidden bg-gradient-to-br ${tier?.gradient || 'from-gray-500 to-gray-400'} p-[2px] shadow-lg ${tier?.glow || ''} cursor-grab active:cursor-grabbing transition-all ${
            isDragTarget ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[var(--bg-primary)]' : ''
          }`}
        >
        <div className="relative rounded-[10px] overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {/* Rank Badge */}
          <div 
            className={`absolute top-0 left-0 z-20 flex items-center gap-1 px-2.5 py-1.5 rounded-br-xl bg-gradient-to-r ${tier?.gradient || ''}`}
          >
            <IconComponent className="w-3.5 h-3.5 text-black/80" />
            <span className="text-xs font-bold text-black/80">{tier?.label}</span>
          </div>

          {/* Remove Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRemove();
            }}
            className="absolute top-1 right-1 z-20 p-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
          >
            <X className="w-3 h-3 text-white" />
          </button>

          {/* Peak Badge Display (Top 5 only) */}
          {isTop5 && anime.peakBadge && (
            <div 
              className="absolute top-8 left-0 z-20 flex items-center gap-1 px-2 py-1 rounded-r-lg shadow-lg"
              style={{ backgroundColor: anime.peakBadge.color }}
              title={anime.peakBadge.label}
            >
              {(() => {
                const BadgeIcon = getBadgeIcon(anime.peakBadge.icon);
                return <BadgeIcon className="w-3 h-3 text-white" />;
              })()}
              <span className="text-[9px] font-bold text-white">{anime.peakBadge.label}</span>
            </div>
          )}

          {/* Badge Toggle Button (Top 5 only) */}
          {isTop5 && onSetBadge && (
            <div className="absolute top-8 right-1 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowBadgeMenu(!showBadgeMenu);
                }}
                className={`p-1.5 rounded-full transition-all ${
                  anime.peakBadge 
                    ? 'bg-black/50 opacity-0 group-hover:opacity-100' 
                    : 'bg-gradient-to-r from-yellow-500 to-amber-500 opacity-0 group-hover:opacity-100 animate-pulse'
                }`}
                title="Add peak badge"
              >
                <Flame className="w-3 h-3 text-white" />
              </button>
              
              {/* Badge Selection Menu */}
              {showBadgeMenu && (
                <div 
                  className="absolute top-full right-0 mt-1 p-2 rounded-lg shadow-xl z-30 min-w-[140px]"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] font-semibold mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                    Peak Badge
                  </div>
                  {PEAK_BADGES.map((badge) => {
                    const BadgeIcon = getBadgeIcon(badge.icon);
                    return (
                      <button
                        key={badge.icon}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onSetBadge(anime.peakBadge?.icon === badge.icon ? undefined : badge);
                          setShowBadgeMenu(false);
                        }}
                        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors hover:bg-white/10 ${
                          anime.peakBadge?.icon === badge.icon ? 'bg-white/20' : ''
                        }`}
                        style={{ color: badge.color }}
                      >
                        <BadgeIcon className="w-3.5 h-3.5" />
                        <span className="text-white">{badge.label}</span>
                      </button>
                    );
                  })}
                  {anime.peakBadge && (
                    <>
                      <div className="h-px my-1" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onSetBadge(undefined);
                          setShowBadgeMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors hover:bg-red-500/20 text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove Badge</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Drag Handle Indicator */}
          <div className="absolute top-1/2 right-1 -translate-y-1/2 z-20 p-1 rounded opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
            <GripVertical className="w-4 h-4 text-white" />
          </div>

          {/* Image */}
          <div className="aspect-[3/4] relative select-none">
            <img
              src={anime.image || 'https://cdn.myanimelist.net/images/qm_50.gif'}
              alt={anime.title}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://cdn.myanimelist.net/images/qm_50.gif';
              }}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
            
            {/* MAL Score */}
            {anime.score > 0 && (
              <div className="absolute top-8 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm pointer-events-none">
                <span className="text-[10px] font-bold text-yellow-400">★ {anime.score}</span>
              </div>
            )}

            {/* Drop indicator overlay */}
            {isDragTarget && (
              <div className="absolute inset-0 bg-white/20 flex items-center justify-center pointer-events-none">
                <ArrowUpDown className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
            )}

            {/* Title */}
            <div className="absolute bottom-0 left-0 right-0 p-2.5 pointer-events-none">
              <h3 className="text-xs font-semibold text-white line-clamp-2 leading-tight">
                {anime.title}
              </h3>
            </div>
          </div>
        </div>
        </div>
      </motion.div>
    </div>
  );
});

TierCard.displayName = 'TierCard';

function AnimeSearchModal({
  isOpen,
  onClose,
  onAdd,
  existingIds,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (anime: TierAnime) => void;
  existingIds: Set<number>;
}) {
  const [search, setSearch] = useState('');
  const [animeList, setAnimeList] = useState<MALAnimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const loadList = async () => {
      if (!isAuthenticated()) return;
      setIsLoading(true);
      try {
        const list = await fetchAnimeList();
        setAnimeList(list);
      } catch (err) {
        console.error('Failed to load anime list:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadList();
  }, [isOpen]);

  const filteredAnime = animeList.filter(
    (anime) =>
      !existingIds.has(anime.id) &&
      anime.title.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-lg rounded-2xl p-4 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Add to Tier List
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Search Input */}
        <div 
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search your MAL library..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        {/* Anime List */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent" />
            </div>
          ) : !isAuthenticated() ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-muted)' }}>
                Connect your MAL account to add anime
              </p>
            </div>
          ) : filteredAnime.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-muted)' }}>
                {search ? 'No anime found' : 'No more anime to add'}
              </p>
            </div>
          ) : (
            filteredAnime.slice(0, 20).map((anime) => (
              <motion.button
                key={anime.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  onAdd({
                    id: anime.id,
                    title: anime.title,
                    image: anime.image || '',
                    score: anime.score || 0,
                    rank: 0,
                  });
                }}
                className="flex items-center gap-3 w-full p-2 rounded-xl transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <img
                  src={anime.image || 'https://cdn.myanimelist.net/images/qm_50.gif'}
                  alt={anime.title}
                  className="w-10 h-14 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn.myanimelist.net/images/qm_50.gif';
                  }}
                />
                <div className="flex-1 text-left">
                  <h4 className="text-sm font-medium line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                    {anime.title}
                  </h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {anime.score ? `★ ${anime.score}` : 'Not rated'}
                  </p>
                </div>
                <Plus className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              </motion.button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AnimeTierList() {
  const [tierList, setTierList] = useState<TierAnime[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragTargetId, setDragTargetId] = useState<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTierList(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to load tier list:', err);
    }
  }, []);

  // Save to localStorage
  const saveTierList = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tierList));
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save tier list:', err);
    }
  }, [tierList]);

  // Auto-save on changes
  useEffect(() => {
    if (hasChanges) {
      const timeout = setTimeout(saveTierList, 1000);
      return () => clearTimeout(timeout);
    }
  }, [hasChanges, saveTierList]);

  const handleSwap = (fromId: number, toId: number) => {
    if (fromId === toId) return;
    
    const fromIndex = tierList.findIndex(a => a.id === fromId);
    const toIndex = tierList.findIndex(a => a.id === toId);
    
    if (fromIndex === -1 || toIndex === -1) return;
    
    // Create a new array and swap the items
    const newList = [...tierList];
    [newList[fromIndex], newList[toIndex]] = [newList[toIndex], newList[fromIndex]];
    
    // Update ranks
    const updated = newList.map((anime, index) => ({
      ...anime,
      rank: index + 1,
    }));
    
    setTierList(updated);
    setHasChanges(true);
    setDraggedId(null);
    setDragTargetId(null);
  };

  const handleAddAnime = (anime: TierAnime) => {
    if (tierList.length >= 10) {
      alert('You can only have 10 anime in your tier list!');
      return;
    }
    const newAnime = { ...anime, rank: tierList.length + 1 };
    setTierList([...tierList, newAnime]);
    setHasChanges(true);
    setIsSearchOpen(false);
  };

  const handleRemoveAnime = (id: number) => {
    const updated = tierList
      .filter((a) => a.id !== id)
      .map((anime, index) => ({ ...anime, rank: index + 1 }));
    setTierList(updated);
    setHasChanges(true);
  };

  const handleSetBadge = (id: number, badge: PeakBadge | undefined) => {
    const updated = tierList.map((anime) => {
      if (anime.id === id) {
        return { ...anime, peakBadge: badge };
      }
      return anime;
    });
    setTierList(updated);
    setHasChanges(true);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset your tier list?')) {
      setTierList([]);
      localStorage.removeItem(STORAGE_KEY);
      setHasChanges(false);
    }
  };

  const existingIds = new Set(tierList.map((a) => a.id));

  return (
    <div 
      className="flex h-full flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => {
        setDraggedId(null);
        setDragTargetId(null);
      }}
    >
      {/* Header */}
      <header className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg shadow-amber-500/20"
            >
              <Trophy className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Anime Tier List
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Rank your top 10 favorite anime
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}
              >
                <Sparkles className="w-3 h-3" />
                Auto-saving...
              </motion.div>
            )}
            
            {tierList.length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 hover:text-red-400"
                style={{ color: 'var(--text-muted)' }}
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            
            {tierList.length < 10 && (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              >
                <Plus className="w-4 h-4" />
                Add Anime ({tierList.length}/10)
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {tierList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'var(--accent-primary)10' }}
            >
              <Trophy className="w-12 h-12" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Your Tier List is Empty
            </h2>
            <p className="text-sm mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
              Create your personal top 10 anime ranking. Drag and drop to swap positions.
            </p>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 shadow-lg"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            >
              <Plus className="w-5 h-5" />
              Add Your First Anime
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4">
            <AnimatePresence mode="popLayout">
              {tierList.map((anime) => (
                <TierCard
                  key={anime.id}
                  anime={anime}
                  rank={anime.rank}
                  onRemove={() => handleRemoveAnime(anime.id)}
                  onDragStart={() => setDraggedId(anime.id)}
                  onDragOver={(e) => {
                    if (draggedId !== null && draggedId !== anime.id) {
                      setDragTargetId(anime.id);
                    }
                  }}
                  onDrop={() => {
                    if (draggedId !== null) {
                      handleSwap(draggedId, anime.id);
                    }
                  }}
                  isDragTarget={dragTargetId === anime.id}
                  isDragging={draggedId === anime.id}
                  onSetBadge={(badge) => handleSetBadge(anime.id, badge)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Tips Section */}
        {tierList.length > 0 && tierList.length < 10 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-4 rounded-xl border border-dashed"
            style={{ borderColor: 'var(--bg-elevated)', backgroundColor: 'var(--bg-secondary)30' }}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 mt-0.5" style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Tips
                </h3>
                <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                  <li>• Drag a card onto another to swap their positions</li>
                  <li>• Hover over a card and click ✕ to remove it</li>
                  <li>• Your tier list saves automatically</li>
                  <li>• Add up to 10 anime from your MAL library</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <AnimeSearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onAdd={handleAddAnime}
            existingIds={existingIds}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
