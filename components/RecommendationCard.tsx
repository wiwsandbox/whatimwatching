"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { getDisplayTitle, getYear } from "@/lib/tmdb";
import type { Recommendation, TMDBTitle, MediaType } from "@/lib/types";

interface RecommendationCardProps {
  rec: Recommendation & { tmdbTitle?: TMDBTitle };
  onMarkWatched: (id: string) => void;
  onMarkUnwatched: (id: string) => void;
  onAddToWatchlist: (recId: string, tmdbId: number, mediaType: MediaType, title: string, posterPath: string | null) => void;
  onMarkWatchedFromRec: (recId: string, tmdbId: number, mediaType: MediaType, title: string, posterPath: string | null) => void;
  onDismiss: (recId: string) => void;
  onMarkOpened: (recId: string) => void;
}

export default function RecommendationCard({
  rec,
  onAddToWatchlist,
  onMarkWatchedFromRec,
  onDismiss,
  onMarkOpened,
}: RecommendationCardProps) {
  const [animPhase, setAnimPhase] = useState<"idle" | "exiting" | "entering">("idle");

  const tmdbTitle = rec.tmdbTitle;
  const displayTitle = tmdbTitle ? getDisplayTitle(tmdbTitle) : rec.title || "Loading…";
  const year = tmdbTitle ? getYear(tmdbTitle) : "";
  const senderName = rec.sender?.display_name || rec.sender?.username || "Someone";
  const posterPath = tmdbTitle?.poster_path ?? rec.posterPath ?? null;
  const backdropPath = tmdbTitle?.backdrop_path ?? null;
  const backdropUrl = backdropPath
    ? `https://image.tmdb.org/t/p/w780${backdropPath}`
    : posterPath
    ? `https://image.tmdb.org/t/p/w185${posterPath}`
    : null;

  const handleOpen = () => {
    if (animPhase !== "idle") return;
    setAnimPhase("exiting");
    setTimeout(() => {
      onMarkOpened(rec.id);
      setAnimPhase("entering");
      setTimeout(() => setAnimPhase("idle"), 250);
    }, 200);
  };

  const animOpacity = animPhase === "exiting" ? 0 : 1;
  const animTransform = animPhase === "exiting" ? "translateY(-8px)" : "translateY(0)";
  const animTransition =
    animPhase === "exiting"
      ? "opacity 200ms ease, transform 200ms ease"
      : animPhase === "entering"
      ? "opacity 250ms ease, transform 250ms ease"
      : undefined;

  // State A — Unopened envelope
  if (!rec.opened_at && !rec.watched) {
    return (
      <div
        style={{
          opacity: animOpacity,
          transform: animTransform,
          transition: animTransition,
          background: "#f5eeea",
          border: "0.5px solid #e8d8d0",
          borderRadius: 20,
          boxShadow: "0 6px 28px rgba(180,100,80,0.14)",
          overflow: "hidden",
        }}
      >
        {/* Flap */}
        <div
          style={{
            height: 80,
            background: "#eee0d8",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Triangle fold */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: "polygon(0 100%, 50% 0, 100% 100%)",
              background: "#e8d5cc",
            }}
          />
          {/* Wax seal */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#ff5757",
              boxShadow: "0 2px 8px rgba(255,87,87,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                color: "white",
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              w
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "12px 16px 16px" }}>
          {/* Sender row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Avatar
              avatarUrl={rec.sender?.avatar_url ?? null}
              displayName={senderName}
              size={28}
            />
            <span style={{ fontSize: 12, color: "#8b7b72" }}>
              {senderName} sent you something
            </span>
          </div>

          {/* Mystery box */}
          <div
            style={{
              background: "#ede0d8",
              borderRadius: 10,
              padding: "16px",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 28 }}>🎬</span>
            <p style={{ fontSize: 12, fontStyle: "italic", color: "#a08070", marginTop: 6 }}>
              A title they think you&apos;ll love
            </p>
          </div>

          {/* Note */}
          {rec.note && (
            <p
              style={{
                fontSize: 12,
                fontStyle: "italic",
                color: "#a08070",
                marginBottom: 12,
                lineHeight: 1.4,
              }}
            >
              &ldquo;{rec.note}&rdquo;
            </p>
          )}

          {/* CTA */}
          <button
            onClick={handleOpen}
            style={{
              width: "100%",
              background: "#ff5757",
              color: "white",
              borderRadius: 12,
              padding: "12px",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
            }}
          >
            Tap to open
          </button>
        </div>
      </div>
    );
  }

  // State C — Actioned (watched)
  if (rec.watched) {
    return (
      <div
        style={{
          opacity: 0.55,
          background: "var(--surface)",
          borderRadius: 20,
          boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
          overflow: "hidden",
          transition: "all 300ms ease",
        }}
      >
        {/* Poster */}
        <div style={{ position: "relative", height: 120, overflow: "hidden", background: "var(--surface-2)" }}>
          {backdropUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={backdropUrl}
              alt={displayTitle}
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, transparent 20%, var(--surface) 100%)",
            }}
          />
          {/* Sender badge */}
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(253,252,251,0.92)",
              borderRadius: 20,
              padding: "3px 8px 3px 3px",
            }}
          >
            <Avatar avatarUrl={rec.sender?.avatar_url ?? null} displayName={senderName} size={22} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>{senderName}</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "10px 12px 14px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.2 }}>
            {displayTitle}
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: rec.note ? 6 : 10 }}>
            {year && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{year}</span>}
            {year && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>·</span>}
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {rec.mediaType === "tv" ? "Series" : "Film"}
            </span>
          </div>

          {rec.note && (
            <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.4 }}>
              &ldquo;{rec.note}&rdquo;
            </p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "8px 14px",
                background: "#FFF1EF", color: "#C44030",
                border: "0.5px solid #FACCBC", borderRadius: 12,
                fontSize: 12, fontWeight: 600,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="#C44030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Actioned
            </span>
            <Link
              href={`/title/${rec.mediaType}-${rec.tmdbId}`}
              style={{
                display: "flex", alignItems: "center",
                padding: "8px 14px",
                background: "#FFF1EF", color: "#C44030",
                border: "0.5px solid #FACCBC", borderRadius: 12,
                fontSize: 12, fontWeight: 600, textDecoration: "none",
              }}
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State B — Opened, unactioned
  return (
    <div
      style={{
        opacity: animOpacity,
        transform: animTransform,
        transition: animTransition ?? "all 300ms ease",
        background: "#1a1a1a",
        borderRadius: 20,
        boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
        overflow: "hidden",
      }}
    >
      {/* Poster */}
      <div style={{ position: "relative", height: 120, overflow: "hidden", background: "#111" }}>
        {backdropUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdropUrl}
            alt={displayTitle}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, transparent 20%, #1a1a1a 100%)",
          }}
        />
        {/* Sender badge overlay */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Avatar avatarUrl={rec.sender?.avatar_url ?? null} displayName={senderName} size={22} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "white" }}>{senderName}</span>
        </div>
        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(rec.id)}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 1L7 7M7 1L1 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "10px 12px 14px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "white", marginBottom: 4, lineHeight: 1.2 }}>
          {displayTitle}
        </h3>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: rec.note ? 6 : 12 }}>
          {year && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{year}</span>}
          {year && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>·</span>}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {rec.mediaType === "tv" ? "Series" : "Film"}
          </span>
        </div>

        {rec.note && (
          <p style={{ fontSize: 12, fontStyle: "italic", color: "rgba(255,255,255,0.45)", marginBottom: 12, lineHeight: 1.4 }}>
            &ldquo;{rec.note}&rdquo;
          </p>
        )}

        <button
          onClick={() => onAddToWatchlist(rec.id, rec.tmdbId, rec.mediaType, displayTitle, posterPath)}
          style={{
            width: "100%",
            background: "#ff5757",
            color: "white",
            borderRadius: 12,
            padding: "11px",
            fontWeight: 600,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            marginBottom: 8,
            display: "block",
          }}
        >
          Add to Watchlist
        </button>
        <button
          onClick={() => onMarkWatchedFromRec(rec.id, rec.tmdbId, rec.mediaType, displayTitle, posterPath)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.6)",
            borderRadius: 12,
            padding: "11px",
            fontWeight: 600,
            fontSize: 14,
            border: "0.5px solid rgba(255,255,255,0.12)",
            cursor: "pointer",
            display: "block",
          }}
        >
          Already watched
        </button>
      </div>
    </div>
  );
}
