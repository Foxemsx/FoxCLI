import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, Activity, Image, Pause, Play, AlertTriangle, Signal, Clock } from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import type { RpcStatus } from '../renderer';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Never';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

type DashboardProps = {
  status: RpcStatus;
};

export default function Dashboard({ status }: DashboardProps) {
  const [isPaused, setIsPaused] = useState(status.rpcPaused ?? false);
  const [isToggling, setIsToggling] = useState(false);
  const [lastExtensionActivity, setLastExtensionActivity] = useState<Date | null>(null);
  const [discordConnectedAt, setDiscordConnectedAt] = useState<Date | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const prevExtensionConnected = useRef(status.extensionConnected);
  const prevDiscordConnected = useRef(status.discordConnected);
  const prevAnimeName = useRef(status.activity?.anime);

  // Sync with status changes from main process
  useEffect(() => {
    setIsPaused(status.rpcPaused ?? false);
  }, [status.rpcPaused]);

  // Track connection timestamps
  useEffect(() => {
    if (status.extensionConnected && !prevExtensionConnected.current) {
      setLastExtensionActivity(new Date());
    } else if (status.extensionConnected && status.activity?.anime) {
      setLastExtensionActivity(new Date());
    }
    prevExtensionConnected.current = status.extensionConnected;
  }, [status.extensionConnected, status.activity?.anime]);

  useEffect(() => {
    if (status.discordConnected && !prevDiscordConnected.current) {
      setDiscordConnectedAt(new Date());
    } else if (!status.discordConnected) {
      setDiscordConnectedAt(null);
    }
    prevDiscordConnected.current = status.discordConnected;
  }, [status.discordConnected]);

  useEffect(() => {
    if (status.activity?.anime && status.activity.anime !== prevAnimeName.current) {
      setLastSyncTime(new Date());
    }
    prevAnimeName.current = status.activity?.anime;
  }, [status.activity?.anime]);

  // Update display every second
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const connectionDuration = discordConnectedAt
    ? formatDuration(Math.floor((Date.now() - discordConnectedAt.getTime()) / 1000))
    : 'Not connected';

  const handlePauseToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const newState = !isPaused;
      await window.nexus?.setRpcPaused?.(newState);
      setIsPaused(newState);
    } catch (err) {
      console.error('Failed to toggle RPC pause:', err);
    } finally {
      setIsToggling(false);
    }
  };

  const animeName = status.activity?.anime ?? null;
  const episode = status.activity?.episode ?? null;
  const playState = status.activity?.state ?? 'idle';
  const currentTime = status.activity?.currentTime ?? null;
  const duration = status.activity?.duration ?? null;

  // Format time as MM:SS or HH:MM:SS
  const formatVideoTime = (seconds: number | null): string => {
    if (seconds === null || isNaN(seconds)) return '--:--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Anime Presence</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Sync your Animekai watching status to Discord Rich Presence.
            </p>
          </div>
          
          {/* RPC Pause Toggle */}
          <button
            onClick={handlePauseToggle}
            disabled={isToggling}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isPaused
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/50'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 ring-1 ring-emerald-500/50'
            } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" />
                <span>Resume RPC</span>
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                <span>Pause RPC</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Pause Warning Banner */}
      {isPaused && (
        <div 
          className="mb-6 rounded-lg p-4 flex items-center gap-4"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
          >
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-400">Discord RPC is Paused</h3>
            <p className="text-xs text-red-400/70 mt-0.5">
              Your Discord status will not update while watching anime. Click "Resume RPC" to re-enable.
            </p>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Extension Status */}
        <div 
          className="flex items-start gap-4 rounded-lg p-4 transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              backgroundColor: status.extensionConnected 
                ? 'rgba(35, 165, 90, 0.2)' 
                : 'rgba(242, 63, 67, 0.2)',
              color: status.extensionConnected 
                ? 'var(--status-online)' 
                : 'var(--status-dnd)'
            }}
          >
            {status.extensionConnected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Extension Status</div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ 
                  backgroundColor: status.extensionConnected 
                    ? 'var(--status-online)' 
                    : 'var(--status-dnd)' 
                }}
              />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {status.extensionConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Discord Rich Presence */}
        <div 
          className="flex items-start gap-4 rounded-lg p-4 transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              backgroundColor: status.discordConnected 
                ? 'rgba(88, 101, 242, 0.2)' 
                : 'rgba(242, 63, 67, 0.2)',
              color: status.discordConnected 
                ? 'var(--accent-primary)' 
                : 'var(--status-dnd)'
            }}
          >
            <FaDiscord className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Rich Presence</div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ 
                  backgroundColor: status.discordConnected 
                    ? 'var(--status-online)' 
                    : 'var(--status-dnd)' 
                }}
              />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {status.discordConnected ? 'Active' : 'Idle'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Current Activity */}
        <div 
          className="flex items-start gap-4 rounded-lg p-4 sm:col-span-2 lg:col-span-1 transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {/* Cover Art Placeholder */}
          <div 
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}
          >
            {animeName ? (
              <Activity className="h-6 w-6" style={{ color: 'var(--accent-primary)' }} />
            ) : (
              <Image className="h-6 w-6" />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Current Activity</div>
            {animeName && animeName !== 'Unknown Anime' ? (
              <>
                <div 
                  className="mt-1 truncate text-sm font-semibold" 
                  style={{ color: 'var(--text-primary)' }}
                >
                  {animeName}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {episode ?? 'Episode ?'} &middot;{' '}
                  <span style={{ 
                    color: playState === 'playing' 
                      ? 'var(--status-online)' 
                      : 'var(--status-idle)' 
                  }}>
                    {playState === 'playing' ? 'Playing' : 'Paused'}
                  </span>
                  {currentTime !== null && duration !== null && duration > 0 && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                      {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {status.extensionConnected 
                  ? (animeName === 'Unknown Anime' ? 'Waiting for anime data...' : 'No activity detected') 
                  : 'Connect browser extension to see activity'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Health Indicator */}
      <section className="mt-6 rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Signal size={18} style={{ color: 'var(--accent-primary)' }} />
          Connection Health
        </h2>
        
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Extension Health */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${status.extensionConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Browser Extension</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Last activity: {formatTimeAgo(lastExtensionActivity)}
            </p>
          </div>
          
          {/* Discord Health */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${status.discordConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Discord RPC</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Connected for: {connectionDuration}
            </p>
          </div>
          
          {/* Data Freshness */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} style={{ color: 'var(--text-primary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Data Freshness</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {status.activity?.anime 
                ? `Live • Synced ${formatTimeAgo(lastSyncTime)}`
                : 'Waiting for activity'}
            </p>
          </div>
        </div>
      </section>

      {/* Instructions */}
      <section 
        className="mt-8 rounded-xl p-5"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>How it works</h2>
        
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { 
              step: '1', 
              title: 'Install Extension', 
              desc: 'Get the companion browser extension to detect video playback.',
              color: 'var(--status-online)'
            },
            { 
              step: '2', 
              title: 'Start Watching', 
              desc: 'Open animekai.to and start watching any anime.',
              color: 'var(--accent-primary)'
            },
            { 
              step: '3', 
              title: 'Auto Sync', 
              desc: 'Your Discord status updates automatically in real-time.',
              color: '#5865F2'
            }
          ].map((item) => (
            <div 
              key={item.step}
              className="flex gap-3 p-3 rounded-lg"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div 
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: `${item.color}20`, color: item.color }}
              >
                {item.step}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
