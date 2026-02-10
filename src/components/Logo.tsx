import { colors } from "@/lib/constants";

export function Logo({ size = 48 }: { size?: number }) {
  const r = size * 0.25;
  const rOuter = r * 0.82;
  const spread = r * 1.1;

  const contentLeft = size / 2 - spread - rOuter;
  const contentRight = size / 2 + spread + rOuter;
  const contentTop = size / 2 - r;
  const contentBottom = size / 2 + r;
  const contentWidth = contentRight - contentLeft;
  const contentHeight = contentBottom - contentTop;

  const cx1 = size / 2 - spread;
  const cx2 = size / 2;
  const cx3 = size / 2 + spread;
  const cy = size / 2;

  const aspect = contentWidth / contentHeight;
  const outHeight = size * 0.5;
  const outWidth = outHeight * aspect;

  return (
    <svg
      width={outWidth}
      height={outHeight}
      viewBox={`${contentLeft} ${contentTop} ${contentWidth} ${contentHeight}`}
      className="block"
    >
      {/* Basketball */}
      <circle cx={cx1} cy={cy} r={rOuter} fill={colors.basketball} />
      {/* Football */}
      <circle cx={cx3} cy={cy} r={rOuter} fill={colors.football} />
      {/* Baseball (on top) */}
      <circle cx={cx2} cy={cy} r={r} fill={colors.baseball} />
      {/* Left stitch */}
      <path
        d={`M ${cx2 - r * 0.38} ${cy - r * 0.5} A ${rOuter * 0.9} ${rOuter * 0.9} 0 0 1 ${cx2 - r * 0.38} ${cy + r * 0.5}`}
        fill="none"
        stroke={colors.baseballStitch}
        strokeWidth={r * 0.11}
        strokeLinecap="round"
      />
      {/* Right stitch */}
      <path
        d={`M ${cx2 + r * 0.38} ${cy - r * 0.5} A ${rOuter * 0.9} ${rOuter * 0.9} 0 0 0 ${cx2 + r * 0.38} ${cy + r * 0.5}`}
        fill="none"
        stroke={colors.baseballStitch}
        strokeWidth={r * 0.11}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoWithWordmark({ size = 48 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: size * 0.45 }}>
      <Logo size={size} />
      <span
        className="font-display leading-none"
        style={{
          fontSize: size * 0.55,
          letterSpacing: size * 0.04,
          color: colors.textPrimary,
          position: "relative",
          top: size * 0.04,
        }}
      >
        BOXD<span style={{ color: colors.accent }}>SEATS</span>
      </span>
    </div>
  );
}
