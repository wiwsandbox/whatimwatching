// Weekly digest v3 — a simple live watchlist digest.
//
// For each push subscriber, count three things:
//   own     = titles on the user's list (to_watch / watching)
//   friends = distinct to_watch titles on accepted friends' lists that are
//             not anywhere on the user's own list
//   unrated = titles the user watched but never rated
// Send one push pointing at /digest, which renders those lists live. The
// digest_sent event only records counts (and powers the 7-day guard).
//
// Body {"dry_run": true} returns per-user results and sends/writes nothing.
import { createClient } from "jsr:@supabase/supabase-js@2";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- web-push ships no Deno types
// @ts-ignore
import webpush from "npm:web-push@3";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
// Guard is shorter than the window on purpose: last week's send is logged a
// few seconds after 15:00, so an exact 7-day guard skipped every other week.
const GUARD_MS = 6 * 24 * 60 * 60 * 1000;
const CONCURRENCY = 8;
const PUSH_TITLE = "Your watchlist is waiting 🎬";

type Row = { tmdb_id: number; media_type: string; title: string | null; status: string; rating: number | null };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const key = (r: Row) => `${r.media_type}-${r.tmdb_id}`;
const hasTitle = (r: Row) => typeof r.title === "string" && r.title.trim() !== "";

function buildBody(own: number, friends: number, unrated: number): string {
  const parts: string[] = [];
  if (own > 0) parts.push(`${own} on your list`);
  if (friends > 0) parts.push(`${friends} on friends' lists`);
  if (parts.length > 0) return `${parts.join(", ")}. Watch them, or rate what you've seen.`;
  return unrated === 1
    ? "1 title you've watched is waiting for your rating."
    : `${unrated} titles you've watched are waiting for your rating.`;
}

// Only the project's secret keys may call this (the cron job sends one). The
// public anon/publishable keys and signed-in users' tokens are rejected.
function secretKeys(): string[] {
  const out: string[] = [];
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) out.push(legacy);
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const vals = Array.isArray(parsed) ? parsed : typeof parsed === "object" && parsed ? Object.values(parsed) : [parsed];
      for (const v of vals) if (typeof v === "string" && v) out.push(v);
    } catch {
      out.push(raw);
    }
  }
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(req: Request): boolean {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  return secretKeys().some((k) => timingSafeEqual(token, k));
}

Deno.serve(async (req) => {
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dry_run === true;
  } catch {
    // No body (or non-JSON) — cron's fixed '{}' payload. Default false.
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  webpush.setVapidDetails(Deno.env.get("VAPID_EMAIL")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS).toISOString();
  const windowEnd = now.toISOString();
  const guardStart = new Date(now.getTime() - GUARD_MS).toISOString();

  const { data: subs, error: subsErr } = await admin.from("push_subscriptions").select("user_id, endpoint, p256dh, auth");
  if (subsErr) return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 });

  let sent = 0;
  let skippedAlreadySent = 0;
  let skippedEmpty = 0;
  let errors = 0;
  const dryRunResults: Record<string, unknown>[] = [];

  for (const batch of chunk(subs ?? [], CONCURRENCY)) {
    await Promise.all(
      batch.map(async (sub) => {
        const userId = sub.user_id as string;
        try {
          // Dry runs write nothing, so the guard has nothing to protect.
          if (!dryRun) {
            const { data: alreadySent } = await admin
              .from("events")
              .select("id")
              .eq("user_id", userId)
              .eq("event_type", "digest_sent")
              .gte("created_at", guardStart)
              .limit(1)
              .maybeSingle();
            if (alreadySent) {
              skippedAlreadySent++;
              return;
            }
          }

          const { data: mineRaw, error: mineErr } = await admin
            .from("watchlist")
            .select("tmdb_id, media_type, title, status, rating")
            .eq("user_id", userId);
          if (mineErr) throw mineErr;
          const mine = ((mineRaw ?? []) as Row[]).filter(hasTitle);
          const myKeys = new Set(mine.map(key));

          const own = mine.filter((r) => r.status === "to_watch" || r.status === "watching").length;
          const unrated = mine.filter((r) => r.status === "watched" && r.rating == null).length;

          const { data: friendRows, error: frErr } = await admin
            .from("friendships")
            .select("friend_id")
            .eq("user_id", userId)
            .eq("status", "accepted");
          if (frErr) throw frErr;
          const friendIds = (friendRows ?? []).map((f) => f.friend_id as string);

          let friends = 0;
          if (friendIds.length > 0) {
            const { data: fwRaw, error: fwErr } = await admin
              .from("watchlist")
              .select("tmdb_id, media_type, title, status, rating")
              .in("user_id", friendIds)
              .eq("status", "to_watch");
            if (fwErr) throw fwErr;
            const friendKeys = new Set(((fwRaw ?? []) as Row[]).filter(hasTitle).map(key));
            for (const k of friendKeys) if (!myKeys.has(k)) friends++;
          }

          if (own + friends + unrated === 0) {
            skippedEmpty++;
            if (dryRun) dryRunResults.push({ user_id: userId, skipped: "empty", own_count: 0, friend_count: 0, unrated_count: 0 });
            return;
          }

          const payload = { title: PUSH_TITLE, body: buildBody(own, friends, unrated), url: "/digest" };

          if (dryRun) {
            dryRunResults.push({ user_id: userId, own_count: own, friend_count: friends, unrated_count: unrated, push: payload });
            sent++;
            return;
          }

          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify(payload)
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
            metadata: { window_start: windowStart, window_end: windowEnd, own_count: own, friend_count: friends, unrated_count: unrated },
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
      processed: subs?.length ?? 0,
      sent,
      skipped_already_sent: skippedAlreadySent,
      skipped_empty: skippedEmpty,
      errors,
      ...(dryRun ? { results: dryRunResults } : {}),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
