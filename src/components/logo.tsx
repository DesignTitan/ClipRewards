export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="grid h-7 w-7 place-items-center rounded-lg bg-lime text-black"
        aria-hidden
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M9 7.5v9l7.5-4.5L9 7.5z" fill="currentColor" />
          <rect
            x="3.25"
            y="3.25"
            width="17.5"
            height="17.5"
            rx="5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      </span>
      {!compact && (
        <span className="text-[15px] font-bold tracking-tight">
          Clip<span className="text-lime">Rewards</span>
        </span>
      )}
    </span>
  );
}
