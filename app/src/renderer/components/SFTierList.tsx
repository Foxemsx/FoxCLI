import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  RotateCcw,
  Sparkles,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Zap,
  Check,
  Grid3X3,
  Crown,
  Star,
  Tv,
  Calendar,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Link2
} from 'lucide-react';
import {
  isAuthenticated,
  fetchAnimeList,
  MALAnimeEntry,
} from '../services/malApi';
import { saveTierLists } from '../services/tierListStore';

type TierAnime = {
  id: number;
  title: string;
  image: string;
  score: number;
};

type TierName = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

type TierData = {
  name: TierName;
  color: string;
  gradient: string;
  glow: string;
  description: string;
  items: TierAnime[];
};

const TIER_DEFINITIONS: Omit<TierData, 'items'>[] = [
  { name: 'S+', color: '#FFD700', gradient: 'from-yellow-400 via-amber-300 to-yellow-500', glow: 'shadow-yellow-500/40', description: 'Masterpiece - Peak Fiction' },
  { name: 'S', color: '#FF6B6B', gradient: 'from-red-500 via-rose-400 to-red-600', glow: 'shadow-red-500/40', description: 'Outstanding - Near Perfect' },
  { name: 'A', color: '#FF9F43', gradient: 'from-orange-500 via-amber-400 to-orange-600', glow: 'shadow-orange-500/40', description: 'Excellent - Highly Recommended' },
  { name: 'B', color: '#FECA57', gradient: 'from-yellow-500 via-amber-400 to-yellow-600', glow: 'shadow-amber-500/40', description: 'Great - Very Good' },
  { name: 'C', color: '#48DBFB', gradient: 'from-cyan-400 via-sky-400 to-cyan-500', glow: 'shadow-cyan-500/40', description: 'Good - Enjoyable' },
  { name: 'D', color: '#1DD1A1', gradient: 'from-emerald-500 via-teal-400 to-emerald-600', glow: 'shadow-emerald-500/40', description: 'Average - Has Merits' },
  { name: 'E', color: '#5F27CD', gradient: 'from-violet-600 via-purple-500 to-violet-700', glow: 'shadow-violet-500/40', description: 'Below Average' },
  { name: 'F', color: '#576574', gradient: 'from-slate-500 via-gray-400 to-slate-600', glow: 'shadow-slate-500/40', description: 'Not Recommended' },
];

const STORAGE_KEY = 'foxcli-sf-tierlist';
const TOP10_STORAGE_KEY = 'foxcli-anime-tierlist';

// Type for related anime with tier info
type RelatedAnimeWithTier = {
  id: number;
  title: string;
  image: string;
  relation: string;
  tier?: TierName;
  top10Rank?: number;
  myScore?: number;
};

