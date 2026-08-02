// Weekly digest v2 — content redesign. Delivery mechanism (cron trigger,
// push send, events snapshot) is unchanged from v1; this rewrites what
// gets computed and stored into the digest_sent event's metadata.
//
// Historical digest_sent rows keep their v1 shape (own_activity/
// friend_activity/trending) forever — this function only ever writes the
// new v2 block shape going forward. app/digest/page.tsx renders whichever
// shape a given event actually has.
//
// Two blocks from the original spec are deliberately not built:
// - "Invite" (recommended-to-a-non-WIW-contact) has no underlying data
//   anywhere in this app — recommendations.receiver_id is always a real
//   profile. Not a query gap, a missing feature. Omitted entirely.
// - Episode/season *progress* (the mockup's "2/10", "Priya is 2 ahead of
//   you") doesn't exist — no episode-level tracking anywhere. The
//   episodes_aired block renders air-date + friend-signal only, matching
//   the written spec's own degraded-v1 instruction.
import { createClient } from "jsr:@supabase/supabase-js@2";
// @ts-ignore
import webpush from "npm:web-push@3";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CONCURRENCY = 8;
const TMDB_API_KEY = "78c87308e5caf2d13af3381e0e94958c";
const TASTE_AGREEMENT_TOLERANCE = 2; // out of 10 — ratings within this delta count as "agree". Not spec-defined, documented default.
const HOTTEST_TAKE_MIN_CIRCLE = 3;
const MUST_WATCH_DEFAULT_TOTAL = 3;
const CIRCLE_RATINGS_CAP = 8;
const TRENDING_CAP = 4;
const WAITING_ON_YOU_CAP = 4;
const UNRATED_CAP = 5;

const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://getwiwapp.com";

type Json = Record<string, unknown>;

