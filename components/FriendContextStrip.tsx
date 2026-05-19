"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { getClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

interface FriendContextStripProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
}

interface FriendEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  rating: number | null;
}

export default function FriendContextStrip({ tmdbId, mediaType }: FriendContextStripProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const supabase = getClient();

        const { data: friendships } = await supabase
          .from("friendships")
          .select("friend_id")
          .eq("user_id", user!.id)
          .eq("status", "accepted");

        const friendIds = (friendships ?? []).map((f: { friend_id: string }) => f.friend_id);

        if (friendIds.length === 0) {
          setFriends([]);
          return;
        }

        const { data } = await supabase
          .from("watchlist")
          .select("user_id, rating, profiles(id, display_name, username, avatar_url)")
          .eq("tmdb_id", tmdbId)
          .eq("media_type", mediaType)
          .eq("status", "watched")
          .in("user_id", friendIds);

        type ProfileRow = { display_name: string | null; username: string | null; avatar_url: string | null };
        const entries: FriendEntry[] = (data ?? []).map((row: {
          user_id: string;
          rating: number | null;
          profiles: ProfileRow | ProfileRow[] | null;
        }) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          return {
            userId: row.user_id,
            displayName: profile?.display_name ?? profile?.username ?? "Friend",
            avatarUrl: profile?.avatar_url ?? null,
            rating: row.rating,
          };
        });

        setFriends(entries);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, tmdbId, mediaType]);

  if (!user || loading || friends.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <p
        style={{
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-muted)",
          marginBottom: 10,
          fontWeight: 600,
        }}
      >
        Friends
      </p>
      <div style={{ display: "flex", flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
        {friends.map((f) => (
          <div key={f.userId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ position: "relative", display: "inline-flex" }}>
              <Avatar avatarUrl={f.avatarUrl} displayName={f.displayName} size={44} />
              {f.rating !== null && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    background: "#ff5757",
                    color: "white",
                    fontSize: 8,
                    fontWeight: "bold",
                    border: "1.5px solid var(--bg)",
                    borderRadius: 20,
                    padding: "1px 5px",
                    lineHeight: "14px",
                  }}
                >
                  {f.rating}
                </span>
              )}
            </div>
            <span style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center", maxWidth: 52 }}>
              {f.displayName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
