import { useEffect, useState, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import AnimeRPCTool from './components/AnimeRPCTool';
import AnimeLibrary from './components/AnimeLibrary';
import Statistics from './components/Statistics';
import SettingsModal from './components/SettingsModal';
import CommandPalette from './components/CommandPalette';
import TitleBar from './components/TitleBar';
import Changelog from './components/Changelog';
import Home from './components/Home';
import { loadCredentials } from './services/malApi';

// Lazy load heavy components for better initial load
const AiringTracker = lazy(() => import('./components/AiringTracker'));
const News = lazy(() => import('./components/News'));
const SteamLibrary = lazy(() => import('./components/SteamLibrary'));
const Sales = lazy(() => import('./components/Sales'));
const SteamDisks = lazy(() => import('./components/SteamDisks'));
const Calendar = lazy(() => import('./components/Calendar'));
const AnimeTierList = lazy(() => import('./components/AnimeTierList'));
const SFTierList = lazy(() => import('./components/SFTierList'));
import { useTheme, BACKGROUNDS } from './hooks/useTheme';
import { useSidebarState } from './hooks/useSidebarState';
import type { RpcStatus } from './renderer';

const initialStatus: RpcStatus = {
  discordConnected: false,
  extensionConnected: false,
  rpcPaused: false
};

export default function App() {
  const [activeTool, setActiveTool] = useState('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [status, setStatus] = useState<RpcStatus>(initialStatus);
  const { background } = useTheme();
  const { isCollapsed, toggle: toggleSidebar } = useSidebarState();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      console.log('[FoxCLI] App init. window.nexus:', window.nexus);
      
      // Load MAL credentials from persistent storage
      await loadCredentials();
      
      if (window.nexus?.getStatus) {
        const snapshot = await window.nexus.getStatus();
        setStatus(snapshot);
      }
      if (window.nexus?.onStatus) {
        unsubscribe = window.nexus.onStatus((next) => setStatus(next));
      }
    };

    init();
    return () => unsubscribe?.();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape = Close any open modals
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          e.preventDefault();
          setIsCommandPaletteOpen(false);
        } else if (isSettingsOpen) {
          e.preventDefault();
          setIsSettingsOpen(false);
        }
      }
      // Ctrl/Cmd + K = Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      // Ctrl/Cmd + , = Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
      // Ctrl/Cmd + B = Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      // Ctrl/Cmd + 1/2/3 = Quick Navigation
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        setActiveTool('discord-rpc');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        setActiveTool('anime-library');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault();
        setActiveTool('statistics');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, isCommandPaletteOpen, isSettingsOpen]);

  // Get the background class for current theme
  const bgClass = BACKGROUNDS[background]?.class || 'bg-theme-solid';

  return (
    <div className={`flex h-screen w-screen flex-col overflow-hidden ${bgClass}`}>
      {/* Custom Title Bar */}
      <TitleBar discordConnected={status.discordConnected} extensionConnected={status.extensionConnected} />

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        {/* Main Content Area */}
        <main 
          className="flex-1 overflow-y-auto bg-[#313338]"
        >
          {activeTool === 'home' && <Home onNavigate={setActiveTool} />}
          {activeTool === 'discord-rpc' && <AnimeRPCTool status={status} />}
          {activeTool === 'anime-library' && <AnimeLibrary />}
          {activeTool === 'statistics' && <Statistics />}
          {activeTool === 'airing-tracker' && (
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent" />
              </div>
            }>
              <AiringTracker />
            </Suspense>
          )}
          {activeTool === 'news' && (
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent" />
              </div>
            }>
              <News />
            </Suspense>
          )}
          {activeTool === 'tier-list' && (
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent" />
              </div>
            }>
              <AnimeTierList />
            </Suspense>
          )}
          {activeTool === 'sf-tier-list' && (
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent" />
              </div>
            }>
              <SFTierList />
            </Suspense>
          )}
          {activeTool === 'changelog' && <Changelog />}
          {activeTool === 'calendar' && (
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent" />
              </div>
            }>
              <Calendar />
            </Suspense>
          )}
          {activeTool === 'steam-library' && (
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent" />
              </div>
            }>
              <SteamLibrary />
            </Suspense>
          )}
          {activeTool === 'sales' && (
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent" />
              </div>
            }>
              <Sales />
            </Suspense>
          )}
          {activeTool === 'steam-disks' && (
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent" />
              </div>
            }>
              <SteamDisks />
            </Suspense>
          )}
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      </AnimatePresence>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tool) => {
          setActiveTool(tool);
          setIsCommandPaletteOpen(false);
        }}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          setIsCommandPaletteOpen(false);
        }}
      />
    </div>
  );
}
