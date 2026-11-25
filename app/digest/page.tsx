"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import RatingSelector from "@/components/RatingSelector";
import { useAuth } from "@/lib/authContext";
import { getClient } from "@/lib/supabase/client";
import { tmdbImage } from "@/lib/tmdb";

// Live watchlist digest: everything here is queried at render time. The
// weekly push only links here; it does not snapshot any content.

const SECTION_CAP = 25;

interface DigestRow {
  key: string;
  watchlist_id?: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  who: string | null;
}

interface DigestData {
  own: DigestRow[];
  friends: DigestRow[];
  unrated: DigestRow[];
  counts: { own_count: number; friend_count: number; unrated_count: number };
}

interface WatchlistRow {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string | null;
  poster_path: string | null;
  status: string;
  rating: number | null;
  watched_at: string | null;
  created_at: string;
}

function titleHref(item: { tmdb_id: number; media_type: string }) {
  return `/title/${item.media_type}-${item.tmdb_id}`;
}

const rowKey = (r: { tmdb_id: number; media_type: string }) => `${r.media_type}-${r.tmdb_id}`;
const hasTitle = (r: WatchlistRow) => typeof r.title === "string" && r.title.trim() !== "";

function namesLabel(names: string[]) {
  const shown = names.slice(0, 2).join(", ");
  return names.length > 2 ? `${shown} +${names.length - 2}` : shown;
}

async function logDigestEvent(supabase: ReturnType<typeof getClient>, userId: string, eventType: string, metadata: Record<string, unknown>) {
  await supabase.from("events").insert({ user_id: userId, event_type: eventType, metadata }).then(() => {}, () => {});
}

async function loadDigest(userId: string): Promise<DigestData> {
  const supabase = getClient();

  const [{ data: mineRaw }, { data: friendRows }] = await Promise.all([
    supabase
      .from("watchlist")
      .select("id, user_id, tmdb_id, media_type, title, poster_path, status, rating, watched_at, created_at")
      .eq("user_id", userId),
    supabase.from("friendships").select("friend_id").eq("user_id", userId).eq("status", "accepted"),
  ]);
  const mine = ((mineRaw ?? []) as WatchlistRow[]).filter(hasTitle);
  const myKeys = new Set(mine.map(rowKey));
  const friendIds = (friendRows ?? []).map((f) => f.friend_id as string);

  let friendWatchlist: WatchlistRow[] = [];
  const nameById = new Map<string, string>();
  if (friendIds.length > 0) {
    const [{ data: fw }, { data: profiles }] = await Promise.all([
      supabase
        .from("watchlist")
        .select("id, user_id, tmdb_id, media_type, title, poster_path, status, rating, watched_at, created_at")
        .in("user_id", friendIds)
        .eq("status", "to_watch"),
      supabase.from("profiles").select("id, display_name, username").in("id", friendIds),
    ]);
    friendWatchlist = ((fw ?? []) as WatchlistRow[]).filter(hasTitle);
    for (const p of profiles ?? []) {
      const name = (p.display_name as string | null)?.trim().split(/\s+/)[0] || (p.username as string | null) || "Friend";
      nameById.set(p.id as string, name);
    }
  }

  // Group friends' to_watch rows by title.
  const byTitle = new Map<string, { row: WatchlistRow; names: string[]; latest: string }>();
  for (const r of friendWatchlist) {
    const k = rowKey(r);
    const name = nameById.get(r.user_id) ?? "Friend";
    const g = byTitle.get(k);
    if (!g) byTitle.set(k, { row: r, names: [name], latest: r.created_at });
    else {
      if (!g.names.includes(name)) g.names.push(name);
      if (r.created_at > g.latest) g.latest = r.created_at;
    }
  }

  const toRow = (r: WatchlistRow, who: string | null, withId = false): DigestRow => ({
    key: rowKey(r),
    watchlist_id: withId ? r.id : undefined,
    tmdb_id: r.tmdb_id,
    media_type: r.media_type,
    title: r.title as string,
    poster_path: r.poster_path,
    who,
  });

  const ownAll = mine
    .filter((r) => r.status === "to_watch" || r.status === "watching")
    .sort((a, b) => {
      const sa = byTitle.has(rowKey(a)) ? 1 : 0;
      const sb = byTitle.has(rowKey(b)) ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return b.created_at.localeCompare(a.created_at);
    })
    .map((r) => {
      const g = byTitle.get(rowKey(r));
      return toRow(r, g ? `You + ${namesLabel(g.names)}` : null);
    });

  const friendsAll = [...byTitle.entries()]
    .filter(([k]) => !myKeys.has(k))
    .sort(([, a], [, b]) => b.names.length - a.names.length || b.latest.localeCompare(a.latest))
    .map(([, g]) => toRow(g.row, namesLabel(g.names)));

  const unratedAll = mine
    .filter((r) => r.status === "watched" && r.rating == null)
    .sort((a, b) => (b.watched_at ?? b.created_at).localeCompare(a.watched_at ?? a.created_at))
    .map((r) => toRow(r, null, true));

  return {
    own: ownAll.slice(0, SECTION_CAP),
    friends: friendsAll.slice(0, SECTION_CAP),
    unrated: unratedAll.slice(0, SECTION_CAP),
    counts: { own_count: ownAll.length, friend_count: friendsAll.length, unrated_count: unratedAll.length },
  };
}

