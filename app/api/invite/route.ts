import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendPushToUser } from "@/lib/sendPush";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone } = await request.json();
  if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

  // Get sender's display name
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();
  const senderName = senderProfile?.display_name || senderProfile?.username || "Someone";

  // Look up recipient by phone number
  const { data: recipient } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("phone", phone)
    .maybeSingle();

  if (recipient) {
    if (recipient.id === user.id) {
      return NextResponse.json({ error: "That's your own number" }, { status: 400 });
    }

    // Check if any friendship already exists in either direction
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${recipient.id}),` +
        `and(user_id.eq.${recipient.id},friend_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      const msg = existing.status === "accepted" ? "You're already friends" : "Request already sent";
      return NextResponse.json({ success: false, error: msg });
    }

    // Create pending friendship
    const { error: friendError } = await supabase.from("friendships").insert({
      user_id: user.id,
      friend_id: recipient.id,
      status: "pending",
    });

    if (friendError) {
      return NextResponse.json({ error: friendError.message }, { status: 500 });
    }

    // Push notification (also logs to notifications) — best-effort
    sendPushToUser(
      recipient.id,
      "wiw",
      `${senderName} wants to connect with you on wiw`,
      "/",
      { senderId: user.id, notificationType: "friend_request", metadata: { sender_name: senderName } }
    ).catch(() => {});

    return NextResponse.json({ success: true, found: true });
  }

  // User not found — send SMS invite if Twilio is configured
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber) {
    const smsBody =
      `Hey! ${senderName} wants to connect with you on wiw — the app for sharing what you're watching. ` +
      `Join here: https://whatimwatching.vercel.app`;

    const params = new URLSearchParams({ To: phone, From: fromNumber, Body: smsBody });

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const smsError = errBody?.message || `Twilio error ${res.status}`;
        console.error("Twilio SMS error:", smsError, errBody);
        return NextResponse.json({ success: false, found: false, smsSent: false, smsError });
      }

      return NextResponse.json({ success: true, found: false, smsSent: true });
    } catch (err) {
      const smsError = err instanceof Error ? err.message : "Network error sending SMS";
      console.error("Twilio fetch failed:", smsError);
      return NextResponse.json({ success: false, found: false, smsSent: false, smsError });
    }
  }

  // Twilio not configured
  return NextResponse.json({ success: true, found: false, smsSent: false, noTwilio: true });
}
