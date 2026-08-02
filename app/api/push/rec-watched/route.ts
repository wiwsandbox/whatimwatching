import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

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
    .select("id, sender_id")
    .eq("receiver_id", user.id)
    .eq("tmdb_id", tmdb_id)
    .eq("media_type", media_type)

  // Exclude self-recommendations before claiming — once claimed, the send
  // is decoupled from this request (handled later by the polling edge
  // function), so filtering has to happen here, not after the fact.
  const notifiable = recs.filter((r) => r.sender_id !== user.id)
  if (notifiable.length === 0) return NextResponse.json({ ok: true })

  // Idempotent claim: only rows actually inserted here are newly scheduled.
  // watched_at/send_after/sent_at all come from column defaults (see
  // migration 016) — send_after is derived from app_config so the delay
  // window is centralized there, not duplicated in this route. The actual
  // send happens later via the send-rec-watched edge function, polled by
  // cron, which re-checks the rating at send-time rather than now.
  const { data: claimed } = await admin
    .from("recommendation_watch_notifications")
    .upsert(
      notifiable.map((r) => ({ recommendation_id: r.id })),
      { onConflict: "recommendation_id", ignoreDuplicates: true }
    )
    .select("recommendation_id")

  return NextResponse.json({ ok: true, scheduled: claimed?.length ?? 0 })
}
