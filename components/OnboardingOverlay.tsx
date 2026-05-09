"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import AddFriendSheet from "@/components/AddFriendSheet";

const TOTAL_SLIDES = 4;

export default function OnboardingOverlay({
  isOpen,
  onClose,
  forceShow,
}: {
  isOpen: boolean;
  onClose: () => void;
  forceShow?: boolean;
}) {
  const { updateProfile } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else {
      setVisible(false);
      setTimeout(() => {
        setSlide(0);
        setInviteSent(false);
        setCompleting(false);
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen && !visible) return null;

  const advance = () => setSlide((s) => Math.min(s + 1, TOTAL_SLIDES - 1));

  const markComplete = async () => {
    if (completing) return;
    setCompleting(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("wiw_onboarding_completed", "true");
    }
    await updateProfile({ onboarding_completed: true });
    onClose();
    router.push("/search");
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex flex-col transition-opacity duration-300"
        style={{
          background: "white",
          opacity: visible ? 1 : 0,
          fontFamily: "var(--font-dm-sans)",
        }}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-14 pb-2 flex-shrink-0">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i <= slide ? "#ff5757" : "var(--border)",
                transition: "background 0.25s",
              }}
            />
          ))}
        </div>

        {/* Slide area */}
        <div
          className="flex-1 flex flex-col px-8"
          style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}
        >
          {slide === 0 && <Slide1 onNext={advance} />}
          {slide === 1 && <Slide2 onNext={advance} />}
          {slide === 2 && (
            <Slide3
              inviteSent={inviteSent}
              onInvitePress={() => setAddFriendOpen(true)}
              onNext={advance}
            />
          )}
          {slide === 3 && (
            <Slide4 onComplete={markComplete} completing={completing} />
          )}
        </div>
      </div>

      <AddFriendSheet
        isOpen={addFriendOpen}
        onClose={() => setAddFriendOpen(false)}
        onSuccess={() => setInviteSent(true)}
        elevated
      />
    </>
  );
}

/* ─── Slide 1: Welcome ─────────────────────────────────────────── */

function Slide1({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <span
          style={{
            fontFamily: "var(--font-playfair)",
            fontWeight: 900,
            fontSize: 72,
            lineHeight: 1,
            color: "#ff5757",
            letterSpacing: "-2px",
          }}
        >
          wiw
        </span>
        <div className="text-center space-y-2">
          <h1
            className="text-2xl font-bold leading-tight"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)" }}
          >
            Welcome to wiw
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            The best way to share what you&apos;re watching with the people you actually trust.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <PrimaryButton onClick={onNext}>Let&apos;s go</PrimaryButton>
      </div>
    </div>
  );
}

/* ─── Slide 2: How it works ────────────────────────────────────── */

function Slide2({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {/* Watch → Recommend → Discover illustration */}
        <div className="flex items-center gap-3">
          {/* Watch */}
          <div className="flex flex-col items-center gap-2">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="7" width="32" height="22" rx="3" stroke="#ff5757" strokeWidth="2" />
              <path d="M14 33H26" stroke="#ff5757" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 29V33" stroke="#ff5757" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 15L24 18L16 21V15Z" fill="#ff5757" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#ff5757" }}>
              Watch
            </span>
          </div>
          {/* Arrow */}
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
            <path d="M1 6H19M14 1L19 6L14 11" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {/* Recommend */}
          <div className="flex flex-col items-center gap-2">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="14" stroke="#ff5757" strokeWidth="2" />
              <path d="M15 20H25" stroke="#ff5757" strokeWidth="2" strokeLinecap="round" />
              <path d="M21 15L26 20L21 25" stroke="#ff5757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#ff5757" }}>
              Recommend
            </span>
          </div>
          {/* Arrow */}
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
            <path d="M1 6H19M14 1L19 6L14 11" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {/* Discover */}
          <div className="flex flex-col items-center gap-2">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="18" cy="18" r="11" stroke="#ff5757" strokeWidth="2" />
              <path d="M27 27L35 35" stroke="#ff5757" strokeWidth="2" strokeLinecap="round" />
              <path d="M14 18H22M18 14V22" stroke="#ff5757" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#ff5757" }}>
              Discover
            </span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1
            className="text-2xl font-bold leading-tight"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)" }}
          >
            Watch. Recommend. Discover.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Rate what you&apos;ve watched, send recommendations to friends, and build a watchlist from theirs.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <PrimaryButton onClick={onNext}>Got it</PrimaryButton>
      </div>
    </div>
  );
}

/* ─── Slide 3: Add your first friend ───────────────────────────── */

function Slide3({
  inviteSent,
  onInvitePress,
  onNext,
}: {
  inviteSent: boolean;
  onInvitePress: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Two person silhouettes */}
        <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
          <circle cx="28" cy="16" r="12" stroke="#ff5757" strokeWidth="2.5" />
          <path
            d="M4 58C4 46.4 14.7 37 28 37"
            stroke="#ff5757"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="54" cy="20" r="10" stroke="#ff5757" strokeWidth="2.5" />
          <path
            d="M36 58C36 48.1 44.1 40 54 40C63.9 40 72 48.1 72 58"
            stroke="#ff5757"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        <div className="text-center space-y-2">
          <h1
            className="text-2xl font-bold leading-tight"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)" }}
          >
            Start with a friend
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            wiw works best when your friends are on it. Invite someone now via SMS.
          </p>
        </div>

        {inviteSent && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium"
            style={{
              background: "rgba(16,185,129,0.08)",
              color: "#10b981",
              border: "1px solid rgba(16,185,129,0.2)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill="#10b981" />
              <path d="M5 8L7 10L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Invite sent — nice one.
          </div>
        )}
      </div>

      <div className="space-y-3">
        {inviteSent ? (
          <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
        ) : (
          <>
            <PrimaryButton onClick={onInvitePress}>Invite a friend</PrimaryButton>
            <button
              onClick={onNext}
              className="w-full py-3 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Slide 4: Add something you've watched ────────────────────── */

function Slide4({
  onComplete,
  completing,
}: {
  onComplete: () => void;
  completing: boolean;
}) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Screen with checkmark */}
        <svg width="80" height="70" viewBox="0 0 80 70" fill="none">
          <rect x="4" y="4" width="72" height="46" rx="6" stroke="#ff5757" strokeWidth="2.5" />
          <path d="M28 54H52" stroke="#ff5757" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M40 50V54" stroke="#ff5757" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="56" cy="48" r="14" fill="white" />
          <circle cx="56" cy="48" r="13" fill="#ff5757" />
          <path
            d="M50 48L54.5 52.5L62 44"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="text-center space-y-2">
          <h1
            className="text-2xl font-bold leading-tight"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)" }}
          >
            What have you watched recently?
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Add something you&apos;ve already seen. You can rate it and your friends will see it on your profile.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <PrimaryButton onClick={onComplete} disabled={completing}>
          {completing ? <Spinner /> : "Search for a title"}
        </PrimaryButton>
        <button
          onClick={onComplete}
          disabled={completing}
          className="w-full py-3 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          I&apos;ll do this later
        </button>
      </div>
    </div>
  );
}

/* ─── Shared ────────────────────────────────────────────────────── */

function PrimaryButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      style={{
        background: "#ff5757",
        color: "white",
        opacity: disabled ? 0.7 : 1,
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div
      className="w-4 h-4 rounded-full border-2 animate-spin"
      style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}
    />
  );
}
