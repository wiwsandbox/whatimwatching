"use client";

import Link from "next/link";
import PosterImage from "./PosterImage";
import StreamingProviders from "./StreamingProviders";
import { getDisplayTitle, getYear } from "@/lib/tmdb";
import { formatRelativeTime } from "@/lib/mockData";
import type { Recommendation } from "@/lib/types";

interface RecommendationCardProps {
  rec: Recommendation & { tmdbTitle?: import("@/lib/types").TMDBTitle };
  onMarkWatched: (id: string) => void;
  onMarkUnwatched: (id: string) => void;
  onAddToWatchlist: (recId: string, tmdbId: number, mediaType: import("@/lib/types").MediaType, title: string, posterPath: string | null) => void;
  onMarkWatchedFromRec: (recId: string, tmdbId: number, mediaType: import("@/lib/types").MediaType, title: string, posterPath: string | null) => void;
  onDismiss: (recId: string) => void;
}

export default function RecommendationCard({
  rec,
  onMarkWatched,
  onMarkUnwatched,
  onAddToWatchlist,
  onMarkWatchedFromRec,
  onDismiss,
}: RecommendationCardProps) {
  const tmdbTitle = rec.tmdbTitle;
  const displayTitle = tmdbTitle ? getDisplayTitle(tmdbTitle) : rec.title || "Loading…";
  const year = tmdbTitle ? getYear(tmdbTitle) : "";
  const senderName = rec.sender?.display_name || rec.sender?.username || "Someone";
  const posterPath = tmdbTitle?.poster_path ?? rec.posterPath ?? null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden transition-opacity duration-300 active:scale-[0.97]"
      style={{
        background: "var(--surface)",
        opacity: rec.watched ? 0.55 : 1,
        border: "0.5px solid var(--border)",
        boxShadow: "0 2px 12px rgba(180, 100, 80, 0.06)",
        transition: "transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms",
      }}
    >
      <button
        onClick={() => onDismiss(rec.id)}
        className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{ background: "var(--surface-2)", border: "0.5px solid var(--border)" }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 1L7 7M7 1L1 7" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="flex gap-3 p-3">
        {/* Poster */}
        <Link href={`/title/${rec.mediaType}-${rec.tmdbId}`} className="flex-shrink-0">
          <div
            className="relative w-[72px] h-[108px] overflow-hidden"
            style={{ background: "var(--surface-2)", borderRadius: 8 }}
          >
            <PosterImage path={posterPath} alt={displayTitle} size="w185" fill />
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Sender */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: "var(--brand)", color: "white", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)" }}
              >
                {senderName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                {senderName}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>·</span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {formatRelativeTime(rec.createdAt)}
              </span>
            </div>

            {/* Title */}
            <Link href={`/title/${rec.mediaType}-${rec.tmdbId}`}>
              <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2" style={{ color: "var(--text-primary)" }}>
                {displayTitle}
              </h3>
            </Link>

            {/* Meta */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {year && (
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{year}</span>
              )}
              <span
                className="text-[11px] font-medium"
                style={{ background: "transparent", border: "0.5px solid var(--brand)", color: "var(--brand)", borderRadius: 20, padding: "2px 8px" }}
              >
                {rec.mediaType === "tv" ? "Series" : "Film"}
              </span>
              <StreamingProviders id={rec.tmdbId} mediaType={rec.mediaType} maxShow={3} size="sm" />
            </div>

            {/* Note */}
            {rec.note && (
              <p className="text-xs italic leading-snug line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                &ldquo;{rec.note}&rdquo;
              </p>
            )}
          </div>

          {/* Actions */}
          {!rec.watched ? (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <button
                onClick={() => onAddToWatchlist(rec.id, rec.tmdbId, rec.mediaType, displayTitle, posterPath)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95"
                style={{ background: "var(--brand)", color: "white", borderRadius: 14 }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10 1.5H2C1.4 1.5 1 1.9 1 2.5V10.5L6 8L11 10.5V2.5C11 1.9 10.6 1.5 10 1.5Z" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 3.5V6.5M4.5 5H7.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Add to Watchlist
              </button>
              <button
                onClick={() => onMarkWatchedFromRec(rec.id, rec.tmdbId, rec.mediaType, displayTitle, posterPath)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95"
                style={{ background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="#C44030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Watched
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2.5">
              <span
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                style={{ background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="#C44030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Actioned
              </span>
              <Link
                href={`/title/${rec.mediaType}-${rec.tmdbId}`}
                className="flex items-center gap-1 text-xs px-3 py-1.5 transition-all active:scale-95"
                style={{ background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }}
              >
                Details
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
