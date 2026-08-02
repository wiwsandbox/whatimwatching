"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Avatar from "@/components/Avatar";
import RatingSelector from "@/components/RatingSelector";
import { useAuth } from "@/lib/authContext";
import { getClient } from "@/lib/supabase/client";
import { tmdbImage } from "@/lib/tmdb";
import type {
  DigestEvent,
  DigestActivityItem,
  DigestFriendActivityItem,
  DigestTrendingItem,
  DigestBlockId,
  UnratedItem,
  WaitingOnYouItem,
} from "@/lib/types";

const GOLD = "linear-gradient(135deg, #D4AF37, #F5D060)";
const CINE_DEEP = "#0d0d0d";

function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = new Date(startIso).toLocaleDateString("en-US", opts);
  const end = new Date(endIso).toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}

function titleHref(item: { tmdb_id: number; media_type: string }) {
  return `/title/${item.media_type}-${item.tmdb_id}`;
}

function pluralize(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// "person"/"Must Watch" don't pluralize with a plain +s — irregular cases
// get their own helpers rather than a generic pluralizer that gets it wrong.
function pluralizePeople(n: number) {
  return n === 1 ? "1 person" : `${n} people`;
}

function pluralizeMustWatch(n: number) {
  return n === 1 ? "1 Must Watch" : `${n} Must Watches`;
}

async function logDigestEvent(supabase: ReturnType<typeof getClient>, userId: string, eventType: string, metadata: Record<string, unknown>) {
  await supabase.from("events").insert({ user_id: userId, event_type: eventType, metadata }).then(() => {}, () => {});
}

// --- shared small building blocks -------------------------------------------

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between mb-3 px-1">
      <p className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "var(--text-primary)" }}>
        {children}
      </p>
      {right && <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{right}</span>}
    </div>
  );
}

function Hero({ kicker, headline, sub }: { kicker: string; headline: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="px-1 pb-6">
      <p className="text-[10px] font-bold uppercase mb-2.5" style={{ letterSpacing: "0.18em", color: "var(--brand)" }}>
        {kicker}
      </p>
      <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 34, lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
        {headline}
      </h2>
      {sub && <div className="mt-3.5">{sub}</div>}
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

function Mono({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: "var(--font-dm-mono)", ...style }}>{children}</span>;
}

// --- Payoff -------------------------------------------------------------------

function PayoffBlock({
  payoff,
  isHero,
}: {
  payoff: { items: DigestActivityItem[]; count: number; prior_week_count: number };
  isHero: boolean;
}) {
  const body = (
    <div className="px-1">
      {payoff.items.map((item, i) => (
        <Link
          key={`${item.tmdb_id}-${i}`}
          href={titleHref(item)}
          data-block="payoff"
          className="flex items-center gap-3 py-3"
          style={{ textDecoration: "none", borderTop: "0.5px solid var(--border)" }}
        >
          <Poster path={item.poster_path} width={40} height={60} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.title}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Avatar avatarUrl={null} displayName={(item as unknown as { friend_name?: string }).friend_name ?? "Friend"} size={18} />
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {(item as unknown as { friend_name?: string }).friend_name} {item.rating != null ? "rated it" : "watched it"}
              </p>
            </div>
          </div>
          {item.rating != null && (
            <Mono style={{ fontSize: 19, color: "var(--text-primary)", textAlign: "right", flexShrink: 0 }}>
              {item.rating}
              <span style={{ display: "block", fontFamily: "var(--font-dm-sans)", fontSize: 9, letterSpacing: "0.09em", color: "var(--text-muted)", textTransform: "uppercase", marginTop: 1 }}>
                /10
              </span>
            </Mono>
          )}
        </Link>
      ))}
    </div>
  );

  if (!isHero) {
    return (
      <div>
        <SectionLabel>Because of you</SectionLabel>
        {body}
      </div>
    );
  }

  const delta = payoff.count - payoff.prior_week_count;
  return (
    <div>
      <Hero
        kicker="Your week"
        headline={
          <>
            {pluralizePeople(payoff.count)} watched <em style={{ fontStyle: "italic", color: "var(--brand)" }}>because of you.</em>
          </>
        }
        sub={
          <Link
            href="/profile"
            data-block="payoff"
            className="inline-flex items-center gap-1.5 text-[11.5px] px-3 py-1.5 rounded-full"
            style={{ textDecoration: "none", color: "var(--text-secondary)", background: "var(--surface-1)" }}
          >
            Last week it was {pluralizePeople(payoff.prior_week_count)}
            {delta !== 0 && (
              <Mono style={{ color: delta > 0 ? "#1a7f4b" : "var(--brand)" }}>
                {delta > 0 ? "↑" : "↓"} {Math.abs(delta)}
              </Mono>
            )}
          </Link>
        }
      />
      {body}
    </div>
  );
}

