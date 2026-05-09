"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/authContext";
import { getClient } from "@/lib/supabase/client";
import AddFriendSheet from "@/components/AddFriendSheet";
import OnboardingOverlay from "@/components/OnboardingOverlay";

const STREAMING_SERVICES = [
  "Netflix","Max","Hulu","Apple TV+","Prime Video",
  "Disney+","Peacock","Paramount+","Starz","Showtime",
];

const GENRES = [
  "Thriller","Drama","Documentary","Comedy","Sci-fi",
  "Horror","Action","Romance","Crime","Animation","Fantasy","History",
];

interface Friend {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { watchlist } = useApp();
  const router = useRouter();
  const supabase = getClient();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [manageFriendsOpen, setManageFriendsOpen] = useState(false);

  const [sentCount, setSentCount] = useState(0);

  const [bioSheetOpen, setBioSheetOpen] = useState(false);
  const [installSheetOpen, setInstallSheetOpen] = useState(false);
  const [wiw101Open, setWiw101Open] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [bioSaving, setBioSaving] = useState(false);

  const [activeServices, setActiveServices] = useState<Set<string>>(new Set());
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set());

  const watchedCount = watchlist.filter((w) => w.status === "watched").length;
  const friendsCount = friends.length;

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

    async function loadSentCount() {
      const { count } = await supabase
        .from("recommendations")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", user!.id);
      setSentCount(count ?? 0);
    }

    async function loadServices() {
      const { data } = await supabase
        .from("user_streaming_services")
        .select("service_name")
        .eq("user_id", user!.id);
      if (data) setActiveServices(new Set(data.map((r) => r.service_name)));
    }

    async function loadGenres() {
      const { data } = await supabase
        .from("user_genre_preferences")
        .select("genre")
        .eq("user_id", user!.id);
      if (data) setActiveGenres(new Set(data.map((r) => r.genre)));
    }

    loadFriends();
    loadSentCount();
    loadServices();
    loadGenres();
  }, [user, supabase, addFriendOpen]);

  const toggleService = useCallback(
    async (service: string) => {
      if (!user) return;
      const isActive = activeServices.has(service);
      setActiveServices((prev) => {
        const next = new Set(prev);
        isActive ? next.delete(service) : next.add(service);
        return next;
      });
      if (isActive) {
        await supabase.from("user_streaming_services").delete().eq("user_id", user.id).eq("service_name", service);
      } else {
        await supabase.from("user_streaming_services").insert({ user_id: user.id, service_name: service });
      }
    },
    [user, supabase, activeServices]
  );

  const toggleGenre = useCallback(
    async (genre: string) => {
      if (!user) return;
      const isActive = activeGenres.has(genre);
      setActiveGenres((prev) => {
        const next = new Set(prev);
        isActive ? next.delete(genre) : next.add(genre);
        return next;
      });
      if (isActive) {
        await supabase.from("user_genre_preferences").delete().eq("user_id", user.id).eq("genre", genre);
      } else {
        await supabase.from("user_genre_preferences").insert({ user_id: user.id, genre });
      }
    },
    [user, supabase, activeGenres]
  );

  const openBioSheet = () => {
    setBioInput(profile?.bio || "");
    setBioSheetOpen(true);
  };

  const saveBio = useCallback(async () => {
    setBioSaving(true);
    await updateProfile({ bio: bioInput.trim() || null });
    setBioSaving(false);
    setBioSheetOpen(false);
  }, [bioInput, updateProfile]);

  const handleInvite = useCallback(() => {
    const text =
      "I've been using wiw to share what I'm watching with friends and family — join me: https://getwiwapp.com";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth");
  };

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: "rgba(253,252,251,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <AppHeader />
      </header>

      <main className="flex-1 px-4 space-y-5 pt-2">

        {/* ── Profile card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "0 2px 12px rgba(180,100,80,0.06)" }}
        >
          {/* Avatar + name */}
          <div className="p-4 flex items-start gap-4">
            <div className="flex-shrink-0">
              <div
                className="rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ width: 56, height: 56, background: avatarColor, color: "white", fontFamily: "var(--font-playfair)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)" }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-base leading-tight" style={{ color: "var(--text-primary)" }}>
                {displayName}
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>@{username}</p>
              {profile?.bio ? (
                <button onClick={openBioSheet} className="mt-1 text-left w-full">
                  <p className="text-xs italic leading-snug" style={{ color: "var(--text-secondary)" }}>
                    {profile.bio}
                  </p>
                </button>
              ) : (
                <button onClick={openBioSheet} className="mt-1">
                  <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>Add a bio...</p>
                </button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex" style={{ borderTop: "0.5px solid var(--border)" }}>
            {[
              { label: "Watched", value: watchedCount },
              { label: "Sent", value: sentCount },
              { label: "Friends", value: friendsCount },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex-1 flex flex-col items-center py-3"
                style={i < 2 ? { borderRight: "0.5px solid var(--border)" } : {}}
              >
                <span className="text-xl font-bold leading-none" style={{ color: "var(--text-primary)" }}>
                  {stat.value}
                </span>
                <span className="text-[10px] mt-1 uppercase tracking-[0.06em]" style={{ color: "var(--text-muted)" }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Friends ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2 px-1" style={{ color: "var(--text-secondary)" }}>
            Friends{friendsCount > 0 ? ` · ${friendsCount}` : ""}
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "0 2px 12px rgba(180,100,80,0.06)" }}
          >
            <button
              onClick={() => setManageFriendsOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-opacity active:opacity-70"
              style={{ borderBottom: "0.5px solid var(--border)" }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--surface-2)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="6" cy="5" r="2.5" stroke="var(--brand)" strokeWidth="1.3" />
                  <path d="M1 13C1 10.8 3.2 9 6 9" stroke="var(--brand)" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="12" cy="7" r="2" stroke="var(--brand)" strokeWidth="1.3" />
                  <path d="M9.5 13C9.5 11.6 10.6 10.5 12 10.5C13.4 10.5 14.5 11.6 14.5 13" stroke="var(--brand)" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Manage friends</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>View, add or remove connections</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                <path d="M5 3L9 7L5 11" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={handleInvite}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-opacity active:opacity-70"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--surface-2)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1V10" stroke="var(--brand)" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M5 4L8 1L11 4" stroke="var(--brand)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 10V14H13V10" stroke="var(--brand)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Invite someone</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Share wiw via SMS</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                <path d="M5 3L9 7L5 11" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Streaming services ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2 px-1" style={{ color: "var(--text-secondary)" }}>
            Streaming services
          </p>
          <div
            className="p-4 rounded-2xl"
            style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "0 2px 12px rgba(180,100,80,0.06)" }}
          >
            <div className="flex flex-wrap gap-2" style={{ gap: 8 }}>
              {STREAMING_SERVICES.map((service) => {
                const active = activeServices.has(service);
                return (
                  <button
                    key={service}
                    onClick={() => toggleService(service)}
                    className="transition-all active:scale-95"
                    style={
                      active
                        ? { background: "#FFF0EE", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 500 }
                        : { background: "transparent", color: "#DDD0CB", border: "1px dashed #E8DDD8", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 400 }
                    }
                  >
                    {service}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Taste profile ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2 px-1" style={{ color: "var(--text-secondary)" }}>
            Taste profile
          </p>
          <div
            className="p-4 rounded-2xl"
            style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "0 2px 12px rgba(180,100,80,0.06)" }}
          >
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {GENRES.map((genre) => {
                const active = activeGenres.has(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className="transition-all active:scale-95"
                    style={
                      active
                        ? { background: "#FFF0EE", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 500 }
                        : { background: "transparent", color: "#DDD0CB", border: "1px dashed #E8DDD8", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 400 }
                    }
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Settings ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2 px-1" style={{ color: "var(--text-secondary)" }}>
            Settings
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "0 2px 12px rgba(180,100,80,0.06)" }}
          >
            {/* WIW 101 */}
            <button
              onClick={() => setWiw101Open(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-sm transition-opacity active:opacity-60"
              style={{ color: "var(--text-secondary)", borderBottom: "0.5px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M5 6H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M5 8.5H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M5 11H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>WIW 101</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>A guide to using wiw</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Add to Home Screen */}
            <button
              onClick={() => setInstallSheetOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-sm transition-opacity active:opacity-60"
              style={{ color: "var(--text-secondary)", borderBottom: "0.5px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M5.5 7.5L8 10L10.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 13H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span>Add to Home Screen</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {[
              { label: "Notifications", icon: "🔔" },
              { label: "Privacy", icon: "🔒" },
              { label: "Help & Feedback", icon: "💬" },
            ].map((item) => (
              <button
                key={item.label}
                className="w-full flex items-center justify-between px-4 py-3.5 text-sm transition-opacity active:opacity-60"
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
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm transition-opacity active:opacity-60"
              style={{ color: "var(--brand)" }}
            >
              <span>🚪</span>
              <span>Sign out</span>
            </button>
          </div>
        </div>

      </main>

      <BottomNav />

      <AddFriendSheet isOpen={addFriendOpen} onClose={() => setAddFriendOpen(false)} />

      {/* Bio edit sheet */}
      {bioSheetOpen && (
        <>
          <div
            className="fixed inset-0 z-[80]"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setBioSheetOpen(false)}
          />
          <div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-[90] rounded-t-3xl p-6"
            style={{ background: "var(--surface)", boxShadow: "0 -4px 32px rgba(0,0,0,0.12)" }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />
            <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-primary)" }}>Edit bio</h3>
            <textarea
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              placeholder="Tell people a bit about yourself…"
              rows={3}
              maxLength={150}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={{
                background: "var(--surface-2)",
                border: "0.5px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-dm-sans)",
              }}
              autoFocus
            />
            <p className="text-[11px] text-right mt-1" style={{ color: "var(--text-muted)" }}>
              {bioInput.length}/150
            </p>
            <button
              onClick={saveBio}
              disabled={bioSaving}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm mt-4 transition-all active:scale-[0.98]"
              style={{ background: "var(--brand)", color: "white", opacity: bioSaving ? 0.7 : 1 }}
            >
              {bioSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}

      {/* Install sheet */}
      {installSheetOpen && (
        <InstallSheet onClose={() => setInstallSheetOpen(false)} />
      )}

      {/* Manage friends sheet */}
      {manageFriendsOpen && (
        <ManageFriendsSheet
          friends={friends}
          loading={friendsLoading}
          onAddFriend={() => { setManageFriendsOpen(false); setAddFriendOpen(true); }}
          onClose={() => setManageFriendsOpen(false)}
        />
      )}

      {/* WIW 101 overlay */}
      <OnboardingOverlay
        isOpen={wiw101Open}
        onClose={() => setWiw101Open(false)}
        forceShow
      />
    </div>
  );
}

function ManageFriendsSheet({
  friends,
  loading,
  onAddFriend,
  onClose,
}: {
  friends: Friend[];
  loading: boolean;
  onAddFriend: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[80]" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-[90] rounded-t-3xl overflow-hidden"
        style={{
          background: "var(--surface)",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
          maxHeight: "75vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="px-6 pt-6 pb-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Friends</h3>
            <button
              onClick={onAddFriend}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
              style={{ background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }}
            >
              + Add friend
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: "var(--surface-2)" }} />
            ))
          ) : friends.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No friends yet</p>
            </div>
          ) : (
            friends.map((friend) => {
              const name = friend.display_name || friend.username || "?";
              const color = friend.avatar_url?.startsWith("color:")
                ? friend.avatar_url.slice(6)
                : "var(--brand)";
              return (
                <Link
                  key={friend.id}
                  href={`/friends/${friend.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-2xl active:scale-[0.97]"
                  style={{
                    background: "var(--surface-2)",
                    border: "0.5px solid var(--border)",
                    transition: "transform 150ms cubic-bezier(0.34,1.56,0.64,1)",
                    display: "flex",
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
            })
          )}
        </div>
      </div>
    </>
  );
}

function InstallSheet({ onClose }: { onClose: () => void }) {
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  const steps = isIOS
    ? [
        "Tap the Share button at the bottom of your Safari browser",
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" in the top right corner',
        "wiw will appear on your home screen like any other app",
      ]
    : [
        "Tap the three-dot menu in the top right of Chrome",
        'Tap "Add to Home Screen"',
        'Tap "Add" to confirm',
        "wiw will appear on your home screen like any other app",
      ];

  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-[90] rounded-t-3xl p-6"
        style={{ background: "var(--surface)", boxShadow: "0 -4px 32px rgba(0,0,0,0.12)" }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />
        <h3 className="font-semibold text-base mb-1" style={{ color: "var(--text-primary)" }}>
          Add wiw to your home screen
        </h3>
        <p className="text-xs mb-5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Access wiw instantly from your home screen — no app store needed.
        </p>
        <div className="space-y-3 mb-6">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: "#FFF0EE", color: "#C44030", border: "0.5px solid #FACCBC" }}
              >
                {i + 1}
              </div>
              <p className="text-sm leading-snug pt-0.5" style={{ color: "var(--text-primary)" }}>
                {step}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]"
          style={{ background: "var(--brand)", color: "white" }}
        >
          Got it
        </button>
      </div>
    </>
  );
}
