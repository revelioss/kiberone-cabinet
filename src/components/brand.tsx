export function Mark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M7 8.5 16 4l9 4.5v9.2c0 4.7-3.7 8.4-9 10.3-5.3-1.9-9-5.6-9-10.3V8.5Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M16 7.2 22.2 10.4v6.2c0 2.7-2.1 4.9-6.2 6.2-4.1-1.3-6.2-3.5-6.2-6.2v-6.2L16 7.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M13 16.2 15.1 18.3 19.4 13.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-2xl bg-[linear-gradient(160deg,#17315c,#2aa0c4)] text-white shadow-md shadow-sky-900/10">
        <Mark className="size-7" />
      </span>
      {compact ? null : (
        <span className="leading-tight">
          <span className="block font-display text-sm tracking-wide text-[#17315c]">KIBERone</span>
          <span className="block text-xs text-muted-foreground">Караганда</span>
        </span>
      )}
    </div>
  );
}

export function KiberonCoin({ className = "size-14" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="#f6c453" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#fff7df" strokeWidth="2" />
      <path d="M24 38V26h8.2a6.2 6.2 0 0 1 0 12.4H24Z" fill="#17315c" />
      <path d="M28.2 29.4v6.2h3.6a3.1 3.1 0 0 0 0-6.2h-3.6Z" fill="#f6c453" />
    </svg>
  );
}
