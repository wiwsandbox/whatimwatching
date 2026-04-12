"use client";

import { useState } from "react";
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
}

export default function RecommendationCard({
  rec,
  onMarkWatched,
  onMarkUnwatched,
}: RecommendationCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const tmdbTitle = rec.tmdbTitle;
  const displayTitle = tmdbTitle ? getDisplayTitle(tmdbTitle) : rec.title || "Loading…";
  const year = tmdbTitle ? getYear(tmdbTitle) : "";
  const senderName = rec.sender?.display_name || rec.sender?.username || "Someone";
  const posterPath = tmdbTitle?.poster_path ?? rec.posterPath ?? null;

  const handleToggleWatched = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (rec.watched) onMarkUnwatched(rec.id);
      else onMarkWatched(rec.id);
      setIsAnimating(false);
    }, 200);
  };

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
      {rec.watched && (
        <div
          className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
          style={{ background: "#ff5757", color: "#fff" }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Watched
        </div>
      )}

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
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={handleToggleWatched}
              disabled={isAnimating}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95"
              style={
                rec.watched
                  ? { background: "#f7f7f7", color: "#999999", border: "1px solid #eeeeee" }
                  : { background: "#ff5757", color: "white" }
              }
            >
              {rec.watched ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Watched
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.5" />
                    <path d="M4 6L6 8L9 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Mark watched
                </>
              )}
            </button>

            <Link
              href={`/title/${rec.mediaType}-${rec.tmdbId}`}
              className="flex items-center gap-1 text-xs rounded-full px-3 py-1.5 transition-all active:scale-95"
              style={{ background: "#f7f7f7", color: "#666666", border: "1px solid #eeeeee" }}
            >
              Details
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M3 5H7M7 5L5 3M7 5L5 7" stroke="#999999" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
