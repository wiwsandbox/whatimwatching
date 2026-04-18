import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendPushToUser } from "@/lib/sendPush"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { rec_id, notification_type } = await request.json()
  if (!rec_id) return NextResponse.json({ error: "Missing rec_id" }, { status: 400 })

  const { data: rec } = await supabase
    .from("recommendations")
    .select("sender_id, title")
    .eq("id", rec_id)
    .single()

  if (!rec) return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
  if (rec.sender_id === user.id) return NextResponse.json({ ok: true })

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single()

  const recipientName = profile?.display_name || profile?.username || "Someone"

  const message = notification_type === "watched"
    ? `${recipientName} has already watched ${rec.title}`
    : `${recipientName} added ${rec.title} to their watchlist`

  await sendPushToUser(rec.sender_id, "wiw", message, "/")

  return NextResponse.json({ ok: true })
}
