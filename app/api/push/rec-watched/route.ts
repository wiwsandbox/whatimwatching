import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { sendPushToUser } from "@/lib/sendPush"

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { tmdb_id, media_type } = await request.json()
  if (!tmdb_id || !media_type) {
    return NextResponse.json({ error: "Missing tmdb_id or media_type" }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return NextResponse.json({ ok: true })

  // Service-role client: recommendation_watch_notifications has no RLS
  // policies (server-only), and we need to read recommendations across
  // senders, not just rows the recipient can see.
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)

  const { data: recs } = await admin
    .from("recommendations")
    .select("id, sender_id, title, created_at")
    .eq("receiver_id", user.id)
    .eq("tmdb_id", tmdb_id)
    .eq("media_type", media_type)

  if (!recs || recs.length === 0) return NextResponse.json({ ok: true })

  // Idempotent claim: only rows actually inserted here are newly notified.
  const { data: claimed } = await admin
    .from("recommendation_watch_notifications")
    .upsert(
      recs.map((r) => ({ recommendation_id: r.id })),
      { onConflict: "recommendation_id", ignoreDuplicates: true }
    )
    .select("recommendation_id")

  const claimedIds = new Set((claimed ?? []).map((c) => c.recommendation_id))
  const toNotify = recs.filter((r) => claimedIds.has(r.id) && r.sender_id !== user.id)
  if (toNotify.length === 0) return NextResponse.json({ ok: true })

  const { data: watchlistRow } = await admin
    .from("watchlist")
    .select("rating")
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdb_id)
    .eq("media_type", media_type)
    .maybeSingle()

  const recipientRating = watchlistRow?.rating ?? null
  const deepLink = `/title/${media_type}-${tmdb_id}`
  const watchedAt = new Date().toISOString()

  await Promise.all(
    toNotify.map((rec) =>
      sendPushToUser(
        rec.sender_id,
        "[PLACEHOLDER - pending copy approval]",
        "[PLACEHOLDER]",
        deepLink,
        {
          senderId: user.id,
          notificationType: "rec_watched",
          metadata: {
            rec_id: rec.id,
            recommender_id: rec.sender_id,
            recipient_id: user.id,
            tmdb_id,
            media_type,
            title: rec.title,
            recommended_at: rec.created_at,
            watched_at: watchedAt,
            recipient_rating: recipientRating,
          },
        }
      )
    )
  )

  return NextResponse.json({ ok: true })
}
