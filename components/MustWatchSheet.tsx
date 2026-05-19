"use client";

import { useState, useEffect } from "react";

interface MustWatchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  remaining: number;
  titleName: string;
  sending: boolean;
}

const GOLD = "linear-gradient(135deg, #D4AF37, #F5D060)";

const RULES = [
  {
    icon: "★",
    bold: "3 per month.",
    rest: " Use them on titles you'd genuinely recommend to anyone, anytime.",
  },
  {
    icon: "👁",
    bold: "They'll know.",
    rest: " Must Watch recs look different in their inbox — gold, not red.",
  },
  {
    icon: "↺",
    bold: "No rollover.",
    rest: " Unused Must Watches don't carry over. Spend them wisely.",
  },
];

export default function MustWatchSheet({
  isOpen,
  onClose,
  onConfirm,
  remaining,
  sending,
}: MustWatchSheetProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);

  const now = new Date();
  const reset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetStr = reset.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  if (!isOpen && !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.6)", opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed z-[110] w-full max-w-[390px] rounded-t-3xl overflow-hidden transition-transform duration-300"
        style={{
          bottom: 0,
          left: "50%",
          transform: `translateX(-50%) translateY(${visible ? "0%" : "100%"})`,
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.2)",
        }}
      >
        {/* Handle */}
        <div
          className="flex justify-center pt-3 pb-0"
          style={{ background: "#1a1a1a" }}
        >
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.2)" }}
          />
        </div>

        {/* Dark hero */}
        <div className="px-5 pt-5 pb-6" style={{ background: "#1a1a1a" }}>
          <div className="mb-4">
            <span
              style={{
                background: GOLD,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: 800,
                color: "#1a1a1a",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-dm-sans)",
                display: "inline-block",
              }}
            >
              MUST WATCH
            </span>
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "white",
              fontFamily: "var(--font-dm-sans)",
              marginBottom: 8,
            }}
          >
            Stake your taste.
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.5,
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Send this as a Must Watch when you really mean it. They&apos;ll
            know this one is different.
          </p>
        </div>

        {/* Counter row */}
        <div
          style={{
            background: "#f7f7f7",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#1a1a1a",
                marginBottom: 2,
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {remaining} of 3 remaining
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#999",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              Resets {resetStr}
            </p>
          </div>

          {/* Pip bars */}
          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 28,
                  height: 10,
                  borderRadius: 5,
                  background: i < remaining ? GOLD : "#dddddd",
                }}
              />
            ))}
          </div>
        </div>

        {/* Rules + actions */}
        <div style={{ background: "white", padding: "20px" }}>
          {RULES.map((rule, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                marginBottom: i < RULES.length - 1 ? 14 : 0,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#f7f7f7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {rule.icon}
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "#555",
                  lineHeight: 1.5,
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                <strong>{rule.bold}</strong>
                {rule.rest}
              </p>
            </div>
          ))}

          {remaining === 0 ? (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <p style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>
                You&apos;ve used all your Must Watches this month.
              </p>
              <p style={{ fontSize: 11, color: "#aaa" }}>Resets {resetStr}</p>
            </div>
          ) : (
            <button
              onClick={onConfirm}
              disabled={sending}
              style={{
                width: "100%",
                background: GOLD,
                color: "#1a1a1a",
                borderRadius: 14,
                padding: "14px",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.6 : 1,
                marginTop: 20,
                fontFamily: "var(--font-dm-sans)",
                display: "block",
              }}
            >
              {sending ? "Sending…" : "Send as Must Watch"}
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              fontSize: 12,
              color: "#aaa",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "12px 0 0",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
