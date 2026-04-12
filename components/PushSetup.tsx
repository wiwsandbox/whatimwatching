"use client";

import { useEffect, useCallback, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { getClient } from "@/lib/supabase/client";
import NotificationPermissionModal from "./NotificationPermissionModal";

const DISMISSED_KEY = "wiw_push_dismissed";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeAndSave(userId: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const registration = await navigator.serviceWorker.ready;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
  const sub = subscription.toJSON();
  const supabase = getClient();
  await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys?.p256dh,
      auth: sub.keys?.auth,
    },
    { onConflict: "user_id" }
  );
}

export default function PushSetup() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user || !("Notification" in window)) return;

    // Already granted — silently subscribe/refresh the subscription
    if (Notification.permission === "granted") {
      subscribeAndSave(user.id).catch(console.error);
      return;
    }

    // Denied by browser or explicitly dismissed by user — don't ask again
    if (
      Notification.permission === "denied" ||
      localStorage.getItem(DISMISSED_KEY) === "true"
    ) {
      return;
    }

    // Show our modal after a brief delay so it doesn't interrupt sign-in
    const timer = setTimeout(() => setShowModal(true), 1500);
    return () => clearTimeout(timer);
  }, [user]);

  const handleEnable = useCallback(async () => {
    setShowModal(false);
    if (!user) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await subscribeAndSave(user.id);
      }
    } catch (err) {
      console.error("Push setup failed:", err);
    }
  }, [user]);

  const handleDismiss = useCallback(() => {
    setShowModal(false);
    localStorage.setItem(DISMISSED_KEY, "true");
  }, []);

  if (!showModal) return null;

  return (
    <NotificationPermissionModal onEnable={handleEnable} onDismiss={handleDismiss} />
  );
}
