"use client";

import React from "react";

interface AvatarProps {
  avatarUrl?: string | null;
  displayName: string;
  size?: number;
  uploading?: boolean;
  onClick?: () => void;
}

export default function Avatar({
  avatarUrl,
  displayName,
  size = 40,
  uploading = false,
  onClick,
}: AvatarProps) {
  const isPhoto = !!avatarUrl && !avatarUrl.startsWith("color:");
  const color = avatarUrl?.startsWith("color:") ? avatarUrl.slice(6) : "var(--brand)";
  const fontSize = Math.max(12, Math.round(size * 0.4));

  const circleStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    position: "relative",
    overflow: "hidden",
    background: isPhoto ? "var(--surface-2)" : color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: isPhoto ? undefined : "inset 0 1px 2px rgba(0,0,0,0.1)",
  };

  const circle = (
    <div style={circleStyle}>
      {isPhoto ? (
        <img
          src={avatarUrl!}
          alt={displayName}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <span
          style={{
            color: "white",
            fontFamily: "var(--font-playfair)",
            fontSize,
            fontWeight: "bold",
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
      {uploading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="animate-spin"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "2.5px solid rgba(255,255,255,0.4)",
              borderTopColor: "white",
            }}
          />
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{
          position: "relative",
          flexShrink: 0,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          lineHeight: 0,
          display: "inline-flex",
        }}
      >
        {circle}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#ff5757",
            border: "2px solid var(--surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <rect x="0.5" y="2.5" width="10" height="6" rx="1.2" stroke="white" strokeWidth="1.1" />
            <circle cx="5.5" cy="5.5" r="1.5" stroke="white" strokeWidth="1.1" />
            <path d="M3.5 2.5L4.2 1H6.8L7.5 2.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
    );
  }

  return circle;
}
