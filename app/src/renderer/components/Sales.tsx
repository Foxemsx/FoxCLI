import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tag, Search, ExternalLink, RefreshCw, Heart, ShoppingCart,
  TrendingDown, Star, AlertCircle, ChevronDown, X,
  DollarSign, Info, Loader2, Award
} from 'lucide-react';
import { FaSteam } from 'react-icons/fa';

interface GameDeal {
  id: string;
  title: string;
  steamAppId?: number;
  thumb: string;
  normalPrice: number;
  salePrice: number;
  savings: number;
  metacriticScore?: number;
  steamRatingPercent?: number;
  dealRating?: number;
  stores: StoreDeal[];
  ggDealsUrl?: string; // URL to GG.deals game page for scraping individual keyshop prices
}

interface StoreDeal {
  store: string;
  storeName: string;
  price: number;
  originalPrice: number;
  discount: number;
  url: string;
  isVerified: boolean; // True = from CheapShark API, False = search link only
}

interface WishlistGame {
  appid: number;
  name: string;
  capsule: string;
  added: number;
  priority: number;
  deals?: StoreDeal[];
  isLoading?: boolean;
}

type Tab = 'search' | 'wishlist';

// Store reputation tiers for deal scoring
const STORE_REPUTATION: Record<string, number> = {
  // Official stores - highest trust
  'Steam': 1.0,
  'GOG': 1.0,
  'Epic Games': 1.0,
  'Humble Store': 0.95,
  'GreenManGaming': 0.9,
  'Fanatical': 0.9,
  // Key resellers - lower trust
  'Eneba': 0.7,
  'Loaded.com': 0.7,
  'ggdeals-keyshop': 0.65,
  'Keyshops (GG.deals)': 0.65,
};

type DealTier = 'S' | 'A' | 'B' | 'C' | 'D';

interface DealScore {
  score: number; // 0-100
  tier: DealTier;
  label: string;
}

// Calculate deal score combining discount, rating, and store reputation
function calculateDealScore(deal: GameDeal): DealScore {
  // Get best verified deal for scoring
  const verifiedDeals = deal.stores.filter(s => s.isVerified);
  if (verifiedDeals.length === 0) {
    return { score: 0, tier: 'D', label: 'No Price' };
  }
  
  const bestDeal = verifiedDeals.reduce((best, curr) => 
    curr.price < best.price ? curr : best, verifiedDeals[0]);
  
  // Factor 1: Discount percentage (40% weight)
  const discountScore = Math.min(bestDeal.discount / 90, 1) * 40; // Cap at 90% discount
  
  // Factor 2: CheapShark deal rating or calculated value (30% weight)
  let ratingScore = 0;
  if (deal.dealRating !== undefined && deal.dealRating !== null) {
    ratingScore = (deal.dealRating / 10) * 30;
  } else {
    // Fallback: calculate from metacritic + steam rating
    const qualityScore = ((deal.metacriticScore || 0) / 100 + (deal.steamRatingPercent || 0) / 100) / 2;
    ratingScore = qualityScore * 30;
  }
  
  // Factor 3: Store reputation (30% weight)
  const storeRep = STORE_REPUTATION[bestDeal.storeName] ?? 0.5;
  const storeScore = storeRep * 30;
  
  const totalScore = Math.round(discountScore + ratingScore + storeScore);
  
  // Determine tier
  let tier: DealTier;
  let label: string;
  if (totalScore >= 85) {
    tier = 'S';
    label = 'Exceptional';
  } else if (totalScore >= 70) {
    tier = 'A';
    label = 'Great Deal';
  } else if (totalScore >= 55) {
    tier = 'B';
    label = 'Good Deal';
  } else if (totalScore >= 40) {
    tier = 'C';
    label = 'Okay';
  } else {
    tier = 'D';
    label = 'Poor Value';
  }
  
  return { score: totalScore, tier, label };
}

// Tier color mapping
const TIER_COLORS: Record<DealTier, { bg: string; text: string; border: string }> = {
  S: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: 'rgba(234, 179, 8, 0.4)' },
  A: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.4)' },
  B: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.4)' },
  C: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.4)' },
  D: { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280', border: 'rgba(107, 114, 128, 0.4)' },
};

