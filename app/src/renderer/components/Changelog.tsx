import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Sparkles, Wrench, Bug, ChevronDown, ChevronRight, Calendar, Tag } from 'lucide-react';

// Changelog entry types
type ChangeType = 'added' | 'changed' | 'fixed' | 'improved';

interface ChangeItem {
  type: ChangeType;
  text: string;
}

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: ChangeItem[];
}

// Changelog data - update this when making releases
const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.9.1',
    date: '2026-01-25',
    title: 'Steam Insights & Disk View',
    changes: [
      { type: 'added', text: 'Steam Achievements - view unlocked/total achievements with progress bars per game' },
      { type: 'added', text: 'Collection Value - estimate total library value from Steam store prices with optional price-paid overrides' },
      { type: 'added', text: 'Steam Disk view - see installed Steam games grouped by library and drive, with per-game size and drive free space' },
      { type: 'added', text: 'Cross-platform stats - compare anime watch time vs Steam playtime in Statistics' },
      { type: 'added', text: 'Genre Affinity Score - 0-100 score per genre based on your MAL ratings and watch volume' },
      { type: 'fixed', text: 'Steam store price fetch - improved batching and fallback to reduce 400 Bad Request errors' },
    ],
  },
  {
    version: '0.9.0',
    date: '2026-01-25',
    title: 'Tier List System & Enhanced Navigation',
    changes: [
      { type: 'added', text: 'S-F Tier Rankings - comprehensive tier list system with 8 tiers (S+ through F) for all your watched anime' },
      { type: 'added', text: 'Top 10 Rankings - curated list of your absolute favorite anime with peak arc badges' },
      { type: 'added', text: 'Tier List Dropdown - sidebar navigation with expandable sub-items for tier tools' },
      { type: 'added', text: 'Anime Detail Modal - click any anime in tier list to see comprehensive info' },
      { type: 'added', text: 'Related Anime View - see prequels, sequels, and spin-offs with tier comparison arrows' },
      { type: 'added', text: 'Cross-Reference Display - view S-F tier, Top 10 rank, and MAL score in one place' },
      { type: 'added', text: 'Peak Arc Badges - mark top 5 anime with special badges (Peak Arc, Peak Animation, Peak OST, etc.)' },
      { type: 'added', text: 'Grid-based Anime Picker - browse all your watched anime in a visual grid' },
      { type: 'added', text: 'Drag & Drop Tiers - reorganize anime between tiers by dragging' },
      { type: 'improved', text: 'Homepage - added Tier List quick action and updated layout' },
      { type: 'improved', text: 'Command Palette - added tier list navigation options' },
      { type: 'fixed', text: 'Duplicate anime when dragging between tiers' },
      { type: 'fixed', text: 'Remove button not working on tier list cards' },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-01-26',
    title: 'Advanced Analytics & Performance',
    changes: [
      { type: 'added', text: 'Taste DNA - radar chart visualization of your genre preferences' },
      { type: 'added', text: 'Gap Analysis (Blind Spots) - popular anime in your favorite genres you haven\'t watched' },
      { type: 'added', text: 'Voice Actor Tracker - see which VAs appear most across your anime, with expandable character lists' },
      { type: 'added', text: 'Memory Profiler - monitor app memory usage in Settings (heap, external, array buffers)' },
      { type: 'added', text: 'Deal Score badges - games scored by discount, store reputation, and price tier' },
      { type: 'added', text: 'Episode countdown timers - real-time "airs in X days" on airing anime cards' },
      { type: 'added', text: 'Smart sequel detection - highlights sequels to anime you\'ve watched using MAL related_anime' },
      { type: 'added', text: 'RPC Pause button - toggle Discord Rich Presence on/off without stopping the app' },
      { type: 'improved', text: 'Better error handling for Jikan API JSON parsing errors' },
      { type: 'improved', text: 'Extension video detection uses visibility API for accuracy' },
      { type: 'improved', text: 'Tray icon click now brings window to front properly' },
      { type: 'fixed', text: 'Extension popup redesigned for cleaner look' },
      { type: 'fixed', text: 'Console JSON parsing errors from API responses' },
    ],
  },
  {
    version: '0.7.1',
    date: '2026-01-24',
    title: 'Enhanced Steam Features',
    changes: [
      { type: 'added', text: 'Installed/Not Installed filters - detect games installed on your PC via Steam folder scan' },
      { type: 'added', text: 'Eneba & Loaded price scraping - attempts to fetch real prices from key reseller sites' },
      { type: 'improved', text: 'Better error handling for wishlist fetch - no more JSON parse errors' },
      { type: 'improved', text: 'More robust IPC fetchUrl returns raw HTML when needed for scraping' },
      { type: 'improved', text: 'Scans multiple Steam library folders including custom locations' },
      { type: 'fixed', text: 'HTTP response parsing errors in devtools console' },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-01-24',
    title: 'Steam & Games Integration',
    changes: [
      { type: 'added', text: 'Steam Library - browse and launch your Steam games directly from FoxCLI' },
      { type: 'added', text: 'Game Sales - compare prices across 30+ stores via CheapShark' },
      { type: 'added', text: 'Wishlist import - pull your Steam wishlist for deal tracking' },
      { type: 'added', text: 'Calendar - view anime airing schedules by day of week' },
      { type: 'added', text: 'Steam & Games settings tab - configure Steam API key and ID' },
      { type: 'added', text: 'Game launch overlay - sleek animation when starting games' },
      { type: 'added', text: 'Price verification badges - distinguishes verified vs search-only stores' },
      { type: 'improved', text: 'Custom styled dropdowns and filter chips in Steam Library' },
      { type: 'improved', text: 'Game launch now uses native shell instead of browser window' },
      { type: 'improved', text: 'Wishlist fetching via IPC to bypass CORS restrictions' },
      { type: 'improved', text: 'MAL credentials now persist across app restarts' },
      { type: 'fixed', text: 'Game launch no longer opens blank white Electron page' },
      { type: 'fixed', text: 'Removed fake simulated prices for key reseller sites' },
      { type: 'fixed', text: 'Wishlist CORS errors when fetching from Steam' },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-01-25',
    title: 'New Home Dashboard',
    changes: [
      { type: 'added', text: 'Home - beautiful new dashboard with personalized greeting' },
      { type: 'added', text: 'Continue Watching section - quick access to your current anime' },
      { type: 'added', text: 'Quick stats overview - watching, completed, PTW at a glance' },
      { type: 'added', text: 'Watch time tracking - see total hours/days spent watching' },
      { type: 'added', text: 'Quick actions - fast navigation to key features' },
      { type: 'added', text: 'Inspirational anime quotes - random motivation on each visit' },
      { type: 'improved', text: 'Home is now the default page when opening the app' },
      { type: 'improved', text: 'Sidebar reorganized with Home at the top' },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-01-24',
    title: 'Personalized News Feed',
    changes: [
      { type: 'added', text: 'News - personalized anime updates based on your watch history' },
      { type: 'added', text: 'Sequel detection - shows airing/upcoming sequels to anime you\'ve watched' },
      { type: 'added', text: 'Episode notifications - see when next episodes air (Today/Tomorrow)' },
      { type: 'added', text: 'MAL news integration - latest anime news from MyAnimeList' },
      { type: 'improved', text: 'Airing Tracker now detects sequels to watched anime' },
      { type: 'improved', text: 'Lazy loading for heavy components (News, Airing Tracker)' },
      { type: 'improved', text: 'Memory management - clears cache on window minimize' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-01-24',
    title: 'Statistics Overhaul & Airing Tracker',
    changes: [
      { type: 'added', text: 'Changelog system - track all updates and changes' },
      { type: 'added', text: 'Airing Tracker - see currently airing and upcoming anime' },
      { type: 'added', text: 'Interactive score distribution - click scores to see anime' },
      { type: 'added', text: 'Score comparison vs MAL community average' },
      { type: 'added', text: 'Score trend analysis - track if you\'re rating harsher over time' },
      { type: 'added', text: 'Genre score breakdown with average ratings per genre' },
      { type: 'added', text: 'Studio discovery - find new studios based on your taste' },
      { type: 'added', text: 'Studio news feed - upcoming anime from favorite studios' },
      { type: 'added', text: 'Year filtering for seasonal breakdown' },
      { type: 'improved', text: 'Score distribution now shows tooltips on hover' },
      { type: 'improved', text: 'Fixed username display showing @ instead of @username' },
      { type: 'fixed', text: 'Electron app lag when receiving rapid presence updates' },
      { type: 'fixed', text: 'Non-blocking anime data fetching for smoother UI' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-01-20',
    title: 'Extended Statistics & Recommendations',
    changes: [
      { type: 'added', text: 'Smart recommendations based on your taste profile' },
      { type: 'added', text: 'Studio affinity scores with expandable anime lists' },
      { type: 'added', text: 'Seasonal breakdown with completion rates' },
      { type: 'added', text: 'Franchise map showing connected anime series' },
      { type: 'added', text: 'Tab-based navigation in Statistics view' },
      { type: 'improved', text: 'Better loading states with animated spinners' },
      { type: 'improved', text: 'Extended anime data fetching with caching' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-01-15',
    title: 'MyAnimeList Integration',
    changes: [
      { type: 'added', text: 'MAL OAuth2 authentication with PKCE flow' },
      { type: 'added', text: 'Real-time statistics from your MAL account' },
      { type: 'added', text: 'Score distribution chart' },
      { type: 'added', text: 'Watch status breakdown (watching, completed, etc.)' },
      { type: 'added', text: 'Anime Library with search and filtering' },
      { type: 'improved', text: 'Settings modal with theme customization' },
      { type: 'fixed', text: 'Token refresh handling for expired sessions' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-01-10',
    title: 'Initial Release',
    changes: [
      { type: 'added', text: 'Discord Rich Presence for anime streaming sites' },
      { type: 'added', text: 'Browser extension for AnimeKAI and other sites' },
      { type: 'added', text: 'WebSocket connection between extension and app' },
      { type: 'added', text: 'Custom titlebar with window controls' },
      { type: 'added', text: 'Collapsible sidebar navigation' },
      { type: 'added', text: 'Dark theme with customizable accent colors' },
      { type: 'added', text: 'Jikan API integration for anime metadata' },
    ],
  },
];

const changeTypeConfig: Record<ChangeType, { icon: React.ElementType; color: string; label: string }> = {
  added: { icon: Sparkles, color: '#3BA55D', label: 'Added' },
  changed: { icon: Wrench, color: '#F0B132', label: 'Changed' },
  fixed: { icon: Bug, color: '#ED4245', label: 'Fixed' },
  improved: { icon: Sparkles, color: '#5865F2', label: 'Improved' },
};

function ChangelogEntryCard({ entry, isLatest, defaultExpanded }: { 
  entry: ChangelogEntry; 
  isLatest: boolean;
  defaultExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{ 
              backgroundColor: isLatest ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: isLatest ? 'white' : 'var(--text-primary)'
            }}
          >
            {entry.version}
          </div>
          <div className="text-left">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {entry.title}
              {isLatest && (
                <span 
                  className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}
                >
                  Latest
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={12} />
              {new Date(entry.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
              <span>•</span>
              <Tag size={12} />
              {entry.changes.length} changes
            </div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />
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
            <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--bg-elevated)' }}>
              <div className="mt-3 space-y-2">
                {entry.changes.map((change, i) => {
                  const config = changeTypeConfig[change.type];
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-3 p-2 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      <div 
                        className="p-1.5 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon size={14} style={{ color: config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span 
                          className="text-xs font-medium uppercase tracking-wide"
                          style={{ color: config.color }}
                        >
                          {config.label}
                        </span>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {change.text}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Changelog() {
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
              <History size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Changelog
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Track updates, new features, and improvements
              </p>
            </div>
          </div>
        </motion.header>

        {/* Version Timeline */}
        <div className="space-y-4">
          {CHANGELOG.map((entry, index) => (
            <ChangelogEntryCard 
              key={entry.version} 
              entry={entry} 
              isLatest={index === 0}
              defaultExpanded={index === 0}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
