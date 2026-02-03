export function FoxIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fox ears */}
      <path
        d="M12 8L18 28L8 24L12 8Z"
        className="fill-[var(--accent-primary)] transition-colors duration-300"
        style={{ fill: 'var(--accent-primary, #E74C3C)' }}
      />
      <path
        d="M52 8L46 28L56 24L52 8Z"
        className="fill-[var(--accent-primary)] transition-colors duration-300"
        style={{ fill: 'var(--accent-primary, #E74C3C)' }}
      />
      {/* Inner ears */}
      <path
        d="M14 12L18 26L12 23L14 12Z"
        className="fill-[var(--accent-hover)] transition-colors duration-300"
        style={{ fill: 'var(--accent-hover, #C0392B)' }}
      />
      <path
        d="M50 12L46 26L52 23L50 12Z"
        className="fill-[var(--accent-hover)] transition-colors duration-300"
        style={{ fill: 'var(--accent-hover, #C0392B)' }}
      />
      {/* Face */}
      <ellipse
        cx="32"
        cy="38"
        rx="20"
        ry="18"
        className="fill-[var(--accent-primary)] transition-colors duration-300"
        style={{ fill: 'var(--accent-primary, #E74C3C)' }}
      />
      {/* Snout */}
      <ellipse
        cx="32"
        cy="46"
        rx="10"
        ry="8"
        fill="#ffffff"
        opacity="0.95"
      />
      {/* Nose */}
      <ellipse
        cx="32"
        cy="42"
        rx="4"
        ry="3"
        fill="#2C3E50"
      />
      {/* Eyes */}
      <ellipse
        cx="24"
        cy="34"
        rx="3"
        ry="4"
        fill="#2C3E50"
      />
      <ellipse
        cx="40"
        cy="34"
        rx="3"
        ry="4"
        fill="#2C3E50"
      />
      {/* Eye shine */}
      <ellipse cx="25" cy="33" rx="1" ry="1.5" fill="#ffffff" opacity="0.8" />
      <ellipse cx="41" cy="33" rx="1" ry="1.5" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}
