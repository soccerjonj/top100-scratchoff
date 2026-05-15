/**
 * iOS-style share glyph (rectangle with arrow pointing up out of it).
 * Universally recognized "share to anywhere" affordance — used on both
 * the user-grid Share button and the primary Share action on the
 * /share/* pages.
 */
export function ShareIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Box opening at top */}
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
      {/* Up-arrow head */}
      <path d="M8 6l4-4 4 4" />
      {/* Arrow shaft */}
      <path d="M12 2v14" />
    </svg>
  );
}
