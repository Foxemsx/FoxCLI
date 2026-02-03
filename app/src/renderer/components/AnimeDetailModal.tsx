import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ExternalLink, Star, GitBranch, ChevronRight, Info, Eye, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { MALAnimeEntry, fetchAnimeRelations, getAnimeById, AnimeRelation, fetchAnimeList, MALAnimeStatus } from '../services/malApi';

interface AnimeDetailModalProps {
  anime: MALAnimeEntry;
  onClose: () => void;
}

interface UserAnimeStatus {
  id: number;
  status: MALAnimeStatus;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  watching: { label: 'Watching', color: '#3BA55D', icon: Eye },
  completed: { label: 'Completed', color: '#5865F2', icon: CheckCircle2 },
  plan_to_watch: { label: 'Planned', color: '#F0B132', icon: Calendar },
  on_hold: { label: 'On Hold', color: '#9B59B6', icon: Clock },
  dropped: { label: 'Dropped', color: '#ED4245', icon: X },
};

export default function AnimeDetailModal({ anime, onClose }: AnimeDetailModalProps) {
  const [fullAnime, setFullAnime] = useState<MALAnimeEntry>(anime);
  const [relations, setRelations] = useState<AnimeRelation[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [userAnimeMap, setUserAnimeMap] = useState<Map<number, MALAnimeStatus>>(new Map());

  useEffect(() => {
    const loadData = async () => {
      setLoadingRelations(true);
      try {
        const [relationsData, detailsData, userList] = await Promise.all([
            fetchAnimeRelations(anime.id),
            getAnimeById(anime.id),
            fetchAnimeList()
        ]);
        setRelations(relationsData);
        
        // Build a map of user's anime statuses
        const statusMap = new Map<number, MALAnimeStatus>();
        userList.forEach((entry: MALAnimeEntry) => {
          statusMap.set(entry.id, entry.status);
        });
        setUserAnimeMap(statusMap);
        
        if (detailsData) {
            setFullAnime(prev => ({
                ...prev,
                ...detailsData,
                image: detailsData.main_picture?.large || detailsData.main_picture?.medium || prev.image,
                status: detailsData.my_list_status?.status || detailsData.status || prev.status,
                score: detailsData.my_list_status?.score || prev.score,
                episodes_watched: detailsData.my_list_status?.num_episodes_watched || prev.episodes_watched,
            }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRelations(false);
      }
    };
    loadData();
  }, [anime.id]);

  // Group relations by type
  const groupedRelations = relations.reduce((acc, rel) => {
    if (!acc[rel.relation]) acc[rel.relation] = [];
    acc[rel.relation].push(rel);
    return acc;
  }, {} as Record<string, AnimeRelation[]>);

  const RELATION_ORDER = ['Prequel', 'Sequel', 'Parent story', 'Side story', 'Spin-off', 'Summary', 'Alternative version'];

  const getUserStatus = (animeId: number) => userAnimeMap.get(animeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col shadow-2xl"
            style={{ backgroundColor: 'var(--bg-primary)' }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header / Hero */}
            <div className="relative h-48 sm:h-64 flex-shrink-0 overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] to-transparent z-10" />
                 <img 
                    src={fullAnime.image} 
                    alt={fullAnime.title} 
                    className="w-full h-full object-cover opacity-60 blur-sm scale-110"
                 />
                 <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex items-end gap-6">
                    <img 
                        src={fullAnime.image} 
                        alt={fullAnime.title} 
                        className="w-32 h-48 object-cover rounded-lg shadow-xl border-2 border-[var(--bg-elevated)]"
                    />
                    <div className="mb-2">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight shadow-black drop-shadow-md">
                            {fullAnime.title}
                        </h2>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-200">
                             {fullAnime.score > 0 && (
                                <span className="flex items-center gap-1 font-bold bg-yellow-500/20 px-2 py-0.5 rounded text-yellow-400">
                                    <Star size={14} fill="currentColor" /> {fullAnime.score}
                                </span>
                             )}
                             <span className="bg-white/10 px-2 py-0.5 rounded capitalize">{fullAnime.status.replace(/_/g, ' ')}</span>
                             {fullAnime.total_episodes > 0 && <span>{fullAnime.total_episodes} eps</span>}
                        </div>
                    </div>
                 </div>
                 
                 <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                 >
                    <X size={20} />
                 </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Info & Actions */}
                <div className="space-y-6">
                    <div className="flex flex-col gap-3">
                        <a 
                            href={fullAnime.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-medium transition-all hover:opacity-90"
                            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                        >
                            <ExternalLink size={16} /> View on MAL
                        </a>
                        <a
                            href={`https://myanimelist.net/ownlist/anime/${fullAnime.id}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-medium transition-all hover:opacity-90"
                            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                        >
                            <Star size={16} /> Edit Progress
                        </a>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Details</h3>
                        
                        {fullAnime.start_season && (
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--text-secondary)' }}>Season</span>
                                <span className="capitalize" style={{ color: 'var(--text-primary)' }}>
                                    {fullAnime.start_season.season} {fullAnime.start_season.year}
                                </span>
                            </div>
                        )}
                        
                        {fullAnime.studios && fullAnime.studios.length > 0 && (
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--text-secondary)' }}>Studio</span>
                                <span style={{ color: 'var(--text-primary)' }}>
                                    {fullAnime.studios.map(s => s.name).join(', ')}
                                </span>
                            </div>
                        )}

                        {fullAnime.genres && fullAnime.genres.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Genres</span>
                                <div className="flex flex-wrap gap-2">
                                    {fullAnime.genres.map(g => (
                                        <span 
                                            key={g.id} 
                                            className="text-xs px-2 py-1 rounded-md"
                                            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                        >
                                            {g.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Relations Graph */}
                <div className="lg:col-span-2">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <GitBranch size={20} style={{ color: 'var(--accent-primary)' }} />
                        Related Anime
                    </h3>
                    
                    {loadingRelations ? (
                        <div className="flex items-center justify-center h-40 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]" />
                        </div>
                    ) : relations.length > 0 ? (
                        <div className="relative pl-4 space-y-8 before:absolute before:left-1.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-[var(--bg-elevated)]">
                            {RELATION_ORDER.filter(type => groupedRelations[type]).map(type => (
                                <div key={type} className="relative">
                                    <div className="flex items-center gap-3 mb-3">
                                         <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent-primary)', marginLeft: '-0.375rem' }} />
                                         <span className="text-sm font-medium px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                                            {type}
                                         </span>
                                    </div>
                                    
                                    <div className="ml-6 space-y-2">
                                        {groupedRelations[type].map(rel => {
                                            const status = getUserStatus(rel.id);
                                            const statusConfig = status ? STATUS_CONFIG[status] : null;
                                            return (
                                                <a 
                                                    key={rel.id}
                                                    href={`https://myanimelist.net/anime/${rel.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-lg hover:translate-x-1 transition-all group"
                                                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-sm truncate group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                                                                {rel.title}
                                                            </p>
                                                            {statusConfig && (
                                                                <div 
                                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                                                                    style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}
                                                                    title={`In your list: ${statusConfig.label}`}
                                                                >
                                                                    <Info size={10} />
                                                                    <span>{statusConfig.label}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                            {rel.type}
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {/* Render other relations not in order */}
                            {Object.keys(groupedRelations).filter(type => !RELATION_ORDER.includes(type)).map(type => (
                                 <div key={type} className="relative">
                                    <div className="flex items-center gap-3 mb-3">
                                         <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--text-muted)', marginLeft: '-0.375rem' }} />
                                         <span className="text-sm font-medium px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                                            {type}
                                         </span>
                                    </div>
                                    <div className="ml-6 space-y-2">
                                        {groupedRelations[type].map(rel => {
                                            const status = getUserStatus(rel.id);
                                            const statusConfig = status ? STATUS_CONFIG[status] : null;
                                            return (
                                                <a 
                                                    key={rel.id}
                                                    href={`https://myanimelist.net/anime/${rel.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-lg hover:translate-x-1 transition-all group"
                                                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-sm truncate group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                                                                {rel.title}
                                                            </p>
                                                            {statusConfig && (
                                                                <div 
                                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                                                                    style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}
                                                                    title={`In your list: ${statusConfig.label}`}
                                                                >
                                                                    <Info size={10} />
                                                                    <span>{statusConfig.label}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                            {rel.type}
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No related anime found</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    </div>
  );
}
