"use client";

import { useState, useEffect, useRef } from "react";

type Phase = "idle" | "selected" | "fading" | "lock" | "dismissing";

interface RatingSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentRating: number | null;
  titleName: string;
  onRate: (rating: number | null) => Promise<void>;
  backdropUrl?: string | null;
  posterUrl?: string | null;
  year?: string;
  mediaType?: "movie" | "tv";
}

const DESCRIPTORS: Record<number, string> = {
  1: "Unwatchable",
  2: "Very poor",
  3: "Poor",
  4: "Below average",
  5: "Average",
  6: "Fine",
  7: "Good",
  8: "Great",
  9: "Excellent",
  10: "Masterpiece",
};

const KEYFRAMES = `
  @keyframes ratingStampPunch {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.18); }
    70%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
  @keyframes ratingLockPop {
    0%   { transform: scale(0.4); }
    45%  { transform: scale(1.12); }
    65%  { transform: scale(0.94); }
    80%  { transform: scale(1.03); }
    100% { transform: scale(1); }
  }
  @keyframes ratingShackleClose {
    0%   { transform: translateY(0); }
    100% { transform: translateY(10px); }
  }
  @keyframes ratingLockThud {
    0%   { transform: scale(1); }
    30%  { transform: scaleX(1.1) scaleY(0.88); }
    65%  { transform: scaleX(0.95) scaleY(1.05); }
    100% { transform: scale(1); }
  }
  @keyframes ratingGlowFade {
    0%   { opacity: 1; }
    100% { opacity: 0; }
  }
`;

