// Weekly digest: aggregates a user's own activity, friend activity, and
// trending suggestions from the prior 7 days, then pushes a notification
// linking to /digest (screen not built yet — deep link is a stub).
//
// Schema note: this project's live DB has drifted from its tracked
// migrations more than once (see migration 014 / commit "sendPushToUser's
// notifications insert used columns that don't exist"). The `events` table
// itself has no tracked migration at all — its shape here is inferred from
// lib/store.tsx's `logEvent` helper (user_id, event_type, metadata jsonb).
// If `events` inserts start failing, check for an undocumented CHECK
// constraint on event_type before assuming the code is wrong.
//
// There is no `connections` table anywhere in this codebase — friendships
// (reciprocal rows, status='accepted') is the only source of a user's
// social graph, so that's what this function reads.
//
// rec_watched is NOT an `events` row anywhere in the app — it's recorded as
// a `notifications` row (notification_type='rec_watched', recipient_id =
// the recommender) by app/api/push/rec-watched/route.ts. Section (a) reads
// it from there, not from `events`.
import { createClient } from "jsr:@supabase/supabase-js@2";
// @ts-ignore
import webpush from "npm:web-push@3";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const FRIEND_ACTIVITY_CAP = 5;
const TRENDING_CAP = 5;
const CONCURRENCY = 8;

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

