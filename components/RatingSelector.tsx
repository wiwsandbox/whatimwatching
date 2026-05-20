"use client";

import { useState, useEffect } from "react";

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
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number | null>(currentRating);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelected(currentRating);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen, currentRating]);

  if (!isOpen && !visible) return null;

  const handleRate = async (rating: number) => {
    if (saving) return;
    const newRating = rating === currentRating ? null : rating;
    setSelected(newRating);
    setSaving(true);
    await onRate(newRating);
    setSaving(false);
    onClose();
  };

  const mediaLabel = mediaType === "tv" ? "Series" : "Film";
  const meta = [mediaLabel, year].filter(Boolean).join(" · ");

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-[80] transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.4)", opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Sheet — content-sized, slides up from bottom */}
      <div
        className="fixed z-[90] w-full max-w-[390px] transition-transform duration-300"
        style={{
          bottom: 0,
          left: "50%",
          transform: `translateX(-50%) translateY(${visible ? "0%" : "100%"})`,
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
          {/* Backdrop image */}
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

          {/* Fade gradient → #FDFCFB */}
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
            onClick={onClose}
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
              cursor: "pointer",
              zIndex: 2,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Poster + title row */}
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
                style={{
                  fontSize: 17,
                  fontWeight: 500,
                  color: "white",
                  lineHeight: 1.25,
                  marginBottom: 4,
                }}
              >
                {titleName}
              </p>
              {meta && (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  {meta}
                </p>
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

          {/* Number display area */}
          <div
            style={{
              minHeight: 60,
              position: "relative",
              display: "flex",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {/* Hint — fades out on selection */}
            <span
              style={{
                position: "absolute",
                fontSize: 14,
                color: "#B4B2A9",
                opacity: selected == null ? 1 : 0,
                transition: "opacity 200ms ease",
                pointerEvents: "none",
              }}
            >
              Tap a number to rate
            </span>

            {/* Number + descriptor — fades in on selection */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                opacity: selected != null ? 1 : 0,
                transition: "opacity 200ms ease",
              }}
            >
              <span style={{ fontSize: 72, fontWeight: 500, color: "#ff5757", lineHeight: 1 }}>
                {selected ?? ""}
              </span>
              <span style={{ fontSize: 18, color: "#888780" }}>
                {selected != null ? DESCRIPTORS[selected] : ""}
              </span>
            </div>
          </div>

          {/* Number grid — 5×2 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 10,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
              const isSelected = n === selected;
              const isHovered = n === hovered;
              return (
                <button
                  key={n}
                  disabled={saving}
                  onMouseEnter={() => setHovered(n)}
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
                    cursor: saving ? "not-allowed" : "pointer",
                    transform: isSelected ? "scale(1.1)" : "scale(1)",
                    transition: "background 120ms ease, color 120ms ease, border-color 120ms ease, transform 120ms ease",
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
