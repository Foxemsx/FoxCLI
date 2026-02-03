import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Settings, 
  BarChart3, 
  Library,
  Home,
  Command,
  ArrowRight,
  RefreshCw,
  Calendar,
  ShoppingCart,
  Gamepad2,
  Newspaper,
  Radio,
  FileText,
  Crown,
  Zap
} from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import { SiMyanimelist } from 'react-icons/si';

type Command = {
  id: string;
  label: string;
  description?: string;
  category: 'Navigation' | 'Actions' | 'Settings';
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
};

type CommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tool: string) => void;
  onOpenSettings: () => void;
};

export default function CommandPalette({ isOpen, onClose, onNavigate, onOpenSettings }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = useMemo(() => [
    // Navigation
    { 
      id: 'nav-dashboard', 
      label: 'Discord RPC', 
      description: 'Go to Discord RPC dashboard',
      category: 'Navigation', 
      icon: <Home size={18} />, 
      shortcut: '⌘1',
      action: () => onNavigate('discord-rpc') 
    },
    { 
      id: 'nav-library', 
      label: 'Anime Library', 
      description: 'View your MAL anime list',
      category: 'Navigation', 
      icon: <Library size={18} />, 
      shortcut: '⌘2',
      action: () => onNavigate('anime-library') 
    },
    { 
      id: 'nav-stats', 
      label: 'Statistics', 
      description: 'View your anime statistics',
      category: 'Navigation', 
      icon: <BarChart3 size={18} />, 
      shortcut: '⌘3',
      action: () => onNavigate('statistics') 
    },
    { 
      id: 'nav-top10', 
      label: 'Top 10 Rankings', 
      description: 'Your top 10 favorite anime',
      category: 'Navigation', 
      icon: <Crown size={18} />, 
      shortcut: '⌘4',
      action: () => onNavigate('anime-tier-list') 
    },
    { 
      id: 'nav-sftier', 
      label: 'S-F Tier List', 
      description: 'Rate all your anime in S+ to F tiers',
      category: 'Navigation', 
      icon: <Zap size={18} />, 
      shortcut: '⌘5',
      action: () => onNavigate('sf-tier-list') 
    },
    { 
      id: 'nav-airing', 
      label: 'Airing Tracker', 
      description: 'Track currently airing anime',
      category: 'Navigation', 
      icon: <Radio size={18} />, 
      action: () => onNavigate('airing-tracker') 
    },
    { 
      id: 'nav-calendar', 
      label: 'Calendar', 
      description: 'View anime airing schedule',
      category: 'Navigation', 
      icon: <Calendar size={18} />, 
      action: () => onNavigate('calendar') 
    },
    { 
      id: 'nav-sales', 
      label: 'Sales', 
      description: 'Find game deals and compare prices',
      category: 'Navigation', 
      icon: <ShoppingCart size={18} />, 
      action: () => onNavigate('sales') 
    },
    { 
      id: 'nav-steam', 
      label: 'Steam Library', 
      description: 'View your Steam game library',
      category: 'Navigation', 
      icon: <Gamepad2 size={18} />, 
      action: () => onNavigate('steam-library') 
    },
    { 
      id: 'nav-news', 
      label: 'News', 
      description: 'Read anime and gaming news',
      category: 'Navigation', 
      icon: <Newspaper size={18} />, 
      action: () => onNavigate('news') 
    },
    { 
      id: 'nav-changelog', 
      label: 'Changelog', 
      description: 'View app updates and changes',
      category: 'Navigation', 
      icon: <FileText size={18} />, 
      action: () => onNavigate('changelog') 
    },
    // Actions
    { 
      id: 'action-reconnect', 
      label: 'Reconnect Discord', 
      description: 'Reconnect Discord RPC client',
      category: 'Actions', 
      icon: <FaDiscord size={18} />, 
      action: () => {
        window.nexus?.reconnectDiscord?.();
        onClose();
      }
    },
    { 
      id: 'action-mal-connect', 
      label: 'Connect MAL', 
      description: 'Link your MyAnimeList account',
      category: 'Actions', 
      icon: <SiMyanimelist size={18} />, 
      action: () => onNavigate('mal-connect') 
    },
    { 
      id: 'action-refresh', 
      label: 'Refresh Data', 
      description: 'Refresh all data from sources',
      category: 'Actions', 
      icon: <RefreshCw size={18} />, 
      action: () => {
        window.location.reload();
      }
    },
    // Settings
    { 
      id: 'settings-open', 
      label: 'Open Settings', 
      description: 'Configure Nexus Tools preferences',
      category: 'Settings', 
      icon: <Settings size={18} />, 
      shortcut: '⌘,', 
      action: onOpenSettings 
    },
  ], [onNavigate, onOpenSettings, onClose]);

  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const lower = search.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(lower) || 
      cmd.description?.toLowerCase().includes(lower) ||
      cmd.category.toLowerCase().includes(lower)
    );
  }, [commands, search]);

  // Group by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection on search change
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
        <motion.div
          className="w-[560px] overflow-hidden rounded-xl shadow-2xl border"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-elevated)' }}
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          transition={{ type: 'spring', duration: 0.25 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div 
            className="flex items-center gap-3 px-4 py-3.5 border-b"
            style={{ borderColor: 'var(--bg-elevated)' }}
          >
            <Search size={20} style={{ color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)' }}
            />
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            >
              <Command size={12} />
              <span>K</span>
            </div>
          </div>

          {/* Command List */}
          <div 
            ref={listRef}
            className="max-h-[400px] overflow-y-auto p-2"
          >
            {filteredCommands.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No commands found for "{search}"
                </p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category} className="mb-2">
                  <div 
                    className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {category}
                  </div>
                  {cmds.map(cmd => {
                    const globalIdx = filteredCommands.indexOf(cmd);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <button
                        key={cmd.id}
                        data-index={globalIdx}
                        onClick={() => { cmd.action(); onClose(); }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                        style={{
                          backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        <span style={{ color: isSelected ? 'var(--accent-primary)' : 'inherit' }}>
                          {cmd.icon}
                        </span>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {cmd.description}
                            </div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd 
                            className="px-2 py-1 rounded text-xs font-mono"
                            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}
                          >
                            {cmd.shortcut}
                          </kbd>
                        )}
                        {isSelected && (
                          <ArrowRight size={14} style={{ color: 'var(--accent-primary)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div 
            className="flex items-center gap-6 px-4 py-2.5 border-t text-xs"
            style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }}>↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }}>↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }}>esc</kbd>
              close
            </span>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
