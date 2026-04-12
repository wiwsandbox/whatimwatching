"use client";

import { useState, useEffect } from "react";

interface RatingSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentRating: number | null;
  titleName: string;
  onRate: (rating: number | null) => Promise<void>;
}

export default function RatingSelector({
  isOpen,
  onClose,
  currentRating,
  titleName,
  onRate,
}: RatingSelectorProps) {
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);

  if (!isOpen && !visible) return null;

  const handleRate = async (rating: number) => {
    setSaving(true);
    const newRating = rating === currentRating ? null : rating;
    await onRate(newRating);
    setSaving(false);
    onClose();
  };

  const displayValue = hovered ?? currentRating;

  const ratingLabels: Record<number, string> = {
    1: "Unwatchable",
    2: "Very bad",
    3: "Bad",
    4: "Below average",
    5: "Average",
    6: "Above average",
    7: "Good",
    8: "Great",
    9: "Excellent",
    10: "Masterpiece",
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[80] transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.4)", opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        className="fixed z-[90] w-full max-w-[390px] rounded-t-3xl transition-transform duration-300"
        style={{
          bottom: 0,
          left: "50%",
          background: "#ffffff",
          transform: `translateX(-50%) translateY(${visible ? "0%" : "100%"})`,
          paddingBottom: "max(28px, env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: "#eeeeee" }} />
        </div>

        {/* Header */}
        <div className="px-5 mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: "#999999" }}>
            Rate this
          </p>
          <h2 className="text-base font-bold line-clamp-1" style={{ color: "#1a1a1a" }}>
            {titleName}
          </h2>
        </div>

        {/* Score display */}
        <div className="px-5 mb-5 flex items-baseline gap-2">
          {displayValue ? (
            <>
              <span
                className="text-5xl font-bold leading-none"
                style={{
                  fontFamily: "var(--font-playfair)",
                  color: "#ff5757",
                }}
              >
                {displayValue}
              </span>
              <span className="text-sm" style={{ color: "#666666" }}>
                {ratingLabels[displayValue]}
              </span>
            </>
          ) : (
            <span className="text-sm" style={{ color: "#999999" }}>
              Tap a number to rate
            </span>
          )}
        </div>

        {/* Number grid — 1–10 as large pill buttons */}
        <div className="px-5 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const isSelected = n === currentRating;
            const isHighlighted = hovered !== null ? n <= hovered : n <= (currentRating ?? 0);
            return (
              <button
                key={n}
                disabled={saving}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleRate(n)}
                className="flex items-center justify-center rounded-2xl transition-all active:scale-90 select-none"
                style={{
                  height: "52px",
                  background: isSelected
                    ? "#ff5757"
                    : isHighlighted
                    ? "rgba(255,87,87,0.12)"
                    : "#f7f7f7",
                  color: isSelected ? "#ffffff" : isHighlighted ? "#ff5757" : "#666666",
                  fontFamily: "var(--font-dm-sans)",
                  fontWeight: 700,
                  fontSize: "18px",
                  border: isSelected ? "none" : "1px solid #eeeeee",
                }}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* Clear button */}
        {currentRating && (
          <div className="px-5 mt-4">
            <button
              onClick={() => onRate(null).then(onClose)}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: "#f7f7f7", color: "#999999" }}
            >
              Remove rating
            </button>
          </div>
        )}
      </div>
    </>
  );
}
