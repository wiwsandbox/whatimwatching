"use client";

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
}

export default function RecommendationCard({
  rec,
  onAddToWatchlist,
  onMarkWatchedFromRec,
  onDismiss,
}: RecommendationCardProps) {
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

  const isActioned = rec.watched;

  const cardBg = isActioned ? "var(--surface)" : "#1a1a1a";
  const posterOpacity = isActioned ? 0.4 : 0.6;
  const gradientEnd = isActioned ? "var(--surface)" : "#1a1a1a";
  const titleColor = isActioned ? "var(--text-primary)" : "white";
  const metaColor = isActioned ? "var(--text-muted)" : "rgba(255,255,255,0.4)";
  const noteColor = isActioned ? "var(--text-muted)" : "rgba(255,255,255,0.45)";

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 20,
        boxShadow: isActioned
          ? "0 2px 12px rgba(180,100,80,0.06)"
          : "0 4px 24px rgba(0,0,0,0.22)",
        border: isActioned ? "0.5px solid var(--border)" : undefined,
        overflow: "hidden",
        opacity: isActioned ? 0.55 : 1,
        transition: "opacity 300ms ease, transform 150ms cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {/* Poster */}
      <div style={{ position: "relative", height: 120, overflow: "hidden", background: isActioned ? "var(--surface-2)" : "#111" }}>
        {backdropUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdropUrl}
            alt={displayTitle}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: posterOpacity }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, transparent 20%, ${gradientEnd} 100%)`,
          }}
        />

        {/* Sender badge — top-left */}
        {isActioned ? (
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
        ) : (
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
        )}

        {/* Dismiss button — top-right */}
        <button
          onClick={() => onDismiss(rec.id)}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: isActioned ? "var(--surface-2)" : "rgba(255,255,255,0.15)",
            border: isActioned ? "0.5px solid var(--border)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d="M1 1L7 7M7 1L1 7"
              stroke={isActioned ? "var(--text-muted)" : "white"}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "10px 12px 14px" }}>
        {/* Title + rating row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: titleColor,
              lineHeight: 1.2,
              flex: 1,
            }}
          >
            {displayTitle}
          </h3>
          {rec.senderRating != null && (
            <div
              style={{
                background: "#ff5757",
                borderRadius: 9,
                padding: "4px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 800, color: "white", lineHeight: 1 }}>
                {rec.senderRating}
              </span>
              <span style={{ fontSize: 7, color: "rgba(255,255,255,0.7)", lineHeight: 1 }}>/10</span>
            </div>
          )}
        </div>

        {/* Year + media type */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: rec.note ? 6 : 12 }}>
          {year && (
            <span style={{ fontSize: 9, color: metaColor }}>{year}</span>
          )}
          <span
            style={{
              fontSize: 9,
              color: isActioned ? "var(--text-secondary)" : "#ff8080",
              border: isActioned ? "0.5px solid var(--border)" : "0.5px solid #ff5757",
              borderRadius: 20,
              padding: "2px 6px",
            }}
          >
            {rec.mediaType === "tv" ? "Series" : "Film"}
          </span>
        </div>

        {/* Note */}
        {rec.note && (
          <p style={{ fontSize: 10, fontStyle: "italic", color: noteColor, marginBottom: 12, lineHeight: 1.4 }}>
            &ldquo;{rec.note}&rdquo;
          </p>
        )}

        {/* CTAs */}
        {isActioned ? (
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
        ) : (
          <>
            <button
              onClick={() => onAddToWatchlist(rec.id, rec.tmdbId, rec.mediaType, displayTitle, posterPath)}
              style={{
                width: "100%",
                display: "block",
                background: "#ff5757",
                color: "white",
                borderRadius: 12,
                padding: "10px",
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                marginBottom: 6,
              }}
            >
              Add to Watchlist
            </button>
            <button
              onClick={() => onMarkWatchedFromRec(rec.id, rec.tmdbId, rec.mediaType, displayTitle, posterPath)}
              style={{
                width: "100%",
                display: "block",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.6)",
                borderRadius: 12,
                padding: "8px",
                fontSize: 11,
                fontWeight: 600,
                border: "0.5px solid rgba(255,255,255,0.12)",
                cursor: "pointer",
              }}
            >
              Already watched
            </button>
          </>
        )}
      </div>
    </div>
  );
}
