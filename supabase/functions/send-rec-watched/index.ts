// Polled every minute by pg_cron (see migration 016 / the cron job set up
// alongside this function). For each recommendation_watch_notifications row
// whose send_after has arrived and hasn't been sent yet: atomically claims
// it (so two overlapping cron runs can't double-send), re-checks the
// recipient's rating fresh at send-time, sends the recommender a push with
// copy chosen by whether that rating exists, and logs it to `notifications`
// in the same metadata shape the old immediate-send code used (preserved
// because supabase/functions/weekly-digest reads this shape for its
// "your recs that got watched" section).
import { createClient } from "jsr:@supabase/supabase-js@2";
// @ts-ignore
import webpush from "npm:web-push@3";

const CONCURRENCY = 8;

type Json = Record<string, unknown>;

function buildCopy(recipientName: string, title: string, rating: number | null) {
  if (rating != null) {
    return {
      title: "Your pick landed 🎬",
      body: `${recipientName} just watched ${title} and rated it ${rating}/10`,
    };
  }
  return {
    title: `${recipientName} watched ${title}`,
    body: "Tap to see what they thought",
  };
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
    // No body (or non-JSON) — cron's fixed '{}' payload. Default false.
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, supabaseKey);

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidEmail = Deno.env.get("VAPID_EMAIL")!;
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  const now = new Date().toISOString();

  const { data: due, error: dueErr } = await admin
    .from("recommendation_watch_notifications")
    .select("recommendation_id, watched_at, recommendations(sender_id, receiver_id, tmdb_id, media_type, title, created_at)")
    .lte("send_after", now)
    .is("sent_at", null);

  if (dueErr) {
    return new Response(JSON.stringify({ error: dueErr.message }), { status: 500 });
  }
  if (!due || due.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0, sent: 0 }), { status: 200 });
  }

  let sent = 0;
  let skippedRaced = 0;
  let errors = 0;
  const dryRunResults: Json[] = [];

  for (const batch of chunk(due, CONCURRENCY)) {
    await Promise.all(
      batch.map(async (row) => {
        const rec = (Array.isArray(row.recommendations) ? row.recommendations[0] : row.recommendations) as Json;
        if (!rec) return; // recommendation row deleted since being claimed — nothing to notify about

        try {
          if (dryRun) {
            const { data: watchlistRow } = await admin
              .from("watchlist")
              .select("rating")
              .eq("user_id", rec.receiver_id)
              .eq("tmdb_id", rec.tmdb_id)
              .eq("media_type", rec.media_type)
              .maybeSingle();
            dryRunResults.push({
              recommendation_id: row.recommendation_id,
              recommender_id: rec.sender_id,
              recipient_id: rec.receiver_id,
              tmdb_id: rec.tmdb_id,
              media_type: rec.media_type,
              content_title: rec.title,
              recipient_rating: watchlistRow?.rating ?? null,
            });
            sent++;
            return;
          }

          // Atomic claim: only proceed if we're the one flipping sent_at
          // from null. Marking it up-front (rather than after a successful
          // send) means a failed push doesn't get retried on the next
          // poll — matches "the single scheduled send is final."
          const { data: claimedRow } = await admin
            .from("recommendation_watch_notifications")
            .update({ sent_at: new Date().toISOString() })
            .eq("recommendation_id", row.recommendation_id)
            .is("sent_at", null)
            .select("recommendation_id")
            .maybeSingle();
          if (!claimedRow) {
            skippedRaced++;
            return;
          }

          const { data: watchlistRow } = await admin
            .from("watchlist")
            .select("rating")
            .eq("user_id", rec.receiver_id)
            .eq("tmdb_id", rec.tmdb_id)
            .eq("media_type", rec.media_type)
            .maybeSingle();
          const recipientRating: number | null = watchlistRow?.rating ?? null;

          const { data: recipientProfile } = await admin
            .from("profiles")
            .select("display_name, username")
            .eq("id", rec.receiver_id)
            .maybeSingle();
          const recipientName =
            (recipientProfile?.display_name as string) || (recipientProfile?.username as string) || "A friend";

          const deepLink = `/title/${rec.media_type}-${rec.tmdb_id}`;
          const copy = buildCopy(recipientName, rec.title as string, recipientRating);

          const metadata = {
            url: deepLink,
            rec_id: row.recommendation_id,
            recommender_id: rec.sender_id,
            recipient_id: rec.receiver_id,
            tmdb_id: rec.tmdb_id,
            media_type: rec.media_type,
            content_title: rec.title,
            recommended_at: rec.created_at,
            watched_at: row.watched_at,
            recipient_rating: recipientRating,
          };

          const { data: notif, error: notifErr } = await admin
            .from("notifications")
            .insert({
              recipient_id: rec.sender_id,
              sender_id: rec.receiver_id,
              notification_type: "rec_watched",
              title: copy.title,
              body: copy.body,
              metadata,
            })
            .select("id")
            .single();
          if (notifErr) {
            console.error("[send-rec-watched] notifications insert failed for", row.recommendation_id, notifErr);
            errors++;
          }

          const { data: sub } = await admin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", rec.sender_id)
            .maybeSingle();

          if (sub) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify({ title: copy.title, body: copy.body, url: deepLink })
              );
              if (notif?.id) {
                await admin.from("notifications").update({ delivered_at: new Date().toISOString() }).eq("id", notif.id);
              }
            } catch (pushErr: unknown) {
              const statusCode = (pushErr as { statusCode?: number })?.statusCode;
              if (statusCode === 404 || statusCode === 410) {
                await admin.from("push_subscriptions").delete().eq("user_id", rec.sender_id);
              }
              console.error("[send-rec-watched] push failed for", rec.sender_id, pushErr);
              errors++;
            }
          }

          sent++;
        } catch (err) {
          console.error("[send-rec-watched] failed for queue row", row.recommendation_id, err);
          errors++;
        }
      })
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      dry_run: dryRun,
      processed: due.length,
      sent,
      skipped_raced: skippedRaced,
      errors,
      ...(dryRun ? { results: dryRunResults } : {}),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
