"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import RecommendationCard from "@/components/RecommendationCard";
import SendMessageSheet from "@/components/SendMessageSheet";
import { useApp } from "@/lib/store";
import { getMovie, getTVShow } from "@/lib/tmdb";
import { getClient } from "@/lib/supabase/client";
import Image from "next/image";
import { formatRelativeTime } from "@/lib/mockData";
import type { TMDBTitle } from "@/lib/types";

type Tab = "friends" | "recommendations";

export default function InboxPage() {
  const { recommendations, markWatched, markUnwatched, addRecToWatchlist, markWatchedFromRec, dismissRecommendation, friendRequests, acceptFriendRequest, declineFriendRequest, markInboxSeen, messages, markMessagesRead, deleteMessage, userId } = useApp();
  const [titleCache, setTitleCache] = useState<Record<string, TMDBTitle>>({});
  const [tab, setTab] = useState<Tab>("recommendations");
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const supabase = useRef(getClient()).current;

  // Update last_active_at on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id) return;
      supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", session.user.id).then(() => {}, () => {});
    });
  }, [supabase]);

  // Clear the badge whenever the inbox is opened
  useEffect(() => {
    markInboxSeen();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "friends") markMessagesRead();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTitles = useCallback(async () => {
    const toFetch = recommendations.filter(
      (r) => !titleCache[`${r.mediaType}-${r.tmdbId}`]
    );
    if (toFetch.length === 0) {
      setLoading(false);
      return;
    }

    const results = await Promise.allSettled(
      toFetch.map((r) =>
        r.mediaType === "movie" ? getMovie(r.tmdbId) : getTVShow(r.tmdbId)
      )
    );

    const newEntries: Record<string, TMDBTitle> = {};
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        const key = `${toFetch[i].mediaType}-${toFetch[i].tmdbId}`;
        newEntries[key] = result.value;
      }
    });

    setTitleCache((prev) => ({ ...prev, ...newEntries }));
    setLoading(false);
  }, [recommendations, titleCache]);

  useEffect(() => {
    fetchTitles();
  }, [fetchTitles]);

  const enrichedRecs = recommendations.map((r) => ({
    ...r,
    tmdbTitle: titleCache[`${r.mediaType}-${r.tmdbId}`],
  }));

  const unwatchedCount = recommendations.filter((r) => !r.watched).length;

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#ffffff" }}>
      <header className="sticky top-0 z-40" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <AppHeader />

        <div className="px-4 pb-3">
          {tab === "recommendations" && unwatchedCount > 0 && (
            <p className="text-xs mb-3" style={{ color: "#999999" }}>
              {unwatchedCount} unseen recommendation{unwatchedCount !== 1 ? "s" : ""}
            </p>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#f7f7f7", border: "1px solid #eeeeee" }}>
            {(["recommendations", "friends"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all duration-200"
                style={
                  tab === t
                    ? { background: "#ff5757", color: "white" }
                    : { background: "transparent", color: "#999999" }
                }
              >
                {t === "recommendations" ? "Recommendations" : "Friends"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-2">
        {tab === "friends" ? (
          <div>
            {/* New Message button */}
            <button
              onClick={() => setComposeOpen(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl mb-4 transition-all active:scale-[0.98]"
              style={{ background: "#fff0f0", border: "1px solid rgba(255,87,87,0.15)" }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#ff5757" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2H14C14.6 2 15 2.4 15 3V10C15 10.6 14.6 11 14 11H5L2 14V3C2 2.4 2.4 2 2 2Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 5V8M6.5 6.5H9.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: "#ff5757" }}>New Message</p>
                <p className="text-xs" style={{ color: "#999999" }}>Send a message to a friend</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto flex-shrink-0">
                <path d="M5 3L9 7L5 11" stroke="#ffaaaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Messages */}
            {messages.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#cccccc" }}>
                  Messages
                </p>
                {messages.map((msg) => {
                  const isSent = msg.senderId === userId;
                  const senderName = msg.sender?.display_name || msg.sender?.username || "Someone";
                  const recipientName = msg.receiver?.display_name || msg.receiver?.username || "Someone";
                  const avatarColor = msg.sender?.avatar_url?.startsWith("color:")
                    ? msg.sender.avatar_url.slice(6)
                    : "#ff5757";
                  return (
                    <div
                      key={msg.id}
                      className="relative p-3 rounded-2xl"
                      style={{
                        background: isSent ? "#fff8f8" : "#ffffff",
                        border: isSent ? "1px solid rgba(255,87,87,0.2)" : "1px solid #eeeeee",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        opacity: isSent ? 0.85 : (msg.readAt ? 0.6 : 1),
                      }}
                    >
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90"
                        style={{ background: "#f0f0f0", border: "1px solid #e0e0e0" }}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 1L7 7M7 1L1 7" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-2 mb-2">
                        {isSent ? (
                          <>
                            <span className="text-xs font-semibold" style={{ color: "#ff5757" }}>You</span>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0"><path d="M2 6H10M7 3L10 6L7 9" stroke="#ffaaaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <span className="text-xs font-semibold" style={{ color: "#1a1a1a" }}>{recipientName}</span>
                          </>
                        ) : (
                          <>
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: avatarColor, color: "white", fontFamily: "var(--font-playfair)" }}
                            >
                              {senderName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold" style={{ color: "#1a1a1a" }}>{senderName}</span>
                            {!msg.readAt && (
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#ff5757" }} />
                            )}
                          </>
                        )}
                        <span className="text-[10px] ml-auto" style={{ color: "#999999" }}>
                          {formatRelativeTime(msg.createdAt)}
                        </span>
                      </div>
                      {msg.showTitle && (
                        <div
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-2"
                          style={{ background: "#f7f7f7" }}
                        >
                          {msg.showPosterPath && (
                            <Image
                              src={`https://image.tmdb.org/t/p/w92${msg.showPosterPath}`}
                              alt={msg.showTitle ?? ""}
                              width={28}
                              height={42}
                              className="rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div>
                            <p className="text-xs font-semibold line-clamp-1" style={{ color: "#1a1a1a" }}>{msg.showTitle}</p>
                            <p className="text-[10px] uppercase tracking-wide" style={{ color: "#999999" }}>
                              {msg.mediaType === "tv" ? "Series" : "Film"}
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="text-sm leading-snug" style={{ color: "#1a1a1a" }}>{msg.content}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Friend requests */}
            {friendRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#cccccc" }}>
                  Friend requests
                </p>
                {friendRequests.map((req) => {
                  const name = req.sender.display_name || req.sender.username || "Unknown";
                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 p-3 rounded-2xl"
                      style={{ background: "#ffffff", border: "1px solid #eeeeee", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: "#ff5757", color: "white", fontFamily: "var(--font-playfair)" }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{name}</p>
                        {req.sender.username && (
                          <p className="text-xs" style={{ color: "#999999" }}>@{req.sender.username}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => declineFriendRequest(req.id)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ background: "#f7f7f7", color: "#999999", border: "1px solid #eeeeee" }}
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => acceptFriendRequest(req.id, req.sender.id)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ background: "#ff5757", color: "white" }}
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {friendRequests.length === 0 && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "#f7f7f7" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#cccccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="9" cy="7" r="4" stroke="#cccccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#cccccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#cccccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: "#cccccc" }}>No friend activity</p>
                <p className="text-xs mt-1" style={{ color: "#dddddd" }}>Friend requests and messages will appear here</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[140px] rounded-2xl animate-pulse"
                  style={{ background: "#f7f7f7" }}
                />
              ))
            ) : enrichedRecs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "#f7f7f7" }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z"
                      stroke="#cccccc"
                      strokeWidth="2"
                    />
                    <path d="M22 6L12 13L2 6" stroke="#cccccc" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: "#cccccc" }}>All caught up!</p>
                <p className="text-xs mt-1" style={{ color: "#dddddd" }}>No recommendations waiting for you</p>
              </div>
            ) : (
              enrichedRecs.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  onMarkWatched={markWatched}
                  onMarkUnwatched={markUnwatched}
                  onAddToWatchlist={addRecToWatchlist}
                  onMarkWatchedFromRec={markWatchedFromRec}
                  onDismiss={dismissRecommendation}
                />
              ))
            )}
          </div>
        )}
      </main>

      <BottomNav />

      <SendMessageSheet
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
      />
    </div>
  );
}
