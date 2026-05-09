"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import InboxPage from "@/components/InboxPage";
import LandingPage from "@/app/landing/LandingPage";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Read ref param synchronously on first render (client-only)
  const [refParam] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("ref");
  });

  // Persist signup source on first touch
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("wiw_signup_source")) {
      localStorage.setItem(
        "wiw_signup_source",
        refParam === "invite" ? "invite" : "organic"
      );
    }
  }, [refParam]);

  // Redirect invite links straight to auth
  useEffect(() => {
    if (loading) return;
    if (!user && refParam === "invite") {
      router.replace("/auth");
    }
  }, [loading, user, refParam, router]);

  if (loading) return null;

  if (!user) {
    if (refParam === "invite") return null; // redirecting
    return <LandingPage />;
  }

  return <InboxPage />;
}
