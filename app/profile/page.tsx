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
    : "var(--brand)";

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
        setFriends(mapped);
      }
      setFriendsLoading(false);
    }
    loadFriends();
  }, [user, supabase, addFriendOpen]);

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
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: "rgba(255,250,248,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <AppHeader />
      </header>

      <main className="flex-1 px-4 space-y-5 pt-2">
        {/* User card */}
        <div
          className="p-4 rounded-2xl"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "0 2px 12px rgba(180, 100, 80, 0.06)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{ background: avatarColor, color: "white", fontFamily: "var(--font-playfair)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)" }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{displayName}</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>@{username}</p>
              {profile?.bio && (
                <p className="text-xs mt-1 leading-snug" style={{ color: "var(--text-secondary)" }}>{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Friends section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--text-secondary)" }}>
              Friends {!friendsLoading && friends.length > 0 && `· ${friends.length}`}
            </h2>
            <button
              onClick={() => setAddFriendOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
              style={{ background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="4.5" cy="4" r="2.5" stroke="#C44030" strokeWidth="1.3" />
                <path d="M1 10C1 8.3 2.6 7 4.5 7" stroke="#C44030" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M9 7V11M7 9H11" stroke="#C44030" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Add friend
            </button>
          </div>

          {/* Search bar */}
          {friends.length > 3 && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
              style={{ background: "var(--surface-2)", border: "0.5px solid var(--border)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="5" stroke="var(--text-muted)" strokeWidth="1.5" />
                <path d="M11 11L8.5 8.5" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={friendQuery}
                onChange={(e) => setFriendQuery(e.target.value)}
                placeholder="Search friends…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)" }}
              />
              {friendQuery && (
                <button onClick={() => setFriendQuery("")}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2L10 10M10 2L2 10" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {friendsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--surface-2)" }} />
              ))}
            </div>
          ) : filteredFriends.length === 0 ? (
            <div
              className="flex flex-col items-center py-8 rounded-2xl text-center"
              style={{ background: "var(--surface-2)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                {friendQuery ? `No results for "${friendQuery}"` : "No friends yet — add someone you know"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFriends.map((friend) => {
                const name = friend.display_name || friend.username || "?";
                const color = friend.avatar_url?.startsWith("color:")
                  ? friend.avatar_url.slice(6)
                  : "var(--brand)";
                return (
                  <Link
                    key={friend.id}
                    href={`/friends/${friend.id}`}
                    className="flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.97]"
                    style={{
                      background: "var(--surface)",
                      border: "0.5px solid var(--border)",
                      boxShadow: "0 2px 12px rgba(180, 100, 80, 0.06)",
                      transition: "transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: color, color: "white", fontFamily: "var(--font-playfair)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)" }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{name}</p>
                      {friend.username && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>@{friend.username}</p>
                      )}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                      <path d="M5 3L9 7L5 11" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "0 2px 12px rgba(180, 100, 80, 0.06)" }}
        >
          {[
            { label: "Notifications", icon: "🔔" },
            { label: "Privacy", icon: "🔒" },
            { label: "Help & Feedback", icon: "💬" },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center justify-between py-3 text-sm transition-opacity active:opacity-60"
              style={{ color: "var(--text-secondary)", borderBottom: "0.5px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 py-3 text-sm transition-opacity active:opacity-60"
            style={{ color: "var(--brand)" }}
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
