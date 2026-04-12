"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import PosterImage from "@/components/PosterImage";
import { getMovie, getTVShow, getDisplayTitle } from "@/lib/tmdb";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/authContext";
import AddFriendSheet from "@/components/AddFriendSheet";
import type { TMDBTitle, WatchlistItem } from "@/lib/types";

export default function ProfilePage() {
  const { watchlist } = useApp();
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [recentPosters, setRecentPosters] = useState<Array<{ title: TMDBTitle; item: typeof watchlist[0] }>>([]);
  const [addFriendOpen, setAddFriendOpen] = useState(false);

  useEffect(() => {
    const watched = watchlist.filter((w) => w.status === "watched").slice(0, 6);
    Promise.allSettled(
      watched.map((w) => (w.mediaType === "movie" ? getMovie(w.tmdbId) : getTVShow(w.tmdbId)))
    ).then((results) => {
      const enriched = results
        .map((r, i) => (r.status === "fulfilled" ? { title: r.value, item: watched[i] } : null))
        .filter((x): x is NonNullable<typeof x> => x !== null);
      setRecentPosters(enriched);
    });
  }, [watchlist]);

  const watchedCount = watchlist.filter((w) => w.status === "watched").length;
  const toWatchCount = watchlist.filter((w) => w.status !== "watched").length;
  const ratedCount = watchlist.filter((w) => w.rating).length;

  const displayName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "?";
  const username = profile?.username || user?.email?.split("@")[0] || "";

  const avatarColor = profile?.avatar_url?.startsWith("color:")
    ? profile.avatar_url.slice(6)
    : "#ff5757";

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth");
  };

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#ffffff" }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <AppHeader />
      </header>

      <main className="flex-1 px-4 space-y-5 pt-2">
        {/* User card */}
        <div
          className="p-4 rounded-2xl"
          style={{ background: "#ffffff", border: "1px solid #eeeeee", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{ background: avatarColor, color: "white", fontFamily: "var(--font-playfair)" }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: "#1a1a1a" }}>{displayName}</h2>
              <p className="text-sm" style={{ color: "#999999" }}>@{username}</p>
              {profile?.bio && (
                <p className="text-xs mt-1 leading-snug" style={{ color: "#666666" }}>{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div
            className="flex items-center justify-around py-3 rounded-xl"
            style={{ background: "#f7f7f7" }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-bold" style={{ color: "#1a1a1a", fontFamily: "var(--font-playfair)" }}>
                {watchedCount}
              </span>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "#999999" }}>Watched</span>
            </div>
            <div className="w-px h-8" style={{ background: "#eeeeee" }} />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-bold" style={{ color: "#1a1a1a", fontFamily: "var(--font-playfair)" }}>
                {toWatchCount}
              </span>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "#999999" }}>To watch</span>
            </div>
            <div className="w-px h-8" style={{ background: "#eeeeee" }} />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-bold" style={{ color: "#1a1a1a", fontFamily: "var(--font-playfair)" }}>
                {ratedCount}
              </span>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "#999999" }}>Rated</span>
            </div>
          </div>
        </div>

        {/* Add Friend */}
        <button
          onClick={() => setAddFriendOpen(true)}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: "#fff0f0", color: "#ff5757", border: "1px solid rgba(255,87,87,0.2)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6" cy="5" r="3" stroke="#ff5757" strokeWidth="1.5" />
            <path d="M1 13C1 10.8 3.2 9 6 9" stroke="#ff5757" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M12 9V13M10 11H14" stroke="#ff5757" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Add a friend
        </button>

        {/* Recently watched + ratings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#cccccc" }}>
              Recently watched
            </h2>
            <Link href="/watchlist" className="text-xs font-semibold" style={{ color: "#ff5757" }}>
              See all
            </Link>
          </div>

          {recentPosters.length === 0 ? (
            <div
              className="flex flex-col items-center py-8 rounded-2xl text-center"
              style={{ background: "#f7f7f7" }}
            >
              <p className="text-xs" style={{ color: "#cccccc" }}>
                Mark titles as watched to see them here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {recentPosters.map(({ title, item }) => (
                <RatedPosterTile key={item.id} title={title} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div
          className="p-4 rounded-2xl space-y-1"
          style={{ background: "#ffffff", border: "1px solid #eeeeee", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
        >
          {[
            { label: "Notifications", icon: "🔔" },
            { label: "Privacy", icon: "🔒" },
            { label: "Help & Feedback", icon: "💬" },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center justify-between py-3 text-sm transition-opacity active:opacity-60"
              style={{ color: "#666666", borderBottom: "1px solid #f7f7f7" }}
            >
              <div className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="#cccccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 py-3 text-sm transition-opacity active:opacity-60"
            style={{ color: "#ff5757" }}
          >
            <span>🚪</span>
            <span>Sign out</span>
          </button>
        </div>
      </main>

      <BottomNav />
      <AddFriendSheet isOpen={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
    </div>
  );
}

function RatedPosterTile({
  title,
  item,
}: {
  title: TMDBTitle;
  item: WatchlistItem;
}) {
  return (
    <Link
      href={`/title/${item.mediaType}-${item.tmdbId}`}
      className="relative aspect-[2/3] rounded-xl overflow-hidden"
      style={{ background: "#f7f7f7" }}
    >
      <PosterImage
        path={title.poster_path}
        alt={getDisplayTitle(title)}
        size="w185"
        fill
        className="rounded-xl"
      />
      {item.rating && (
        <div
          className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: "#ff5757", color: "white" }}
        >
          ★ {item.rating}
        </div>
      )}
    </Link>
  );
}
