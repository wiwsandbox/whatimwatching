"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/authContext";
import { getClient } from "@/lib/supabase/client";
import type { DigestEvent, DigestActivityItem, DigestFriendActivityItem, DigestTrendingItem } from "@/lib/types";

function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(startIso).toLocaleDateString("en-US", opts);
  const end = new Date(endIso).toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}

function titleHref(item: { tmdb_id: number; media_type: string }) {
  return `/title/${item.media_type}-${item.tmdb_id}`;
}

function ActivityRow({ item, subtitle, bordered }: { item: DigestActivityItem; subtitle: string; bordered?: boolean }) {
  return (
    <Link
      href={titleHref(item)}
      className="flex items-center gap-3 py-2"
      style={{ textDecoration: "none", borderBottom: bordered ? "0.5px solid var(--border)" : undefined }}
    >
      <div className="flex-shrink-0" style={{ width: 48, height: 72, borderRadius: 8, overflow: "hidden", background: "var(--surface-2)" }}>
        {item.poster_path && (
          <Image src={`https://image.tmdb.org/t/p/w154${item.poster_path}`} alt={item.title} width={48} height={72} className="object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold line-clamp-1" style={{ color: "var(--text-primary)" }}>{item.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
      </div>
    </Link>
  );
}

function FriendRow({ item, bordered }: { item: DigestFriendActivityItem; bordered?: boolean }) {
  const action =
    item.kind === "friend_rating"
      ? `rated it ${item.rating}/10`
      : item.kind === "friend_watchlist_add"
      ? "added it to their watchlist"
      : "recommended it to you";
  return (
    <Link
      href={titleHref(item)}
      className="flex items-center gap-3 py-2"
      style={{ textDecoration: "none", borderBottom: bordered ? "0.5px solid var(--border)" : undefined }}
    >
      <div className="flex-shrink-0" style={{ width: 28, height: 42, borderRadius: 6, overflow: "hidden", background: "var(--surface-2)" }}>
        {item.poster_path && (
          <Image src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt={item.title} width={28} height={42} className="object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm line-clamp-2" style={{ color: "var(--text-primary)" }}>
          <span className="font-semibold">{item.friend_name}</span> {action}
        </p>
        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-secondary)" }}>{item.title}</p>
      </div>
    </Link>
  );
}

function TrendingCard({ item }: { item: DigestTrendingItem }) {
  return (
    <Link href={titleHref(item)} className="flex-shrink-0" style={{ width: 90, textDecoration: "none" }}>
      <div style={{ width: 90, height: 135, borderRadius: 10, overflow: "hidden", background: "var(--surface-2)" }}>
        {item.poster_path && (
          <Image src={`https://image.tmdb.org/t/p/w185${item.poster_path}`} alt={item.title} width={90} height={135} className="object-cover" />
        )}
      </div>
      <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "var(--text-primary)" }}>{item.title}</p>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2 px-1" style={{ color: "var(--text-secondary)" }}>
      {children}
    </p>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl px-4"
      style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "0 2px 12px rgba(180,100,80,0.06)" }}
    >
      {children}
    </div>
  );
}

function DigestPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const { user } = useAuth();

  const [digest, setDigest] = useState<DigestEvent | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    const supabase = getClient();
    let query = supabase
      .from("events")
      .select("id, created_at, metadata")
      .eq("user_id", user.id)
      .eq("event_type", "digest_sent");
    query = eventId ? query.eq("id", eventId) : query.order("created_at", { ascending: false }).limit(1);
    query.then(({ data }) => {
      setDigest(((data?.[0] as DigestEvent | undefined) ?? null));
    });
  }, [user, eventId]);

  if (digest === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--brand)" }} />
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-8" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--text-muted)" }}>No weekly digest yet — check back after your first one goes out.</p>
        <button onClick={() => router.back()} style={{ color: "var(--brand)" }} className="text-sm">
          Go back
        </button>
      </div>
    );
  }

  const { own_activity, friend_activity, trending, window_start, window_end } = digest.metadata;

  return (
    <div className="min-h-screen pb-12" style={{ background: "var(--bg)" }}>
      <button
        onClick={() => router.back()}
        className="fixed top-12 left-4 z-50 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,250,248,0.9)", border: "0.5px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9L11 14" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="pt-24 px-4">
        <p style={{ fontFamily: "var(--font-playfair)", fontWeight: 900, fontSize: 22, color: "var(--text-primary)" }}>
          Your week
        </p>
        <p className="text-sm mt-1 mb-6" style={{ color: "var(--text-muted)" }}>
          {formatRange(window_start, window_end)}
        </p>

        <div className="space-y-5">
          {own_activity.rec_watched.length > 0 && (
            <div>
              <SectionLabel>Your picks landed</SectionLabel>
              <SectionCard>
                {own_activity.rec_watched.map((item, i) => (
                  <ActivityRow
                    key={`${item.tmdb_id}-${i}`}
                    item={item}
                    subtitle={
                      item.recipient_rating != null
                        ? `Watched and rated ${item.recipient_rating}/10`
                        : "Watched"
                    }
                    bordered={i < own_activity.rec_watched.length - 1}
                  />
                ))}
              </SectionCard>
            </div>
          )}

          {(own_activity.rated.length > 0 || own_activity.watched.length > 0 || own_activity.watchlist_add.length > 0) && (
            <div>
              <SectionLabel>Your activity</SectionLabel>
              <SectionCard>
                {(() => {
                  const rows = [
                    ...own_activity.rated.map((item) => ({ item, subtitle: `You rated it ${item.rating}/10`, key: `rated-${item.tmdb_id}` })),
                    ...own_activity.watched.map((item) => ({ item, subtitle: "You watched this", key: `watched-${item.tmdb_id}` })),
                    ...own_activity.watchlist_add.map((item) => ({ item, subtitle: "Added to your watchlist", key: `add-${item.tmdb_id}` })),
                  ];
                  return rows.map((row, i) => (
                    <ActivityRow key={row.key} item={row.item} subtitle={row.subtitle} bordered={i < rows.length - 1} />
                  ));
                })()}
              </SectionCard>
            </div>
          )}

          {friend_activity.length > 0 && (
            <div>
              <SectionLabel>Friends</SectionLabel>
              <SectionCard>
                {friend_activity.map((item, i) => (
                  <FriendRow key={`${item.friend_id}-${item.tmdb_id}-${i}`} item={item} bordered={i < friend_activity.length - 1} />
                ))}
              </SectionCard>
            </div>
          )}

          {trending.length > 0 && (
            <div>
              <SectionLabel>Trending for you</SectionLabel>
              <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {trending.map((item, i) => (
                  <TrendingCard key={`${item.tmdb_id}-${i}`} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DigestPage() {
  return (
    <Suspense>
      <DigestPageInner />
    </Suspense>
  );
}
