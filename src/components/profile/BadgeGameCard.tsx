import Link from "next/link";
import type { AchievementGame } from "@/lib/queries/achievements";

/**
 * One game on a badge-detail page: title, date/venue, and — for single-player
 * stat badges — who hit the feat and their line ("Player · 42 PTS · 11 REB").
 * Shared by the own, in-app, and public badge-detail routes; each passes the
 * fully-built event href (in-app uses /event, public uses /e).
 */
export default function BadgeGameCard({ game, href }: { game: AchievementGame; href: string }) {
  return (
    <Link
      href={href}
      className="block bg-bg-card border border-border rounded-xl px-4 py-3 active:opacity-80 transition-opacity"
    >
      <div className="text-sm text-text-primary font-medium">{game.title}</div>
      <div className="text-xs text-text-muted mt-0.5">
        {new Date(game.date + "T00:00:00").toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
        {game.venue ? ` · ${game.venue}` : ""}
        {game.country ? ` · ${game.country}` : ""}
      </div>
      {game.achievers && game.achievers.length > 0 && (
        <div className="mt-2 flex flex-col gap-0.5">
          {game.achievers.map((a, i) => (
            <div key={`${a.name}-${i}`} className="text-xs">
              <span className="text-accent font-medium">{a.name}</span>
              {a.line ? <span className="text-text-secondary"> · {a.line}</span> : null}
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
