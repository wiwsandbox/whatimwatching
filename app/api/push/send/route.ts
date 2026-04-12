import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/sendPush";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipient_user_id, notification_type, title } = await request.json();
  if (!recipient_user_id || !notification_type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Get sender's display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();
  const senderName = profile?.display_name || profile?.username || "Someone";

  let body: string;
  if (notification_type === "recommendation") {
    body = `${senderName} recommended ${title} to you`;
  } else {
    body = `${senderName} wants to connect with you on wiw`;
  }

  await sendPushToUser(recipient_user_id, "wiw", body, "/");

  return NextResponse.json({ ok: true });
}
