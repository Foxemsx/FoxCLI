import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardDrive, RefreshCw, AlertCircle, Folder, Database, Gamepad2, Search, PieChart, AlertTriangle } from 'lucide-react';

type SteamDiskInfo = {
  drives: { drive: string; freeBytes: number; totalBytes: number }[];
  libraries: { drive: string; libraryPath: string; games: { appId: number; installDir?: string; sizeOnDiskBytes?: number }[] }[];
  updatedAt: number;
  error?: boolean;
  message?: string;
};

type SteamSettings = {
  apiKey: string;
  steamId: string;
};

async function fetchJson(url: string): Promise<any> {
  if (window.nexus?.fetchUrl) {
    return window.nexus.fetchUrl(url);
  }
  const res = await fetch(url);
  return res.json();
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let idx = 0;
  let v = bytes;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx++;
  }
  const digits = idx >= 3 ? 1 : 0;
  return `${v.toFixed(digits)} ${units[idx]}`;
}

const DRIVE_COLORS = [
  '#5865F2', '#3BA55D', '#ED4245', '#F0B132',
  '#9B59B6', '#E67E73', '#00ADB5', '#EB459E'
];

function StorageDistributionChart({ summary, formatBytes }: {
  summary: [string, { gameCount: number; totalSize: number; libraries: number }][];
  formatBytes: (bytes: number) => string;
}) {
  const totalStorage = summary.reduce((sum, [, data]) => sum + data.totalSize, 0);
  if (totalStorage === 0) return null;

  const size = 180;
  const center = size / 2;
  const radius = 70;
  const innerRadius = 40;

  let cumulativeAngle = -Math.PI / 2;
  const segments = summary.map(([drive, data], idx) => {
    const percentage = data.totalSize / totalStorage;
    const angle = percentage * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const x1Outer = center + radius * Math.cos(startAngle);
    const y1Outer = center + radius * Math.sin(startAngle);
    const x2Outer = center + radius * Math.cos(endAngle);
    const y2Outer = center + radius * Math.sin(endAngle);

    const x1Inner = center + innerRadius * Math.cos(endAngle);
    const y1Inner = center + innerRadius * Math.sin(endAngle);
    const x2Inner = center + innerRadius * Math.cos(startAngle);
    const y2Inner = center + innerRadius * Math.sin(startAngle);

    const pathData = [
      `M ${x1Outer} ${y1Outer}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
      `L ${x1Inner} ${y1Inner}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner}`,
      'Z'
    ].join(' ');

    return {
      drive,
      data,
      percentage,
      color: DRIVE_COLORS[idx % DRIVE_COLORS.length],
      pathData,
      idx
    };
  });

  const largestDrive = summary.reduce((max, curr) =>
    curr[1].totalSize > max[1].totalSize ? curr : max
  , summary[0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5 mb-6"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <PieChart size={18} style={{ color: 'var(--accent-primary)' }} />
        Storage Distribution
      </h3>
      <div className="flex flex-col md:flex-row items-center gap-8">
        <svg width={size} height={size} className="flex-shrink-0">
          <defs>
            <filter id="pieGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {segments.map((seg) => (
            <motion.path
              key={seg.drive}
              d={seg.pathData}
              fill={seg.color}
              stroke="var(--bg-primary)"
              strokeWidth={2}
              filter="url(#pieGlow)"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: seg.idx * 0.1, duration: 0.4, ease: 'easeOut' }}
              style={{ transformOrigin: 'center' }}
            />
          ))}
          <text
            x={center}
            y={center - 8}
            textAnchor="middle"
            style={{ fill: 'var(--text-primary)', fontSize: '14px', fontWeight: 'bold' }}
          >
            {formatBytes(totalStorage)}
          </text>
          <text
            x={center}
            y={center + 10}
            textAnchor="middle"
            style={{ fill: 'var(--text-muted)', fontSize: '10px' }}
          >
            Total
          </text>
        </svg>

        <div className="flex-1 space-y-3">
          {segments.map((seg) => (
            <motion.div
              key={seg.drive}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: seg.idx * 0.1 }}
              className="flex items-center gap-3"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {seg.drive}
                    {seg.drive === largestDrive[0] && (
                      <span
                        className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${seg.color}20`, color: seg.color }}
                      >
                        Largest
                      </span>
                    )}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {formatBytes(seg.data.totalSize)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  <span>{seg.data.gameCount} games</span>
                  <span>{(seg.percentage * 100).toFixed(1)}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function SteamDisks() {
  const [data, setData] = useState<SteamDiskInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nameByAppId, setNameByAppId] = useState<Map<number, string>>(new Map());
  const [steamSettings, setSteamSettings] = useState<SteamSettings>({ apiKey: '', steamId: '' });

  const load = async () => {
    if (!window.nexus?.getSteamDiskInfo) {
      setError('Disk view is unavailable: IPC bridge not ready.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await window.nexus.getSteamDiskInfo();
      if (result?.error) {
        setError(result.message || 'Failed to load disk info');
        setData(null);
      } else {
        setData(result);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load disk info');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (window.nexus?.getSettings) {
          const s = await window.nexus.getSettings();
          const apiKey = (s as any)?.steamApiKey || '';
          const steamId = (s as any)?.steamId || '';
          if (apiKey && steamId) {
            setSteamSettings({ apiKey, steamId });
            return;
          }
        }
      } catch {
      }

      try {
        const raw = localStorage.getItem('foxcli-steam-settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          const apiKey = parsed?.apiKey || '';
          const steamId = parsed?.steamId || '';
          if (apiKey && steamId) setSteamSettings({ apiKey, steamId });
        }
      } catch {
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const loadNames = async () => {
      if (!steamSettings.apiKey || !steamSettings.steamId) return;
      try {
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${steamSettings.apiKey}&steamid=${steamSettings.steamId}&include_appinfo=true&include_played_free_games=true&format=json`;
        const res = await fetchJson(url);
        const games = res?.response?.games;
        if (!Array.isArray(games)) return;
        const map = new Map<number, string>();
        for (const g of games) {
          const id = Number(g?.appid);
          const name = String(g?.name || '');
          if (Number.isFinite(id) && name) map.set(id, name);
        }
        setNameByAppId(map);
      } catch {
      }
    };
    loadNames();
  }, [steamSettings.apiKey, steamSettings.steamId]);

  useEffect(() => {
    load();
  }, []);

  const driveMap = useMemo(() => {
    const map = new Map<string, { freeBytes: number; totalBytes: number }>();
    for (const d of data?.drives || []) {
      map.set(d.drive.toUpperCase(), { freeBytes: d.freeBytes, totalBytes: d.totalBytes });
    }
    return map;
  }, [data]);

  const filteredLibraries = useMemo(() => {
    if (!data) return [] as SteamDiskInfo['libraries'];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.libraries;

    return data.libraries
      .map((lib) => {
        const games = lib.games.filter((g) => {
          const installDir = (g.installDir || '').toLowerCase();
          return installDir.includes(q) || String(g.appId).includes(q) || lib.libraryPath.toLowerCase().includes(q);
        });
        return { ...lib, games };
      })
      .filter((lib) => lib.games.length > 0);
  }, [data, searchQuery]);

  const summary = useMemo(() => {
    const libs = filteredLibraries;
    const byDrive = new Map<string, { gameCount: number; totalSize: number; libraries: number }>();

    for (const lib of libs) {
      const key = lib.drive.toUpperCase();
      const current = byDrive.get(key) || { gameCount: 0, totalSize: 0, libraries: 0 };
      current.libraries += 1;
      for (const g of lib.games) {
        current.gameCount += 1;
        current.totalSize += g.sizeOnDiskBytes || 0;
      }
      byDrive.set(key, current);
    }

    return Array.from(byDrive.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredLibraries]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a, #334155)' }}>
                <HardDrive size={20} className="text-white" />
              </div>
              Steam Disks
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Installed games grouped by Steam library & drive
            </p>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={load}
              disabled={isLoading}
              className="p-2.5 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Refresh disk info"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} style={{ color: 'var(--text-muted)' }} />
            </motion.button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by folder/appid..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--bg-elevated)' }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pt-2">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: '#ED424515', border: '1px solid #ED424540' }}>
                <AlertCircle size={20} style={{ color: '#ED4245' }} />
                <span className="text-sm flex-1" style={{ color: '#ED4245' }}>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drive Space Alerts */}
        {data && summary.map(([drive]) => {
          const driveStats = driveMap.get(drive);
          if (!driveStats) return null;
          const usedPct = ((driveStats.totalBytes - driveStats.freeBytes) / driveStats.totalBytes) * 100;
          if (usedPct < 70) return null;

          const isCritical = usedPct >= 85;
          return (
            <motion.div
              key={`alert-${drive}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-xl flex items-center gap-3"
              style={{
                backgroundColor: isCritical ? '#ED424515' : '#F0B13215',
                border: `1px solid ${isCritical ? '#ED424540' : '#F0B13240'}`
              }}
            >
              <AlertTriangle size={20} style={{ color: isCritical ? '#ED4245' : '#F0B132' }} />
              <div>
                <span className="font-medium" style={{ color: isCritical ? '#ED4245' : '#F0B132' }}>
                  {drive} is {isCritical ? 'critically' : 'nearly'} full ({usedPct.toFixed(0)}%)
                </span>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Consider moving or uninstalling games to free up space.
                </p>
              </div>
            </motion.div>
          );
        })}

        {isLoading && !data ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <HardDrive size={48} style={{ color: 'var(--accent-primary)' }} />
            </motion.div>
            <span style={{ color: 'var(--text-muted)' }}>Scanning Steam libraries...</span>
          </div>
        ) : !data ? (
          <div className="text-center py-16">
            <HardDrive size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No disk data yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Click refresh to scan your Steam libraries.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {summary.length > 0 && (
              <StorageDistributionChart summary={summary} formatBytes={formatBytes} />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {summary.map(([drive, s], idx) => {
                const driveStats = driveMap.get(drive);
                const usedBytes = driveStats ? Math.max(0, driveStats.totalBytes - driveStats.freeBytes) : 0;
                const usedPct = driveStats && driveStats.totalBytes > 0 ? Math.round((usedBytes / driveStats.totalBytes) * 100) : 0;
                const progressColor = usedPct >= 85 ? '#ED4245' : usedPct >= 70 ? '#F0B132' : 'var(--accent-primary)';

                return (
                  <motion.div
                    key={drive}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="rounded-xl p-5"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Drive</p>
                        <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{drive}</p>
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{s.libraries} libraries • {s.gameCount} games</p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        <Database size={22} />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                        <span>Installed size</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{formatBytes(s.totalSize)}</span>
                      </div>
                      {driveStats && (
                        <>
                          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                            <span>Free</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{formatBytes(driveStats.freeBytes)} / {formatBytes(driveStats.totalBytes)}</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                            <div className="h-full" style={{ width: `${usedPct}%`, backgroundColor: progressColor }} />
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="space-y-4">
              {filteredLibraries.map((lib, idx) => {
                const totalSize = lib.games.reduce((sum, g) => sum + (g.sizeOnDiskBytes || 0), 0);
                return (
                  <motion.div
                    key={`${lib.drive}-${lib.libraryPath}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="rounded-xl overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div className="p-5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <Folder size={18} style={{ color: 'var(--accent-primary)' }} />
                          <span className="truncate">{lib.libraryPath}</span>
                        </h3>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {lib.drive} • {lib.games.length} games • {formatBytes(totalSize)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        <Gamepad2 size={22} />
                      </div>
                    </div>

                    <div className="px-5 pb-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {lib.games
                          .slice()
                          .sort((a, b) => (b.sizeOnDiskBytes || 0) - (a.sizeOnDiskBytes || 0))
                          .slice(0, 60)
                          .map((g) => (
                            <div
                              key={`${lib.libraryPath}-${g.appId}`}
                              className="p-3 rounded-lg"
                              style={{ backgroundColor: 'var(--bg-primary)' }}
                              title={g.installDir || String(g.appId)}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                    {nameByAppId.get(g.appId) || g.installDir || `App ${g.appId}`}
                                  </p>
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>appid {g.appId}</p>
                                </div>
                                <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                  {formatBytes(g.sizeOnDiskBytes || 0)}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>

                      {lib.games.length > 60 && (
                        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                          Showing top 60 by size. Use search to find specific installs.
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
