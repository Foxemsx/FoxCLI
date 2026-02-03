import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { parseError, ParsedError } from '../services/errorUtils';

interface ErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
  onReconnect?: () => void;
  compact?: boolean;
}

export default function ErrorDisplay({ error, onRetry, onReconnect, compact = false }: ErrorDisplayProps) {
  const parsed: ParsedError = parseError(error);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 p-3 rounded-lg text-sm"
        style={{ backgroundColor: '#ED424520', color: '#ED4245' }}
      >
        <AlertCircle size={16} className="flex-shrink-0" />
        <span className="flex-1">{parsed.message}</span>
        {parsed.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="p-1 rounded hover:bg-[#ED424540] transition-colors"
            title="Retry"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center p-6 rounded-xl max-w-md mx-auto"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div 
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: '#ED424520' }}
      >
        <AlertCircle size={28} style={{ color: '#ED4245' }} />
      </div>
      
      <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
        {parsed.title}
      </h3>
      
      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
        {parsed.message}
      </p>
      
      {parsed.suggestion && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          {parsed.suggestion}
        </p>
      )}
      
      <div className="flex items-center gap-3">
        {parsed.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        )}
        
        {!parsed.retryable && onReconnect && (
          <button
            onClick={onReconnect}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            <LogIn size={16} />
            Reconnect
          </button>
        )}
      </div>
    </motion.div>
  );
}
