import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarDays, ChevronLeft, ChevronRight, Plus, X, Clock,
  Tv, Star, Edit2, Trash2, Check, AlertCircle
} from 'lucide-react';
import { fetchAnimeList, isAuthenticated, MALAnimeEntry } from '../services/malApi';

interface AiringAnime {
  id: number;
  title: string;
  image: string;
  episode: number;
  airingAt: Date;
  broadcast?: string;
  isOnUserList: boolean;
  userStatus?: string;
}

interface CustomEvent {
  id: string;
  title: string;
  date: Date;
  time?: string;
  color: string;
  type: 'custom';
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: (AiringAnime | CustomEvent)[];
}

type ViewMode = 'month' | 'week';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_FULL = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

const EVENT_COLORS = [
  '#5865F2', '#3BA55D', '#ED4245', '#F0B132', '#9B59B6', '#E67E73', '#00ADB5', '#EB459E'
];

// Cache for anime schedule to avoid refetching
const scheduleCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Convert JST (UTC+9) to local timezone
function convertJSTToLocal(jstHours: number, jstMinutes: number, baseDate: Date): Date {
  // Create a date in JST
  const jstOffset = 9 * 60; // JST is UTC+9
  const localOffset = baseDate.getTimezoneOffset(); // Local offset in minutes (negative for east of UTC)
  
  // Calculate the difference in minutes
  const diffMinutes = jstOffset + localOffset;
  
  // Start with the base date at JST time
  const result = new Date(baseDate);
  result.setHours(jstHours, jstMinutes, 0, 0);
  
  // Subtract the difference to get local time
  result.setMinutes(result.getMinutes() - diffMinutes);
  
  return result;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function EventBadge({ event, compact = false }: { event: AiringAnime | CustomEvent; compact?: boolean }) {
  const isAnime = 'episode' in event;
  
  if (compact) {
    return (
      <div 
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: isAnime ? 'var(--accent-primary)' : (event as CustomEvent).color }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs truncate"
      style={{ 
        backgroundColor: isAnime ? 'var(--accent-primary)20' : `${(event as CustomEvent).color}20`,
        color: isAnime ? 'var(--accent-primary)' : (event as CustomEvent).color,
      }}
      title={isAnime ? `${event.title} - Ep ${(event as AiringAnime).episode}` : event.title}
    >
      {isAnime ? <Tv size={10} /> : <CalendarDays size={10} />}
      <span className="truncate">{event.title}</span>
    </motion.div>
  );
}

function AddEventModal({ 
  selectedDate, 
  onClose, 
  onSave,
  editEvent 
}: { 
  selectedDate: Date;
  onClose: () => void;
  onSave: (event: CustomEvent) => void;
  editEvent?: CustomEvent | null;
}) {
  const [title, setTitle] = useState(editEvent?.title || '');
  const [time, setTime] = useState(editEvent?.time || '');
  const [color, setColor] = useState(editEvent?.color || EVENT_COLORS[0]);

  const handleSave = () => {
    if (!title.trim()) return;

    const event: CustomEvent = {
      id: editEvent?.id || `custom-${Date.now()}`,
      title: title.trim(),
      date: selectedDate,
      time: time || undefined,
      color,
      type: 'custom',
    };
    onSave(event);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-xl p-6"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {editEvent ? 'Edit Event' : 'Add Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
          >
            <X size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter event title"
              autoFocus
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors"
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-elevated)'
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Date
            </label>
            <div 
              className="px-4 py-3 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              {selectedDate.toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Time (optional)
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors"
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-elevated)'
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{ 
                    backgroundColor: c,
                    border: color === c ? '3px solid white' : 'none',
                    boxShadow: color === c ? '0 0 0 2px var(--accent-primary)' : 'none'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            {editEvent ? 'Update' : 'Add Event'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DayDetailModal({
  date,
  events,
  onClose,
  onAddEvent,
  onEditEvent,
  onDeleteEvent
}: {
  date: Date;
  events: (AiringAnime | CustomEvent)[];
  onClose: () => void;
  onAddEvent: () => void;
  onEditEvent: (event: CustomEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="p-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {events.length} events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddEvent}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
              title="Add event"
            >
              <Plus size={18} style={{ color: 'var(--accent-primary)' }} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
            >
              <X size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No events on this day
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, i) => {
                const isAnime = 'episode' in event;
                
                return (
                  <motion.div
                    key={isAnime ? event.id : (event as CustomEvent).id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    {isAnime ? (
                      <>
                        <img
                          src={(event as AiringAnime).image}
                          alt={event.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <span className="flex items-center gap-1">
                              <Tv size={11} />
                              Episode {(event as AiringAnime).episode}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {formatTime((event as AiringAnime).airingAt)}
                            </span>
                          </div>
                          {(event as AiringAnime).isOnUserList && (
                            <span 
                              className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs"
                              style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}
                            >
                              <Star size={10} />
                              On your list
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div 
                          className="w-2 h-12 rounded-full flex-shrink-0"
                          style={{ backgroundColor: (event as CustomEvent).color }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {event.title}
                          </h4>
                          {(event as CustomEvent).time && (
                            <span className="text-xs flex items-center gap-1 mt-1" style={{ color: 'var(--text-muted)' }}>
                              <Clock size={11} />
                              {(event as CustomEvent).time}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEditEvent(event as CustomEvent)}
                            className="p-2 rounded transition-colors hover:bg-[var(--bg-elevated)]"
                          >
                            <Edit2 size={14} style={{ color: 'var(--text-muted)' }} />
                          </button>
                          <button
                            onClick={() => onDeleteEvent((event as CustomEvent).id)}
                            className="p-2 rounded transition-colors hover:bg-[var(--bg-elevated)]"
                          >
                            <Trash2 size={14} style={{ color: '#ED4245' }} />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [airingAnime, setAiringAnime] = useState<AiringAnime[]>([]);
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CustomEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as loading
  const [userAnimeIds, setUserAnimeIds] = useState<Set<number>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showOnlyMyAnime, setShowOnlyMyAnime] = useState(() => {
    const saved = localStorage.getItem('foxcli-calendar-my-anime-only');
    return saved === 'true';
  });

  // Save filter preference
  useEffect(() => {
    localStorage.setItem('foxcli-calendar-my-anime-only', String(showOnlyMyAnime));
  }, [showOnlyMyAnime]);

  // Load custom events from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('foxcli-calendar-events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomEvents(parsed.map((e: any) => ({
          ...e,
          date: new Date(e.date),
        })));
      } catch (e) {
        console.error('Failed to parse calendar events:', e);
      }
    }
  }, []);

  // Save custom events to localStorage
  useEffect(() => {
    if (customEvents.length > 0) {
      localStorage.setItem('foxcli-calendar-events', JSON.stringify(customEvents));
    }
  }, [customEvents]);

  // Load user's anime list for matching
  useEffect(() => {
    const loadUserList = async () => {
      if (!isAuthenticated()) return;
      try {
        const list = await fetchAnimeList(undefined, 1000, false);
        const ids = new Set(list.map(a => a.id));
        setUserAnimeIds(ids);
      } catch (err) {
        console.error('Failed to load user anime list:', err);
      }
    };
    loadUserList();
  }, []);

  // Fetch airing anime schedule
  useEffect(() => {
    let isCancelled = false;
    
    const fetchAiringSchedule = async () => {
      const cacheKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      
      // Check cache first
      const cached = scheduleCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('[Calendar] Using cached schedule data');
        setAiringAnime(cached.data);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      console.log('[Calendar] Fetching airing schedule...');
      
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const anime: AiringAnime[] = [];
        
        // Fetch each day with proper rate limiting (Jikan allows 3 requests/second)
        for (let day = 0; day < 7; day++) {
          if (isCancelled) return;
          
          const dayName = WEEKDAY_FULL[day]; // Use full day names!
          console.log(`[Calendar] Fetching schedule for ${dayName}...`);
          
          try {
            // Wait 1 second between requests to avoid rate limiting
            if (day > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const dayResponse = await fetch(
              `https://api.jikan.moe/v4/schedules?filter=${dayName}&limit=25`
            );
            
            if (!dayResponse.ok) {
              if (dayResponse.status === 429) {
                console.warn(`[Calendar] Rate limited for ${dayName}, waiting...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
              }
              console.error(`[Calendar] API error for ${dayName}: ${dayResponse.status}`);
              continue;
            }
            
            const dayData = await dayResponse.json();
            console.log(`[Calendar] Got ${dayData?.data?.length || 0} anime for ${dayName}`);
            
            if (dayData?.data && Array.isArray(dayData.data)) {
              for (const item of dayData.data) {
                // Skip if not currently airing
                if (item.status !== 'Currently Airing' && !item.airing) continue;
                
                // Parse broadcast time (Jikan returns time in JST)
                const broadcastTime = item.broadcast?.time || '12:00';
                const [jstHours, jstMinutes] = broadcastTime.split(':').map(Number);
                
                // Find all occurrences of this day in the current month
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                
                for (let d = firstDay.getDate(); d <= lastDay.getDate(); d++) {
                  const baseDate = new Date(year, month, d);
                  if (baseDate.getDay() === day) {
                    // Convert JST time to local timezone
                    const localAiringDate = convertJSTToLocal(jstHours || 12, jstMinutes || 0, baseDate);
                    
                    anime.push({
                      id: item.mal_id,
                      title: item.title,
                      image: item.images?.jpg?.small_image_url || item.images?.jpg?.image_url,
                      episode: item.episodes_aired || 1,
                      airingAt: localAiringDate,
                      broadcast: `${item.broadcast?.string || ''} (Local: ${localAiringDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                      isOnUserList: userAnimeIds.has(item.mal_id),
                      userStatus: undefined,
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.error(`[Calendar] Failed to fetch schedule for ${dayName}:`, e);
          }
        }
        
        if (!isCancelled) {
          console.log(`[Calendar] Total anime loaded: ${anime.length}`);
          // Cache the results
          scheduleCache.set(cacheKey, { data: anime, timestamp: Date.now() });
          setAiringAnime(anime);
          setFetchError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to fetch airing schedule:', err);
          setFetchError(err.message || 'Failed to load schedule');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchAiringSchedule();
    
    return () => {
      isCancelled = true;
    };
  }, [currentDate.getMonth(), currentDate.getFullYear(), userAnimeIds.size]);

  // Generate calendar days
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const current = new Date(startDate);
    
    // Filter anime based on toggle
    const filteredAnime = showOnlyMyAnime 
      ? airingAnime.filter(a => a.isOnUserList)
      : airingAnime;
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(current);
      const dayEvents: (AiringAnime | CustomEvent)[] = [];
      
      // Add airing anime for this day
      for (const anime of filteredAnime) {
        if (isSameDay(anime.airingAt, date)) {
          dayEvents.push(anime);
        }
      }
      
      // Add custom events for this day
      for (const event of customEvents) {
        if (isSameDay(event.date, date)) {
          dayEvents.push(event);
        }
      }
      
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: isSameDay(date, today),
        events: dayEvents,
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate, airingAnime, customEvents, showOnlyMyAnime, userAnimeIds]);

  const navigateMonth = (delta: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + delta);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleAddEvent = (event: CustomEvent) => {
    if (editingEvent) {
      setCustomEvents(prev => prev.map(e => e.id === event.id ? event : e));
    } else {
      setCustomEvents(prev => [...prev, event]);
    }
    setShowAddEvent(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    setCustomEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.date);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <CalendarDays style={{ color: 'var(--accent-primary)' }} />
              Calendar
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Anime airing schedule & personal events
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOnlyMyAnime(!showOnlyMyAnime)}
              className="px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all"
              style={{ 
                backgroundColor: showOnlyMyAnime ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                color: showOnlyMyAnime ? 'white' : 'var(--text-secondary)',
                border: showOnlyMyAnime ? 'none' : '1px solid var(--bg-elevated)'
              }}
              title={showOnlyMyAnime ? 'Showing only anime from your list' : 'Showing all airing anime'}
            >
              <Star size={14} fill={showOnlyMyAnime ? 'currentColor' : 'none'} />
              My Anime
            </button>
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setShowAddEvent(true);
              }}
              className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            >
              <Plus size={16} />
              Add Event
            </button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
            >
              <ChevronLeft size={20} style={{ color: 'var(--text-muted)' }} />
            </button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center" style={{ color: 'var(--text-primary)' }}>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
            >
              <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="px-6 pb-2">
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Tv size={14} />
            </motion.div>
            Loading anime schedule...
          </div>
        </div>
      )}

      {/* Anime count indicator */}
      {!isLoading && airingAnime.length > 0 && (
        <div className="px-6 pb-2 flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}>
            {showOnlyMyAnime 
              ? `${airingAnime.filter(a => a.isOnUserList).length} from your list` 
              : `${airingAnime.length} anime episodes`} this month
          </span>
          {showOnlyMyAnime && userAnimeIds.size === 0 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              (Connect MAL to see your anime)
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {fetchError && (
        <div className="px-6 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#ED424520', color: '#ED4245' }}>
            <AlertCircle size={14} />
            {fetchError}
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 overflow-hidden p-6 pt-2">
        <div className="h-full flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--bg-elevated)' }}>
            {WEEKDAYS.map(day => (
              <div 
                key={day}
                className="py-3 text-center text-sm font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="flex-1 grid grid-cols-7 grid-rows-6">
            {calendarDays.map((day, i) => (
              <motion.div
                key={i}
                onClick={() => handleDayClick(day)}
                className={`relative p-1 border-b border-r cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]`}
                style={{ 
                  borderColor: 'var(--bg-elevated)',
                  opacity: day.isCurrentMonth ? 1 : 0.4,
                }}
                whileHover={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span 
                    className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      day.isToday ? 'text-white' : ''
                    }`}
                    style={{ 
                      backgroundColor: day.isToday ? 'var(--accent-primary)' : 'transparent',
                      color: day.isToday ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    {day.date.getDate()}
                  </span>
                  {day.events.length > 0 && (
                    <span 
                      className="text-[10px] px-1.5 rounded"
                      style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}
                    >
                      {day.events.length}
                    </span>
                  )}
                </div>
                
                {/* Event previews */}
                <div className="space-y-0.5 overflow-hidden" style={{ maxHeight: 'calc(100% - 28px)' }}>
                  {day.events.slice(0, 3).map((event, j) => (
                    <EventBadge key={j} event={event} />
                  ))}
                  {day.events.length > 3 && (
                    <span className="text-[10px] px-2" style={{ color: 'var(--text-muted)' }}>
                      +{day.events.length - 3} more
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedDate && !showAddEvent && (
          <DayDetailModal
            date={selectedDate}
            events={calendarDays.find(d => isSameDay(d.date, selectedDate))?.events || []}
            onClose={() => setSelectedDate(null)}
            onAddEvent={() => setShowAddEvent(true)}
            onEditEvent={(event) => {
              setEditingEvent(event);
              setShowAddEvent(true);
            }}
            onDeleteEvent={handleDeleteEvent}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddEvent && selectedDate && (
          <AddEventModal
            selectedDate={selectedDate}
            onClose={() => {
              setShowAddEvent(false);
              setEditingEvent(null);
            }}
            onSave={handleAddEvent}
            editEvent={editingEvent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
