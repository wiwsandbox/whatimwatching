"use client";

import { useState, useEffect } from "react";
import { getClient } from "@/lib/supabase/client";

interface FriendProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface FriendNetworkSheetProps {
  isOpen: boolean;
  onClose: () => void;
  friendName: string;
  friendId: string;
}

export default function FriendNetworkSheet({
  isOpen,
  onClose,
  friendName,
  friendId,
}: FriendNetworkSheetProps) {
  const [visible, setVisible] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [myFriendIds, setMyFriendIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setFriends([]);

    async function fetchData() {
      const supabase = getClient();

      const { data: { session } } = await supabase.auth.getSession();
      const myId = session?.user?.id ?? null;
      setCurrentUserId(myId);

      const { data: fofData } = await supabase
        .from("friendships")
        .select("friend:friend_id(id, username, display_name, avatar_url)")
        .eq("user_id", friendId)
        .eq("status", "accepted");

      if (fofData) {
        const mapped = fofData
          .map((row) => (Array.isArray(row.friend) ? row.friend[0] : row.friend))
          .filter(Boolean)
          .filter((f) => f.id !== myId) as FriendProfile[];
        setFriends(mapped);
      }

      if (myId) {
        const { data: myFriends } = await supabase
          .from("friendships")
          .select("friend_id, status")
          .eq("user_id", myId);

        if (myFriends) {
          setMyFriendIds(new Set(myFriends.filter((f) => f.status === "accepted").map((f) => f.friend_id)));
          setPendingIds(new Set(myFriends.filter((f) => f.status === "pending").map((f) => f.friend_id)));
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [isOpen, friendId]);

  const sendFriendRequest = async (targetId: string) => {
    if (!currentUserId) return;
    const supabase = getClient();
    await supabase.from("friendships").insert({
      user_id: currentUserId,
      friend_id: targetId,
      status: "pending",
    });
    setPendingIds((prev) => new Set([...prev, targetId]));
  };

  if (!isOpen && !visible) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.4)", opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        className="fixed z-[90] w-full max-w-[390px] rounded-t-3xl transition-transform duration-300"
        style={{
          bottom: 0,
          left: "50%",
          background: "#ffffff",
          transform: `translateX(-50%) translateY(${visible ? "0%" : "100%"})`,
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: "#eeeeee" }} />
        </div>

        <div className="px-5">
          <h2 className="text-xl font-bold mb-4" style={{ color: "#1a1a1a" }}>
            {friendName}&apos;s friends
          </h2>

          {loading ? (
            <div className="space-y-2 pb-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#f7f7f7" }} />
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm" style={{ color: "#cccccc" }}>No friends to show</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4 overflow-y-auto" style={{ maxHeight: "60vh" }}>
              {friends.map((f) => {
                const name = f.display_name || f.username || "Unknown";
                const avatarColor = f.avatar_url?.startsWith("color:")
                  ? f.avatar_url.slice(6)
                  : "#ff5757";
                const isMyFriend = myFriendIds.has(f.id);
                const isPending = pendingIds.has(f.id);

                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{ background: "#ffffff", border: "1px solid #eeeeee", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: avatarColor, color: "white", fontFamily: "var(--font-playfair)" }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{name}</p>
                      {f.username && (
                        <p className="text-xs" style={{ color: "#999999" }}>@{f.username}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {isMyFriend ? (
                        <span
                          className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ background: "#f7f7f7", color: "#999999" }}
                        >
                          Friends
                        </span>
                      ) : isPending ? (
                        <span
                          className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ background: "#f7f7f7", color: "#999999" }}
                        >
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => sendFriendRequest(f.id)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                          style={{ background: "#ff5757", color: "white" }}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