function DealScoreBadge({ deal }: { deal: GameDeal }) {
  const { score, tier, label } = calculateDealScore(deal);
  const colors = TIER_COLORS[tier];
  
  if (tier === 'D' && score === 0) return null;
  
  return (
    <div 
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold"
      style={{ 
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`
      }}
      title={`Deal Score: ${score}/100 - ${label}`}
    >
      <Award size={12} />
      <span>{tier}</span>
      <span className="opacity-70 font-medium">({score})</span>
    </div>
  );
}

const STORE_COLORS: Record<string, string> = {
  Steam: '#1b2838',
  GOG: '#86328a',
  'Humble Store': '#cc2929',
  'Epic Games': '#313131',
  'Fanatical': '#e44d26',
  'GreenManGaming': '#21b800',
  Eneba: '#ff6b00',
  'Loaded.com': '#00c853',
  'Keyshops (GG.deals)': '#9333ea',
  'ggdeals-keyshop': '#9333ea',
};

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function StoreTag({ deal }: { deal: StoreDeal }) {
  const color = STORE_COLORS[deal.storeName] || '#666666';
  
  return (
    <a
      href={deal.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105 group"
      style={{ 
        backgroundColor: `${color}15`,
        border: `1px solid ${color}30`
      }}
    >
      <span style={{ color }}>
        {deal.storeName === 'Steam' ? <FaSteam size={14} /> : <Tag size={14} />}
      </span>
      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
        {deal.storeName}
      </span>
      {deal.isVerified ? (
        <>
          <span className="font-bold text-sm" style={{ color: 'var(--status-online)' }}>
            {formatPrice(deal.price)}
          </span>
          {deal.discount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--status-online)', color: 'white' }}>
              -{deal.discount}%
            </span>
          )}
        </>
      ) : (
        <span className="text-xs flex items-center gap-1 group-hover:underline" style={{ color: 'var(--accent-primary)' }}>
          Check price <ExternalLink size={10} />
        </span>
      )}
    </a>
  );
}

function DealCard({ deal }: { deal: GameDeal }) {
  const verifiedDeals = deal.stores.filter(s => s.isVerified);
  const bestDeal = verifiedDeals.length > 0 
    ? verifiedDeals.reduce((best, curr) => curr.price < best.price ? curr : best, verifiedDeals[0])
    : null;

  const [showAllStores, setShowAllStores] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="flex gap-4 p-4">
        <img
          src={deal.thumb}
          alt={deal.title}
          className="w-36 h-20 object-cover rounded-lg flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {deal.title}
              </h3>
              <DealScoreBadge deal={deal} />
            </div>
            {deal.steamAppId && (
              <a
                href={`https://store.steampowered.com/app/${deal.steamAppId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
                title="View on Steam"
              >
                <FaSteam size={14} style={{ color: 'var(--text-muted)' }} />
              </a>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {deal.metacriticScore && deal.metacriticScore > 0 && (
              <span className="flex items-center gap-1">
                <Star size={11} />
                {deal.metacriticScore}
              </span>
            )}
            {deal.steamRatingPercent && deal.steamRatingPercent > 0 && (
              <span>{deal.steamRatingPercent}% positive</span>
            )}
          </div>

          {bestDeal && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-lg font-bold" style={{ color: 'var(--status-online)' }}>
                {formatPrice(bestDeal.price)}
              </span>
              {bestDeal.originalPrice > bestDeal.price && (
                <>
                  <span className="text-sm line-through" style={{ color: 'var(--text-muted)' }}>
                    {formatPrice(bestDeal.originalPrice)}
                  </span>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: 'var(--status-online)', color: 'white' }}
                  >
                    -{bestDeal.discount}%
                  </span>
                </>
              )}
              <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                on {bestDeal.storeName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Store prices */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setShowAllStores(!showAllStores)}
          className="flex items-center gap-2 text-xs mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>Compare {deal.stores.length} stores</span>
          <ChevronDown size={12} className={`transition-transform ${showAllStores ? 'rotate-180' : ''}`} />
        </button>
        
        <AnimatePresence>
          {showAllStores && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 mb-2">
                {deal.stores
                  .filter(s => s.isVerified)
                  .sort((a, b) => a.price - b.price)
                  .map((store, i) => (
                    <StoreTag key={i} deal={store} />
                  ))}
              </div>
              {deal.stores.some(s => !s.isVerified) && (
                <>
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Info size={10} /> Key resellers (prices may vary)
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deal.stores
                      .filter(s => !s.isVerified)
                      .map((store, i) => (
                        <StoreTag key={i} deal={store} />
                      ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {!showAllStores && bestDeal && (
          <div className="flex flex-wrap gap-2">
            <StoreTag deal={bestDeal} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function WishlistCard({ game, onRefresh }: { game: WishlistGame; onRefresh: () => void }) {
  const verifiedDeals = game.deals?.filter(d => d.isVerified) || [];
  const bestDeal = verifiedDeals.length > 0
    ? verifiedDeals.reduce((best, curr) => curr.price < best.price ? curr : best, verifiedDeals[0])
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 rounded-xl"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <img
        src={game.capsule || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
        alt={game.name}
        className="w-28 h-14 object-cover rounded-lg flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {game.name}
        </h3>
        {game.isLoading ? (
          <div className="flex items-center gap-2 mt-1">
            <Loader2 size={12} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Finding best price...</span>
          </div>
        ) : bestDeal ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold" style={{ color: 'var(--status-online)' }}>
              Best: {formatPrice(bestDeal.price)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              on {bestDeal.storeName}
            </span>
            {bestDeal.discount > 0 && (
              <span 
                className="px-1.5 py-0.5 rounded text-xs font-bold"
                style={{ backgroundColor: 'var(--status-online)', color: 'white' }}
              >
                -{bestDeal.discount}%
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No verified deals found</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {bestDeal && (
          <a
            href={bestDeal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            <ShoppingCart size={14} />
            Buy
          </a>
        )}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
          title="Refresh prices"
        >
          <RefreshCw size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </motion.div>
  );
}

// CheapShark store ID to name mapping
function getStoreName(storeId: string): string {
  const stores: Record<string, string> = {
    '1': 'Steam', '2': 'GamersGate', '3': 'GreenManGaming', '4': 'Amazon',
    '7': 'GOG', '8': 'Origin', '11': 'Humble Store', '13': 'Uplay',
    '15': 'Fanatical', '21': 'WinGameStore', '23': 'GameBillet',
    '24': 'Voidu', '25': 'Epic Games', '27': 'Gamesplanet', '30': 'IndieGala',
  };
  return stores[storeId] || 'Other';
}

interface AppSettings {
  steamApiKey: string;
  steamId: string;
  ggDealsApiKey: string;
  ggDealsRegion: string;
}

type SortOption = 'score' | 'discount' | 'price' | 'title';

export default function Sales() {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GameDeal[]>([]);
  const [wishlist, setWishlist] = useState<WishlistGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({ 
    steamApiKey: '', 
    steamId: '', 
    ggDealsApiKey: '',
    ggDealsRegion: 'us'
  });

  // Sort search results based on selected option
  const sortedResults = useMemo(() => {
    const sorted = [...searchResults];
    switch (sortBy) {
      case 'score':
        return sorted.sort((a, b) => calculateDealScore(b).score - calculateDealScore(a).score);
      case 'discount':
        return sorted.sort((a, b) => b.savings - a.savings);
      case 'price':
        return sorted.sort((a, b) => a.salePrice - b.salePrice);
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  }, [searchResults, sortBy]);

  // Load settings from persistent store
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.nexus?.getSettings?.();
        if (settings) {
          setAppSettings({
            steamApiKey: settings.steamApiKey || '',
            steamId: settings.steamId || '',
            ggDealsApiKey: settings.ggDealsApiKey || '',
            ggDealsRegion: settings.ggDealsRegion || 'us',
          });
        }
      } catch (e) {
        console.error('Failed to load app settings:', e);
      }
    };
    loadSettings();
  }, []);

  // Fetch keyshop prices from GG.deals API
  // Fetch keyshop prices from GG.deals API (returns best price + game URL for scraping)
  const fetchGGDealsPrices = async (steamAppIds: number[]): Promise<Map<number, { keyshopPrice: number; keyshopUrl: string; currency: string } | null>> => {
    const priceMap = new Map<number, { keyshopPrice: number; keyshopUrl: string; currency: string } | null>();
    
    if (!appSettings.ggDealsApiKey || !window.nexus?.getGGDealsPrice) {
      console.log('[GG.deals] Skipping API - no API key or IPC not available');
      return priceMap;
    }
    
    try {
      console.log('[GG.deals] Requesting prices for Steam App IDs:', steamAppIds);
      const result = await window.nexus.getGGDealsPrice({ steamAppIds });
      
      if (result.success && result.data) {
        for (const [appId, gameData] of Object.entries(result.data)) {
          if (gameData && gameData.prices?.currentKeyshops) {
            priceMap.set(parseInt(appId), {
              keyshopPrice: parseFloat(gameData.prices.currentKeyshops),
              keyshopUrl: gameData.url,
              currency: gameData.prices.currency,
            });
          } else {
            priceMap.set(parseInt(appId), null);
          }
        }
      } else {
        console.warn('[GG.deals] API error:', result.error);
      }
    } catch (err) {
      console.error('[GG.deals] API error:', err);
    }
    
    return priceMap;
  };

  // Background scrape key reseller prices and update search results (legacy fallback)
  const scrapeKeyResellerPrices = async (game: GameDeal) => {
    if (!window.nexus?.scrapePrice) return;
    
    const enebaUrl = `https://www.eneba.com/store/games?text=${encodeURIComponent(game.title)}&platforms[]=STEAM`;
    const loadedUrl = `https://loaded.com/search?q=${encodeURIComponent(game.title)}`;
    
    try {
      const [enebaResult, loadedResult] = await Promise.all([
        window.nexus.scrapePrice({ url: enebaUrl, store: 'eneba', gameName: game.title }),
        window.nexus.scrapePrice({ url: loadedUrl, store: 'loaded', gameName: game.title }),
      ]);
      
      setSearchResults(prev => prev.map(g => {
        if (g.id !== game.id) return g;
        
        const updatedStores = g.stores.map(store => {
          if (store.store === 'eneba' && !enebaResult.error && enebaResult.price) {
            return { ...store, price: enebaResult.price, originalPrice: enebaResult.price };
          }
          if (store.store === 'loaded' && !loadedResult.error && loadedResult.price) {
            return { ...store, price: loadedResult.price, originalPrice: loadedResult.price };
          }
          return store;
        });
        
        return { ...g, stores: updatedStores };
      }));
    } catch (err) {
      console.error('Failed to scrape key reseller prices:', err);
    }
  };

  // Search for game deals using CheapShark API + GG.deals for keyshops
  const searchDeals = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://www.cheapshark.com/api/1.0/deals?title=${encodeURIComponent(query)}&pageSize=20`
      );
      const data = await response.json();

      if (Array.isArray(data)) {
        // Group deals by game
        const gamesMap = new Map<string, GameDeal>();
        
        for (const deal of data) {
          const gameId = deal.steamAppID || deal.gameID;
          
          if (!gamesMap.has(gameId)) {
            gamesMap.set(gameId, {
              id: gameId,
              title: deal.title,
              steamAppId: deal.steamAppID ? parseInt(deal.steamAppID) : undefined,
              thumb: deal.thumb,
              normalPrice: parseFloat(deal.normalPrice),
              salePrice: parseFloat(deal.salePrice),
              savings: parseFloat(deal.savings),
              metacriticScore: deal.metacriticScore ? parseInt(deal.metacriticScore) : undefined,
              steamRatingPercent: deal.steamRatingPercent ? parseInt(deal.steamRatingPercent) : undefined,
              dealRating: deal.dealRating ? parseFloat(deal.dealRating) : undefined,
              stores: [],
            });
          }

          const game = gamesMap.get(gameId)!;
          game.stores.push({
            store: deal.storeID,
            storeName: getStoreName(deal.storeID),
            price: parseFloat(deal.salePrice),
            originalPrice: parseFloat(deal.normalPrice),
            discount: Math.round(parseFloat(deal.savings)),
            url: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
            isVerified: true, // CheapShark data is verified
          });
        }

        // Get Steam App IDs for GG.deals lookup
        const steamAppIds = Array.from(gamesMap.values())
          .filter(g => g.steamAppId)
          .map(g => g.steamAppId!);
        
        // Fetch keyshop prices from GG.deals if API key is configured
        let ggDealsPrices = new Map<number, { keyshopPrice: number; keyshopUrl: string; currency: string } | null>();
        if (appSettings.ggDealsApiKey && steamAppIds.length > 0) {
          ggDealsPrices = await fetchGGDealsPrices(steamAppIds);
        }

        // Add keyshop prices for each game
        const gamesWithKeyshops = Array.from(gamesMap.values()).map(game => {
          const stores = [...game.stores];
          
          // Check if we have GG.deals keyshop price for this game
          const ggPrice = game.steamAppId ? ggDealsPrices.get(game.steamAppId) : null;
          
          // Always add Eneba and Loaded search links for direct store access
          const enebaUrl = `https://www.eneba.com/store/games?text=${encodeURIComponent(game.title)}&platforms[]=STEAM`;
          const loadedUrl = `https://www.loaded.com/en/games/?q=${encodeURIComponent(game.title)}`;
          
          if (ggPrice) {
            // GG.deals provides the best keyshop price - show it as reference
            stores.push({
              store: 'ggdeals-keyshop',
              storeName: 'Best Keyshop (GG.deals)',
              price: ggPrice.keyshopPrice,
              originalPrice: ggPrice.keyshopPrice,
              discount: 0,
              url: ggPrice.keyshopUrl,
              isVerified: true,
            });
          }
          
          // Always add Eneba and Loaded links for users who want to check specific stores
          stores.push({
            store: 'eneba',
            storeName: 'Eneba',
            price: 0,
            originalPrice: 0,
            discount: 0,
            url: enebaUrl,
            isVerified: false,
          });
          
          stores.push({
            store: 'loaded',
            storeName: 'Loaded.com',
            price: 0,
            originalPrice: 0,
            discount: 0,
            url: loadedUrl,
            isVerified: false,
          });
          
          return { ...game, stores, ggDealsUrl: ggPrice?.keyshopUrl };
        });

        setSearchResults(gamesWithKeyshops);
        // Eneba and Loaded show "Check price" links - no scraping needed
      }
    } catch (err: any) {
      console.error('Deal search error:', err);
      setError(err.message || 'Failed to search for deals');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Steam wishlist via IPC to bypass CORS
  const loadWishlist = async () => {
    if (!appSettings.steamId) {
      setError('Steam ID not configured. Please set it up in Settings > Steam & Sales.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use IPC to fetch wishlist (bypasses CORS)
      const wishlistUrl = `https://store.steampowered.com/wishlist/profiles/${appSettings.steamId}/wishlistdata/?p=0`;
      
      let data;
      if (window.nexus?.fetchUrl) {
        const result = await window.nexus.fetchUrl(wishlistUrl);
        
        // Handle error response from IPC
        if (result?.error) {
          throw new Error(result.message || 'Failed to fetch wishlist');
        }
        
        data = result;
      } else {
        // Fallback direct fetch (may fail due to CORS)
        const response = await fetch(wishlistUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch wishlist. Make sure your Steam profile and wishlist are public.');
        }
        data = await response.json();
      }
      
      // Check for valid wishlist data (should be an object with appids as keys)
      if (data && typeof data === 'object' && !data.error && !data.html) {
        const entries = Object.entries(data).filter(([key]) => !isNaN(parseInt(key)));
        
        if (entries.length === 0) {
          throw new Error('Your wishlist is empty or your Steam profile/wishlist is private.');
        }
        
        const games: WishlistGame[] = entries.map(([appid, info]: [string, any]) => ({
          appid: parseInt(appid),
          name: info.name,
          capsule: info.capsule,
          added: info.added,
          priority: info.priority || 0,
          isLoading: true,
        }));

        setWishlist(games.sort((a, b) => a.priority - b.priority));

        // Fetch prices for each game (with delay to avoid rate limiting)
        for (let i = 0; i < games.length; i++) {
          if (i > 0) await new Promise(r => setTimeout(r, 150)); // Small delay between requests
          fetchGameDeals(games[i]);
        }
      } else {
        throw new Error('Your wishlist is empty or your Steam profile/wishlist is private.');
      }
    } catch (err: any) {
      console.error('Wishlist error:', err);
      setError(err.message || 'Failed to load wishlist');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGameDeals = async (game: WishlistGame) => {
    try {
      const response = await fetch(
        `https://www.cheapshark.com/api/1.0/deals?steamAppID=${game.appid}&pageSize=10`
      );
      const deals = await response.json();

      const storeDeal: StoreDeal[] = [];

      if (Array.isArray(deals) && deals.length > 0) {
        for (const deal of deals) {
          storeDeal.push({
            store: deal.storeID,
            storeName: getStoreName(deal.storeID),
            price: parseFloat(deal.salePrice),
            originalPrice: parseFloat(deal.normalPrice),
            discount: Math.round(parseFloat(deal.savings)),
            url: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
            isVerified: true,
          });
        }
      }

      // Use GG.deals API for keyshop prices if configured
      if (appSettings.ggDealsApiKey && window.nexus?.getGGDealsPrice) {
        try {
          const ggResult = await window.nexus.getGGDealsPrice({ steamAppIds: [game.appid] });
          if (ggResult.success && ggResult.data[game.appid.toString()]) {
            const ggData = ggResult.data[game.appid.toString()];
            if (ggData && ggData.prices.currentKeyshops) {
              storeDeal.push({
                store: 'ggdeals-keyshop',
                storeName: 'Keyshops (GG.deals)',
                price: parseFloat(ggData.prices.currentKeyshops),
                originalPrice: parseFloat(ggData.prices.currentKeyshops),
                discount: 0,
                url: ggData.url,
                isVerified: true,
              });
            }
          }
        } catch (err) {
          console.error('GG.deals fetch error for wishlist game:', err);
        }
      } else {
        // Fallback: Add Eneba search link
        const enebaUrl = `https://www.eneba.com/store/games?text=${encodeURIComponent(game.name)}&platforms[]=STEAM`;
        storeDeal.push({
          store: 'eneba',
          storeName: 'Eneba',
          price: 0,
          originalPrice: 0,
          discount: 0,
          url: enebaUrl,
          isVerified: false,
        });
      }

      setWishlist(prev => prev.map(g => 
        g.appid === game.appid 
          ? { ...g, deals: storeDeal, isLoading: false }
          : g
      ));
    } catch (err) {
      console.error(`Failed to fetch deals for ${game.name}:`, err);
      setWishlist(prev => prev.map(g => 
        g.appid === game.appid 
          ? { ...g, isLoading: false }
          : g
      ));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchDeals(searchQuery);
  };

  useEffect(() => {
    if (activeTab === 'wishlist' && wishlist.length === 0 && appSettings.steamId) {
      loadWishlist();
    }
  }, [activeTab, appSettings.steamId]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))' }}
              >
                <TrendingDown size={20} className="text-white" />
              </div>
              Game Sales
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Compare prices from verified stores via CheapShark
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('search')}
            className="px-4 py-2.5 rounded-xl font-medium text-sm transition-all"
            style={{ 
              backgroundColor: activeTab === 'search' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: activeTab === 'search' ? 'white' : 'var(--text-secondary)',
            }}
          >
            <div className="flex items-center gap-2">
              <Search size={16} />
              Search Games
            </div>
          </button>
          <button
            onClick={() => setActiveTab('wishlist')}
            className="px-4 py-2.5 rounded-xl font-medium text-sm transition-all"
            style={{ 
              backgroundColor: activeTab === 'wishlist' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: activeTab === 'wishlist' ? 'white' : 'var(--text-secondary)',
            }}
          >
            <div className="flex items-center gap-2">
              <Heart size={16} />
              Steam Wishlist
            </div>
          </button>
        </div>

        {/* Search form */}
        {activeTab === 'search' && (
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for a game..."
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)]"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)',
                  border: '1px solid var(--bg-elevated)'
                }}
              />
            </div>
            {/* Custom Sort Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all hover:opacity-80"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)',
                  border: '1px solid var(--bg-elevated)'
                }}
                title="Sort results"
              >
                {sortBy === 'score' && <Award size={16} style={{ color: '#FFD700' }} />}
                {sortBy === 'discount' && <TrendingDown size={16} style={{ color: '#3BA55D' }} />}
                {sortBy === 'price' && <DollarSign size={16} style={{ color: '#5865F2' }} />}
                {sortBy === 'title' && <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>AZ</span>}
                <span className="hidden sm:inline">
                  {sortBy === 'score' ? 'Best Score' : sortBy === 'discount' ? 'Highest Discount' : sortBy === 'price' ? 'Lowest Price' : 'Title A-Z'}
                </span>
                <ChevronDown size={14} className={`transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {sortDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-1 z-20 rounded-xl shadow-lg overflow-hidden min-w-[180px]"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-tertiary)' }}
                  >
                    {[
                      { value: 'score' as SortOption, label: 'Best Score', icon: Award, color: '#FFD700' },
                      { value: 'discount' as SortOption, label: 'Highest Discount', icon: TrendingDown, color: '#3BA55D' },
                      { value: 'price' as SortOption, label: 'Lowest Price', icon: DollarSign, color: '#5865F2' },
                      { value: 'title' as SortOption, label: 'Title A-Z', icon: null, color: 'var(--text-muted)' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => { setSortBy(option.value); setSortDropdownOpen(false); }}
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:opacity-80 transition-opacity ${sortBy === option.value ? 'font-medium' : ''}`}
                        style={{ 
                          backgroundColor: sortBy === option.value ? 'var(--accent-primary)20' : 'transparent',
                          color: sortBy === option.value ? 'var(--accent-primary)' : 'var(--text-primary)'
                        }}
                      >
                        {option.icon ? <option.icon size={16} style={{ color: option.color }} /> : <span className="w-4 text-center font-bold" style={{ color: option.color }}>AZ</span>}
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
            </motion.button>
          </form>
        )}
      </div>

      {/* Info banner */}
      <div className="mx-6 mb-4 p-3 rounded-xl flex items-start gap-3" style={{ backgroundColor: 'var(--accent-primary)10', border: '1px solid var(--accent-primary)30' }}>
        <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-primary)' }} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Prices shown are from <strong>CheapShark</strong> (verified official stores). Key reseller links (Eneba, Loaded) open search pages - check their sites for actual prices.
        </p>
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-6 mb-4"
          >
            <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: '#ED424515', border: '1px solid #ED424540' }}>
              <AlertCircle size={20} style={{ color: '#ED4245' }} />
              <span className="text-sm flex-1" style={{ color: '#ED4245' }}>{error}</span>
              <button onClick={() => setError(null)}>
                <X size={16} style={{ color: '#ED4245' }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 pt-0">
        {activeTab === 'search' && (
          <>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                  <Tag size={48} style={{ color: 'var(--accent-primary)' }} />
                </motion.div>
                <span style={{ color: 'var(--text-muted)' }}>Searching for deals...</span>
              </div>
            ) : sortedResults.length > 0 ? (
              <div className="grid gap-4">
                {sortedResults.map(deal => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-16">
                <Tag size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No deals found for "{searchQuery}"</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Try a different search term</p>
              </div>
            ) : (
              <div className="text-center py-16">
                <DollarSign size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Search for a game</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Find the best prices across multiple stores</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'wishlist' && (
          <>
            {!appSettings.steamId ? (
              <div className="text-center py-16">
                <Heart size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Steam Not Configured</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Please configure your Steam settings in the Settings → Steam & Sales section.
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                  <Heart size={48} style={{ color: 'var(--accent-primary)' }} />
                </motion.div>
                <span style={{ color: 'var(--text-muted)' }}>Loading your wishlist...</span>
              </div>
            ) : wishlist.length > 0 ? (
              <div className="space-y-3">
                {wishlist.map(game => (
                  <WishlistCard key={game.appid} game={game} onRefresh={() => fetchGameDeals(game)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Heart size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Wishlist Empty or Private</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Your wishlist is empty or your Steam profile/wishlist is set to private.
                </p>
                <button
                  onClick={loadWishlist}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                >
                  Retry
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
