"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import PosterImage from "@/components/PosterImage";
import StreamingProviders from "@/components/StreamingProviders";
import RecommendModal from "@/components/RecommendModal";
import RatingSelector from "@/components/RatingSelector";
import { getMovie, getTVShow, tmdbImage, getDisplayTitle, getYear } from "@/lib/tmdb";
import { useApp } from "@/lib/store";
import type { TMDBTitle, MediaType, WatchlistStatus } from "@/lib/types";

const STATUS_LABELS: Record<WatchlistStatus, string> = {
  to_watch: "Add to Watchlist",
  watching: "Watching",
  watched: "Watched",
};

export default function TitleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const [mediaType, tmdbIdStr] = rawId.split("-") as [MediaType, string];
  const tmdbId = parseInt(tmdbIdStr, 10);

  const [title, setTitle] = useState<TMDBTitle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  const [survivorActive, setSurvivorActive] = useState(false);
  const [overlayFading, setOverlayFading] = useState(false);
  const [tribeTextVisible, setTribeTextVisible] = useState(false);

  const { addToWatchlist, removeFromWatchlist, isInWatchlist, getWatchlistItem, setWatchlistStatus, setRating } = useApp();
  const inWatchlist = isInWatchlist(tmdbId, mediaType);
  const watchlistItem = getWatchlistItem(tmdbId, mediaType);

  useEffect(() => {
    if (!tmdbId || isNaN(tmdbId)) { setError(true); return; }
    const fetch = mediaType === "movie" ? getMovie(tmdbId) : getTVShow(tmdbId);
    fetch.then(setTitle).catch(() => setError(true)).finally(() => setLoading(false));
  }, [tmdbId, mediaType]);

  useEffect(() => {
    if (tmdbId !== 14658) return;
    if (sessionStorage.getItem("survivorSeen")) return;
    const t = setTimeout(() => {
      setSurvivorActive(true);
      sessionStorage.setItem("survivorSeen", "1");
    }, 400);
    return () => clearTimeout(t);
  }, [tmdbId]);

  useEffect(() => {
    if (!survivorActive) return;
    const textTimer = setTimeout(() => setTribeTextVisible(true), 800);
    const fadeTimer = setTimeout(() => setOverlayFading(true), 3500);
    const hideTimer = setTimeout(() => {
      setSurvivorActive(false);
      setOverlayFading(false);
      setTribeTextVisible(false);
    }, 4100);
    return () => { clearTimeout(textTimer); clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, [survivorActive]);

  const dismissSurvivor = () => {
    setOverlayFading(true);
    setTimeout(() => { setSurvivorActive(false); setOverlayFading(false); setTribeTextVisible(false); }, 600);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--brand)" }}
        />
      </div>
    );
  }

  if (error || !title) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--text-muted)" }}>Could not load title.</p>
        <button onClick={() => router.back()} style={{ color: "var(--brand)" }} className="text-sm">
          Go back
        </button>
      </div>
    );
  }

  const displayTitle = getDisplayTitle(title);
  const year = getYear(title);
  const backdropUrl = title.backdrop_path ? tmdbImage(title.backdrop_path, "w780") : null;

  const handleStatusChange = (status: WatchlistStatus) => {
    if (watchlistItem) {
      setWatchlistStatus(watchlistItem.id, status);
    } else {
      addToWatchlist({ tmdbId, mediaType, titleStr: displayTitle, posterPath: title.poster_path, status });
    }
  };

  const handleAddOrRemove = () => {
    if (inWatchlist) removeFromWatchlist(tmdbId, mediaType);
    else addToWatchlist({ tmdbId, mediaType, titleStr: displayTitle, posterPath: title.poster_path, status: "to_watch" });
  };

  return (
    <>
      <div className="min-h-screen pb-10" style={{ background: "var(--bg)" }}>
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="fixed top-12 left-4 z-50 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,250,248,0.9)", border: "0.5px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Backdrop */}
        <div className="relative w-full h-[240px] overflow-hidden">
          {backdropUrl ? (
            <Image src={backdropUrl} alt={displayTitle} fill className="object-cover" priority />
          ) : (
            <div className="w-full h-full" style={{ background: "var(--surface-2)" }} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(255,250,248,0) 0%, rgba(255,250,248,0.3) 60%, var(--bg) 100%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="px-4 -mt-8 relative">
          <div className="flex gap-4 mb-4">
            {/* Poster */}
            <div
              className="relative w-[90px] h-[135px] overflow-hidden flex-shrink-0"
              style={{ borderRadius: 16, border: "0.5px solid var(--border)", boxShadow: "0 8px 24px rgba(180,100,80,0.15)" }}
            >
              <PosterImage path={title.poster_path} alt={displayTitle} size="w185" fill />
            </div>

            {/* Basic info */}
            <div className="flex-1 pt-10">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className="text-[11px] font-medium"
                  style={{ background: "transparent", border: "0.5px solid var(--brand)", color: "var(--brand)", borderRadius: 20, padding: "2px 8px" }}
                >
                  {mediaType === "tv" ? "Series" : "Film"}
                </span>
                {year && (
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{year}</span>
                )}
              </div>
              <h1 className="text-xl font-bold leading-tight mb-2" style={{ color: "var(--text-primary)" }}>
                {displayTitle}
              </h1>
              {title.tagline && (
                <p className="text-xs italic mb-2" style={{ color: "var(--text-secondary)" }}>
                  &ldquo;{title.tagline}&rdquo;
                </p>
              )}
              {watchlistItem?.rating && (
                <div className="flex items-center gap-1">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--brand)", color: "white" }}
                  >
                    ★ {watchlistItem.rating}/10
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Streaming providers */}
          <div className="mb-4 h-10 flex items-center">
            <StreamingProviders id={tmdbId} mediaType={mediaType} size="md" maxShow={6} />
          </div>

          {/* Genres */}
          {title.genres && title.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {title.genres.map((g) => (
                <span
                  key={g.id}
                  className="px-3 py-1 text-xs font-medium"
                  style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: 20 }}
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          {title.overview && (
            <div className="mb-6">
              <h2 className="text-[11px] font-semibold mb-2 uppercase tracking-[0.06em]" style={{ color: "var(--text-secondary)" }}>
                Overview
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {title.overview}
              </p>
            </div>
          )}

          {/* Watchlist status selector */}
          {inWatchlist && watchlistItem ? (
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "var(--text-secondary)" }}>
                Your status
              </p>
              <div className="flex gap-2">
                {(["to_watch", "watching", "watched"] as WatchlistStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="flex-1 py-2.5 text-xs font-semibold transition-all active:scale-95"
                    style={
                      watchlistItem.status === s
                        ? { background: "var(--brand)", color: "white", borderRadius: 14 }
                        : { background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }
                    }
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={handleAddOrRemove}
              className="w-full py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-3"
              style={{ background: "var(--brand)", color: "white", borderRadius: 14 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13 2H3C2.4 2 2 2.4 2 3V14L8 11L14 14V3C14 2.4 13.6 2 13 2Z"
                  stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />
                <path d="M8 5V9M6 7H10" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Add to Watchlist
            </button>
          )}

          {/* Remove from watchlist */}
          {inWatchlist && (
            <button
              onClick={() => removeFromWatchlist(tmdbId, mediaType)}
              className="w-full py-3 text-sm font-medium mb-3 transition-all active:scale-[0.98]"
              style={{ background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }}
            >
              Remove from watchlist
            </button>
          )}

          {/* Rate button */}
          <button
            onClick={() => setRateOpen(true)}
            className="w-full py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-3"
            style={{ background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1L9.8 5.5H14.6L10.6 8.6L12.2 13.1L8 10.1L3.8 13.1L5.4 8.6L1.4 5.5H6.2L8 1Z"
                stroke="#C44030" strokeWidth="1.5" strokeLinejoin="round"
                fill={watchlistItem?.rating ? "#C44030" : "none"}
              />
            </svg>
            {watchlistItem?.rating ? `Your rating: ${watchlistItem.rating}/10` : "Rate this"}
          </button>

          {/* Recommend CTA */}
          <button
            onClick={() => setRecommendOpen(true)}
            className="w-full py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M14 2L2 6.5L7 8.5M14 2L9.5 14L7 8.5M14 2L7 8.5"
                stroke="#C44030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            Recommend to a friend
          </button>
        </div>
      </div>

      <RecommendModal
        isOpen={recommendOpen}
        onClose={() => setRecommendOpen(false)}
        titleName={displayTitle}
        posterPath={title?.poster_path}
        tmdbId={tmdbId}
        mediaType={mediaType}
      />

      <RatingSelector
        isOpen={rateOpen}
        onClose={() => setRateOpen(false)}
        currentRating={watchlistItem?.rating ?? null}
        titleName={displayTitle}
        onRate={(rating) => setRating(tmdbId, mediaType, rating)}
      />

      {survivorActive && (
        <SurvivorOverlay fading={overlayFading} textVisible={tribeTextVisible} onDismiss={dismissSurvivor} />
      )}
    </>
  );
}

const EMBERS = [
  { left: "47%", size: 3, delay: 0.0, dx: "-9px",  dur: 2.0 },
  { left: "52%", size: 2, delay: 0.5, dx: "13px",  dur: 1.8 },
  { left: "49%", size: 4, delay: 1.0, dx: "-6px",  dur: 2.3 },
  { left: "51%", size: 2, delay: 1.4, dx: "9px",   dur: 1.6 },
  { left: "45%", size: 3, delay: 0.3, dx: "-15px", dur: 2.5 },
  { left: "54%", size: 2, delay: 1.7, dx: "7px",   dur: 1.9 },
  { left: "48%", size: 3, delay: 0.8, dx: "-11px", dur: 2.1 },
  { left: "50%", size: 2, delay: 1.2, dx: "16px",  dur: 1.7 },
];

function SurvivorOverlay({
  fading,
  textVisible,
  onDismiss,
}: {
  fading: boolean;
  textVisible: boolean;
  onDismiss: () => void;
}) {
  return (
    <>
      <style>{`
        @keyframes flicker1 {
          0%,100% { transform: scaleX(1) scaleY(1) rotate(0deg); }
          25%      { transform: scaleX(0.88) scaleY(1.06) rotate(-2deg); }
          50%      { transform: scaleX(1.08) scaleY(0.94) rotate(1.5deg); }
          75%      { transform: scaleX(0.92) scaleY(1.04) rotate(-1deg); }
        }
        @keyframes flicker2 {
          0%,100% { transform: scaleX(1) scaleY(1) rotate(0deg); }
          30%      { transform: scaleX(1.1) scaleY(0.9) rotate(2deg); }
          60%      { transform: scaleX(0.9) scaleY(1.08) rotate(-2.5deg); }
          80%      { transform: scaleX(1.05) scaleY(0.96) rotate(1deg); }
        }
        @keyframes flicker3 {
          0%,100% { transform: scaleX(1) scaleY(1) rotate(0deg); }
          20%      { transform: scaleX(0.85) scaleY(1.1) rotate(-3deg); }
          55%      { transform: scaleX(1.12) scaleY(0.88) rotate(2deg); }
          80%      { transform: scaleX(0.94) scaleY(1.06) rotate(-1.5deg); }
        }
        @keyframes flicker4 {
          0%,100% { transform: scaleX(1) scaleY(1); }
          40%      { transform: scaleX(0.8) scaleY(1.15); }
          70%      { transform: scaleX(1.15) scaleY(0.85); }
        }
        @keyframes glow-pulse {
          0%,100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.15); }
        }
        @keyframes ember-rise {
          0%   { transform: translateY(0) translateX(0); opacity: 0.95; }
          100% { transform: translateY(-72px) translateX(var(--dx)); opacity: 0; }
        }
        @keyframes tribe-fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        onClick={onDismiss}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(10,8,5,0.92)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: fading ? 0 : 1,
          transition: "opacity 0.6s ease",
          pointerEvents: fading ? "none" : "all",
        }}
      >
        {/* Torch */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* Glow */}
          <div style={{
            position: "absolute",
            top: -30,
            left: "50%",
            transform: "translateX(-50%)",
            width: 90,
            height: 90,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(255,140,0,0.45) 0%, transparent 70%)",
            animation: "glow-pulse 1.6s ease-in-out infinite",
          }} />

          {/* Flames */}
          <div style={{ position: "relative", width: 40, height: 60, marginBottom: -2 }}>
            {/* Outer flame */}
            <div style={{
              position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
              width: 38, height: 58,
              background: "radial-gradient(ellipse at 50% 70%, #FF6B00, transparent 80%)",
              borderRadius: "50% 50% 40% 40% / 60% 60% 40% 40%",
              animation: "flicker1 0.35s ease-in-out infinite alternate",
              transformOrigin: "center bottom",
            }} />
            {/* Mid flame */}
            <div style={{
              position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
              width: 28, height: 48,
              background: "radial-gradient(ellipse at 50% 65%, #FF9500, transparent 80%)",
              borderRadius: "50% 50% 40% 40% / 60% 60% 40% 40%",
              animation: "flicker2 0.28s ease-in-out infinite alternate",
              transformOrigin: "center bottom",
            }} />
            {/* Inner flame */}
            <div style={{
              position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
              width: 18, height: 36,
              background: "radial-gradient(ellipse at 50% 60%, #FFCC00, transparent 80%)",
              borderRadius: "50% 50% 40% 40% / 60% 60% 40% 40%",
              animation: "flicker3 0.22s ease-in-out infinite alternate",
              transformOrigin: "center bottom",
            }} />
            {/* White core */}
            <div style={{
              position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
              width: 9, height: 20,
              background: "radial-gradient(ellipse at 50% 55%, #FFF5CC, transparent 80%)",
              borderRadius: "50% 50% 40% 40% / 60% 60% 40% 40%",
              animation: "flicker4 0.18s ease-in-out infinite alternate",
              transformOrigin: "center bottom",
            }} />

            {/* Embers */}
            {EMBERS.map((e, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: e.left,
                  width: e.size,
                  height: e.size,
                  borderRadius: "50%",
                  background: i % 2 === 0 ? "#FF9500" : "#FFCC00",
                  animation: `ember-rise ${e.dur}s ease-out ${e.delay}s infinite`,
                  ["--dx" as string]: e.dx,
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* Torch head */}
          <div style={{
            width: 28,
            height: 18,
            background: "linear-gradient(to bottom, #3D2000, #5D3A1A)",
            borderRadius: "4px 4px 2px 2px",
          }} />

          {/* Torch handle */}
          <div style={{
            width: 11,
            height: 80,
            background: "linear-gradient(to bottom, #5D3A1A, #3D2000)",
            borderRadius: 4,
            marginTop: 1,
          }} />
        </div>

        {/* Text */}
        <p style={{
          marginTop: 36,
          fontFamily: "Georgia, serif",
          fontSize: 22,
          color: "#FFB347",
          letterSpacing: "0.02em",
          textShadow: "0 0 20px rgba(255,140,0,0.6), 0 2px 8px rgba(0,0,0,0.8)",
          opacity: textVisible ? 1 : 0,
          animation: textVisible ? "tribe-fade 0.7s ease forwards" : "none",
        }}>
          The tribe has spoken.
        </p>
      </div>
    </>
  );
}