// --- building blocks ----------------------------------------------------------

function SectionLabel({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div className="flex items-baseline justify-between mb-3 px-1">
      <p className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "var(--text-primary)" }}>
        {children}
      </p>
      <span className="font-bold" style={{ background: "var(--brand)", color: "white", padding: "2px 7px", borderRadius: 999, fontSize: 10 }}>
        {count}
      </span>
    </div>
  );
}

function Poster({ path, width, height, radius = 6 }: { path: string | null; width: number; height: number; radius?: number }) {
  return (
    <div className="flex-shrink-0" style={{ width, height, borderRadius: radius, overflow: "hidden", background: "var(--surface-2)" }}>
      {path && <Image src={tmdbImage(path, "w185")} alt="" width={width} height={height} className="object-cover" />}
    </div>
  );
}

function Row({ item, last, onRate }: { item: DigestRow; last: boolean; onRate?: (item: DigestRow) => void }) {
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: last ? undefined : "0.5px solid var(--border)" }}>
      <Link href={titleHref(item)} className="flex items-center gap-3 flex-1 min-w-0" style={{ textDecoration: "none" }}>
        <Poster path={item.poster_path} width={38} height={57} />
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{item.title}</p>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
            {item.media_type === "tv" ? "TV" : "Movie"}
            {item.who && (
              <>
                {" · "}
                <span style={{ color: "var(--brand)", fontWeight: 600 }}>{item.who}</span>
              </>
            )}
          </p>
        </div>
      </Link>
      {onRate && (
        <button
          onClick={() => onRate(item)}
          aria-label={`Rate ${item.title}`}
          className="flex-shrink-0 text-[11px] font-bold px-3.5 py-2 rounded-full"
          style={{ background: "var(--brand)", color: "white", border: "none" }}
        >
          Rate
        </button>
      )}
    </div>
  );
}

function Section({ label, items, onRate }: { label: string; items: DigestRow[]; onRate?: (item: DigestRow) => void }) {
  if (items.length === 0) return null;
  return (
    <div>
      <SectionLabel count={items.length}>{label}</SectionLabel>
      <div className="rounded-2xl px-4" style={{ background: "var(--warm, var(--surface-2))" }}>
        {items.map((item, i) => (
          <Row key={item.key} item={item} last={i === items.length - 1} onRate={onRate} />
        ))}
      </div>
    </div>
  );
}

// --- page -----------------------------------------------------------------------

export default function DigestPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [data, setData] = useState<DigestData | null>(null);
  const [ratingTarget, setRatingTarget] = useState<DigestRow | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadDigest(user.id).then((d) => {
      if (cancelled) return;
      setData(d);
      logDigestEvent(getClient(), user.id, "digest_viewed", d.counts);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleRateSubmit = useCallback(
    async (rating: number | null) => {
      if (!ratingTarget?.watchlist_id) return;
      const supabase = getClient();
      await supabase.from("watchlist").update({ rating }).eq("id", ratingTarget.watchlist_id);
      if (user) await logDigestEvent(supabase, user.id, "digest_action_completed", { action: "rate" });
      if (rating != null) {
        setData((prev) => (prev ? { ...prev, unrated: prev.unrated.filter((i) => i.watchlist_id !== ratingTarget.watchlist_id) } : prev));
      }
    },
    [ratingTarget, user]
  );

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--brand)" }} />
      </div>
    );
  }

  const empty = data.own.length === 0 && data.friends.length === 0 && data.unrated.length === 0;

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg)", fontFamily: "var(--font-dm-sans)" }}>
      <button
        onClick={() => router.back()}
        className="fixed top-12 left-4 z-50 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,250,248,0.9)", border: "0.5px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
        aria-label="Go back"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9L11 14" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="pt-24 px-4">
        <div className="flex items-baseline justify-between mb-6">
          <span style={{ fontFamily: "var(--font-playfair)", fontWeight: 900, fontSize: 24, color: "var(--brand)" }}>wiw</span>
          <span className="text-[10px] uppercase" style={{ letterSpacing: "0.13em", color: "var(--text-muted)" }}>Your watchlist &amp; friends&apos;</span>
        </div>

        {empty ? (
          <div className="flex flex-col items-center gap-4 text-center py-16 px-4">
            <p style={{ color: "var(--text-muted)" }}>Nothing on your list or your friends&apos; lists yet.</p>
            <Link href="/search" className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
              Find something to watch
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <Section label="On your list" items={data.own} />
            <Section label="On friends' lists" items={data.friends} />
            <Section label="Waiting for your rating" items={data.unrated} onRate={setRatingTarget} />
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/watchlist" className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
            See your full watchlist
          </Link>
        </div>

        <p className="text-center text-[10.5px] mt-9 px-4" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
          Sent Sundays.
        </p>
      </div>

      <RatingSelector
        isOpen={!!ratingTarget}
        onClose={() => setRatingTarget(null)}
        currentRating={null}
        titleName={ratingTarget?.title ?? ""}
        onRate={handleRateSubmit}
        posterUrl={ratingTarget?.poster_path ? tmdbImage(ratingTarget.poster_path, "w342") : null}
        mediaType={ratingTarget?.media_type}
      />
    </div>
  );
}