function titleKey(tmdbId: number, mediaType: string) {
  return `${mediaType}-${tmdbId}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function daysBetween(later: Date, earlier: Date) {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 86400000));
}

// Shared across the whole run — many users share overlapping watchlists,
// so this keeps TMDB call volume proportional to unique titles, not users.
const tmdbCache = new Map<string, Promise<Json | null>>();
function getTMDBDetails(mediaType: string, tmdbId: number): Promise<Json | null> {
  const key = titleKey(tmdbId, mediaType);
  if (!tmdbCache.has(key)) {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const p = fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
    tmdbCache.set(key, p);
  }
  return tmdbCache.get(key)!;
}

function formatRuntimeLabel(mediaType: string, details: Json | null): string | null {
  if (!details) return null;
  if (mediaType === "movie") {
    const runtime = details.runtime as number | undefined;
    if (!runtime) return null;
    const h = Math.floor(runtime / 60);
    const m = runtime % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  const episodes = details.number_of_episodes as number | undefined;
  const runtimes = details.episode_run_time as number[] | undefined;
  const perEp = runtimes && runtimes.length > 0 ? runtimes[0] : null;
  if (!episodes) return null;
  return perEp ? `${episodes} eps · ${perEp} min` : `${episodes} eps`;
}

Deno.serve(async (req) => {
  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dry_run === true;
  } catch {
    // No body (or non-JSON) — cron's fixed '{}' payload. Default false.
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, supabaseKey);

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidEmail = Deno.env.get("VAPID_EMAIL")!;
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS).toISOString();
  const windowEnd = now.toISOString();
  const priorWindowStart = new Date(now.getTime() - 2 * WINDOW_MS).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS).toISOString();

  // Trending is the same for every user this run — fetch it once. This IS
  // the "weekly cached snapshot": one fetch per cron run, reused by every
  // user's trending_annotated block, never a live call at page-render time.
  let trendingRaw: Json[] = [];
  try {
    const res = await fetch(`${APP_BASE_URL}/api/tmdb-trending?mediaType=all&timeWindow=week`);
    if (res.ok) {
      const data = await res.json();
      trendingRaw = Array.isArray(data.results) ? data.results : [];
    }
  } catch {
    // Leave empty — trending_annotated suppresses cleanly downstream.
  }
  const trendingTop10 = trendingRaw.slice(0, 10).map((r) => ({
    tmdb_id: r.id as number,
    media_type: (r.media_type as string) ?? "movie",
    title: (r.title as string) ?? (r.name as string) ?? "Untitled",
    poster_path: (r.poster_path as string | null) ?? null,
  }));

  // Must Watch cadence/reset config — one read for the whole run.
  const { data: configRows } = await admin
    .from("app_config")
    .select("key, value")
    .in("key", ["must_watch_last_reset_at", "must_watch_reset_cadence_days"]);
  const configMap = new Map((configRows ?? []).map((c) => [c.key as string, c.value as string]));
  const mustWatchCadenceDays = parseInt(configMap.get("must_watch_reset_cadence_days") ?? "30", 10);
  const mustWatchLastReset = configMap.get("must_watch_last_reset_at");

  const { data: subs, error: subsErr } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  if (subsErr) {
    return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0, sent: 0 }), { status: 200 });
  }

  // must_watch_remaining for every subscribed user, batched once.
  const { data: profileRows } = await admin
    .from("profiles")
    .select("id, must_watch_remaining")
    .in("id", subs.map((s) => s.user_id));
  const mustWatchRemainingById = new Map((profileRows ?? []).map((p) => [p.id as string, (p.must_watch_remaining as number) ?? MUST_WATCH_DEFAULT_TOTAL]));

  let sent = 0;
  let skippedAlreadySent = 0;
  let errors = 0;
  const dryRunResults: Json[] = [];

  for (const batch of chunk(subs, CONCURRENCY)) {
    await Promise.all(
      batch.map(async (sub) => {
        const userId = sub.user_id as string;
        try {
          // Dry runs never write anything, so there's nothing for this guard
          // to protect — skipping it here is what lets dry_run inspect a
          // user who already got a real digest this window.
          if (!dryRun) {
            const { data: alreadySent } = await admin
              .from("events")
              .select("id")
              .eq("user_id", userId)
              .eq("event_type", "digest_sent")
              .gte("created_at", windowStart)
              .limit(1)
              .maybeSingle();
            if (alreadySent) {
              skippedAlreadySent++;
              return;
            }
          }

          // --- foundational per-user data --------------------------------------
          const { data: myWatchlistRaw } = await admin
            .from("watchlist")
            .select("id, tmdb_id, media_type, title, poster_path, status, rating, watched_at, created_at")
            .eq("user_id", userId);
          const myWatchlist = myWatchlistRaw ?? [];
          const byKey = new Map<string, Json>();
          for (const w of myWatchlist) byKey.set(titleKey(w.tmdb_id as number, w.media_type as string), w);

          const { data: friendRows } = await admin
            .from("friendships")
            .select("friend_id")
            .eq("user_id", userId)
            .eq("status", "accepted");
          const friendIds = (friendRows ?? []).map((f) => f.friend_id as string);

          const nameById = new Map<string, string>();
          let friendWatchlist: Json[] = [];
          const friendWatchlistByTitleKey = new Map<string, Json[]>();
          const friendWatchlistByFriendTitle = new Map<string, Json>();
          const myRecent30d = new Map<string, number>();
          const friendRecent30d = new Map<string, Map<string, number>>();
          const circleRatingsThisWeek: { friend_id: string; tmdb_id: number; media_type: string; rating: number; created_at: string }[] = [];

          if (friendIds.length > 0) {
            const [{ data: fwl }, { data: fps }, { data: ratingEvents }] = await Promise.all([
              admin.from("watchlist").select("user_id, tmdb_id, media_type, title, poster_path, rating").in("user_id", friendIds),
              admin.from("profiles").select("id, display_name, username").in("id", friendIds),
              admin
                .from("events")
                .select("user_id, metadata, created_at")
                .in("user_id", [userId, ...friendIds])
                .eq("event_type", "rating_set")
                .gte("created_at", thirtyDaysAgo)
                .order("created_at", { ascending: false }),
            ]);

            friendWatchlist = fwl ?? [];
            for (const w of friendWatchlist) {
              const key = titleKey(w.tmdb_id as number, w.media_type as string);
              if (!friendWatchlistByTitleKey.has(key)) friendWatchlistByTitleKey.set(key, []);
              friendWatchlistByTitleKey.get(key)!.push(w);
              friendWatchlistByFriendTitle.set(`${w.user_id}-${key}`, w);
            }
            for (const p of fps ?? []) {
              nameById.set(p.id as string, (p.display_name as string) || (p.username as string) || "A friend");
            }

            const seenMine = new Set<string>();
            const seenFriend = new Set<string>();
            for (const ev of ratingEvents ?? []) {
              const meta = (ev.metadata ?? {}) as Json;
              const rating = meta.rating as number | null;
              if (rating == null) continue;
              const key = titleKey(meta.tmdb_id as number, meta.media_type as string);
              if (ev.user_id === userId) {
                if (seenMine.has(key)) continue;
                seenMine.add(key);
                myRecent30d.set(key, rating);
              } else {
                const dedupeKey = `${ev.user_id}-${key}`;
                if (seenFriend.has(dedupeKey)) continue;
                seenFriend.add(dedupeKey);
                if (!friendRecent30d.has(ev.user_id as string)) friendRecent30d.set(ev.user_id as string, new Map());
                friendRecent30d.get(ev.user_id as string)!.set(key, rating);
                if ((ev.created_at as string) >= windowStart) {
                  circleRatingsThisWeek.push({
                    friend_id: ev.user_id as string,
                    tmdb_id: meta.tmdb_id as number,
                    media_type: meta.media_type as string,
                    rating,
                    created_at: ev.created_at as string,
                  });
                }
              }
            }
          }

          const { data: recsReceivedRaw } = await admin
            .from("recommendations")
            .select("id, sender_id, tmdb_id, media_type, title, poster_path, is_must_watch, action_type, created_at")
            .eq("receiver_id", userId);
          const recsReceived = recsReceivedRaw ?? [];
          const mustWatchCandidates = recsReceived.filter((r) => r.is_must_watch && r.action_type == null);
          const waitingOnYouCandidates = recsReceived
            .filter((r) => !r.is_must_watch && r.action_type == null)
            .sort((a, b) => ((a.created_at as string) < (b.created_at as string) ? -1 : 1))
            .slice(0, WAITING_ON_YOU_CAP);

          const { data: recWatchedNotifs } = await admin
            .from("notifications")
            .select("metadata, created_at")
            .eq("recipient_id", userId)
            .eq("notification_type", "rec_watched")
            .gte("created_at", windowStart)
            .order("created_at", { ascending: false });
          const { count: priorPayoffCountRaw } = await admin
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", userId)
            .eq("notification_type", "rec_watched")
            .gte("created_at", priorWindowStart)
            .lt("created_at", windowStart);
          const priorPayoffCount = priorPayoffCountRaw ?? 0;

          // Names we don't already have from the friends batch.
          const extraIds = new Set<string>();
          for (const n of recWatchedNotifs ?? []) {
            const rid = (n.metadata as Json)?.recipient_id as string | undefined;
            if (rid && !nameById.has(rid)) extraIds.add(rid);
          }
          for (const r of [...mustWatchCandidates, ...waitingOnYouCandidates]) {
            if (!nameById.has(r.sender_id as string)) extraIds.add(r.sender_id as string);
          }
          if (extraIds.size > 0) {
            const { data: extraProfiles } = await admin.from("profiles").select("id, display_name, username").in("id", [...extraIds]);
            for (const p of extraProfiles ?? []) {
              nameById.set(p.id as string, (p.display_name as string) || (p.username as string) || "A friend");
            }
          }

          // --- 1. Payoff -----------------------------------------------------
          // notifications.metadata never stored poster_path (only content_title)
          // — resolve it via the underlying recommendations row instead.
          const payoffRecIds = (recWatchedNotifs ?? []).map((n) => (n.metadata as Json)?.rec_id as string).filter(Boolean);
          const payoffPosterByRecId = new Map<string, string | null>();
          if (payoffRecIds.length > 0) {
            const { data: payoffRecs } = await admin.from("recommendations").select("id, poster_path").in("id", payoffRecIds);
            for (const r of payoffRecs ?? []) payoffPosterByRecId.set(r.id as string, r.poster_path as string | null);
          }
          const payoffItems = (recWatchedNotifs ?? []).map((n) => {
            const meta = (n.metadata as Json) ?? {};
            const rating = (meta.recipient_rating as number | null) ?? null;
            return {
              tmdb_id: meta.tmdb_id as number,
              media_type: meta.media_type as string,
              title: meta.content_title as string,
              poster_path: payoffPosterByRecId.get(meta.rec_id as string) ?? null,
              friend_id: meta.recipient_id as string,
              friend_name: nameById.get(meta.recipient_id as string) ?? "A friend",
              action: rating != null ? "rated" : "watched",
              rating,
              created_at: n.created_at as string,
            };
          });
          const payoff = payoffItems.length > 0 ? { items: payoffItems, count: payoffItems.length, prior_week_count: priorPayoffCount } : null;

          // --- 2. Unrated ------------------------------------------------------
          const unrated = myWatchlist
            .filter((w) => w.status === "watched" && w.rating == null && w.title)
            .sort((a, b) => {
              const ad = (a.watched_at as string) ?? (a.created_at as string);
              const bd = (b.watched_at as string) ?? (b.created_at as string);
              return ad < bd ? 1 : -1;
            })
            .slice(0, UNRATED_CAP)
            .map((w) => ({
              watchlist_id: w.id as string,
              tmdb_id: w.tmdb_id as number,
              media_type: w.media_type as string,
              title: w.title as string,
              poster_path: w.poster_path as string | null,
              watched_at: (w.watched_at as string) ?? (w.created_at as string),
            }));

          // --- 3. Must Watch received -------------------------------------------
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const senderSpendCache = new Map<string, Promise<number>>();
          const getSenderMonthlySpend = (senderId: string) => {
            if (!senderSpendCache.has(senderId)) {
              senderSpendCache.set(
                senderId,
                admin
                  .from("events")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", senderId)
                  .eq("event_type", "must_watch_sent")
                  .gte("created_at", monthStart)
                  .then(({ count }) => count ?? 0)
              );
            }
            return senderSpendCache.get(senderId)!;
          };
          const mustWatchReceived = await Promise.all(
            mustWatchCandidates.map(async (r) => {
              const details = await getTMDBDetails(r.media_type as string, r.tmdb_id as number);
              return {
                rec_id: r.id as string,
                tmdb_id: r.tmdb_id as number,
                media_type: r.media_type as string,
                title: r.title as string,
                poster_path: r.poster_path as string | null,
                runtime_label: formatRuntimeLabel(r.media_type as string, details),
                sender_id: r.sender_id as string,
                sender_name: nameById.get(r.sender_id as string) ?? "A friend",
                sender_monthly_sent_count: await getSenderMonthlySpend(r.sender_id as string),
              };
            })
          );

          // --- 4. Episodes aired -------------------------------------------------
          const trackedShowIds = [...new Set(myWatchlist.filter((w) => w.media_type === "tv").map((w) => w.tmdb_id as number))];
          const episodesAiredRaw = await Promise.all(
            trackedShowIds.map(async (tmdbId) => {
              const details = await getTMDBDetails("tv", tmdbId);
              if (!details) return null;
              const lastEp = details.last_episode_to_air as Json | null;
              if (!lastEp || !lastEp.air_date) return null;
              const airDate = lastEp.air_date as string;
              if (airDate < windowStart.slice(0, 10) || airDate > windowEnd.slice(0, 10)) return null;
              const key = titleKey(tmdbId, "tv");
              const watchlistRow = byKey.get(key);
              const friendsForTitle = friendWatchlistByTitleKey.get(key) ?? [];
              const ratedFriend = friendsForTitle.find((f) => f.rating != null);
              const friendSignal = ratedFriend
                ? `${nameById.get(ratedFriend.user_id as string) ?? "A friend"} rated it`
                : friendsForTitle.length > 0
                ? `${nameById.get(friendsForTitle[0].user_id as string) ?? "A friend"} is watching this too`
                : null;
              return {
                tmdb_id: tmdbId,
                media_type: "tv",
                title: (watchlistRow?.title as string) ?? (details.name as string) ?? "Untitled",
                poster_path: (watchlistRow?.poster_path as string | null) ?? (details.poster_path as string | null) ?? null,
                episode_label: `S${lastEp.season_number} E${lastEp.episode_number}`,
                air_date: airDate,
                friend_signal: friendSignal,
                caught_up: false,
              };
            })
          );
          const episodesAired = episodesAiredRaw.filter((e): e is NonNullable<typeof e> => e != null);

          // --- 5. Waiting on you ---------------------------------------------------
          const waitingOnYou = await Promise.all(
            waitingOnYouCandidates.map(async (r) => {
              const details = await getTMDBDetails(r.media_type as string, r.tmdb_id as number);
              return {
                rec_id: r.id as string,
                tmdb_id: r.tmdb_id as number,
                media_type: r.media_type as string,
                title: r.title as string,
                poster_path: r.poster_path as string | null,
                runtime_label: formatRuntimeLabel(r.media_type as string, details),
                sender_id: r.sender_id as string,
                sender_name: nameById.get(r.sender_id as string) ?? "A friend",
                created_at: r.created_at as string,
                age_days: daysBetween(now, new Date(r.created_at as string)),
              };
            })
          );

          // --- 6. Hottest take ------------------------------------------------------
          let hottestTake: Json | null = null;
          if (friendIds.length > 0) {
            let maxDiff = -1;
            for (const w of myWatchlist) {
              // Skip rows with no title — a known pre-existing data quirk:
              // setRating() can insert a watchlist row with title: "" when
              // rating something not already on the list. Not something to
              // silently spotlight in a hero card.
              if (w.rating == null || !w.title) continue;
              const key = titleKey(w.tmdb_id as number, w.media_type as string);
              const circleRatings = (friendWatchlistByTitleKey.get(key) ?? []).map((f) => f.rating as number | null).filter((r): r is number => r != null);
              if (circleRatings.length < HOTTEST_TAKE_MIN_CIRCLE) continue;
              const avg = circleRatings.reduce((a, b) => a + b, 0) / circleRatings.length;
              const diff = Math.abs((w.rating as number) - avg);
              if (diff > maxDiff) {
                maxDiff = diff;
                hottestTake = {
                  tmdb_id: w.tmdb_id,
                  media_type: w.media_type,
                  title: w.title,
                  user_rating: w.rating,
                  circle_average: Math.round(avg * 10) / 10,
                  circle_rating_count: circleRatings.length,
                };
              }
            }
          }

          // --- 7. Taste twin --------------------------------------------------------
          let tasteTwin: Json | null = null;
          if (myRecent30d.size > 0 && friendRecent30d.size > 0) {
            let best: { friendId: string; shared: number; agree: number; pct: number } | null = null;
            for (const [friendId, ratings] of friendRecent30d) {
              let shared = 0;
              let agree = 0;
              for (const [key, myRating] of myRecent30d) {
                const theirRating = ratings.get(key);
                if (theirRating == null) continue;
                shared++;
                if (Math.abs(myRating - theirRating) <= TASTE_AGREEMENT_TOLERANCE) agree++;
              }
              if (shared === 0) continue;
              const pct = Math.round((agree / shared) * 100);
              if (!best || pct > best.pct || (pct === best.pct && shared > best.shared)) {
                best = { friendId, shared, agree, pct };
              }
            }
            if (best) {
              tasteTwin = {
                friend_id: best.friendId,
                friend_name: nameById.get(best.friendId) ?? "A friend",
                shared_count: best.shared,
                agree_count: best.agree,
                agree_pct: best.pct,
              };
            }
          }

          // --- 8. In your circle (circle ratings this week) -------------------------
          const seenCircle = new Set<string>();
          const circleRatings: Json[] = [];
          for (const c of circleRatingsThisWeek) {
            const key = `${c.friend_id}-${titleKey(c.tmdb_id, c.media_type)}`;
            if (seenCircle.has(key)) continue;
            seenCircle.add(key);
            const w = friendWatchlistByFriendTitle.get(key);
            if (!w) continue;
            circleRatings.push({
              tmdb_id: c.tmdb_id,
              media_type: c.media_type,
              title: w.title as string,
              poster_path: w.poster_path as string | null,
              friend_id: c.friend_id,
              friend_name: nameById.get(c.friend_id) ?? "A friend",
              rating: c.rating,
            });
            if (circleRatings.length >= CIRCLE_RATINGS_CAP) break;
          }

          // --- 9. Trending, annotated -------------------------------------------------
          const trendingAnnotated = trendingTop10
            .filter((t) => !byKey.has(titleKey(t.tmdb_id, t.media_type)))
            .slice(0, TRENDING_CAP)
            .map((t) => {
              const key = titleKey(t.tmdb_id, t.media_type);
              const friendsForTitle = friendWatchlistByTitleKey.get(key) ?? [];
              const ratedFriend = friendsForTitle.find((f) => f.rating != null);
              let signal: string;
              if (ratedFriend) {
                signal = `${nameById.get(ratedFriend.user_id as string) ?? "A friend"} rated it ${ratedFriend.rating}/10`;
              } else if (friendsForTitle.length > 0) {
                signal = `${friendsForTitle.length} friend${friendsForTitle.length === 1 ? "" : "s"} have it saved`;
              } else {
                signal = "No one in your circle yet";
              }
              return { ...t, signal };
            });

          // --- 10. Must Watch balance --------------------------------------------------
          const remaining = mustWatchRemainingById.get(userId) ?? MUST_WATCH_DEFAULT_TOTAL;
          const daysUntilReset = mustWatchLastReset
            ? Math.max(0, mustWatchCadenceDays - daysBetween(now, new Date(mustWatchLastReset)))
            : null;
          const mustWatchBalance = {
            remaining,
            total: MUST_WATCH_DEFAULT_TOTAL,
            cadence_days: mustWatchCadenceDays,
            days_until_reset: daysUntilReset,
          };

          // --- hero promotion + thin-state detection --------------------------------
          const blockOrder: [string, boolean][] = [
            ["payoff", payoff != null],
            ["unrated", unrated.length > 0],
            ["must_watch_received", mustWatchReceived.length > 0],
            ["episodes_aired", episodesAired.length > 0],
            ["waiting_on_you", waitingOnYou.length > 0],
            ["hottest_take", hottestTake != null],
            ["taste_twin", tasteTwin != null],
            ["circle_ratings", circleRatings.length > 0],
            ["trending", trendingAnnotated.length > 0],
            ["must_watch_balance", mustWatchBalance.remaining > 0],
          ];
          const populatedCount = blockOrder.filter(([, has]) => has).length;
          const heroBlockId = blockOrder.find(([, has]) => has)?.[0] ?? "trending";
          const state: "full" | "thin" = populatedCount < 3 ? "thin" : "full";

          if (dryRun) {
            dryRunResults.push({
              user_id: userId,
              state,
              hero_block_id: heroBlockId,
              populated_count: populatedCount,
              payoff,
              unrated,
              must_watch_received: mustWatchReceived,
              episodes_aired: episodesAired,
              waiting_on_you: waitingOnYou,
              hottest_take: hottestTake,
              taste_twin: tasteTwin,
              circle_ratings: circleRatings,
              trending_annotated: trendingAnnotated,
              must_watch_balance: mustWatchBalance,
            });
            sent++;
            return;
          }

          // --- push (placeholder copy — see supabase/functions/weekly-digest note) ---
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({
                title: "[PLACEHOLDER - pending copy approval]",
                body: "[PLACEHOLDER]",
                url: "/digest",
              })
            );
          } catch (pushErr: unknown) {
            const statusCode = (pushErr as { statusCode?: number })?.statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await admin.from("push_subscriptions").delete().eq("user_id", userId);
            }
            throw pushErr;
          }

          const { error: logErr } = await admin.from("events").insert({
            user_id: userId,
            event_type: "digest_sent",
            metadata: {
              window_start: windowStart,
              window_end: windowEnd,
              state,
              hero_block_id: heroBlockId,
              payoff,
              unrated,
              must_watch_received: mustWatchReceived,
              episodes_aired: episodesAired,
              waiting_on_you: waitingOnYou,
              hottest_take: hottestTake,
              taste_twin: tasteTwin,
              circle_ratings: circleRatings,
              trending_annotated: trendingAnnotated,
              must_watch_balance: mustWatchBalance,
            },
          });
          if (logErr) {
            console.error("[weekly-digest] digest_sent event insert failed for", userId, logErr);
            errors++;
          }

          sent++;
        } catch (err) {
          console.error("[weekly-digest] failed for user", userId, err);
          errors++;
        }
      })
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      dry_run: dryRun,
      processed: subs.length,
      sent,
      skipped_already_sent: skippedAlreadySent,
      errors,
      ...(dryRun ? { results: dryRunResults } : {}),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