// --- Unrated -------------------------------------------------------------------

function UnratedBlock({
  items,
  onRate,
}: {
  items: UnratedItem[];
  onRate: (item: UnratedItem) => void;
}) {
  // Stable snapshot rather than calling Date.now() during render — this is
  // a once-viewed digest, not a live clock, so it doesn't need to tick.
  const [now] = useState(() => Date.now());
  return (
    <div>
      <SectionLabel right={<span className="font-bold" style={{ background: "var(--brand)", color: "white", padding: "2px 7px", borderRadius: 999, fontSize: 10 }}>{items.length}</span>}>
        You haven&apos;t rated these
      </SectionLabel>
      <div className="rounded-2xl px-4" style={{ background: "var(--warm, var(--surface-2))" }}>
        {items.map((item, i) => {
          const days = Math.floor((now - new Date(item.watched_at).getTime()) / 86400000);
          return (
            <div
              key={item.watchlist_id}
              className="flex items-center gap-3 py-3"
              style={{ borderBottom: i < items.length - 1 ? "0.5px solid var(--border)" : undefined }}
            >
              <Poster path={item.poster_path} width={38} height={57} />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-bold" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {days <= 0 ? "Watched today" : `Watched ${pluralize(days, "day")} ago`}
                </p>
              </div>
              <button
                data-block="unrated"
                data-act="rate"
                onClick={() => onRate(item)}
                aria-label={`Rate ${item.title}`}
                className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ border: "1.5px solid var(--border)", background: "transparent" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5L10.06 5.68L14.68 6.36L11.34 9.62L12.12 14.22L8 12.06L3.88 14.22L4.66 9.62L1.32 6.36L5.94 5.68L8 1.5Z" stroke="var(--brand)" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          );
        })}
        <div className="flex items-center justify-between py-3.5" style={{ borderTop: "0.5px solid var(--border)" }}>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Rating them puts them in front of your circle.</p>
          <button
            data-block="unrated"
            data-act="rate_all"
            onClick={() => items[0] && onRate(items[0])}
            className="flex-shrink-0 text-[11px] font-bold px-3.5 py-2 rounded-full"
            style={{ background: "var(--text-primary)", color: "white", border: "none" }}
          >
            Rate all
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Must Watch received --------------------------------------------------------

interface MustWatchReceivedItem {
  rec_id: string;
  tmdb_id: number;
  media_type: string;
  title: string;
  poster_path: string | null;
  runtime_label: string | null;
  sender_id: string;
  sender_name: string;
  sender_monthly_sent_count: number;
}

function MustWatchReceivedBlock({ items }: { items: MustWatchReceivedItem[] }) {
  return (
    <div>
      <SectionLabel>Sent to you</SectionLabel>
      <div className="space-y-2.5">
        {items.map((item) => (
          <Link
            key={item.rec_id}
            href={titleHref(item)}
            data-block="must_watch_received"
            className="flex gap-4 items-center relative overflow-hidden rounded-2xl p-4"
            style={{ background: CINE_DEEP, border: "1px solid rgba(212,175,55,0.5)", textDecoration: "none" }}
          >
            <Poster path={item.poster_path} width={56} height={84} radius={5} />
            <div className="flex-1 min-w-0">
              <p className="text-[8.5px] font-bold uppercase" style={{ letterSpacing: "0.2em", background: GOLD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                Must Watch
              </p>
              <p style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 21, color: "white", marginTop: 5, lineHeight: 1.1 }}>{item.title}</p>
              {item.runtime_label && <Mono style={{ fontSize: 9.5, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", display: "block", marginTop: 5 }}>{item.runtime_label}</Mono>}
              <div className="flex items-center gap-1.5 mt-2">
                <Avatar avatarUrl={null} displayName={item.sender_name} size={17} />
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {item.sender_name} {item.sender_monthly_sent_count <= 1 ? "has sent one all month" : `has sent ${item.sender_monthly_sent_count} this month`}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// --- Episodes aired --------------------------------------------------------------

interface EpisodeAiredItem {
  tmdb_id: number;
  media_type: "tv";
  title: string;
  poster_path: string | null;
  episode_label: string;
  air_date: string;
  friend_signal: string | null;
}

function EpisodesAiredBlock({ items }: { items: EpisodeAiredItem[] }) {
  return (
    <div>
      <SectionLabel right={`${items.length} tracked`}>New in shows you&apos;re on</SectionLabel>
      <div className="rounded-2xl px-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
        {items.map((item, i) => (
          <Link
            key={item.tmdb_id}
            href={titleHref(item)}
            data-block="episodes_aired"
            className="flex items-center gap-3 py-3"
            style={{ textDecoration: "none", borderBottom: i < items.length - 1 ? "0.5px solid var(--border)" : undefined }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--brand)", boxShadow: "0 0 0 4px rgba(255,87,87,0.14)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold" style={{ color: "var(--text-primary)" }}>{item.title} · {item.episode_label}</p>
              <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Aired {new Date(item.air_date).toLocaleDateString("en-US", { weekday: "long" })}
                {item.friend_signal && <> · <b style={{ color: "var(--brand)", fontWeight: 700 }}>{item.friend_signal}</b></>}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// --- Waiting on you ---------------------------------------------------------------

function WaitingOnYouBlock({
  items,
  onWatch,
  onDismiss,
}: {
  items: WaitingOnYouItem[];
  onWatch: (item: WaitingOnYouItem) => void;
  onDismiss: (item: WaitingOnYouItem) => void;
}) {
  return (
    <div>
      <SectionLabel right={`${items.length} unwatched`}>Waiting on you</SectionLabel>
      {items.map((item) => (
        <div key={item.rec_id} className="flex gap-3 items-center p-3 rounded-2xl mb-2" style={{ border: "0.5px solid var(--border)" }}>
          <Link href={titleHref(item)} data-block="waiting_on_you" style={{ textDecoration: "none" }}>
            <Poster path={item.poster_path} width={38} height={57} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-bold" style={{ color: "var(--text-primary)" }}>{item.title}</p>
            {item.runtime_label && <p className="text-[10px] mt-0.5" style={{ fontFamily: "var(--font-dm-mono)", color: "var(--text-muted)", textTransform: "uppercase" }}>{item.runtime_label}</p>}
            <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
              From {item.sender_name} <Mono style={{ fontSize: 10, color: item.age_days > 30 ? "var(--brand)" : "var(--text-muted)" }}>{item.age_days}d</Mono>
            </p>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              data-block="waiting_on_you"
              data-act="watch"
              onClick={() => onWatch(item)}
              className="text-[10.5px] font-bold px-3.5 py-2 rounded-full"
              style={{ background: "var(--text-primary)", color: "white", border: "none" }}
            >
              Watch
            </button>
            <button
              data-block="waiting_on_you"
              data-act="not_for_me"
              onClick={() => onDismiss(item)}
              className="text-[10.5px] font-bold px-3.5 py-2 rounded-full"
              style={{ background: "transparent", color: "var(--text-muted)", border: "0.5px solid var(--border)" }}
            >
              Not for me
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Hottest take -------------------------------------------------------------------

interface HottestTakeItem {
  tmdb_id: number;
  media_type: string;
  title: string;
  user_rating: number;
  circle_average: number;
  circle_rating_count: number;
}

function HottestTakeBlock({ item }: { item: HottestTakeItem }) {
  const lower = item.user_rating < item.circle_average;
  return (
    <div>
      <SectionLabel>Your hottest take</SectionLabel>
      <Link
        href={titleHref(item)}
        data-block="hottest_take"
        className="block px-4 py-4"
        style={{ textDecoration: "none", background: "var(--surface-2)", borderLeft: "3px solid var(--brand)", borderRadius: "0 10px 10px 0" }}
      >
        <p style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic", fontSize: 18, lineHeight: 1.3, color: "var(--text-primary)" }}>
          You&apos;re the only one in your circle who didn&apos;t {lower ? "love" : "dislike"} {item.title}.
        </p>
        <div className="flex gap-6 mt-3.5 pt-3" style={{ borderTop: "0.5px solid var(--border)" }}>
          <div>
            <p className="text-[9px] uppercase" style={{ letterSpacing: "0.09em", color: "var(--text-muted)" }}>You</p>
            <Mono style={{ fontSize: 17, color: "var(--brand)" }}>{item.user_rating}</Mono>
          </div>
          <div>
            <p className="text-[9px] uppercase" style={{ letterSpacing: "0.09em", color: "var(--text-muted)" }}>Your circle</p>
            <Mono style={{ fontSize: 17, color: "var(--text-primary)" }}>{item.circle_average}</Mono>
          </div>
          <div>
            <p className="text-[9px] uppercase" style={{ letterSpacing: "0.09em", color: "var(--text-muted)" }}>Ratings</p>
            <Mono style={{ fontSize: 17, color: "var(--text-primary)" }}>{item.circle_rating_count}</Mono>
          </div>
        </div>
      </Link>
    </div>
  );
}

// --- Taste twin -------------------------------------------------------------------

interface TasteTwinItem {
  friend_id: string;
  friend_name: string;
  shared_count: number;
  agree_count: number;
  agree_pct: number;
}

function TasteTwinBlock({ item }: { item: TasteTwinItem }) {
  const adaptive = item.shared_count >= 8;
  return (
    <div>
      <SectionLabel right="Rolling 30 days">Taste twin</SectionLabel>
      <Link
        href="/profile"
        data-block="taste_twin"
        className="block rounded-2xl p-4"
        style={{ textDecoration: "none", border: "0.5px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <Avatar avatarUrl={null} displayName={item.friend_name} size={40} />
          <div>
            <p className="text-[9px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "var(--text-muted)" }}>
              {adaptive ? "Closest match" : "Closest so far"}
            </p>
            <p style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 19, color: "var(--text-primary)", marginTop: 2 }}>{item.friend_name}</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full mt-4 overflow-hidden" style={{ background: "var(--border)" }}>
          <div style={{ height: "100%", width: `${item.agree_pct}%`, background: "var(--brand)", borderRadius: 999 }} />
        </div>
        <div className="flex justify-between mt-2.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          <span>
            You agreed on <Mono style={{ color: "var(--text-primary)" }}>{item.agree_count} of {item.shared_count}</Mono> shared titles
          </span>
          {adaptive && <Mono style={{ color: "var(--text-primary)" }}>{item.agree_pct}%</Mono>}
        </div>
      </Link>
    </div>
  );
}

// --- In your circle -------------------------------------------------------------------

interface CircleRatingItem {
  tmdb_id: number;
  media_type: string;
  title: string;
  poster_path: string | null;
  friend_id: string;
  friend_name: string;
  rating: number;
}

function CircleRatingsBlock({ items }: { items: CircleRatingItem[] }) {
  return (
    <div>
      <SectionLabel>In your circle</SectionLabel>
      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {items.map((item, i) => (
          <Link key={`${item.friend_id}-${item.tmdb_id}-${i}`} href={titleHref(item)} data-block="circle_ratings" style={{ width: 88, flexShrink: 0, textDecoration: "none" }}>
            <div style={{ position: "relative" }}>
              <Poster path={item.poster_path} width={88} height={126} radius={8} />
              <span
                className="absolute top-1.5 right-1.5 text-white"
                style={{ fontFamily: "var(--font-dm-mono)", fontSize: 10, background: "rgba(0,0,0,0.72)", padding: "2px 6px", borderRadius: 5 }}
              >
                {item.rating}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Avatar avatarUrl={null} displayName={item.friend_name} size={16} />
              <span className="text-[10.5px] truncate" style={{ color: "var(--text-secondary)" }}>{item.friend_name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// --- Trending -------------------------------------------------------------------

function TrendingBlock({ items }: { items: (DigestTrendingItem & { signal: string })[] }) {
  return (
    <div>
      <SectionLabel right="TMDB">Trending everywhere</SectionLabel>
      <div className="rounded-2xl px-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
        {items.map((item, i) => (
          <Link
            key={item.tmdb_id}
            href={titleHref(item)}
            data-block="trending"
            className="flex items-center gap-3 py-2.5"
            style={{ textDecoration: "none", borderBottom: i < items.length - 1 ? "1px dotted var(--border)" : undefined }}
          >
            <Mono style={{ fontSize: 12, color: "var(--text-muted)", width: 18, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</Mono>
            <Poster path={item.poster_path} width={30} height={44} radius={4} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{item.title}</p>
              <p className="text-[11px] mt-0.5" style={{ color: item.signal === "No one in your circle yet" ? "var(--text-muted)" : "var(--brand)", fontWeight: item.signal === "No one in your circle yet" ? 400 : 500 }}>
                {item.signal}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// --- Must Watch balance -------------------------------------------------------------------

interface MustWatchBalanceItem {
  remaining: number;
  total: number;
  cadence_days: number;
  days_until_reset: number | null;
}

function MustWatchBalanceBlock({ item }: { item: MustWatchBalanceItem }) {
  return (
    <Link
      href="/profile"
      data-block="must_watch_balance"
      className="flex items-center gap-4 rounded-2xl p-4"
      style={{ textDecoration: "none", background: CINE_DEEP, border: "1px solid rgba(212,175,55,0.35)" }}
    >
      <div className="flex-1">
        <p className="text-[8.5px] font-bold uppercase" style={{ letterSpacing: "0.2em", background: GOLD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          Your Must Watch
        </p>
        <p className="text-sm mt-1.5" style={{ color: "white" }}>
          <b style={{ background: GOLD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", fontWeight: 700 }}>
            {item.remaining} left
          </b>{" "}
          this cycle
        </p>
        <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          {item.days_until_reset != null ? `Resets in ${pluralize(item.days_until_reset, "day")}. ` : ""}
          Unused ones don&apos;t carry over.
        </p>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        {Array.from({ length: item.total }).map((_, i) => (
          <span key={i} style={{ width: 26, height: 3, borderRadius: 2, background: i < item.remaining ? undefined : "rgba(255,255,255,0.15)", backgroundImage: i < item.remaining ? GOLD : undefined }} />
        ))}
      </div>
    </Link>
  );
}

// --- Page ------------------------------------------------------------------------------

function DigestPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const { user } = useAuth();

  const [digest, setDigest] = useState<DigestEvent | null | undefined>(undefined);
  const [unratedItems, setUnratedItems] = useState<UnratedItem[]>([]);
  const [waitingItems, setWaitingItems] = useState<WaitingOnYouItem[]>([]);
  const [ratingTarget, setRatingTarget] = useState<UnratedItem | null>(null);
  const [viewLogged, setViewLogged] = useState(false);

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
      const d = (data?.[0] as DigestEvent | undefined) ?? null;
      setDigest(d);
      setUnratedItems(d?.metadata.unrated ?? []);
      setWaitingItems(d?.metadata.waiting_on_you ?? []);
    });
  }, [user, eventId]);

  useEffect(() => {
    if (!user || !digest || viewLogged || !digest.metadata.state) return;
    const supabase = getClient();
    const blocks: DigestBlockId[] = [];
    if (digest.metadata.payoff) blocks.push("payoff");
    if ((digest.metadata.unrated?.length ?? 0) > 0) blocks.push("unrated");
    if ((digest.metadata.must_watch_received?.length ?? 0) > 0) blocks.push("must_watch_received");
    if ((digest.metadata.episodes_aired?.length ?? 0) > 0) blocks.push("episodes_aired");
    if ((digest.metadata.waiting_on_you?.length ?? 0) > 0) blocks.push("waiting_on_you");
    if (digest.metadata.hottest_take) blocks.push("hottest_take");
    if (digest.metadata.taste_twin) blocks.push("taste_twin");
    if ((digest.metadata.circle_ratings?.length ?? 0) > 0) blocks.push("circle_ratings");
    if ((digest.metadata.trending_annotated?.length ?? 0) > 0) blocks.push("trending");
    if (digest.metadata.must_watch_balance) blocks.push("must_watch_balance");
    logDigestEvent(supabase, user.id, "digest_viewed", { digest_event_id: digest.id, state: digest.metadata.state, blocks }).then(() => setViewLogged(true));
  }, [user, digest, viewLogged]);

  const handleBlockTap = useCallback(
    (e: React.MouseEvent) => {
      if (!user) return;
      const target = (e.target as HTMLElement).closest("[data-block]") as HTMLElement | null;
      if (!target) return;
      const supabase = getClient();
      logDigestEvent(supabase, user.id, "digest_block_tapped", {
        digest_event_id: digest?.id,
        block_id: target.dataset.block,
        action: target.dataset.act ?? "navigate",
      });
    },
    [user, digest]
  );

  const handleRateSubmit = useCallback(
    async (rating: number | null) => {
      if (!ratingTarget) return;
      const supabase = getClient();
      await supabase.from("watchlist").update({ rating }).eq("id", ratingTarget.watchlist_id);
      if (user) {
        await logDigestEvent(supabase, user.id, "digest_action_completed", {
          digest_event_id: digest?.id,
          block_id: "unrated",
          action: "rate",
        });
      }
      setUnratedItems((prev) => prev.filter((i) => i.watchlist_id !== ratingTarget.watchlist_id));
    },
    [ratingTarget, user, digest]
  );

  const handleWatch = useCallback(
    async (item: WaitingOnYouItem) => {
      if (!user) return;
      const supabase = getClient();
      const now = new Date().toISOString();
      await supabase
        .from("watchlist")
        .upsert(
          { user_id: user.id, tmdb_id: item.tmdb_id, media_type: item.media_type, title: item.title, poster_path: item.poster_path, status: "to_watch", source: "recommendation" },
          { onConflict: "user_id,tmdb_id,media_type" }
        );
      await supabase.from("recommendations").update({ action_type: "watchlisted", actioned_at: now, read_at: now }).eq("id", item.rec_id);
      await logDigestEvent(supabase, user.id, "watchlist_add", { tmdb_id: item.tmdb_id, media_type: item.media_type, source: "digest" });
      await logDigestEvent(supabase, user.id, "digest_action_completed", { digest_event_id: digest?.id, block_id: "waiting_on_you", action: "watch" });
      setWaitingItems((prev) => prev.filter((i) => i.rec_id !== item.rec_id));
    },
    [user, digest]
  );

  const handleDismiss = useCallback(
    async (item: WaitingOnYouItem) => {
      if (!user) return;
      const supabase = getClient();
      const now = new Date().toISOString();
      // Deliberately does not write to `events` or notify the sender — silent
      // dismissal is the spec'd behavior for "Not for me" in this block.
      await supabase.from("recommendations").update({ dismissed_at: now, actioned_at: now, action_type: "dismissed" }).eq("id", item.rec_id);
      setWaitingItems((prev) => prev.filter((i) => i.rec_id !== item.rec_id));
    },
    [user]
  );

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

  const m = digest.metadata;
  const isV2 = !!m.state;

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg)" }} onClick={handleBlockTap}>
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
          <span className="text-[10px] uppercase" style={{ letterSpacing: "0.13em", color: "var(--text-muted)" }}>{formatRange(m.window_start, m.window_end)}</span>
        </div>

        {isV2 ? (
          m.state === "thin" ? (
            <ThinState metadata={m} onRate={setRatingTarget} onWatch={handleWatch} onDismiss={handleDismiss} unratedItems={unratedItems} waitingItems={waitingItems} />
          ) : (
            <FullState metadata={m} onRate={setRatingTarget} onWatch={handleWatch} onDismiss={handleDismiss} unratedItems={unratedItems} waitingItems={waitingItems} />
          )
        ) : (
          <LegacyDigest metadata={m} />
        )}

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
        mediaType={(ratingTarget?.media_type as "movie" | "tv") ?? undefined}
      />
    </div>
  );
}

function FullState({
  metadata: m,
  onRate,
  onWatch,
  onDismiss,
  unratedItems,
  waitingItems,
}: {
  metadata: DigestEvent["metadata"];
  onRate: (item: UnratedItem) => void;
  onWatch: (item: WaitingOnYouItem) => void;
  onDismiss: (item: WaitingOnYouItem) => void;
  unratedItems: UnratedItem[];
  waitingItems: WaitingOnYouItem[];
}) {
  const hero = m.hero_block_id;
  return (
    <div className="space-y-7">
      {m.payoff && <PayoffBlock payoff={m.payoff as { items: DigestActivityItem[]; count: number; prior_week_count: number }} isHero={hero === "payoff"} />}
      {unratedItems.length > 0 && <UnratedBlock items={unratedItems} onRate={onRate} />}
      {(m.must_watch_received?.length ?? 0) > 0 && <MustWatchReceivedBlock items={m.must_watch_received as unknown as MustWatchReceivedItem[]} />}
      {(m.episodes_aired?.length ?? 0) > 0 && <EpisodesAiredBlock items={m.episodes_aired as unknown as EpisodeAiredItem[]} />}
      {waitingItems.length > 0 && <WaitingOnYouBlock items={waitingItems} onWatch={onWatch} onDismiss={onDismiss} />}
      {m.hottest_take && <HottestTakeBlock item={m.hottest_take as unknown as HottestTakeItem} />}
      {m.taste_twin && <TasteTwinBlock item={m.taste_twin as unknown as TasteTwinItem} />}
      {(m.circle_ratings?.length ?? 0) > 0 && <CircleRatingsBlock items={m.circle_ratings as unknown as CircleRatingItem[]} />}
      {(m.trending_annotated?.length ?? 0) > 0 && <TrendingBlock items={m.trending_annotated as unknown as (DigestTrendingItem & { signal: string })[]} />}
      {m.must_watch_balance && <MustWatchBalanceBlock item={m.must_watch_balance as unknown as MustWatchBalanceItem} />}
    </div>
  );
}

function ThinState({
  metadata: m,
  onRate,
  onWatch,
  onDismiss,
  unratedItems,
  waitingItems,
}: {
  metadata: DigestEvent["metadata"];
  onRate: (item: UnratedItem) => void;
  onWatch: (item: WaitingOnYouItem) => void;
  onDismiss: (item: WaitingOnYouItem) => void;
  unratedItems: UnratedItem[];
  waitingItems: WaitingOnYouItem[];
}) {
  const mustWatch = (m.must_watch_received as unknown as MustWatchReceivedItem[] | undefined) ?? [];
  const picks = [...mustWatch.map((mw) => ({ kind: "must_watch" as const, item: mw })), ...waitingItems.slice(0, 2 - mustWatch.length).map((w) => ({ kind: "waiting" as const, item: w }))].slice(0, 2);
  const pickedRecIds = new Set(picks.filter((p) => p.kind === "waiting").map((p) => (p.item as WaitingOnYouItem).rec_id));

  const everythingElse: { icon: string; text: string; sub: string; href: string }[] = [];
  if (m.payoff) {
    const p = m.payoff as { count: number };
    everythingElse.push({ icon: "🎯", text: `${pluralizePeople(p.count)} watched because of you.`, sub: "See who.", href: "/profile" });
  }
  if (waitingItems.length > picks.length) {
    everythingElse.push({ icon: "📥", text: `${waitingItems.length - pickedRecIds.size} more waiting on you.`, sub: "Still unopened.", href: "/digest" });
  }
  if (m.must_watch_balance) {
    const b = m.must_watch_balance as unknown as MustWatchBalanceItem;
    everythingElse.push({ icon: "⭐", text: `${pluralizeMustWatch(b.remaining)} left.`, sub: "Unused ones don't carry over.", href: "/profile" });
  }
  if ((m.trending_annotated?.length ?? 0) > 0) {
    const t = (m.trending_annotated as unknown as (DigestTrendingItem & { signal: string })[])[0];
    everythingElse.push({ icon: "🌍", text: `${t.title} is trending.`, sub: t.signal, href: titleHref(t) });
  }

  return (
    <div>
      <div className="px-1 pb-6">
        <p className="text-[10px] font-bold uppercase mb-2.5" style={{ letterSpacing: "0.18em", color: "var(--brand)" }}>Quiet week</p>
        <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 32, lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          A few things worth <em style={{ fontStyle: "italic", color: "var(--brand)" }}>ten minutes.</em>
        </h2>
        <p className="text-[13px] mt-3.5" style={{ color: "var(--text-secondary)" }}>Not much moved in your circle. Here&apos;s what&apos;s still worth your evening.</p>
      </div>

      {unratedItems.length > 0 && (
        <div className="mb-7">
          <UnratedBlock items={unratedItems} onRate={onRate} />
        </div>
      )}

      <div className="space-y-2.5 mb-7">
        {picks.map((p, i) =>
          p.kind === "must_watch" ? (
            <MustWatchReceivedBlock key={`mw-${i}`} items={[p.item as MustWatchReceivedItem]} />
          ) : (
            <WaitingOnYouBlock key={`w-${i}`} items={[p.item as WaitingOnYouItem]} onWatch={onWatch} onDismiss={onDismiss} />
          )
        )}
      </div>

      {everythingElse.length > 0 && (
        <div className="pt-6" style={{ borderTop: "8px solid var(--surface-2)" }}>
          <p className="text-[10px] font-bold uppercase mb-3.5" style={{ letterSpacing: "0.18em", color: "var(--text-muted)" }}>Everything else</p>
          {everythingElse.map((e, i) => (
            <Link
              key={i}
              href={e.href}
              data-block="everything_else"
              className="flex items-start gap-3 py-3"
              style={{ textDecoration: "none", borderBottom: i < everythingElse.length - 1 ? "0.5px solid var(--border)" : undefined }}
            >
              <span className="w-6.5 h-6.5 rounded-lg flex items-center justify-center flex-shrink-0 text-sm" style={{ background: "var(--surface-2)", width: 26, height: 26 }}>
                {e.icon}
              </span>
              <div className="flex-1">
                <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>{e.text}</p>
                <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>{e.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Legacy (pre-redesign digest_sent rows) -------------------------------------------

function LegacyActivityRow({ item, subtitle }: { item: DigestActivityItem; subtitle: string }) {
  return (
    <Link href={titleHref(item)} className="flex items-center gap-3 py-2" style={{ textDecoration: "none" }}>
      <Poster path={item.poster_path} width={48} height={72} radius={8} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold line-clamp-1" style={{ color: "var(--text-primary)" }}>{item.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
      </div>
    </Link>
  );
}

function LegacyFriendRow({ item }: { item: DigestFriendActivityItem }) {
  const action = item.kind === "friend_rating" ? `rated it ${item.rating}/10` : item.kind === "friend_watchlist_add" ? "added it to their watchlist" : "recommended it to you";
  return (
    <Link href={titleHref(item)} className="flex items-center gap-3 py-2" style={{ textDecoration: "none" }}>
      <Poster path={item.poster_path} width={28} height={42} radius={6} />
      <div className="flex-1 min-w-0">
        <p className="text-sm line-clamp-2" style={{ color: "var(--text-primary)" }}>
          <span className="font-semibold">{item.friend_name}</span> {action}
        </p>
        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-secondary)" }}>{item.title}</p>
      </div>
    </Link>
  );
}

function LegacyDigest({ metadata: m }: { metadata: DigestEvent["metadata"] }) {
  const own = m.own_activity;
  const friend = m.friend_activity ?? [];
  const trending = m.trending ?? [];
  return (
    <div className="space-y-5">
      {own && own.rec_watched.length > 0 && (
        <div>
          <SectionLabel>Your picks landed</SectionLabel>
          <div className="rounded-2xl px-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
            {own.rec_watched.map((item, i) => (
              <LegacyActivityRow key={`${item.tmdb_id}-${i}`} item={item} subtitle={item.recipient_rating != null ? `Watched and rated ${item.recipient_rating}/10` : "Watched"} />
            ))}
          </div>
        </div>
      )}
      {own && (own.rated.length > 0 || own.watched.length > 0 || own.watchlist_add.length > 0) && (
        <div>
          <SectionLabel>Your activity</SectionLabel>
          <div className="rounded-2xl px-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
            {own.rated.map((item, i) => <LegacyActivityRow key={`r-${i}`} item={item} subtitle={`You rated it ${item.rating}/10`} />)}
            {own.watched.map((item, i) => <LegacyActivityRow key={`w-${i}`} item={item} subtitle="You watched this" />)}
            {own.watchlist_add.map((item, i) => <LegacyActivityRow key={`a-${i}`} item={item} subtitle="Added to your watchlist" />)}
          </div>
        </div>
      )}
      {friend.length > 0 && (
        <div>
          <SectionLabel>Friends</SectionLabel>
          <div className="rounded-2xl px-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
            {friend.map((item, i) => <LegacyFriendRow key={`${item.friend_id}-${i}`} item={item} />)}
          </div>
        </div>
      )}
      {trending.length > 0 && (
        <div>
          <SectionLabel>Trending for you</SectionLabel>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {trending.map((item, i) => (
              <Link key={`${item.tmdb_id}-${i}`} href={titleHref(item)} style={{ width: 90, flexShrink: 0, textDecoration: "none" }}>
                <Poster path={item.poster_path} width={90} height={135} radius={10} />
                <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "var(--text-primary)" }}>{item.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
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
