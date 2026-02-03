import express from 'express';
import cors from 'cors';
import { websiteSettingsStore } from './store';
import { collectWebsiteData } from './dataExporter';

let server: ReturnType<typeof express.application.listen> | null = null;
const rateLimitBuckets = new Map<string, number[]>();

// Type for the current watching state
export type NowWatchingState = {
  isWatching: boolean;
  title?: string;
  episode?: string;
  season?: string;
  image?: string;
  progress?: {
    current: number;
    duration: number;
  };
  source?: string;
  timestamp: string;
};

// Callback to get current watching state from main process
let getNowWatchingState: (() => NowWatchingState) | null = null;

export function setNowWatchingStateGetter(getter: () => NowWatchingState) {
  getNowWatchingState = getter;
}

export function createApiServer(allowedOrigins: string[]): express.Application {
  const app = express();
  const dataTimeoutMs = 15_000;

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  // Enable CORS for configured origins only
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, false);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  }));
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use((req, res, next) => {
    const key = req.ip || 'unknown';
    if (rateLimitBuckets.size > 5000 && !rateLimitBuckets.has(key)) {
      const oldestKey = rateLimitBuckets.keys().next().value;
      if (oldestKey) rateLimitBuckets.delete(oldestKey);
    }
    const now = Date.now();
    const windowMs = 60_000;
    const maxHits = 60;
    const bucket = rateLimitBuckets.get(key) ?? [];
    const nextBucket = bucket.filter((ts) => now - ts < windowMs);
    nextBucket.push(now);
    rateLimitBuckets.set(key, nextBucket);
    if (nextBucket.length > maxHits) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    next();
  });
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Profile endpoint
  app.get('/api/profile', (req, res) => {
    const settings = websiteSettingsStore.getAll();
    res.json({
      displayName: settings.displayName,
      bio: settings.bio,
      avatar: settings.avatar,
      socials: settings.socials,
    });
  });

  // Anime stats endpoint
  app.get('/api/anime/stats', async (req, res) => {
    try {
      const data = await withTimeout(collectWebsiteData(), dataTimeoutMs);
      res.json(data.anime.stats);
    } catch (err) {
      console.error('[API] Failed to get anime stats:', err);
      res.status(500).json({ error: 'Failed to get anime stats' });
    }
  });

  // Top 10 anime endpoint
  app.get('/api/anime/top10', async (req, res) => {
    try {
      const data = await withTimeout(collectWebsiteData(), dataTimeoutMs);
      res.json(data.anime.top10);
    } catch (err) {
      console.error('[API] Failed to get top 10:', err);
      res.status(500).json({ error: 'Failed to get top 10' });
    }
  });

  // Tier list endpoint
  app.get('/api/anime/tiers', async (req, res) => {
    try {
      const data = await withTimeout(collectWebsiteData(), dataTimeoutMs);
      res.json(data.anime.tiers);
    } catch (err) {
      console.error('[API] Failed to get tiers:', err);
      res.status(500).json({ error: 'Failed to get tiers' });
    }
  });

  // Gaming stats endpoint
  app.get('/api/gaming/stats', async (req, res) => {
    try {
      const data = await withTimeout(collectWebsiteData(), dataTimeoutMs);
      res.json(data.gaming.stats);
    } catch (err) {
      console.error('[API] Failed to get gaming stats:', err);
      res.status(500).json({ error: 'Failed to get gaming stats' });
    }
  });

  // Full data endpoint (for static export)
  app.get('/api/data', async (req, res) => {
    try {
      const data = await withTimeout(collectWebsiteData(), dataTimeoutMs);
      res.json(data);
    } catch (err) {
      console.error('[API] Failed to get data:', err);
      res.status(500).json({ error: 'Failed to get data' });
    }
  });

  // Now watching endpoint - returns current anime watching status from extension
  app.get('/api/now-watching', (req, res) => {
    try {
      if (getNowWatchingState) {
        const state = getNowWatchingState();
        res.json(state);
      } else {
        // Fallback if getter not set
        res.json({
          isWatching: false,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[API] Failed to get now watching state:', err);
      res.status(500).json({ error: 'Failed to get now watching state' });
    }
  });

  return app;
}

export function startApiServer(port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      console.log('[API] Server already running');
      resolve();
      return;
    }

    const allowedOrigins = [
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
    ];
    const app = createApiServer(allowedOrigins);
    
    server = app.listen(port, host, () => {
      console.log(`[API] Server started on ${host}:${port}`);
      resolve();
    });

    server.on('error', (err: Error) => {
      console.error('[API] Server error:', err);
      reject(err);
    });
  });
}

export function stopApiServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) {
      console.log('[API] Server not running');
      resolve();
      return;
    }

    server.closeIdleConnections?.();
    server.close(() => {
      console.log('[API] Server stopped');
      server = null;
      rateLimitBuckets.clear();
      resolve();
    });
  });
}

export function isApiServerRunning(): boolean {
  return server !== null;
}