Deno.serve(async (req) => {
  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dry_run === true;
  } catch {
    // No body (or non-JSON) — e.g. the cron job's fixed '{}' payload. Default false.
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

  // Trending is the same for every user this run — fetch it once rather
  // than once per user, per the "respect rate/quota" constraint.
  let trendingRaw: Json[] = [];
  let trendingFetchFailed = false;
  try {
    const res = await fetch(`${APP_BASE_URL}/api/tmdb-trending?mediaType=all&timeWindow=week`);
    if (res.ok) {
      const data = await res.json();
      trendingRaw = Array.isArray(data.results) ? data.results : [];
    } else {
      trendingFetchFailed = true;
    }
  } catch {
    trendingFetchFailed = true;
  }
  if (trendingRaw.length === 0) {
    // /api/tmdb-trending swallows upstream failures and returns { results: [] }
    // with a 200, and its inline fetch does NOT use lib/tmdb.ts's retry-on-
    // transient-failure helper (only that helper has the retry; this route
    // never calls it). A transient TMDB hiccup here will not self-heal —
    // flagging loudly rather than silently shipping an empty trending section.
    console.warn(
      "[weekly-digest] tmdb-trending returned zero results (fetch failed:",
      trendingFetchFailed,
      "). Trending section will be empty this run; retry logic for this route has not been restored."
    );
  }
  const trendingTop10 = trendingRaw.slice(0, 10).map((r) => ({
    tmdb_id: r.id as number,
    media_type: (r.media_type as string) ?? "movie",
    title: (r.title as string) ?? (r.name as string) ?? "Untitled",
    poster_path: (r.poster_path as string | null) ?? null,
  }));

  const { data: subs, error: subsErr } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  if (subsErr) {
    return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0, sent: 0 }), { status: 200 });
  }

  let sent = 0;
  let skippedAlreadySent = 0;
  let errors = 0;
  const dryRunResults: Json[] = [];

  for (const batch of chunk(subs, CONCURRENCY)) {
    await Promise.all(
      batch.map(async (sub) => {
        const userId = sub.user_id as string;
        try {
          // Idempotency: don't double-send if the cron fires twice in a window.
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

          // This user's own watchlist — used both to resolve titles for
          // events (which mostly store tmdb_id/media_type, not title text)
          // and to filter trending items they've already added.
          const { data: myWatchlist } = await admin
            .from("watchlist")
            .select("id, tmdb_id, media_type, title, poster_path")
            .eq("user_id", userId);
          const byKey = new Map<string, Json>();
          const byId = new Map<string, Json>();
          for (const w of myWatchlist ?? []) {
            byKey.set(titleKey(w.tmdb_id as number, w.media_type as string), w);
            byId.set(w.id as string, w);
          }

          // --- (a) own activity -------------------------------------------------
          const { data: ownEvents } = await admin
            .from("events")
            .select("event_type, metadata, created_at")
            .eq("user_id", userId)
            .gte("created_at", windowStart)
            .in("event_type", ["rating_set", "watchlist_add", "watchlist_status_change", "rec_actioned"])
            .order("created_at", { ascending: false });

          const rated = new Map<string, Json>();
          const watchlistAdded = new Map<string, Json>();
          const watched = new Map<string, Json>();

          for (const ev of ownEvents ?? []) {
            const meta = (ev.metadata ?? {}) as Json;
            if (ev.event_type === "rating_set") {
              const rating = meta.rating as number | null;
              if (rating == null) continue; // null rating = "rating removed", not a rate
              const key = titleKey(meta.tmdb_id as number, meta.media_type as string);
              const info = byKey.get(key);
              if (!info || rated.has(key)) continue;
              rated.set(key, { ...info, rating, created_at: ev.created_at });
            } else if (ev.event_type === "watchlist_add") {
              const key = titleKey(meta.tmdb_id as number, meta.media_type as string);
              const info = byKey.get(key);
              if (!info || watchlistAdded.has(key)) continue;
              watchlistAdded.set(key, { ...info, created_at: ev.created_at });
            } else if (ev.event_type === "watchlist_status_change" && meta.status === "watched") {
              const info = byId.get(meta.watchlist_id as string);
              if (!info) continue; // item since deleted from watchlist — can't resolve title
              const key = titleKey(info.tmdb_id as number, info.media_type as string);
              if (watched.has(key)) continue;
              watched.set(key, { ...info, created_at: ev.created_at });
            } else if (ev.event_type === "rec_actioned" && meta.action === "watched") {
              const key = titleKey(meta.tmdb_id as number, meta.media_type as string);
              const info = byKey.get(key);
              if (!info || watched.has(key)) continue;
              watched.set(key, { ...info, created_at: ev.created_at });
            }
          }

          // Highest priority: this user's own recs that got watched (recorded
          // as a notification to the recommender, not an `events` row).
          const { data: recWatchedNotifs } = await admin
            .from("notifications")
            .select("metadata, created_at")
            .eq("recipient_id", userId)
            .eq("notification_type", "rec_watched")
            .gte("created_at", windowStart)
            .order("created_at", { ascending: false });

          const recWatched = (recWatchedNotifs ?? []).map((n) => {
            const meta = (n.metadata ?? {}) as Json;
            return {
              tmdb_id: meta.tmdb_id,
              media_type: meta.media_type,
              title: meta.content_title,
              recipient_rating: meta.recipient_rating ?? null,
              watched_at: meta.watched_at,
              created_at: n.created_at,
            };
          });

          const ownActivity = {
            rec_watched: recWatched,
            rated: [...rated.values()],
            watchlist_add: [...watchlistAdded.values()],
            watched: [...watched.values()],
          };
          const ownActivityPresent =
            recWatched.length > 0 || rated.size > 0 || watchlistAdded.size > 0 || watched.size > 0;

          // --- (b) friend activity ------------------------------------------------
          const { data: friendRows } = await admin
            .from("friendships")
            .select("friend_id")
            .eq("user_id", userId)
            .eq("status", "accepted");
          const friendIds = (friendRows ?? []).map((f) => f.friend_id as string);

          type FriendItem = Json & { created_at: string };
          let friendActivity: FriendItem[] = [];

          if (friendIds.length > 0) {
            const [{ data: friendEvents }, { data: friendWatchlist }, { data: profiles }, { data: recsReceived }] =
              await Promise.all([
                admin
                  .from("events")
                  .select("user_id, event_type, metadata, created_at")
                  .in("user_id", friendIds)
                  .in("event_type", ["rating_set", "watchlist_add"])
                  .gte("created_at", windowStart)
                  .order("created_at", { ascending: false })
                  .limit(50),
                admin.from("watchlist").select("user_id, tmdb_id, media_type, title, poster_path").in("user_id", friendIds),
                admin.from("profiles").select("id, username, display_name").in("id", friendIds),
                admin
                  .from("recommendations")
                  .select("id, sender_id, tmdb_id, media_type, title, poster_path, created_at")
                  .eq("receiver_id", userId)
                  .gte("created_at", windowStart)
                  .order("created_at", { ascending: false }),
              ]);

            const nameById = new Map<string, string>();
            for (const p of profiles ?? []) {
              nameById.set(p.id as string, (p.display_name as string) || (p.username as string) || "A friend");
            }
            const friendWatchlistByKey = new Map<string, Json>();
            for (const w of friendWatchlist ?? []) {
              friendWatchlistByKey.set(`${w.user_id}-${titleKey(w.tmdb_id as number, w.media_type as string)}`, w);
            }

            const seen = new Set<string>();
            for (const ev of friendEvents ?? []) {
              const meta = (ev.metadata ?? {}) as Json;
              const key = titleKey(meta.tmdb_id as number, meta.media_type as string);
              const info = friendWatchlistByKey.get(`${ev.user_id}-${key}`);
              if (!info) continue;
              const dedupeKey = `${ev.event_type}-${ev.user_id}-${key}`;
              if (seen.has(dedupeKey)) continue;
              seen.add(dedupeKey);
              if (ev.event_type === "rating_set" && meta.rating == null) continue;
              friendActivity.push({
                kind: ev.event_type === "rating_set" ? "friend_rating" : "friend_watchlist_add",
                friend_id: ev.user_id,
                friend_name: nameById.get(ev.user_id as string) ?? "A friend",
                tmdb_id: info.tmdb_id,
                media_type: info.media_type,
                title: info.title,
                poster_path: info.poster_path,
                rating: ev.event_type === "rating_set" ? meta.rating : undefined,
                created_at: ev.created_at as string,
              });
            }
            for (const rec of recsReceived ?? []) {
              friendActivity.push({
                kind: "recommendation_received",
                friend_id: rec.sender_id,
                friend_name: nameById.get(rec.sender_id as string) ?? "A friend",
                tmdb_id: rec.tmdb_id,
                media_type: rec.media_type,
                title: rec.title,
                poster_path: rec.poster_path,
                created_at: rec.created_at as string,
              });
            }
            friendActivity.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
            friendActivity = friendActivity.slice(0, FRIEND_ACTIVITY_CAP);
          }
          const friendActivityPresent = friendActivity.length > 0;

          // --- (c) trending suggestions --------------------------------------------
          const personalizedTrending = trendingTop10
            .filter((t) => !byKey.has(titleKey(t.tmdb_id, t.media_type)))
            .slice(0, TRENDING_CAP);

          const trendingOnly = !ownActivityPresent && !friendActivityPresent;

          const digest = {
            window_start: windowStart,
            window_end: windowEnd,
            own_activity: ownActivity,
            friend_activity: friendActivity,
            trending: personalizedTrending,
          };

          if (dryRun) {
            // Exercise every query/aggregation above without sending a real
            // push or writing a digest_sent event — lets us verify output
            // shape against real data without touching real users.
            dryRunResults.push({
              user_id: userId,
              digest,
              own_activity_present: ownActivityPresent,
              friend_activity_present: friendActivityPresent,
              trending_only: trendingOnly,
            });
            sent++;
            return;
          }

          // --- push (placeholder copy pending design review) -----------------------
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
              // Subscription is dead — clean it up so future runs skip it.
              await admin.from("push_subscriptions").delete().eq("user_id", userId);
            }
            throw pushErr;
          }

          const { error: logErr } = await admin.from("events").insert({
            user_id: userId,
            event_type: "digest_sent",
            metadata: {
              ...digest,
              own_activity_present: ownActivityPresent,
              friend_activity_present: friendActivityPresent,
              trending_only: trendingOnly,
              trending_source_empty: trendingRaw.length === 0,
            },
          });
          if (logErr) {
            // Deliberately not swallowed — see the notifications-table incident
            // this codebase already hit once from a silently-failing insert.
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
      trending_source_empty: trendingRaw.length === 0,
      ...(dryRun ? { results: dryRunResults } : {}),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
