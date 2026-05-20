"use client";

import { useState, useEffect } from "react";

interface MustWatchReceivedSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToWatchlist: () => void;
  senderName: string;
  senderAvatarUrl?: string | null;
  title: string;
}

export default function MustWatchReceivedSheet({
  isOpen,
  onClose,
  onAddToWatchlist,
  senderName,
  senderAvatarUrl,
  title,
}: MustWatchReceivedSheetProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);

  if (!isOpen && !visible) return null;

  const firstName = senderName.split(" ")[0];
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.55)", opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed z-[110] w-full max-w-[390px] transition-transform duration-300"
        style={{
          bottom: 0,
          left: "50%",
          transform: `translateX(-50%) translateY(${visible ? "0%" : "100%"})`,
          borderRadius: "20px 20px 0 0",
          overflow: "hidden",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.3)",
        }}
      >
        {/* Dark top section */}
        <div style={{ background: "#111111", padding: "0 20px 20px" }}>
          {/* Drag handle */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, marginBottom: 16 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
          </div>

          {/* Badge */}
          <div style={{ marginBottom: 14 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#C99A2E",
                borderRadius: 6,
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "#3D2800",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-dm-sans)",
                textTransform: "uppercase",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="#3D2800">
                <path d="M6 1L7.545 4.13L11 4.635L8.5 7.07L9.09 10.51L6 8.885L2.91 10.51L3.5 7.07L1 4.635L4.455 4.13L6 1Z" />
              </svg>
              Must Watch
            </span>
          </div>

          {/* Headline */}
          <h2
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "white",
              lineHeight: 1.2,
              marginBottom: 8,
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            {firstName} really means it.
          </h2>

          {/* Subhead */}
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, fontFamily: "var(--font-dm-sans)" }}>
            This isn&apos;t a regular rec. {firstName} used one of their 3 Must Watches this month on you.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: "0.5px", background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

        {/* Light bottom section */}
        <div
          style={{
            background: "#FDFCFB",
            borderRadius: "16px 16px 0 0",
            padding: "20px 20px 0",
            paddingBottom: "max(0px, env(safe-area-inset-bottom))",
          }}
        >
          {/* Sender row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "#C99A2E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {senderAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={senderAvatarUrl} alt={senderName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 16, fontWeight: 700, color: "#3D2800" }}>{initials}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#111111", lineHeight: 1.3, fontFamily: "var(--font-dm-sans)" }}>
                {firstName} recommended {title}
              </p>
              <p style={{ fontSize: 13, color: "#888780", marginTop: 2, fontFamily: "var(--font-dm-sans)" }}>
                Must Watch · just now
              </p>
            </div>
          </div>

          {/* Bullet rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
            {/* 3 per month */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F1EFE8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5L9.854 5.26L14 5.885L11 8.805L11.708 12.93L8 10.985L4.292 12.93L5 8.805L2 5.885L6.146 5.26L8 1.5Z" fill="#5F5E5A" />
                </svg>
              </div>
              <p style={{ fontSize: 14, color: "#444441", lineHeight: 1.5, fontFamily: "var(--font-dm-sans)" }}>
                <strong style={{ color: "#111111" }}>3 per month.</strong>
                {" "}Everyone gets 3 Must Watches a month. {firstName} spent one on this.
              </p>
            </div>

            {/* They'll know */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F1EFE8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="#5F5E5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8" cy="8" r="2" fill="#5F5E5A"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, color: "#444441", lineHeight: 1.5, fontFamily: "var(--font-dm-sans)" }}>
                <strong style={{ color: "#111111" }}>They&apos;ll know.</strong>
                {" "}If you watch it, {firstName} gets a notification. They&apos;re invested.
              </p>
            </div>

            {/* No rollover */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F1EFE8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2.5 8C2.5 5 5 2.5 8 2.5C10.2 2.5 12.1 3.8 13 5.5M13.5 8C13.5 11 11 13.5 8 13.5C5.8 13.5 3.9 12.2 3 10.5" stroke="#5F5E5A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M11.5 4L13 5.5L14.5 4" stroke="#5F5E5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4.5 12L3 10.5L1.5 12" stroke="#5F5E5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, color: "#444441", lineHeight: 1.5, fontFamily: "var(--font-dm-sans)" }}>
                <strong style={{ color: "#111111" }}>No rollover.</strong>
                {" "}Unused Must Watches don&apos;t carry over. This one was deliberate.
              </p>
            </div>
          </div>

          {/* Primary CTA */}
          <button
            onClick={onAddToWatchlist}
            style={{
              width: "100%",
              background: "#C99A2E",
              color: "#3D2800",
              borderRadius: 50,
              padding: 16,
              fontSize: 16,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              display: "block",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Add to watchlist
          </button>

          {/* Dismiss */}
          <button
            onClick={onClose}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              fontSize: 14,
              color: "#888780",
              cursor: "pointer",
              display: "block",
              padding: "14px 0 24px",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </>
  );
}
