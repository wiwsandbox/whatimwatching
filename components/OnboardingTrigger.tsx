"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import OnboardingOverlay from "@/components/OnboardingOverlay";

export default function OnboardingTrigger() {
  const { user, profile, loading, profileLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user || !profile) return;
    if (typeof window !== "undefined" && localStorage.getItem("wiw_onboarding_completed") === "true") return;
    if (profile.onboarding_completed === true) return;
    setShowOnboarding(true);
  }, [user, profile, loading, profileLoading]);

  if (!showOnboarding) return null;

  return (
    <OnboardingOverlay
      isOpen={showOnboarding}
      onClose={() => setShowOnboarding(false)}
    />
  );
}
