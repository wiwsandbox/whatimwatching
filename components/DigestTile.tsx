"use client";

import Link from "next/link";
import type { DigestEvent } from "@/lib/types";

const BLUE_BG = "#EAF0FC";
const BLUE_BORDER = "#C9D8F5";
const BLUE_ACCENT = "#3457B2";

function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(startIso).toLocaleDateString("en-US", opts);
  const end = new Date(endIso).toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}

export default function DigestTile({ digest }: { digest: DigestEvent }) {
  const m = digest.metadata;
  const { window_start, window_end } = m;

  // v2 (post content-redesign) and v1 (historical) rows have different
  // shapes — compute the teaser from whichever fields this row actually has.
  const parts: string[] = [];
  if (m.state) {
    const ownCount =
      (m.payoff?.count ?? 0) +
      (m.unrated?.length ?? 0) +
      (m.must_watch_received?.length ?? 0) +
      (m.episodes_aired?.length ?? 0) +
      (m.waiting_on_you?.length ?? 0);
    const friendCount = (m.circle_ratings?.length ?? 0) + (m.taste_twin ? 1 : 0) + (m.hottest_take ? 1 : 0);
    const trendingCount = m.trending_annotated?.length ?? 0;
    if (ownCount > 0) parts.push(`${ownCount} update${ownCount === 1 ? "" : "s"}`);
    if (friendCount > 0) parts.push(`${friendCount} from friends`);
    if (trendingCount > 0) parts.push(`${trendingCount} trending`);
  } else {
    const own = m.own_activity;
    const ownCount = own ? own.rec_watched.length + own.rated.length + own.watchlist_add.length + own.watched.length : 0;
    const friendCount = m.friend_activity?.length ?? 0;
    const trendingCount = m.trending?.length ?? 0;
    if (ownCount > 0) parts.push(`${ownCount} update${ownCount === 1 ? "" : "s"}`);
    if (friendCount > 0) parts.push(`${friendCount} from friends`);
    if (trendingCount > 0) parts.push(`${trendingCount} trending`);
  }

  return (
    <Link
      href={`/digest?event=${digest.id}`}
      className="flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.97]"
      style={{
        background: BLUE_BG,
        border: `0.5px solid ${BLUE_BORDER}`,
        boxShadow: "0 2px 12px rgba(52,87,178,0.08)",
        textDecoration: "none",
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "white" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="10" rx="1.5" stroke={BLUE_ACCENT} strokeWidth="1.3" />
          <path d="M2 6H14" stroke={BLUE_ACCENT} strokeWidth="1.3" />
          <path d="M5 2V4M11 2V4" stroke={BLUE_ACCENT} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: BLUE_ACCENT }}>
          Your weekly digest
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {formatRange(window_start, window_end)}
          {parts.length > 0 ? ` · ${parts.join(" · ")}` : ""}
        </p>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
        <path d="M5 3L9 7L5 11" stroke={BLUE_ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
