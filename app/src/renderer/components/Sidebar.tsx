import { Settings, ChevronDown, ChevronRight, Library, BarChart3, PanelLeftClose, PanelLeft, History, Tv, Newspaper, Home, CalendarDays, Gamepad2, Tag, Trophy, Zap, Crown, HardDrive } from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { FoxIcon } from './FoxIcon';

// Your Discord User ID
const DISCORD_USER_ID = '767347091873595433';

type SidebarProps = {
  activeTool: string;
  onSelectTool: (id: string) => void;
  onOpenSettings: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

type CategoryProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isCollapsed?: boolean;
};

function Category({ title, children, defaultOpen = true, isCollapsed = false }: CategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  if (isCollapsed) {
    return <div className="space-y-1">{children}</div>;
  }
  
  return (
    <div className="mb-2 relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="group flex w-full items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wide transition-colors relative z-10"
        style={{ color: 'var(--text-muted)' }}
      >
        {isOpen ? (
          <ChevronDown size={12} className="transition-transform" />
        ) : (
          <ChevronRight size={12} className="transition-transform" />
        )}
        <span className="group-hover:text-[var(--text-secondary)]">{title}</span>
      </button>
      
      {isOpen && (
        <div className="mt-1 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

type NavButtonProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
};

function Tooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  if (!show) return <>{children}</>;
  return (
    <div className="relative group">
      {children}
      <div 
        className="absolute left-full ml-2 px-2 py-1 text-xs rounded whitespace-nowrap z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none"
        style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
      >
        {label}
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick, isCollapsed = false }: NavButtonProps) {
  const button = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`group flex w-full items-center rounded-md px-2 py-[6px] transition-all duration-150 relative z-10 ${isCollapsed ? 'justify-center' : ''}`}
      style={{
        backgroundColor: active ? 'var(--bg-elevated)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
    >
      <span className={`${isCollapsed ? '' : 'mr-3'} transition-colors`} style={{ color: active ? 'var(--accent-primary)' : 'inherit' }}>
        {icon}
      </span>
      {!isCollapsed && <span className="font-medium text-sm">{label}</span>}
      {!isCollapsed && active && (
        <span 
          className="ml-auto h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        />
      )}
    </button>
  );

  return isCollapsed ? <Tooltip label={label} show={true}>{button}</Tooltip> : button;
}

// Tier List Dropdown Component
function TierListDropdown({ activeTool, onSelectTool }: { activeTool: string; onSelectTool: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(activeTool === 'tier-list' || activeTool === 'sf-tier-list');
  const isActive = activeTool === 'tier-list' || activeTool === 'sf-tier-list';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center rounded-md px-2 py-[6px] transition-all duration-150 relative z-10"
        style={{
          backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
      >
        <span className="mr-3 transition-colors" style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }}>
          <Trophy className="h-5 w-5" />
        </span>
        <span className="font-medium text-sm flex-1 text-left">Tier List</span>
        {isOpen ? (
          <ChevronDown size={14} className="transition-transform" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronRight size={14} className="transition-transform" style={{ color: 'var(--text-muted)' }} />
        )}
      </button>
      
      {isOpen && (
        <div className="ml-4 mt-1 space-y-0.5 border-l-2 pl-2" style={{ borderColor: 'var(--bg-elevated)' }}>
          <button
            onClick={() => onSelectTool('tier-list')}
            className="group flex w-full items-center rounded-md px-2 py-[5px] transition-all duration-150"
            style={{
              backgroundColor: activeTool === 'tier-list' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTool === 'tier-list' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <Crown className="h-4 w-4 mr-2" style={{ color: activeTool === 'tier-list' ? '#FFD700' : 'inherit' }} />
            <span className="text-sm">Top 10</span>
            {activeTool === 'tier-list' && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
            )}
          </button>
          <button
            onClick={() => onSelectTool('sf-tier-list')}
            className="group flex w-full items-center rounded-md px-2 py-[5px] transition-all duration-150"
            style={{
              backgroundColor: activeTool === 'sf-tier-list' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTool === 'sf-tier-list' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <Zap className="h-4 w-4 mr-2" style={{ color: activeTool === 'sf-tier-list' ? '#FF6B6B' : 'inherit' }} />
            <span className="text-sm">S-F Tiers</span>
            {activeTool === 'sf-tier-list' && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ activeTool, onSelectTool, onOpenSettings, isCollapsed, onToggleCollapse }: SidebarProps) {
  const [discordUser, setDiscordUser] = useState<{
    username: string;
    avatar: string;
    status: string;
  }>({
    username: 'rohli',
    avatar: `https://cdn.discordapp.com/avatars/${DISCORD_USER_ID}/a_placeholder.png?size=128`,
    status: 'online',
  });
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  // Try to fetch Discord user info via Lanyard API (requires being in Lanyard Discord)
  // Falls back to default if not available
  useEffect(() => {
    const fetchDiscordUser = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const data = await res.json();
        if (data.success && data.data) {
          const { discord_user, discord_status } = data.data;
          const avatarUrl = discord_user.avatar
            ? `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.${discord_user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(discord_user.discriminator || '0') % 5}.png`;
          
          setDiscordUser({
            username: discord_user.global_name || discord_user.username,
            avatar: avatarUrl,
            status: discord_status || 'online',
          });
        }
      } catch (err) {
        // Lanyard not available - use fallback
        console.log('[FoxCLI] Using fallback Discord profile');
      }
    };

    fetchDiscordUser();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'var(--status-online)';
      case 'idle': return 'var(--status-idle)';
      case 'dnd': return 'var(--status-dnd)';
      default: return 'var(--status-offline)';
    }
  };

  return (
    <div 
      className={`flex ${isCollapsed ? 'w-[68px]' : 'w-[240px]'} flex-col pb-4 transition-all duration-200`}
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Header with FoxCLI branding */}
      <div 
        className={`flex h-14 items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} border-b`}
        style={{ borderColor: 'var(--bg-elevated)' }}
      >
        <FoxIcon className="w-8 h-8 flex-shrink-0" />
        {!isCollapsed && (
          <div className="flex flex-col flex-1">
            <h1 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              FoxCLI
            </h1>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Rich Presence Suite
            </span>
          </div>
        )}
        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-elevated)]"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <div className="px-2 py-2">
          <button
            onClick={onToggleCollapse}
            className="w-full p-2 rounded-md transition-colors hover:bg-[var(--bg-elevated)] flex justify-center"
            title="Expand sidebar"
          >
            <PanelLeft size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {/* Home - Top level, not in a category */}
        <NavButton
          icon={<Home className="h-5 w-5" />}
          label="Home"
          active={activeTool === 'home'}
          onClick={() => onSelectTool('home')}
          isCollapsed={isCollapsed}
        />
        
        {/* Calendar - Same level as Home */}
        <NavButton
          icon={<CalendarDays className="h-5 w-5" />}
          label="Calendar"
          active={activeTool === 'calendar'}
          onClick={() => onSelectTool('calendar')}
          isCollapsed={isCollapsed}
        />
        
        <div 
          className="my-3 mx-2 h-[1px]"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        />

      <Category title="Anime" isCollapsed={isCollapsed}>
          <NavButton
            icon={<FaDiscord className="h-5 w-5" />}
            label="Discord RPC"
            active={activeTool === 'discord-rpc'}
            onClick={() => onSelectTool('discord-rpc')}
            isCollapsed={isCollapsed}
          />
          <NavButton
            icon={<Library className="h-5 w-5" />}
            label="Anime Library"
            active={activeTool === 'anime-library'}
            onClick={() => onSelectTool('anime-library')}
            isCollapsed={isCollapsed}
          />
          <NavButton
            icon={<BarChart3 className="h-5 w-5" />}
            label="Statistics"
            active={activeTool === 'statistics'}
            onClick={() => onSelectTool('statistics')}
            isCollapsed={isCollapsed}
          />
          <NavButton
            icon={<Tv className="h-5 w-5" />}
            label="Airing Tracker"
            active={activeTool === 'airing-tracker'}
            onClick={() => onSelectTool('airing-tracker')}
            isCollapsed={isCollapsed}
          />
          <NavButton
            icon={<Newspaper className="h-5 w-5" />}
            label="News"
            active={activeTool === 'news'}
            onClick={() => onSelectTool('news')}
            isCollapsed={isCollapsed}
          />
          {/* Tier List Dropdown */}
          {isCollapsed ? (
            <NavButton
              icon={<Trophy className="h-5 w-5" />}
              label="Tier List"
              active={activeTool === 'tier-list' || activeTool === 'sf-tier-list'}
              onClick={() => onSelectTool('tier-list')}
              isCollapsed={isCollapsed}
            />
          ) : (
            <TierListDropdown 
              activeTool={activeTool} 
              onSelectTool={onSelectTool} 
            />
          )}
        </Category>

        <div 
          className="my-3 mx-2 h-[1px]"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        />

        <Category title="Steam & Sales" isCollapsed={isCollapsed}>
          <NavButton
            icon={<Gamepad2 className="h-5 w-5" />}
            label="Library"
            active={activeTool === 'steam-library'}
            onClick={() => onSelectTool('steam-library')}
            isCollapsed={isCollapsed}
          />
          <NavButton
            icon={<Tag className="h-5 w-5" />}
            label="Sales"
            active={activeTool === 'sales'}
            onClick={() => onSelectTool('sales')}
            isCollapsed={isCollapsed}
          />
          <NavButton
            icon={<HardDrive className="h-5 w-5" />}
            label="Disk"
            active={activeTool === 'steam-disks'}
            onClick={() => onSelectTool('steam-disks')}
            isCollapsed={isCollapsed}
          />
        </Category>

        <div 
          className="my-3 mx-2 h-[1px]"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        />

        <Category title="System" isCollapsed={isCollapsed}>
          <NavButton
            icon={<History className="h-5 w-5" />}
            label="Changelog"
            active={activeTool === 'changelog'}
            onClick={() => onSelectTool('changelog')}
            isCollapsed={isCollapsed}
          />
          <NavButton
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
            onClick={onOpenSettings}
            isCollapsed={isCollapsed}
          />
        </Category>
      </div>

      {/* User Profile Footer */}
      <div 
        className={`mx-2 mt-auto flex items-center rounded-lg p-2 transition-colors cursor-pointer hover:bg-[var(--bg-elevated)] ${isCollapsed ? 'justify-center' : ''}`}
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <Tooltip label={discordUser.username} show={isCollapsed}>
          <div className="relative">
            <img
              src={discordUser.avatar}
              alt="User Avatar"
              className="h-9 w-9 rounded-full object-cover"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
              }}
            />
            <span 
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2"
              style={{ 
                borderColor: 'var(--bg-primary)', 
                backgroundColor: getStatusColor(discordUser.status)
              }}
            />
          </div>
        </Tooltip>
        {!isCollapsed && (
          <div className="ml-2 flex flex-col overflow-hidden">
            <div 
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {discordUser.username}
            </div>
            <div 
              className="text-[11px] truncate capitalize"
              style={{ color: 'var(--text-muted)' }}
            >
              {discordUser.status}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
