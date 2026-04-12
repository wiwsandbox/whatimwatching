"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/authContext";
import { getClient } from "@/lib/supabase/client";
import AddFriendSheet from "@/components/AddFriendSheet";

interface Friend {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const { watchlist } = useApp();
  const router = useRouter();
  const supabase = getClient();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendQuery, setFriendQuery] = useState("");
  const [addFriendOpen, setAddFriendOpen] = useState(false);

  const displayName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "?";
  const username = profile?.username || user?.email?.split("@")[0] || "";
  const avatarColor = profile?.avatar_url?.startsWith("color:")
    ? profile.avatar_url.slice(6)
    : "#ff5757";

  useEffect(() => {
    if (!user) return;
    async function loadFriends() {
      setFriendsLoading(true);
      const { data } = await supabase
        .from("friendships")
        .select("friend:friend_id(id, username, display_name, avatar_url)")
        .eq("user_id", user!.id)
        .eq("status", "accepted");

      if (data) {
        const mapped = data
          .map((row) => (Array.isArray(row.friend) ? row.friend[0] : row.friend))
          .filter(Boolean) as Friend[];
        console.log("Friends loaded:", JSON.stringify(mapped));
        setFriends(mapped);
      }
      setFriendsLoading(false);
    }
    loadFriends();
  }, [user, supabase, addFriendOpen]); // re-fetch when sheet closes (might have added someone)

  const filteredFriends = friends.filter((f) => {
    const q = friendQuery.toLowerCase();
    if (!q) return true;
    return (
      (f.display_name || "").toLowerCase().includes(q) ||
      (f.username || "").toLowerCase().includes(q)
    );
  });

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
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{ background: avatarColor, color: "white", fontFamily: "var(--font-playfair)" }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-base" style={{ color: "#1a1a1a" }}>{displayName}</h2>
              <p className="text-sm" style={{ color: "#999999" }}>@{username}</p>
              {profile?.bio && (
                <p className="text-xs mt-1 leading-snug" style={{ color: "#666666" }}>{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Friends section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#cccccc" }}>
              Friends {!friendsLoading && friends.length > 0 && `· ${friends.length}`}
            </h2>
            <button
              onClick={() => setAddFriendOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={{ background: "#fff0f0", color: "#ff5757", border: "1px solid rgba(255,87,87,0.2)" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="4.5" cy="4" r="2.5" stroke="#ff5757" strokeWidth="1.3" />
                <path d="M1 10C1 8.3 2.6 7 4.5 7" stroke="#ff5757" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M9 7V11M7 9H11" stroke="#ff5757" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Add friend
            </button>
          </div>

          {/* Search bar */}
          {friends.length > 3 && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
              style={{ background: "#f7f7f7", border: "1px solid #eeeeee" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="5" stroke="#cccccc" strokeWidth="1.5" />
                <path d="M11 11L8.5 8.5" stroke="#cccccc" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={friendQuery}
                onChange={(e) => setFriendQuery(e.target.value)}
                placeholder="Search friends…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "#1a1a1a", fontFamily: "var(--font-dm-sans)" }}
              />
              {friendQuery && (
                <button onClick={() => setFriendQuery("")}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2L10 10M10 2L2 10" stroke="#cccccc" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {friendsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#f7f7f7" }} />
              ))}
            </div>
          ) : filteredFriends.length === 0 ? (
            <div
              className="flex flex-col items-center py-8 rounded-2xl text-center"
              style={{ background: "#f7f7f7" }}
            >
              <p className="text-sm font-semibold" style={{ color: "#cccccc" }}>
                {friendQuery ? `No results for "${friendQuery}"` : "No friends yet — add someone you know"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFriends.map((friend) => {
                const name = friend.display_name || friend.username || "?";
                const color = friend.avatar_url?.startsWith("color:")
                  ? friend.avatar_url.slice(6)
                  : "#ff5757";
                return (
                  <Link
                    key={friend.id}
                    href={`/friends/${friend.id}`}
                    className="flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]"
                    style={{ background: "#ffffff", border: "1px solid #eeeeee", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: color, color: "white", fontFamily: "var(--font-playfair)" }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{name}</p>
                      {friend.username && (
                        <p className="text-xs" style={{ color: "#999999" }}>@{friend.username}</p>
                      )}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                      <path d="M5 3L9 7L5 11" stroke="#cccccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                );
              })}
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
