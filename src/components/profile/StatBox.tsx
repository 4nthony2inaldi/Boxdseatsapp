import Link from "next/link";

type StatBoxProps = {
  value: number;
  label: string;
  href?: string;
};

export default function StatBox({ value, label, href }: StatBoxProps) {
  const content = (
    <div className="text-center flex-1">
      <div className="font-display text-2xl text-text-primary tracking-wide">
        {value}
      </div>
      <div className="text-[10px] text-text-secondary uppercase tracking-wider">
        {label}
      </div>
    </div>
  );

  // "#" is the "no destination" sentinel (e.g. follower/following counts on a
  // public profile) — render it as a plain, non-interactive stat, not a dead link.
  if (href && href !== "#") {
    return (
      <Link href={href} className="flex-1 hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