export default function RatingSelector({
  isOpen,
  onClose,
  currentRating,
  titleName,
  onRate,
  backdropUrl,
  posterUrl,
  year,
  mediaType,
}: RatingSelectorProps) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [selected, setSelected] = useState<number | null>(currentRating);
  const [hovered, setHovered] = useState<number | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearAll = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    if (isOpen) {
      clearAll();
      setSelected(currentRating);
      setPhase("idle");
      requestAnimationFrame(() => setVisible(true));
    } else {
      clearAll();
      setPhase("idle");
      setVisible(false);
    }
    return clearAll;
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen && !visible) return null;

  const handleRate = (rating: number) => {
    if (phase !== "idle") return;
    const newRating = rating === currentRating ? null : rating;

    setSelected(newRating);
    setPhase("selected");
    setAnimKey((k) => k + 1);

    // Commit to Supabase immediately — do not await
    onRate(newRating).catch(() => {});

    // Orchestrate visual sequence
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setPhase("fading"), 900),
      setTimeout(() => setPhase("lock"), 1150),
      setTimeout(() => setPhase("dismissing"), 3400),
      setTimeout(() => onClose(), 3700),
    ];
  };

  const mediaLabel = mediaType === "tv" ? "Series" : "Film";
  const meta = [mediaLabel, year].filter(Boolean).join(" · ");
  const isAnimating = phase !== "idle";
  const showNumber = selected !== null && (phase === "idle" || phase === "selected");
  const showHint = selected === null && phase === "idle";
  const showLock = phase === "lock" || phase === "dismissing";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80]"
        style={{
          background: "rgba(0,0,0,0.4)",
          opacity: phase === "dismissing" ? 0 : visible ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
        onClick={!isAnimating ? onClose : undefined}
      />

      {/* Sheet */}
      <div
        className="fixed z-[90] w-full max-w-[390px]"
        style={{
          bottom: 0,
          left: "50%",
          transform: `translateX(-50%) translateY(${visible ? "0%" : "100%"})`,
          opacity: phase === "dismissing" ? 0 : 1,
          transition: "transform 300ms ease, opacity 300ms ease",
          borderRadius: "20px 20px 0 0",
          overflow: "hidden",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.2)",
        }}
      >
        {/* ── Top band ── */}
        <div
          style={{
            position: "relative",
            height: 200,
            background: "#111111",
            overflow: "hidden",
          }}
        >
          {backdropUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={backdropUrl}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.5,
              }}
            />
          )}

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 100,
              background: "linear-gradient(to bottom, transparent, #FDFCFB)",
            }}
          />

          {/* Close button */}
          <button
            onClick={!isAnimating ? onClose : undefined}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isAnimating ? "default" : "pointer",
              opacity: isAnimating ? 0.35 : 1,
              transition: "opacity 200ms ease",
              zIndex: 2,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Poster + title */}
          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: 16,
              right: 16,
              display: "flex",
              alignItems: "flex-end",
              gap: 12,
              zIndex: 2,
            }}
          >
            {posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterUrl}
                alt={titleName}
                style={{
                  width: 56,
                  height: 80,
                  borderRadius: 7,
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ minWidth: 0, paddingBottom: 2 }}>
              <p
                className="line-clamp-2"
                style={{ fontSize: 17, fontWeight: 500, color: "white", lineHeight: 1.25, marginBottom: 4 }}
              >
                {titleName}
              </p>
              {meta && (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{meta}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            background: "#FDFCFB",
            padding: 20,
            paddingBottom: "max(28px, env(safe-area-inset-bottom))",
          }}
        >
          {/* Intro card */}
          <div
            style={{
              background: "#F1EFE8",
              border: "0.5px solid #D3D1C7",
              borderRadius: 12,
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#fff0f0",
                border: "0.5px solid #ffb3b3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M11 2L13.472 7.6L19.5 8.382L15.25 12.52L16.344 18.5L11 15.6L5.656 18.5L6.75 12.52L2.5 8.382L8.528 7.6L11 2Z"
                  fill="#ff5757"
                />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111111", marginBottom: 3 }}>
                How was it?
              </p>
              <p style={{ fontSize: 12, color: "#888780", lineHeight: 1.4 }}>
                Your rating is shared with friends — they&apos;ll see it when they look this up.
              </p>
            </div>
          </div>

          {/* ── Number display area ── */}
          <div style={{ height: 90, position: "relative", marginBottom: 16 }}>

            {/* Hint */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                opacity: showHint ? 1 : 0,
                transition: "opacity 200ms ease",
                pointerEvents: "none",
              }}
            >
              <span style={{ fontSize: 14, color: "#B4B2A9" }}>Tap a number to rate</span>
            </div>

            {/* Number + descriptor */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: showNumber ? 1 : 0,
                transition: phase === "fading" ? "opacity 250ms ease" : "opacity 200ms ease",
                pointerEvents: "none",
              }}
            >
              <span
                key={animKey}
                style={{
                  fontSize: 72,
                  fontWeight: 500,
                  color: "#ff5757",
                  lineHeight: 1,
                  display: "inline-block",
                  animation:
                    phase === "selected"
                      ? "ratingStampPunch 350ms cubic-bezier(0.36,0.07,0.19,0.97) both"
                      : "none",
                }}
              >
                {selected ?? ""}
              </span>
              <span style={{ fontSize: 18, color: "#888780", lineHeight: 1 }}>
                {selected != null ? DESCRIPTORS[selected] : ""}
              </span>
            </div>

            {/* Lock icon */}
            {showLock && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  animation: "ratingLockPop 500ms cubic-bezier(0.36,0.07,0.19,0.97) both",
                }}
              >
                <svg width="44" height="48" viewBox="0 0 44 48" fill="none">
                  {/* Background glow — fades after 200ms */}
                  <circle
                    cx="22"
                    cy="36"
                    r="20"
                    fill="#ff5757"
                    style={{
                      animation: "ratingGlowFade 500ms ease forwards",
                      animationDelay: "200ms",
                    }}
                  />
                  {/* Shackle — legs + arc, slides down into body after pop lands */}
                  <g
                    style={{
                      animation: "ratingShackleClose 320ms cubic-bezier(0.36,0.07,0.19,0.97) forwards",
                      animationDelay: "550ms",
                    }}
                  >
                    <path
                      d="M 14,26 L 14,12 A 8,8 0 0 0 30,12 L 30,26"
                      stroke="#ff5757"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  {/* Body + keyhole — thuds after pop lands */}
                  <g
                    style={{
                      transformBox: "fill-box",
                      transformOrigin: "center bottom",
                      animation: "ratingLockThud 350ms ease forwards",
                      animationDelay: "550ms",
                    }}
                  >
                    <rect
                      x="6"
                      y="22"
                      width="32"
                      height="22"
                      rx="5"
                      fill="#fff0f0"
                      stroke="#ff5757"
                      strokeWidth="1.5"
                    />
                    <circle cx="22" cy="31" r="3.5" fill="#ff5757" />
                    <line
                      x1="22"
                      y1="34.5"
                      x2="22"
                      y2="39"
                      stroke="#ff5757"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
                <p
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.07em",
                    color: "#B4B2A9",
                    textTransform: "uppercase",
                    lineHeight: 1,
                  }}
                >
                  Rated
                </p>
              </div>
            )}
          </div>

          {/* ── Number grid — 5×2 ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 10,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
              const isSelected = n === selected;
              const isHovered = !isAnimating && n === hovered;
              return (
                <button
                  key={n}
                  onMouseEnter={() => { if (!isAnimating) setHovered(n); }}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleRate(n)}
                  style={{
                    aspectRatio: "1 / 1",
                    borderRadius: 12,
                    background: isSelected ? "#ff5757" : isHovered ? "#FFE8E8" : "#F1EFE8",
                    border: `0.5px solid ${isSelected ? "#ff5757" : isHovered ? "#ffb3b3" : "#D3D1C7"}`,
                    color: isSelected ? "white" : isHovered ? "#ff5757" : "#888780",
                    fontSize: 20,
                    fontWeight: 500,
                    cursor: isAnimating ? "default" : "pointer",
                    transform: isSelected ? "scale(1.1)" : "scale(1)",
                    opacity: isAnimating && !isSelected ? 0.5 : 1,
                    pointerEvents: isAnimating ? "none" : "auto",
                    transition:
                      "background 120ms ease, color 120ms ease, border-color 120ms ease, transform 120ms ease, opacity 200ms ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
