import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RpcStatus } from '../renderer.d';
import { 
  Plug, Wifi, Video, Pause, Play, ChevronDown, Monitor, Chrome, CheckCircle2, HelpCircle,
  Gamepad2, Globe, Sparkles, ExternalLink, Zap
} from 'lucide-react';

type AnimeRPCToolProps = {
  status: RpcStatus;
};

function HowToUseSection() {
  const [openTroubleshoot, setOpenTroubleshoot] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mt-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          How it works
        </h2>
      </div>
      
      {/* Animated Flow Diagram */}
      <div 
        className="p-6 rounded-2xl mb-4"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          {/* Extension Node */}
          <div className="flex flex-col items-center gap-2">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#3BA55D20' }}
            >
              <Chrome size={28} style={{ color: '#3BA55D' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Extension</span>
          </div>

          {/* Connection Line 1 */}
          <div className="flex flex-col items-center gap-1 w-12 sm:w-20">
            <motion.div 
              className="h-0.5 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <motion.div 
                className="h-full w-1/3 rounded-full"
                style={{ backgroundColor: 'var(--accent-primary)' }}
                animate={{ x: [-20, 80] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            <span className="text-[10px] uppercase tracking-wider hidden sm:block" style={{ color: 'var(--text-muted)' }}>Detects</span>
          </div>

          {/* App Node */}
          <div className="flex flex-col items-center gap-2">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #5865F2 0%, #EB459E 100%)' }}
            >
              <Video size={32} className="text-white" />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>FoxCLI</span>
          </div>

          {/* Connection Line 2 */}
          <div className="flex flex-col items-center gap-1 w-12 sm:w-20">
            <motion.div 
              className="h-0.5 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <motion.div 
                className="h-full w-1/3 rounded-full"
                style={{ backgroundColor: 'var(--accent-primary)' }}
                animate={{ x: [-20, 80] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1 }}
              />
            </motion.div>
            <span className="text-[10px] uppercase tracking-wider hidden sm:block" style={{ color: 'var(--text-muted)' }}>RPC</span>
          </div>

          {/* Discord Node */}
          <div className="flex flex-col items-center gap-2">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#5865F220' }}
            >
              <Monitor size={28} style={{ color: '#5865F2' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Discord</span>
          </div>
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        {[
          { icon: Chrome, title: "Install Extension", desc: "Get the browser helper to detect video playback.", color: '#3BA55D' },
          { icon: Play, title: "Start Watching", desc: "Open any supported anime site. Status updates automatically.", color: '#5865F2' },
          { icon: CheckCircle2, title: "Discord Status", desc: "Your friends see what you're watching in real-time.", color: '#EB459E' }
        ].map((step, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-start gap-3">
              <div 
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${step.color}20` }}
              >
                <step.icon size={20} style={{ color: step.color }} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Troubleshooting */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <button 
          onClick={() => setOpenTroubleshoot(!openTroubleshoot)}
          className="w-full flex items-center justify-between p-4 transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={16} />
            <span className="text-sm font-medium">Troubleshooting</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${openTroubleshoot ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {openTroubleshoot && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ borderTop: '1px solid var(--bg-elevated)' }}
            >
              <div className="p-4 space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <p>• Ensure Discord desktop app is running (not web version).</p>
                <p>• Check if "Activity Privacy" {'>'} "Display current activity..." is enabled in Discord settings.</p>
                <p>• If status is stuck, try pausing and resuming RPC using the button above.</p>
                <p>• Make sure no other RPC apps are conflicting.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function AnimeRPCTool({ status }: AnimeRPCToolProps) {
  const [isPaused, setIsPaused] = useState(status.rpcPaused ?? false);
  const [isToggling, setIsToggling] = useState(false);
  const [universalRpcEnabled, setUniversalRpcEnabled] = useState(status.universalRpcEnabled ?? false);
  const [isTogglingUniversal, setIsTogglingUniversal] = useState(false);

  // Sync with status changes from main process
  useEffect(() => {
    setIsPaused(status.rpcPaused ?? false);
    setUniversalRpcEnabled(status.universalRpcEnabled ?? false);
  }, [status.rpcPaused, status.universalRpcEnabled]);

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

  const handleUniversalRpcToggle = async () => {
    if (isTogglingUniversal) return;
    setIsTogglingUniversal(true);
    try {
      const newState = !universalRpcEnabled;
      await window.nexus?.setUniversalRpcEnabled?.(newState);
      setUniversalRpcEnabled(newState);
    } catch (err) {
      console.error('Failed to toggle universal RPC:', err);
    } finally {
      setIsTogglingUniversal(false);
    }
  };

  const activityLine = status.activity?.anime
    ? `Watching ${status.activity.anime}`
    : 'No activity yet';
  const episodeLine = status.activity?.episode
    ? `Episode ${status.activity.episode}`
    : 'Episode -';

  // Check if showing universal RPC
  const isUniversalRpcActive = universalRpcEnabled && status.activity?.episode === 'Universal RPC';

  return (
    <div className="flex h-full flex-col overflow-y-auto" style={{ backgroundColor: '#1e1f22' }}>
      <div className="p-6 max-w-5xl mx-auto w-full">
        {/* Hero Section */}
        <motion.div 
          className="relative rounded-3xl p-8 mb-6 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #5865F2 0%, #EB459E 100%)' }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" 
            style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10" 
            style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />
          
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <motion.div 
                className="flex items-center gap-2 text-white/80 text-sm mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <span className="text-xs font-medium uppercase tracking-wider">Discord Rich Presence</span>
              </motion.div>
              
              <motion.h1 
                className="text-3xl lg:text-4xl font-bold text-white mb-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                Anime Presence
              </motion.h1>
              
              <motion.p 
                className="text-sm lg:text-base max-w-xl leading-relaxed text-white/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Sync your anime watching activity to Discord in real-time. Your friends will see what you're watching, 
                the episode number, and your progress.
              </motion.p>
            </div>

            {/* Status Badge in Hero */}
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <AnimatePresence mode="wait">
                {status.steamGameRunning ? (
                  <motion.div
                    key="steam"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Gamepad2 size={16} className="text-white" />
                    <span className="text-xs font-semibold text-white">🎮 Steam Active</span>
                  </motion.div>
                ) : isPaused ? (
                  <motion.div
                    key="paused"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl"
                    style={{ backgroundColor: 'rgba(237, 66, 69, 0.3)' }}
                  >
                    <Pause size={16} className="text-white" />
                    <span className="text-xs font-semibold text-white">Paused</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="live"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Zap size={16} className="text-white" />
                    <span className="text-xs font-semibold text-white">Live</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>

        {/* Steam Game Warning */}
        <AnimatePresence>
          {status.steamGameRunning && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl p-4 mb-4 flex items-center gap-4"
              style={{ backgroundColor: '#3BA55D20' }}
            >
              <div 
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#3BA55D30' }}
              >
                <Gamepad2 size={24} style={{ color: '#3BA55D' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  🎮 Steam Game Running: {status.steamGameName || 'Unknown Game'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Anime RPC is paused to let the Steam game show its own status.
                </p>
              </div>
              <div 
                className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium"
                style={{ backgroundColor: '#3BA55D30', color: '#3BA55D' }}
              >
                Auto-Detected
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause Warning Banner */}
        <AnimatePresence>
          {isPaused && !status.steamGameRunning && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl p-4 mb-4 flex items-center gap-4"
              style={{ backgroundColor: '#ED424520' }}
            >
              <div 
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#ED424530' }}
              >
                <Pause size={24} style={{ color: '#ED4245' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: '#ED4245' }}>Discord RPC is Paused</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Your Discord status will not update while watching anime. Click Resume to re-enable.
                </p>
              </div>
              <button
                onClick={handlePauseToggle}
                disabled={isToggling}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: '#ED424530', color: '#ED4245' }}
              >
                <Play size={14} />
                Resume
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Cards Grid */}
        <div className="grid gap-3 md:grid-cols-3 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="relative p-3 rounded-xl overflow-hidden group cursor-pointer"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative flex items-center gap-2.5">
              <div 
                className={`w-2.5 h-2.5 rounded-full ${status.discordConnected ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: status.discordConnected ? '#5865F2' : '#ED4245' }}
              />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Discord
                </p>
                <p className="text-xs" style={{ color: status.discordConnected ? '#5865F2' : '#ED4245' }}>
                  {status.discordConnected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative p-3 rounded-xl overflow-hidden group cursor-pointer"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative flex items-center gap-2.5">
              <div 
                className={`w-2.5 h-2.5 rounded-full ${status.extensionConnected ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: status.extensionConnected ? '#3BA55D' : '#F0B132' }}
              />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Extension
                </p>
                <p className="text-xs" style={{ color: status.extensionConnected ? '#3BA55D' : '#F0B132' }}>
                  {status.extensionConnected ? 'Connected' : 'Waiting...'}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="relative p-3 rounded-xl overflow-hidden group cursor-pointer"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative flex items-center gap-2.5">
              <div 
                className={`w-2.5 h-2.5 rounded-full ${!isPaused && status.activity?.anime ? 'animate-pulse' : ''}`}
                style={{ 
                  backgroundColor: isUniversalRpcActive ? '#EB459E' : isPaused ? '#ED4245' : status.activity?.anime ? '#3BA55D' : 'var(--text-muted)'
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {isPaused ? 'Paused' : isUniversalRpcActive ? 'Universal RPC' : (status.activity?.anime || 'No activity')}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {isPaused ? 'RPC is paused' : isUniversalRpcActive ? 'Custom status' : (episodeLine || 'Waiting for anime...')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Control Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePauseToggle}
            disabled={isToggling || status.steamGameRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: isPaused ? '#ED424520' : 'var(--bg-secondary)',
              color: isPaused ? '#ED4245' : 'var(--text-secondary)',
              border: `1px solid ${isPaused ? '#ED424540' : 'var(--border-subtle)'}`
            }}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleUniversalRpcToggle}
            disabled={isTogglingUniversal || status.steamGameRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: universalRpcEnabled ? '#EB459E20' : 'var(--bg-secondary)',
              color: universalRpcEnabled ? '#EB459E' : 'var(--text-secondary)',
              border: `1px solid ${universalRpcEnabled ? '#EB459E40' : 'var(--border-subtle)'}`
            }}
          >
            <Globe size={14} />
            <span>{universalRpcEnabled ? 'Universal On' : 'Universal Off'}</span>
          </motion.button>
        </motion.div>

        {/* Universal RPC Info Card */}
        <AnimatePresence>
          {universalRpcEnabled && !status.steamGameRunning && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl p-5 overflow-hidden mb-6"
              style={{ backgroundColor: '#EB459E15' }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#EB459E20' }}
                >
                  <Sparkles size={24} style={{ color: '#EB459E' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Universal RPC Mode Active</h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
                    When you're not watching anime, your Discord status will show a custom message with a link to your website. 
                    This keeps your profile active and helps promote your personal brand.
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <ExternalLink size={14} />
                    <span>foxems.vercel.app</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <HowToUseSection />
      </div>
    </div>
  );
}
