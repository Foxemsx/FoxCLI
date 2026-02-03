import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import { websiteSettingsStore, malCredentialsStore, settingsStore } from './store';

// Tier list storage keys (same as in SFTierList.tsx and AnimeTierList.tsx)
const SF_TIERLIST_KEY = 'foxcli-sf-tierlist';
const TOP10_STORAGE_KEY = 'foxcli-anime-tierlist';

export interface WebsiteData {
  lastUpdated: string;
  profile: {
    displayName: string;
    bio: string;
    avatar: string;
    socials: {
      discord?: string;
      twitter?: string;
      mal?: string;
      github?: string;
    };
  };
  anime: {
    stats: {
      userStats: {
        username: string;
        total_anime: number;
        completed: number;
        watching: number;
        plan_to_watch: number;
        on_hold: number;
        dropped: number;
        total_episodes: number;
        days_watched: number;
        mean_score: number;
      } | null;
      genres: { name: string; count: number; percentage: number }[];
      scores: { score: number; count: number }[];
      seasonalStats: {
        season: string;
        year: number;
        count: number;
        avgScore: number;
        color: string;
        emoji: string;
        topAnime: {
          id: number;
          title: string;
          image: string;
          score: number;
        }[];
      }[];
      lengthStats: {
        category: string;
        range: string;
        count: number;
        percentage: number;
        avgScore: number;
        color: string;
        description: string;
      }[];
    } | null;
    top10: {
      id: number;
      title: string;
      image: string;
      score: number;
    }[];
    tiers: {
      name: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
      color: string;
      items: {
        id: number;
        title: string;
        image: string;
        score: number;
      }[];
    }[];
  };
  gaming: {
    stats: {
      totalPlaytime: number;
      totalGames: number;
      mostPlayed: {
        id: number;
        title: string;
        image: string;
        playtime: number;
        lastPlayed?: string;
      }[];
      games: {
        id: number;
        title: string;
        image: string;
        playtime: number;
        lastPlayed?: string;
      }[];
    } | null;
  };
}

