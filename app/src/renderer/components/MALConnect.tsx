import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { 
  LogIn, LogOut, ExternalLink, Key, CheckCircle, 
  AlertCircle, Loader2, User, RefreshCw 
} from 'lucide-react';
import {
  isAuthenticated,
  getUsername,
  getClientId,
  setClientId,
  startOAuthFlow,
  handleOAuthCallback,
  logout,
  fetchCurrentUser
} from '../services/malApi';

interface MALConnectProps {
  onAuthChange?: (authenticated: boolean) => void;
  compact?: boolean;
}

export default function MALConnect({ onAuthChange, compact = false }: MALConnectProps) {
  const onAuthChangeRef = useRef(onAuthChange);
  useEffect(() => {
    onAuthChangeRef.current = onAuthChange;
  }, [onAuthChange]);
  const [clientId, setClientIdState] = useState(getClientId());
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [username, setUsername] = useState(getUsername());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(!clientId);

  // Listen for OAuth callback
  useEffect(() => {
    const unsubCode = window.nexus?.onMalOAuthCode?.(async ({ code, state }) => {
      console.log('[MAL] Received OAuth code');
      setIsLoading(true);
      setError(null);
      
      try {
        if (!state) {
          throw new Error('Missing OAuth state');
        }
        await handleOAuthCallback(code, state);
        setIsLoggedIn(true);
        setUsername(getUsername());
        onAuthChangeRef.current?.(true);
      } catch (err: any) {
        setError(err.message || 'Failed to complete login');
      } finally {
        setIsLoading(false);
      }
    });

    const unsubError = window.nexus?.onMalOAuthError?.((err) => {
      console.error('[MAL] OAuth error:', err);
      setError(err);
      setIsLoading(false);
    });

    return () => {
      unsubCode?.();
      unsubError?.();
    };
  }, []);

  // Check auth status on mount
  useEffect(() => {
    if (isAuthenticated()) {
      setIsLoggedIn(true);
      setUsername(getUsername());
      onAuthChangeRef.current?.(true);
    }
  }, []);

  const handleSaveClientId = () => {
    if (clientId.trim()) {
      setClientId(clientId.trim());
      setClientIdState(clientId.trim());
      setShowSetup(false);
      setError(null);
    }
  };

  const handleLogin = async () => {
    if (!clientId) {
      setShowSetup(true);
      return;
    }

    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const authUrl = await startOAuthFlow();
      await window.nexus?.malStartOAuth?.(authUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to start login');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setUsername(null);
    onAuthChangeRef.current?.(false);
  };

  // Compact version for headers/sidebars
  if (compact) {
    if (isLoggedIn) {
      return (
        <div className="flex items-center gap-2">
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#3ba55d' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              @{username}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
            title="Logout from MAL"
          >
            <LogOut size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <LogIn size={16} />
        )}
        <span className="text-sm">Connect MAL</span>
      </button>
    );
  }

  // Full card version
  return (
    <motion.div 
      className="rounded-xl p-6"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="p-2.5 rounded-xl"
          style={{ 
            backgroundColor: isLoggedIn ? '#3ba55d20' : 'var(--accent-primary)20',
            color: isLoggedIn ? '#3ba55d' : 'var(--accent-primary)'
          }}
        >
          {isLoggedIn ? <CheckCircle size={24} /> : <Key size={24} />}
        </div>
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            MyAnimeList
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isLoggedIn ? `Connected as @${username}` : 'Connect your account'}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm"
            style={{ backgroundColor: '#ed424520', color: '#ed4245' }}
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        {showSetup && !isLoggedIn ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                MAL Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientIdState(e.target.value)}
                placeholder="Enter your Client ID"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all focus:ring-2"
                style={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  color: 'var(--text-primary)',
                  borderColor: 'transparent'
                }}
              />
            </div>

            <div 
              className="p-3 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
            >
              <p className="mb-2">To get your Client ID:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Go to MAL API Config page</li>
                <li>Create a new application</li>
                <li>Set App Redirect URL to: <code className="px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>http://localhost:7842/callback</code></li>
                <li>Copy the Client ID</li>
              </ol>
              <button
                 onClick={() => window.nexus?.malOpenExternal?.('https://myanimelist.net/apiconfig').catch(() => false)}
                className="mt-3 flex items-center gap-1 text-xs hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                <ExternalLink size={12} />
                Open MAL API Config
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveClientId}
                disabled={!clientId.trim()}
                className="flex-1 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              >
                Save & Continue
              </button>
              {getClientId() && (
                <button
                  onClick={() => setShowSetup(false)}
                  className="px-4 py-2.5 rounded-lg transition-all hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        ) : isLoggedIn ? (
          <motion.div
            key="logged-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div 
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              <User size={20} style={{ color: 'var(--text-muted)' }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {username}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  MyAnimeList Account
                </p>
              </div>
              <button
                 onClick={() => window.nexus?.malOpenExternal?.(`https://myanimelist.net/profile/${username}`).catch(() => false)}
                className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <ExternalLink size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSetup(true)}
                className="flex-1 py-2.5 rounded-lg text-sm transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
              >
                Change Client ID
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#ed424520', color: '#ed4245' }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Waiting for authorization...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Login with MyAnimeList
                </>
              )}
            </button>

            <button
              onClick={() => setShowSetup(true)}
              className="w-full py-2 text-sm transition-all hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Configure Client ID
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
