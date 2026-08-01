import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

let vapidInitialized = false;

function ensureVapid() {
  if (vapidInitialized) return;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidInitialized = true;
}

/**
 * Send a push notification to a user. Silently no-ops if the user has no
 * subscription. Requires SUPABASE_SERVICE_ROLE_KEY in env to bypass RLS.
 *
 * Pass options.notificationType to also log the event to the notifications table.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = "/",
  options?: {
    senderId?: string;
    notificationType?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  let notificationId: string | null = null;
  if (options?.notificationType) {
    const { data } = await supabase
      .from("notifications")
      .insert({
        recipient_id: userId,
        sender_id: options.senderId ?? null,
        notification_type: options.notificationType,
        title,
        body,
        metadata: { url, ...options.metadata },
      })
      .select("id")
      .single();
    notificationId = data?.id ?? null;
  }

  const { data: sub } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)
    .single();

  if (!sub) return;

  try {
    ensureVapid();
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title, body, url })
    );
    if (notificationId) {
      await supabase
        .from("notifications")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", notificationId);
    }
  } catch (err) {
    console.error("Push notification failed for user", userId, err);
  }
}
