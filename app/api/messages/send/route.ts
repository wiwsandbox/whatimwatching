import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendPushToUser } from "@/lib/sendPush"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { receiver_id, content, tmdb_id, media_type, show_title, show_poster_path } = await request.json()
  if (!receiver_id || !content?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      sender_id: user.id,
      receiver_id,
      content: content.trim(),
      tmdb_id: tmdb_id ?? null,
      media_type: media_type ?? null,
      show_title: show_title ?? null,
      show_poster_path: show_poster_path ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single()

  const senderName = profile?.display_name || profile?.username || "Someone"
  const pushBody = show_title
    ? `${senderName} sent you a message about ${show_title}`
    : `${senderName} sent you a message`

  await sendPushToUser(receiver_id, "wiw", pushBody, "/", {
    senderId: user.id,
    notificationType: "message",
    metadata: show_title ? { show_title } : undefined,
  })

  return NextResponse.json({ ok: true, message })
}
