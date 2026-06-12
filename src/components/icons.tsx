/**
 * Shared stroke-style icons for empty states, notifications, and status
 * screens — replaces platform emoji, which clashed with the app's
 * line-icon language. All inherit currentColor; color via className.
 */

type IconProps = { size?: number; className?: string };

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function BellIcon({ size = 40, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/** Check inside a circle with celebratory sparks — "logged it!" */
export function CelebrationIcon({ size = 44, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <circle cx="12" cy="14" r="7.5" />
      <path d="m8.75 14.25 2.25 2.25 4.25-5" />
      <path d="M12 3.5V1.5" />
      <path d="m5.5 5.5-1.4-1.4" />
      <path d="m18.5 5.5 1.4-1.4" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 44, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.25 12.25 2.5 2.5 5-6" />
    </svg>
  );
}

export function TrashIcon({ size = 44, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/** Envelope with a check — "reset link sent" */
export function MailCheckIcon({ size = 44, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      <path d="m16 19 2 2 4-4" />
    </svg>
  );
}

export function ListIcon({ size = 40, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

export function UsersIcon({ size = 40, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Stadium bowl — same silhouette as SportIcon's fallback */
export function StadiumIcon({ size = 40, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} strokeWidth={1.5} className={className}>
      <path d="M2 12c0-4 4.5-7 10-7s10 3 10 7-4.5 7-10 7-10-3-10-7Z" />
      <path d="M2 12c0 4 4.5 7 10 7s10-3 10-7" />
      <path d="M12 5v14" />
      <path d="M5.5 8.5c1.5 1.5 4 2.5 6.5 2.5s5-1 6.5-2.5" />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 40, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function CameraIcon({ size = 12, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} strokeWidth={2} className={className}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function HeartIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function CommentIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function UserPlusIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

export function TrophyIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export function ChartIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function MegaphoneIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps} className={className}>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}