// Anime Detail Modal - shows comprehensive info about an anime
function AnimeDetailModal({
  isOpen,
  onClose,
  anime,
  animeList,
  tiers,
  top10List,
}: {
  isOpen: boolean;
  onClose: () => void;
  anime: TierAnime | null;
  animeList: MALAnimeEntry[];
  tiers: TierData[];
  top10List: TierAnime[];
}) {
  if (!isOpen || !anime) return null;

  // Find full anime data from MAL list
  const fullAnimeData = animeList.find(a => a.id === anime.id);
  
  // Find which tier this anime is in
  const currentTier = tiers.find(t => t.items.some(i => i.id === anime.id));
  const tierDef = currentTier ? TIER_DEFINITIONS.find(t => t.name === currentTier.name) : null;
  
  // Check if in top 10 (use index + 1 as rank)
  const top10Index = top10List.findIndex(t => t.id === anime.id);
  const top10Rank = top10Index !== -1 ? top10Index + 1 : undefined;
  
  // Build related anime with tier info
  const relatedAnime: RelatedAnimeWithTier[] = [];
  if (fullAnimeData?.related_anime) {
    for (const rel of fullAnimeData.related_anime) {
      // Find if this related anime is in our tier list
      const relatedTier = tiers.find(t => t.items.some(i => i.id === rel.node.id));
      const relatedTop10Idx = top10List.findIndex(t => t.id === rel.node.id);
      const relatedInList = animeList.find(a => a.id === rel.node.id);
      
      relatedAnime.push({
        id: rel.node.id,
        title: rel.node.title,
        image: rel.node.main_picture?.medium || 'https://cdn.myanimelist.net/images/qm_50.gif',
        relation: rel.relation_type_formatted,
        tier: relatedTier?.name as TierName | undefined,
        top10Rank: relatedTop10Idx !== -1 ? relatedTop10Idx + 1 : undefined,
        myScore: relatedInList?.score,
      });
    }
  }
  
  // Sort related: prequels/sequels first, then by relation type
  const relationPriority = ['Prequel', 'Sequel', 'Parent story', 'Side story', 'Alternative version', 'Summary'];
  relatedAnime.sort((a, b) => {
    const aIdx = relationPriority.findIndex(r => a.relation.includes(r));
    const bIdx = relationPriority.findIndex(r => b.relation.includes(r));
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  // Compare tier rankings between current anime and related
  const getTierRank = (tierName?: TierName): number => {
    if (!tierName) return 99;
    const idx = TIER_DEFINITIONS.findIndex(t => t.name === tierName);
    return idx === -1 ? 99 : idx;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with anime cover */}
        <div className="relative h-48 overflow-hidden">
          {/* Blurred background */}
          <div 
            className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-50"
            style={{ backgroundImage: `url(${anime.image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-secondary)] via-[var(--bg-secondary)]/50 to-transparent" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          {/* Anime info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-4">
            <img
              src={anime.image || 'https://cdn.myanimelist.net/images/qm_50.gif'}
              alt={anime.title}
              className="w-24 h-36 object-cover rounded-xl shadow-lg border-2"
              style={{ borderColor: tierDef?.color || 'var(--bg-elevated)' }}
            />
            <div className="flex-1 flex flex-col justify-end">
              <h2 className="text-xl font-bold text-white line-clamp-2 mb-1">
                {anime.title}
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                {fullAnimeData && (
                  <>
                    <span className="flex items-center gap-1 text-sm text-white/80">
                      <Tv className="w-4 h-4" />
                      {fullAnimeData.total_episodes || '?'} eps
                    </span>
                    {fullAnimeData.start_season && (
                      <span className="flex items-center gap-1 text-sm text-white/80">
                        <Calendar className="w-4 h-4" />
                        {fullAnimeData.start_season.season.charAt(0).toUpperCase() + fullAnimeData.start_season.season.slice(1)} {fullAnimeData.start_season.year}
                      </span>
                    )}
                  </>
                )}
                <button
                  onClick={() => window.open(`https://myanimelist.net/anime/${anime.id}`, '_blank')}
                  className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  MAL
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Tier & Rating Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* S-F Tier */}
            <div 
              className="p-3 rounded-xl text-center"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>S-F Tier</p>
              {currentTier && tierDef ? (
                <div 
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-black text-lg bg-gradient-to-br ${tierDef.gradient}`}
                  style={{ color: currentTier.name === 'S+' || currentTier.name === 'B' ? '#000' : '#fff' }}
                >
                  {currentTier.name}
                </div>
              ) : (
                <span className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>—</span>
              )}
            </div>
            
            {/* Top 10 */}
            <div 
              className="p-3 rounded-xl text-center"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Top 10</p>
              {top10Rank ? (
                <div className="flex items-center justify-center gap-1">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    #{top10Rank}
                  </span>
                </div>
              ) : (
                <span className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>—</span>
              )}
            </div>
            
            {/* My Score */}
            <div 
              className="p-3 rounded-xl text-center"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>My Score</p>
              <div className="flex items-center justify-center gap-1">
                <Star className="w-5 h-5 text-yellow-500" fill="#EAB308" />
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {anime.score || fullAnimeData?.score || '—'}
                </span>
              </div>
            </div>
            
            {/* Episodes Watched */}
            <div 
              className="p-3 rounded-xl text-center"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Progress</p>
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {fullAnimeData ? `${fullAnimeData.episodes_watched}/${fullAnimeData.total_episodes || '?'}` : '—'}
              </span>
            </div>
          </div>

          {/* Related Anime */}
          {relatedAnime.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Related Anime ({relatedAnime.length})
                </h3>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {relatedAnime.map((related) => {
                  const currentTierRank = getTierRank(currentTier?.name as TierName | undefined);
                  const relatedTierRank = getTierRank(related.tier);
                  const comparison = relatedTierRank < currentTierRank ? 'higher' : 
                                    relatedTierRank > currentTierRank ? 'lower' : 'same';
                  const relatedTierDef = related.tier ? TIER_DEFINITIONS.find(t => t.name === related.tier) : null;
                  
                  return (
                    <div
                      key={related.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                      onClick={() => window.open(`https://myanimelist.net/anime/${related.id}`, '_blank')}
                    >
                      <img
                        src={related.image}
                        alt={related.title}
                        className="w-10 h-14 object-cover rounded-lg"
                        style={{ borderColor: relatedTierDef?.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {related.title}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {related.relation}
                        </p>
                      </div>
                      
                      {/* Rating comparison */}
                      <div className="flex items-center gap-2">
                        {related.myScore && (
                          <div className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <Star className="w-3 h-3 text-yellow-500" fill="#EAB308" />
                            {related.myScore}
                          </div>
                        )}
                        
                        {related.tier && relatedTierDef && (
                          <div className="flex items-center gap-1">
                            {related.tier !== currentTier?.name && (
                              comparison === 'higher' ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : comparison === 'lower' ? (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              ) : (
                                <Minus className="w-4 h-4 text-gray-400" />
                              )
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-bold bg-gradient-to-br ${relatedTierDef.gradient}`}
                              style={{ color: related.tier === 'S+' || related.tier === 'B' ? '#000' : '#fff' }}
                            >
                              {related.tier}
                            </span>
                          </div>
                        )}
                        
                        {related.top10Rank && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/20">
                            <Crown className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs font-bold text-yellow-500">#{related.top10Rank}</span>
                          </div>
                        )}
                        
                        {!related.tier && !related.top10Rank && related.myScore === undefined && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                            Not rated
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          {tierDef && (
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                You rated this anime as <strong style={{ color: tierDef.color }}>{tierDef.name}</strong> — {tierDef.description}
                {top10Rank && <span> and ranked it <strong className="text-yellow-500">#{top10Rank}</strong> in your Top 10!</span>}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--bg-elevated)' }}>
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TierRow({ 
  tier, 
  onRemoveItem, 
  onDragOver,
  isDropTarget,
  onItemDragStart,
  onItemDragEnd,
  draggedItem,
  onItemClick,
}: { 
  tier: TierData; 
  onRemoveItem: (id: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  isDropTarget: boolean;
  onItemDragStart: (item: TierAnime) => void;
  onItemDragEnd: () => void;
  draggedItem: TierAnime | null;
  onItemClick: (item: TierAnime) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const tierDef = TIER_DEFINITIONS.find(t => t.name === tier.name)!;

  const handleRemove = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    onRemoveItem(id);
  };

  return (
    <div 
      className={`rounded-xl overflow-hidden transition-all ${isDropTarget ? 'ring-2 ring-white/30' : ''}`}
      style={{ backgroundColor: 'var(--bg-secondary)' }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
      }}
    >
      {/* Tier Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center gap-3 p-3 transition-colors hover:bg-white/5`}
      >
        {/* Tier Badge */}
        <div 
          className={`w-14 h-14 rounded-lg flex items-center justify-center font-black text-xl bg-gradient-to-br ${tierDef.gradient} shadow-lg ${tierDef.glow}`}
          style={{ color: tier.name === 'S+' || tier.name === 'B' ? '#000' : '#fff' }}
        >
          {tier.name}
        </div>
        
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3">
            {/* Tier Name with Color */}
            <span 
              className="font-black text-base"
              style={{ color: tierDef.color }}
            >
              {tier.name}
            </span>
            
            {/* Separator */}
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            
            {/* Description */}
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {tierDef.description.split(' - ')[0]}
            </span>
            
            {/* Sub-description if exists */}
            {tierDef.description.includes(' - ') && (
              <span className="text-sm hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
                {tierDef.description.split(' - ')[1]}
              </span>
            )}
            
            {/* Anime Count Badge */}
            <span 
              className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ 
                backgroundColor: `${tierDef.color}20`, 
                color: tierDef.color 
              }}
            >
              {tier.items.length} Anime
            </span>
          </div>
        </div>
        
        {isExpanded ? (
          <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        )}
      </button>

      {/* Tier Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div 
              className={`min-h-[80px] p-3 pt-0 flex flex-wrap gap-2 ${isDropTarget ? 'bg-white/5' : ''}`}
            >
              {tier.items.length === 0 ? (
                <div 
                  className="w-full h-16 flex items-center justify-center rounded-lg border-2 border-dashed"
                  style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                >
                  <span className="text-sm">Drop anime here or use Manage Anime button</span>
                </div>
              ) : (
                tier.items.map((anime) => (
                  <div
                    key={`${tier.name}-${anime.id}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      onItemDragStart(anime);
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      onItemDragEnd();
                    }}
                    onClick={() => onItemClick(anime)}
                    className={`relative group cursor-grab active:cursor-grabbing ${draggedItem?.id === anime.id ? 'opacity-40' : ''}`}
                  >
                    <div 
                      className="relative w-16 h-24 rounded-lg overflow-hidden border-2 transition-all hover:scale-105"
                      style={{ borderColor: tierDef.color }}
                    >
                      <img
                        src={anime.image || 'https://cdn.myanimelist.net/images/qm_50.gif'}
                        alt={anime.title}
                        className="w-full h-full object-cover pointer-events-none"
                        draggable={false}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://cdn.myanimelist.net/images/qm_50.gif';
                        }}
                      />
                      
                      {/* Remove button - separate from drag */}
                      <div 
                        className="absolute top-0.5 right-0.5 z-10"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleRemove(e, anime.id)}
                          className="p-1 rounded-full bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      
                      {/* Title */}
                      <div className="absolute bottom-0 left-0 right-0 p-1 pointer-events-none">
                        <p className="text-[8px] font-medium text-white line-clamp-2 leading-tight text-center">
                          {anime.title}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// New Grid-based Anime Picker Modal
function AnimePickerModal({
  isOpen,
  onClose,
  animeList,
  tiers,
  onAddToTier,
  onRemoveFromTier,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  animeList: MALAnimeEntry[];
  tiers: TierData[];
  onAddToTier: (anime: TierAnime, tier: TierName) => void;
  onRemoveFromTier: (tierName: TierName, animeId: number) => void;
  isLoading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selectedAnime, setSelectedAnime] = useState<MALAnimeEntry | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Build a map of anime ID to tier
  const animeToTier = new Map<number, TierName>();
  tiers.forEach(tier => {
    tier.items.forEach(item => {
      animeToTier.set(item.id, tier.name);
    });
  });

  // Filter anime based on search and view mode
  const filteredAnime = animeList.filter(anime => {
    const matchesSearch = anime.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    
    const isAssigned = animeToTier.has(anime.id);
    if (viewMode === 'unassigned') return !isAssigned;
    if (viewMode === 'assigned') return isAssigned;
    return true;
  });

  const getTierColor = (tierName: TierName) => {
    return TIER_DEFINITIONS.find(t => t.name === tierName)?.color || '#666';
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--bg-elevated)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Manage Anime Tiers
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
          
          {/* Search and Filter */}
          <div className="flex gap-3">
            <div 
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search anime..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text-primary)' }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="p-0.5 hover:bg-white/10 rounded">
                  <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'all' ? 'bg-[var(--accent-primary)] text-white' : ''}`}
                style={{ color: viewMode !== 'all' ? 'var(--text-secondary)' : undefined }}
              >
                All ({animeList.length})
              </button>
              <button
                onClick={() => setViewMode('unassigned')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'unassigned' ? 'bg-[var(--accent-primary)] text-white' : ''}`}
                style={{ color: viewMode !== 'unassigned' ? 'var(--text-secondary)' : undefined }}
              >
                Unassigned ({animeList.filter(a => !animeToTier.has(a.id)).length})
              </button>
              <button
                onClick={() => setViewMode('assigned')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'assigned' ? 'bg-[var(--accent-primary)] text-white' : ''}`}
                style={{ color: viewMode !== 'assigned' ? 'var(--text-secondary)' : undefined }}
              >
                Assigned ({animeToTier.size})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Anime Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent" />
              </div>
            ) : !isAuthenticated() ? (
              <div className="flex items-center justify-center h-full">
                <p style={{ color: 'var(--text-muted)' }}>Connect your MAL account to manage tiers</p>
              </div>
            ) : filteredAnime.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p style={{ color: 'var(--text-muted)' }}>
                  {search ? 'No anime found' : viewMode === 'unassigned' ? 'All anime assigned!' : 'No anime to show'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {filteredAnime.map((anime) => {
                  const assignedTier = animeToTier.get(anime.id);
                  const isSelected = selectedAnime?.id === anime.id;
                  
                  return (
                    <motion.button
                      key={anime.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAnime(isSelected ? null : anime)}
                      className={`relative aspect-[3/4] rounded-lg overflow-hidden transition-all ${
                        isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-secondary)]' : ''
                      }`}
                      style={{ 
                        borderWidth: 2,
                        borderStyle: 'solid',
                        borderColor: assignedTier ? getTierColor(assignedTier) : 'transparent'
                      }}
                    >
                      <img
                        src={anime.image || 'https://cdn.myanimelist.net/images/qm_50.gif'}
                        alt={anime.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://cdn.myanimelist.net/images/qm_50.gif';
                        }}
                      />
                      
                      {/* Assigned tier badge */}
                      {assignedTier && (
                        <div 
                          className="absolute top-0 left-0 px-1.5 py-0.5 text-[9px] font-black rounded-br"
                          style={{ 
                            backgroundColor: getTierColor(assignedTier),
                            color: assignedTier === 'S+' || assignedTier === 'B' ? '#000' : '#fff'
                          }}
                        >
                          {assignedTier}
                        </div>
                      )}
                      
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      )}
                      
                      {/* Gradient & Title */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-0 left-0 right-0 p-1">
                        <p className="text-[7px] font-medium text-white line-clamp-2 leading-tight text-center">
                          {anime.title}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tier Selection Panel (when anime selected) */}
          <AnimatePresence>
            {selectedAnime && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-l overflow-hidden"
                style={{ borderColor: 'var(--bg-elevated)', backgroundColor: 'var(--bg-primary)' }}
              >
                <div className="p-4 w-[200px]">
                  {/* Selected anime preview */}
                  <div className="mb-4">
                    <img
                      src={selectedAnime.image || 'https://cdn.myanimelist.net/images/qm_50.gif'}
                      alt={selectedAnime.title}
                      className="w-full aspect-[3/4] object-cover rounded-lg mb-2"
                    />
                    <h3 className="text-sm font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {selectedAnime.title}
                    </h3>
                    {selectedAnime.score && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Your score: ★ {selectedAnime.score}
                      </p>
                    )}
                  </div>

                  {/* Current tier */}
                  {animeToTier.has(selectedAnime.id) && (
                    <div className="mb-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Currently in:</p>
                      <div className="flex items-center justify-between">
                        <span 
                          className="px-2 py-1 rounded text-xs font-bold"
                          style={{ 
                            backgroundColor: getTierColor(animeToTier.get(selectedAnime.id)!),
                            color: animeToTier.get(selectedAnime.id) === 'S+' || animeToTier.get(selectedAnime.id) === 'B' ? '#000' : '#fff'
                          }}
                        >
                          {animeToTier.get(selectedAnime.id)}
                        </span>
                        <button
                          onClick={() => {
                            onRemoveFromTier(animeToTier.get(selectedAnime.id)!, selectedAnime.id);
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tier buttons */}
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    {animeToTier.has(selectedAnime.id) ? 'Move to tier:' : 'Assign to tier:'}
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {TIER_DEFINITIONS.map(tier => {
                      const isCurrentTier = animeToTier.get(selectedAnime.id) === tier.name;
                      return (
                        <button
                          key={tier.name}
                          disabled={isCurrentTier}
                          onClick={() => {
                            // Remove from current tier if exists
                            const currentTier = animeToTier.get(selectedAnime.id);
                            if (currentTier) {
                              onRemoveFromTier(currentTier, selectedAnime.id);
                            }
                            // Add to new tier
                            onAddToTier({
                              id: selectedAnime.id,
                              title: selectedAnime.title,
                              image: selectedAnime.image || '',
                              score: selectedAnime.score || 0,
                            }, tier.name);
                            setSelectedAnime(null);
                          }}
                          className={`py-2 rounded text-xs font-bold transition-all ${
                            isCurrentTier ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'
                          }`}
                          style={{ 
                            backgroundColor: tier.color,
                            color: tier.name === 'S+' || tier.name === 'B' ? '#000' : '#fff'
                          }}
                        >
                          {tier.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--bg-elevated)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {animeToTier.size} of {animeList.length} anime assigned to tiers
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SFTierList() {
  const [tiers, setTiers] = useState<TierData[]>(() => 
    TIER_DEFINITIONS.map(def => ({ ...def, items: [] }))
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedItem, setDraggedItem] = useState<TierAnime | null>(null);
  const [dropTargetTier, setDropTargetTier] = useState<TierName | null>(null);
  const [dragSourceTier, setDragSourceTier] = useState<TierName | null>(null);
  const [animeList, setAnimeList] = useState<MALAnimeEntry[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const isDragging = useRef(false);
  
  // Detail modal state
  const [selectedAnime, setSelectedAnime] = useState<TierAnime | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [top10List, setTop10List] = useState<TierAnime[]>([]);
  
  // Search state for main view
  const [tierSearchQuery, setTierSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{anime: TierAnime; tier: TierData}[]>([]);
  const tierSearchInputRef = useRef<HTMLInputElement>(null);

  // Load Top 10 list from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOP10_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTop10List(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to load top 10 list:', err);
    }
  }, []);

  // Load anime list on mount
  useEffect(() => {
    const loadList = async () => {
      if (!isAuthenticated()) return;
      setIsLoadingList(true);
      try {
        const list = await fetchAnimeList();
        const watchedList = list.filter(a => a.status === 'completed' || a.status === 'watching');
        setAnimeList(watchedList);
      } catch (err) {
        console.error('Failed to load anime list:', err);
      } finally {
        setIsLoadingList(false);
      }
    };
    loadList();
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTiers(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to load S-F tier list:', err);
    }
  }, []);

  // One-time sync on mount to ensure existing localStorage data is synced to persistent storage
  useEffect(() => {
    const syncToPersistentStorage = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        const tiers = JSON.parse(saved);
        if (!Array.isArray(tiers)) return;

        // Get top10List from localStorage as well
        const top10Saved = localStorage.getItem(TOP10_STORAGE_KEY);
        const top10: TierAnime[] = top10Saved ? JSON.parse(top10Saved) : [];

        // Convert tiers to format expected by tierListStore (add status field to items)
        const tiersForStorage = tiers.map((tier: any) => ({
          ...tier,
          items: tier.items.map((item: any) => ({
            ...item,
            status: 'completed',
          })),
        }));

        // Convert top10 to format expected by tierListStore (add status field to items)
        const top10ForStorage = top10.map(item => ({
          ...item,
          status: 'completed',
        }));

        await saveTierLists(tiersForStorage, top10ForStorage);
        console.log('[SFTierList] Synced existing tier data to persistent storage');
      } catch (err) {
        console.error('[SFTierList] Failed to sync to persistent storage:', err);
      }
    };

    syncToPersistentStorage();
  }, []);

  // Save to localStorage and persistent storage
  const saveTierList = useCallback(() => {
    try {
      // Save to localStorage (legacy)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tiers));

      // Also save to persistent storage for website export
      // Get top10List from localStorage as well
      const top10Saved = localStorage.getItem(TOP10_STORAGE_KEY);
      const top10: TierAnime[] = top10Saved ? JSON.parse(top10Saved) : [];

      // Convert tiers to the format expected by tierListStore (add status field to items)
      const tiersForStorage = tiers.map(tier => ({
        ...tier,
        items: tier.items.map(item => ({
          ...item,
          status: 'completed',
        })),
      }));

      // Convert top10 to the format expected by tierListStore (add status field to items)
      const top10ForStorage = top10.map(item => ({
        ...item,
        status: 'completed',
      }));

      saveTierLists(tiersForStorage, top10ForStorage).catch(err => {
        console.error('Failed to save tier lists to persistent storage:', err);
      });

      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save tier list:', err);
    }
  }, [tiers]);

  // Auto-save on changes
  useEffect(() => {
    if (hasChanges) {
      const timeout = setTimeout(saveTierList, 500);
      return () => clearTimeout(timeout);
    }
  }, [hasChanges, saveTierList]);

  const handleAddAnime = (anime: TierAnime, tierName: TierName) => {
    // Prevent duplicates
    const alreadyExists = tiers.some(tier => tier.items.some(item => item.id === anime.id));
    if (alreadyExists) return;
    
    setTiers(prev => prev.map(tier => {
      if (tier.name === tierName) {
        return { ...tier, items: [...tier.items, anime] };
      }
      return tier;
    }));
    setHasChanges(true);
  };

  const handleRemoveAnime = (tierName: TierName, animeId: number) => {
    setTiers(prev => prev.map(tier => {
      if (tier.name === tierName) {
        return { ...tier, items: tier.items.filter(a => a.id !== animeId) };
      }
      return tier;
    }));
    setHasChanges(true);
  };

  const handleDragStart = (item: TierAnime, tierName: TierName) => {
    isDragging.current = true;
    setDraggedItem(item);
    setDragSourceTier(tierName);
  };

  const handleDragEnd = () => {
    // Prevent double-execution
    if (!isDragging.current) return;
    isDragging.current = false;
    
    if (draggedItem && dropTargetTier && dragSourceTier && dropTargetTier !== dragSourceTier) {
      // Capture current values before resetting state
      const itemToMove = draggedItem;
      const sourceTier = dragSourceTier;
      const targetTier = dropTargetTier;
      
      setTiers(prev => {
        // First check if item already exists in target tier
        const targetTierData = prev.find(t => t.name === targetTier);
        if (targetTierData?.items.some(a => a.id === itemToMove.id)) {
          // Already exists in target, just remove from source
          return prev.map(tier => {
            if (tier.name === sourceTier) {
              return { ...tier, items: tier.items.filter(a => a.id !== itemToMove.id) };
            }
            return tier;
          });
        }
        
        // Move: remove from source and add to target atomically
        return prev.map(tier => {
          if (tier.name === sourceTier) {
            return { ...tier, items: tier.items.filter(a => a.id !== itemToMove.id) };
          }
          if (tier.name === targetTier) {
            // Double-check it's not already in this tier
            if (tier.items.some(a => a.id === itemToMove.id)) {
              return tier;
            }
            return { ...tier, items: [...tier.items, itemToMove] };
          }
          return tier;
        });
      });
      setHasChanges(true);
    }
    setDraggedItem(null);
    setDropTargetTier(null);
    setDragSourceTier(null);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset your S-F tier list?')) {
      setTiers(TIER_DEFINITIONS.map(def => ({ ...def, items: [] })));
      localStorage.removeItem(STORAGE_KEY);
      setHasChanges(false);
    }
  };

  const totalItems = tiers.reduce((sum, t) => sum + t.items.length, 0);

  // Search functionality for main view
  const handleTierSearch = (query: string) => {
    setTierSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results: {anime: TierAnime; tier: TierData}[] = [];
    const lowerQuery = query.toLowerCase();
    
    tiers.forEach(tier => {
      tier.items.forEach(anime => {
        if (anime.title.toLowerCase().includes(lowerQuery)) {
          results.push({ anime, tier });
        }
      });
    });
    
    setSearchResults(results);
  };

  const clearTierSearch = () => {
    setTierSearchQuery('');
    setSearchResults([]);
    tierSearchInputRef.current?.focus();
  };

  return (
    <div 
      className="flex h-full flex-col"
      onDragEnd={handleDragEnd}
    >
      {/* Header */}
      <header className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 shadow-lg shadow-orange-500/20"
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                S-F Tier Rankings
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Rate your watched anime • {totalItems} of {animeList.length} assigned
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
            
            {totalItems > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 hover:text-red-400"
                style={{ color: 'var(--text-muted)' }}
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            
            <button
              onClick={() => setIsPickerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            >
              <Grid3X3 className="w-4 h-4" />
              Manage Anime
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 flex items-center gap-3">
          <div 
            className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl max-w-md"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={tierSearchInputRef}
              type="text"
              placeholder="Search for an anime to see its tier..."
              value={tierSearchQuery}
              onChange={(e) => handleTierSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)' }}
            />
            {tierSearchQuery && (
              <button 
                onClick={clearTierSearch}
                className="p-0.5 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>
          
          {/* Search Results Count */}
          {tierSearchQuery && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </motion.span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <GripVertical className="w-3 h-3" />
            <span>Drag between tiers to reorganize</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
        {tierSearchQuery ? (
          /* Search Results View */
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Search Results
              </h3>
              <button
                onClick={clearTierSearch}
                className="text-sm px-3 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
              >
                Clear Search
              </button>
            </div>
            
            {searchResults.length === 0 ? (
              <div 
                className="flex flex-col items-center justify-center py-12 rounded-xl"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <Search className="w-12 h-12 mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>
                  No anime found matching "{tierSearchQuery}"
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {searchResults.map(({ anime, tier }) => {
                  const tierDef = TIER_DEFINITIONS.find(t => t.name === tier.name)!;
                  return (
                    <motion.div
                      key={anime.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group cursor-pointer"
                      onClick={() => {
                        setSelectedAnime(anime);
                        setIsDetailOpen(true);
                      }}
                    >
                      <div 
                        className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all hover:scale-105"
                        style={{ borderColor: tierDef.color }}
                      >
                        <img
                          src={anime.image || 'https://cdn.myanimelist.net/images/qm_50.gif'}
                          alt={anime.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://cdn.myanimelist.net/images/qm_50.gif';
                          }}
                        />
                        
                        {/* Tier Badge */}
                        <div 
                          className={`absolute top-0 left-0 px-2 py-1 text-xs font-black rounded-br bg-gradient-to-br ${tierDef.gradient}`}
                          style={{ color: tier.name === 'S+' || tier.name === 'B' ? '#000' : '#fff' }}
                        >
                          {tier.name}
                        </div>
                        
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        
                        {/* Title */}
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-xs font-medium text-white line-clamp-2 leading-tight">
                            {anime.title}
                          </p>
                          <p className="text-[10px] mt-0.5 opacity-80" style={{ color: tierDef.color }}>
                            {tierDef.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Normal Tier List View */
          tiers.map(tier => (
            <TierRow
              key={tier.name}
              tier={tier}
              onRemoveItem={(id) => handleRemoveAnime(tier.name, id)}
              onDragOver={() => setDropTargetTier(tier.name)}
              isDropTarget={dropTargetTier === tier.name && dragSourceTier !== tier.name}
              onItemDragStart={(item) => handleDragStart(item, tier.name)}
              onItemDragEnd={handleDragEnd}
              draggedItem={draggedItem}
              onItemClick={(item) => {
                setSelectedAnime(item);
                setIsDetailOpen(true);
              }}
            />
          ))
        )}
      </div>

      {/* Anime Detail Modal */}
      <AnimatePresence>
        {isDetailOpen && (
          <AnimeDetailModal
            isOpen={isDetailOpen}
            onClose={() => {
              setIsDetailOpen(false);
              setSelectedAnime(null);
            }}
            anime={selectedAnime}
            animeList={animeList}
            tiers={tiers}
            top10List={top10List}
          />
        )}
      </AnimatePresence>

      {/* Anime Picker Modal */}
      <AnimatePresence>
        {isPickerOpen && (
          <AnimePickerModal
            isOpen={isPickerOpen}
            onClose={() => setIsPickerOpen(false)}
            animeList={animeList}
            tiers={tiers}
            onAddToTier={handleAddAnime}
            onRemoveFromTier={handleRemoveAnime}
            isLoading={isLoadingList}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

