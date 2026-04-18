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
      className="relative rounded-2xl overflow-hidden transition-opacity duration-300"
      style={{
        background: "#ffffff",
        opacity: rec.watched ? 0.55 : 1,
        border: "1px solid #eeeeee",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <button
        onClick={() => onDismiss(rec.id)}
        className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{ background: "#f0f0f0", border: "1px solid #e0e0e0" }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 1L7 7M7 1L1 7" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="flex gap-3 p-3">
        {/* Poster */}
        <Link href={`/title/${rec.mediaType}-${rec.tmdbId}`} className="flex-shrink-0">
          <div
            className="relative w-[72px] h-[108px] rounded-xl overflow-hidden"
            style={{ background: "#f7f7f7" }}
          >
            <PosterImage path={posterPath} alt={displayTitle} size="w185" fill className="rounded-xl" />
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Sender */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: "#ff5757", color: "white" }}
              >
                {senderName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium" style={{ color: "#666666" }}>
                {senderName}
              </span>
              <span style={{ color: "#cccccc", fontSize: "10px" }}>·</span>
              <span className="text-[10px]" style={{ color: "#999999" }}>
                {formatRelativeTime(rec.createdAt)}
              </span>
            </div>

            {/* Title */}
            <Link href={`/title/${rec.mediaType}-${rec.tmdbId}`}>
              <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2" style={{ color: "#1a1a1a" }}>
                {displayTitle}
              </h3>
            </Link>

            {/* Meta */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {year && (
                <span className="text-[11px]" style={{ color: "#999999" }}>{year}</span>
              )}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full uppercase font-medium tracking-wide"
                style={
                  rec.mediaType === "tv"
                    ? { background: "#e8f0ff", color: "#3b5bdb" }
                    : { background: "#fff0f0", color: "#ff5757" }
                }
              >
                {rec.mediaType === "tv" ? "Series" : "Film"}
              </span>
              <StreamingProviders id={rec.tmdbId} mediaType={rec.mediaType} maxShow={3} size="sm" />
            </div>

            {/* Note */}
            {rec.note && (
              <p className="text-xs italic leading-snug line-clamp-2" style={{ color: "#666666" }}>
                &ldquo;{rec.note}&rdquo;
              </p>
            )}
          </div>

          {/* Actions */}
          {!rec.watched ? (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <button
                onClick={() => onAddToWatchlist(rec.id, rec.tmdbId, rec.mediaType, displayTitle, posterPath)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95"
                style={{ background: "#ff5757", color: "white" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10 1.5H2C1.4 1.5 1 1.9 1 2.5V10.5L6 8L11 10.5V2.5C11 1.9 10.6 1.5 10 1.5Z" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 3.5V6.5M4.5 5H7.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Add to Watchlist
              </button>
              <button
                onClick={() => onMarkWatchedFromRec(rec.id, rec.tmdbId, rec.mediaType, displayTitle, posterPath)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95"
                style={{ background: "#f7f7f7", color: "#666666", border: "1px solid #eeeeee" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Watched
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2.5">
              <span
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "#f7f7f7", color: "#999999", border: "1px solid #eeeeee" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Actioned
              </span>
              <Link
                href={`/title/${rec.mediaType}-${rec.tmdbId}`}
                className="flex items-center gap-1 text-xs rounded-full px-3 py-1.5 transition-all active:scale-95"
                style={{ background: "#f7f7f7", color: "#666666", border: "1px solid #eeeeee" }}
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
