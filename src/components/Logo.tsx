export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="SAC Community" className="shrink-0">
      <defs>
        <linearGradient id="sacg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary-glow)" />
          <stop offset="1" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#sacg)" />
      <path d="M27 13.5c-1.4-1.6-3.6-2.5-6.3-2.5-4 0-6.6 2-6.6 5 0 6.4 12.4 3.6 12.4 8.6 0 1.8-1.9 3-4.9 3-2.6 0-4.7-1-6.1-2.8" fill="none" stroke="var(--primary-foreground)" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="29" cy="29" r="2.4" fill="var(--background)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <Logo />
      <span className="hidden font-display text-lg font-black tracking-tight sm:inline">
        SAC<span className="text-primary">.</span>Community
      </span>
    </span>
  );
}