async function fetchMalStats(): Promise<WebsiteData['anime']['stats']> {
  try {
    const accessToken = malCredentialsStore.get('accessToken');
    const username = malCredentialsStore.get('username');
    
    if (!accessToken || !username) {
      console.log('[DataExporter] No MAL credentials, skipping stats');
      return null;
    }

    console.log('[DataExporter] Fetching MAL user stats...');

    // Fetch user stats from MAL API
    const response = await fetch('https://api.myanimelist.net/v2/users/@me?fields=anime_statistics', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`MAL API error: ${response.status}`);
    }

    const data = await response.json();
    const stats = data.anime_statistics;
    console.log(`[DataExporter] Got stats: ${stats.num_items} anime, ${stats.num_days_watched.toFixed(1)} days`);

    // Fetch user's anime list to build score distribution, genres, seasonal stats, and length stats
    console.log('[DataExporter] Fetching anime list for detailed stats...');
    const listResponse = await fetch('https://api.myanimelist.net/v2/users/@me/animelist?fields=list_status,genres,num_episodes,start_date,main_picture&limit=1000', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    let scores = Array.from({ length: 10 }, (_, i) => ({ score: i + 1, count: 0 }));
    let genreCounts = new Map<string, number>();
    let seasonalCounts = new Map<string, { count: number; scores: number[]; anime: any[] }>();
    let lengthCounts = new Map<string, { count: number; scores: number[]; range: string; color: string; description: string }>();

    if (listResponse.ok) {
      const listData = await listResponse.json();
      const animeList = listData.data || [];
      console.log(`[DataExporter] Processing ${animeList.length} anime for stats`);

      // Build score distribution, count genres, seasonal stats, and length stats from actual data
      for (const item of animeList) {
        const score = item.list_status?.score || 0;
        if (score > 0 && score <= 10) {
          scores[score - 1]!.count++;
        }

        // Count genres from each anime
        if (item.node?.genres) {
          for (const genre of item.node.genres) {
            const existing = genreCounts.get(genre.name) || 0;
            genreCounts.set(genre.name, existing + 1);
          }
        }

        // Track seasonal stats based on start date
        if (item.node?.start_date) {
          const startDate = new Date(item.node.start_date);
          const year = startDate.getFullYear();
          const month = startDate.getMonth();
          let season: string;
          let emoji: string;
          let color: string;
          
          if (month >= 0 && month <= 2) {
            season = 'Winter';
            emoji = '❄️';
            color = '#5865F2';
          } else if (month >= 3 && month <= 5) {
            season = 'Spring';
            emoji = '🌸';
            color = '#3BA55D';
          } else if (month >= 6 && month <= 8) {
            season = 'Summer';
            emoji = '☀️';
            color = '#F0B132';
          } else {
            season = 'Fall';
            emoji = '🍂';
            color = '#ED4245';
          }
          
          const key = `${season}-${year}`;
          const existing = seasonalCounts.get(key) || { count: 0, scores: [], anime: [] };
          existing.count++;
          if (score > 0) existing.scores.push(score);
          existing.anime.push({
            id: item.node.id,
            title: item.node.title,
            image: item.node.main_picture?.large || item.node.main_picture?.medium || '',
            score: score,
          });
          seasonalCounts.set(key, existing);
          
          // Debug log for suspicious dates
          if (year > 2026) {
            console.log(`[DataExporter] Future date detected: ${item.node.title} - ${item.node.start_date} (${season} ${year})`);
          }
        }

        // Track length stats based on episode count
        const episodes = item.node?.num_episodes || 0;
        if (episodes > 0) {
          let category: string;
          let range: string;
          let color: string;
          let description: string;
          
          if (episodes <= 12) {
            category = 'Short';
            range = '1-12 eps';
            color = '#3BA55D';
            description = 'Quick binges';
          } else if (episodes <= 26) {
            category = 'Standard';
            range = '13-26 eps';
            color = '#5865F2';
            description = 'Perfect balance';
          } else if (episodes <= 50) {
            category = 'Long';
            range = '27-50 eps';
            color = '#F0B132';
            description = 'Deep stories';
          } else {
            category = 'Epic';
            range = '50+ eps';
            color = '#EB459E';
            description = 'Marathon worthy';
          }
          
          const existing = lengthCounts.get(category);
          if (existing) {
            existing.count++;
            if (score > 0) existing.scores.push(score);
          } else {
            lengthCounts.set(category, { 
              count: 1, 
              scores: score > 0 ? [score] : [], 
              range, 
              color, 
              description 
            });
          }
        }
      }
    }

    // Calculate genre percentages and build sorted array
    const totalAnime = genreCounts.size > 0 ? Array.from(genreCounts.values()).reduce((sum, count) => sum + count, 0) : 0;
    const genreArray: { name: string; count: number; percentage: number }[] = Array.from(genreCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalAnime > 0 ? Math.round((count / totalAnime) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Build seasonal stats array
    type SeasonalStat = {
      season: string;
      year: number;
      count: number;
      avgScore: number;
      color: string;
      emoji: string;
      topAnime: { id: number; title: string; image: string; score: number }[];
    };
    
    const seasonalStatsArray: SeasonalStat[] = Array.from(seasonalCounts.entries())
      .map(([key, data]) => {
        const parts = key.split('-');
        const season = parts[0] || 'Unknown';
        const yearStr = parts[1] || '0';
        const year = parseInt(yearStr);
        const avgScore = data.scores.length > 0 
          ? Number((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1))
          : 0;
        
        // Get emoji and color based on season
        let emoji = '📺';
        let color = '#5865F2';
        if (season === 'Winter') { emoji = '❄️'; color = '#5865F2'; }
        else if (season === 'Spring') { emoji = '🌸'; color = '#3BA55D'; }
        else if (season === 'Summer') { emoji = '☀️'; color = '#F0B132'; }
        else if (season === 'Fall') { emoji = '🍂'; color = '#ED4245'; }
        
        // Sort anime by score (highest first, but include all even if score is 0)
        const topAnime = data.anime
          .sort((a: any, b: any) => {
            // If both have scores, sort by score desc
            if (a.score > 0 && b.score > 0) return b.score - a.score;
            // If only one has score, it comes first
            if (a.score > 0) return -1;
            if (b.score > 0) return 1;
            // If neither has score, sort by title
            return a.title.localeCompare(b.title);
          })
          .slice(0, 3);
        
        return {
          season,
          year,
          count: data.count,
          avgScore,
          color,
          emoji,
          topAnime,
        };
      })
      .sort((a, b) => b.year - a.year || 
        ['Winter', 'Spring', 'Summer', 'Fall'].indexOf(a.season) - ['Winter', 'Spring', 'Summer', 'Fall'].indexOf(b.season));

    // Build length stats array
    type LengthStat = {
      category: string;
      range: string;
      count: number;
      percentage: number;
      avgScore: number;
      color: string;
      description: string;
    };
    
    const lengthCategories: LengthStat[] = [
      { category: 'Short', range: '1-12 eps', color: '#3BA55D', description: 'Quick binges', count: 0, percentage: 0, avgScore: 0 },
      { category: 'Standard', range: '13-26 eps', color: '#5865F2', description: 'Perfect balance', count: 0, percentage: 0, avgScore: 0 },
      { category: 'Long', range: '27-50 eps', color: '#F0B132', description: 'Deep stories', count: 0, percentage: 0, avgScore: 0 },
      { category: 'Epic', range: '50+ eps', color: '#EB459E', description: 'Marathon worthy', count: 0, percentage: 0, avgScore: 0 },
    ];

    const totalCompletedAnime = Array.from(lengthCounts.values()).reduce((sum, data) => sum + data.count, 0);
    const lengthStatsArray: LengthStat[] = lengthCategories
      .map(({ category, range, color, description }) => {
        const data = lengthCounts.get(category);
        const count = data?.count || 0;
        const scores = data?.scores || [];
        const avgScore = scores.length > 0
          ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
          : 0;
        const percentage = totalCompletedAnime > 0
          ? Number(((count / totalCompletedAnime) * 100).toFixed(1))
          : 0;
        
        return {
          category,
          range,
          count,
          percentage,
          avgScore,
          color,
          description,
        };
      });

    console.log(`[DataExporter] Found ${genreArray.length} genres, ${seasonalStatsArray.length} seasons, ${lengthStatsArray.length} length categories`);
    console.log(`[DataExporter] Top season: ${seasonalStatsArray[0]?.season} ${seasonalStatsArray[0]?.year} (${seasonalStatsArray[0]?.count} anime)`);
    console.log(`[DataExporter] Top length: ${lengthStatsArray[0]?.category} (${lengthStatsArray[0]?.count} anime)`);

    console.log('[DataExporter] MAL stats ready');
    return {
      userStats: {
        username,
        total_anime: stats.num_items || 0,
        completed: stats.num_items_completed || 0,
        watching: stats.num_items_watching || 0,
        plan_to_watch: stats.num_items_plan_to_watch || 0,
        on_hold: stats.num_items_on_hold || 0,
        dropped: stats.num_items_dropped || 0,
        total_episodes: stats.num_episodes || 0,
        days_watched: stats.num_days_watched || 0,
        mean_score: stats.mean_score || 0,
      },
      genres: genreArray,
      scores,
      seasonalStats: seasonalStatsArray,
      lengthStats: lengthStatsArray,
    };
  } catch (err) {
    console.error('[DataExporter] Failed to fetch MAL stats:', err);
    return null;
  }
}

function getStoredTierLists(): { tiers: WebsiteData['anime']['tiers']; top10: WebsiteData['anime']['top10'] } {
  try {
    const userDataPath = app.getPath('userData');
    const tierListPath = path.join(userDataPath, 'tier-lists.json');

    // Read from persistent tier list file
    if (fs.existsSync(tierListPath)) {
      let data: any = null;
      try {
        data = JSON.parse(fs.readFileSync(tierListPath, 'utf-8'));
      } catch {
        console.error('[DataExporter] tier-lists.json is invalid');
        data = null;
      }
      if (data) {
        const tiers = data.sfTiers || [];
        const top10 = data.top10 || [];
      
      // Check if we have actual data (not just empty structure)
      const hasTierData = tiers.some((tier: any) => tier.items && tier.items.length > 0);
      const hasTop10Data = top10.length > 0;
      
        if (hasTierData || hasTop10Data) {
          console.log('[DataExporter] Loaded tier lists from tier-lists.json');
          return { tiers, top10 };
        }
      }
      
      // If tier-lists.json exists but is empty, fall through to localStorage fallback
      console.log('[DataExporter] tier-lists.json is empty, checking localStorage fallback...');
    }

    // Fallback: Try to read from localStorage files (Chromium's LevelDB storage)
    // Electron stores localStorage in: %APPDATA%/FoxCLI/Local Storage/leveldb/
    const localStoragePath = path.join(userDataPath, 'Local Storage', 'leveldb');
    
    if (fs.existsSync(localStoragePath)) {
      try {
        // Read the Local Storage LevelDB files
        // The actual data is stored in .ldb files, but we can try to extract it
        const lsData = readLocalStorageTierData(localStoragePath);
        if (lsData && (lsData.tiers.some((t: any) => t.items.length > 0) || lsData.top10.length > 0)) {
          console.log('[DataExporter] Loaded tier lists from localStorage fallback');
          // Sync to tier-lists.json for future exports
          fs.writeFileSync(tierListPath, JSON.stringify({
            sfTiers: lsData.tiers,
            top10: lsData.top10,
            lastUpdated: new Date().toISOString(),
          }, null, 2));
          console.log('[DataExporter] Synced localStorage data to tier-lists.json');
          return lsData;
        }
      } catch (lsErr) {
        console.error('[DataExporter] Failed to read localStorage:', lsErr);
      }
    }

    // Final fallback - empty tier structure
    console.log('[DataExporter] No tier data found, returning empty structure');
    const emptyTiers = [
      { name: 'S+' as const, color: '#FFD700', items: [] },
      { name: 'S' as const, color: '#FF6B6B', items: [] },
      { name: 'A' as const, color: '#FF9F43', items: [] },
      { name: 'B' as const, color: '#FECA57', items: [] },
      { name: 'C' as const, color: '#48DBFB', items: [] },
      { name: 'D' as const, color: '#1DD1A1', items: [] },
      { name: 'E' as const, color: '#5F27CD', items: [] },
      { name: 'F' as const, color: '#576574', items: [] },
    ];

    return { tiers: emptyTiers, top10: [] };
  } catch (err) {
    console.error('[DataExporter] Failed to get tier lists:', err);
    return {
      tiers: [
        { name: 'S+' as const, color: '#FFD700', items: [] },
        { name: 'S' as const, color: '#FF6B6B', items: [] },
        { name: 'A' as const, color: '#FF9F43', items: [] },
        { name: 'B' as const, color: '#FECA57', items: [] },
        { name: 'C' as const, color: '#48DBFB', items: [] },
        { name: 'D' as const, color: '#1DD1A1', items: [] },
        { name: 'E' as const, color: '#5F27CD', items: [] },
        { name: 'F' as const, color: '#576574', items: [] },
      ],
      top10: []
    };
  }
}

// Helper function to read tier data from Chromium's LevelDB localStorage
function readLocalStorageTierData(localStoragePath: string): { tiers: WebsiteData['anime']['tiers']; top10: WebsiteData['anime']['top10'] } | null {
  try {
    // Chromium LevelDB files have .ldb extension
    const files = fs.readdirSync(localStoragePath).filter(f => f.endsWith('.ldb'));
    
    // Read all .ldb files and search for our keys
    let sfTierData: any = null;
    let top10Data: any = null;
    
    for (const file of files) {
      try {
        const filePath = path.join(localStoragePath, file);
        const content = fs.readFileSync(filePath);
        const contentStr = content.toString('utf-8');
        
        // Look for foxcli-sf-tierlist key
        if (contentStr.includes('foxcli-sf-tierlist')) {
          // Try to extract the JSON data after the key
          const match = contentStr.match(/foxcli-sf-tierlist[^[{]*([\[{].*?[\]}])/);
          if (match && match[1]) {
            try {
              sfTierData = JSON.parse(match[1]);
            } catch (err) {
              console.warn('[DataExporter] Failed to parse SFTierList data');
            }
          }
        }
        
        // Look for foxcli-anime-tierlist key
        if (contentStr.includes('foxcli-anime-tierlist')) {
          const match = contentStr.match(/foxcli-anime-tierlist[^[{]*([\[{].*?[\]}])/);
          if (match && match[1]) {
            try {
              top10Data = JSON.parse(match[1]);
            } catch (err) {
              console.warn('[DataExporter] Failed to parse top10 data');
            }
          }
        }
      } catch (err) {
        console.warn('[DataExporter] Failed to read localStorage file');
      }
    }
    
    // If we found data, format it properly
    if (sfTierData || top10Data) {
      // Map the data to the expected format (strip status field if present)
      const tiers = (sfTierData || []).map((tier: any) => ({
        name: tier.name,
        color: tier.color,
        items: (tier.items || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          image: item.image,
          score: item.score,
        })),
      }));
      
      const top10 = (top10Data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        image: item.image,
        score: item.score,
      }));
      
      return { tiers, top10 };
    }
    
    return null;
  } catch (err) {
    console.error('[DataExporter] Error reading localStorage:', err);
    return null;
  }
}

async function getGamingStats(): Promise<WebsiteData['gaming']['stats']> {
  try {
    const steamApiKey = settingsStore.get('steamApiKey') as string | undefined;
    const steamId = settingsStore.get('steamId') as string | undefined;

    if (!steamApiKey || !steamId) {
      console.log('[DataExporter] Gaming stats skipped - missing credentials:');
      console.log('[DataExporter]   - Steam API Key:', steamApiKey ? 'Set' : 'Not set');
      console.log('[DataExporter]   - Steam ID:', steamId ? 'Set' : 'Not set');
      console.log('[DataExporter] Configure Steam credentials in Settings > Steam & Sales to enable gaming stats');
      return null;
    }

    // Fetch owned games from Steam API
    console.log('[DataExporter] Fetching Steam games...');
    const response = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`
    );

    if (!response.ok) {
      console.error(`[DataExporter] Steam API error: ${response.status} ${response.statusText}`);
      throw new Error(`Steam API error: ${response.status}`);
    }

    const data = await response.json();
    const games = data.response?.games || [];
    console.log(`[DataExporter] Got ${games.length} games from Steam`);

    // Calculate total playtime
    const totalPlaytime = games.reduce((sum: number, game: any) => sum + (game.playtime_forever || 0), 0);

    // Get all games with playtime > 0
    const allGames = games
      .filter((game: any) => game.playtime_forever > 0)
      .sort((a: any, b: any) => b.playtime_forever - a.playtime_forever)
      .map((game: any) => ({
        id: game.appid,
        title: game.name,
        image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
        playtime: game.playtime_forever,
        lastPlayed: game.rtime_last_played ? new Date(game.rtime_last_played * 1000).toISOString() : undefined,
      }));

    // Get most played games (top 6)
    const mostPlayed = allGames.slice(0, 6);

    return {
      totalPlaytime,
      totalGames: games.length,
      mostPlayed,
      games: allGames,
    };
  } catch (err) {
    console.error('[DataExporter] Failed to get gaming stats:', err);
    return null;
  }
}

export async function collectWebsiteData(): Promise<WebsiteData> {
  const settings = websiteSettingsStore.getAll();
  const { tiers, top10 } = getStoredTierLists();

  return {
    lastUpdated: new Date().toISOString(),
    profile: {
      displayName: settings.displayName,
      bio: settings.bio,
      avatar: settings.avatar,
      socials: settings.socials,
    },
    anime: {
      stats: await fetchMalStats(),
      top10,
      tiers,
    },
    gaming: {
      stats: await getGamingStats(),
    },
  };
}

export async function exportWebsiteData(): Promise<string> {
  try {
    const data = await collectWebsiteData();
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, 'website-data.json');
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('[DataExporter] Website data exported to:', filePath);
    
    return filePath;
  } catch (err) {
    console.error('[DataExporter] Failed to export website data:', err);
    throw err;
  }
}
