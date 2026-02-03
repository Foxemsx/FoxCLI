import { Minus, Square, X, Command } from 'lucide-react';

type TitleBarProps = {
  discordConnected?: boolean;
  extensionConnected?: boolean;
};

export default function TitleBar({ discordConnected, extensionConnected }: TitleBarProps) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  const allConnected = discordConnected && extensionConnected;
  const partialConnected = discordConnected || extensionConnected;

  return (
    <div 
      className="titlebar flex h-8 shrink-0 items-center justify-between select-none"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div 
        className="px-3 text-xs font-semibold flex items-center gap-3"
        style={{ color: 'var(--text-muted)' }}
      >
        <span style={{ color: 'var(--accent-primary)' }}>●</span>
        <span>FoxCLI</span>
        <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>{dateStr}</span>
        <span 
          className={`w-1.5 h-1.5 rounded-full ${allConnected ? 'bg-green-400' : partialConnected ? 'bg-yellow-400' : 'bg-red-400'}`} 
          title="Connection status" 
        />
        <span className="text-[10px] font-normal flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
          <Command size={10} /> K
        </span>
      </div>
      <div className="flex h-full">
        <button
          className="flex h-full w-10 items-center justify-center transition-colors focus:outline-none"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => window.nexus?.minimize?.()}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Minus size={14} />
        </button>
        <button
          className="flex h-full w-10 items-center justify-center transition-colors focus:outline-none"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => window.nexus?.maximize?.()}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Square size={12} />
        </button>
        <button
          className="flex h-full w-10 items-center justify-center transition-colors focus:outline-none hover:bg-[#ed4245] hover:text-white"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => window.nexus?.close?.()}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
