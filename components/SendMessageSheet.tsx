"use client";

import { useState, useEffect } from "react";
import { getClient } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";

interface SendMessageSheetProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedFriendId?: string | null;
  preselectedFriendName?: string | null;
  showContext?: {
    tmdbId: number;
    mediaType: string;
    showTitle: string;
    posterPath: string | null;
  } | null;
}

interface Friend {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export default function SendMessageSheet({
  isOpen,
  onClose,
  preselectedFriendId,
  preselectedFriendName,
  showContext,
}: SendMessageSheetProps) {
  const { sendMessage } = useApp();
  const [visible, setVisible] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState(preselectedFriendId ?? "");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMessageText("");
        setSent(false);
        setLoading(false);
        if (!preselectedFriendId) setSelectedFriendId("");
      }, 300);
      return;
    }

    if (preselectedFriendId) {
      setSelectedFriendId(preselectedFriendId);
      return;
    }

    async function fetchFriends() {
      const supabase = getClient();
      const { data: { session } } = await supabase.auth.getSession();
      const myId = session?.user?.id;
      if (!myId) return;
      const { data } = await supabase
        .from("friendships")
        .select("friend:friend_id(id, username, display_name, avatar_url)")
        .eq("user_id", myId)
        .eq("status", "accepted");
      if (data) {
        const mapped = data
          .map((row) => (Array.isArray(row.friend) ? row.friend[0] : row.friend))
          .filter(Boolean) as Friend[];
        setFriends(mapped);
      }
    }
    fetchFriends();
  }, [isOpen, preselectedFriendId]);

  const handleSend = async () => {
    if (!selectedFriendId || !messageText.trim() || loading) return;
    setLoading(true);
    const { error } = await sendMessage(
      selectedFriendId,
      messageText.trim(),
      showContext
        ? { tmdbId: showContext.tmdbId, mediaType: showContext.mediaType, showTitle: showContext.showTitle, showPosterPath: showContext.posterPath }
        : undefined
    );
    setLoading(false);
    if (!error) {
      setSent(true);
      setTimeout(onClose, 1200);
    }
  };

  const canSend = !!selectedFriendId && !!messageText.trim() && !loading;

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
          <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a1a" }}>New Message</h2>
          <p className="text-xs mb-5" style={{ color: "#999999" }}>Send a message to a friend</p>

          {/* Show context */}
          {showContext && (
            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "#f7f7f7", border: "1px solid #eeeeee" }}>
              {showContext.posterPath && (
                <img
                  src={`https://image.tmdb.org/t/p/w92${showContext.posterPath}`}
                  className="w-10 h-[60px] rounded-lg object-cover flex-shrink-0"
                  alt={showContext.showTitle}
                />
              )}
              <div>
                <p className="text-xs font-semibold" style={{ color: "#1a1a1a" }}>{showContext.showTitle}</p>
                <p className="text-[10px] uppercase font-medium tracking-wide mt-0.5" style={{ color: "#999999" }}>
                  {showContext.mediaType === "tv" ? "Series" : "Film"}
                </p>
              </div>
            </div>
          )}

          {/* Recipient */}
          {preselectedFriendId ? (
            <p className="text-sm mb-4" style={{ color: "#666666" }}>
              To: <span style={{ color: "#1a1a1a", fontWeight: 600 }}>{preselectedFriendName}</span>
            </p>
          ) : (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#999999" }}>To</p>
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {friends.map((f) => {
                  const name = f.display_name || f.username || "Unknown";
                  const avatarColor = f.avatar_url?.startsWith("color:") ? f.avatar_url.slice(6) : "#ff5757";
                  const selected = selectedFriendId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFriendId(f.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all"
                      style={
                        selected
                          ? { background: "#ff5757" }
                          : { background: "#f7f7f7", border: "1px solid #eeeeee" }
                      }
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: selected ? "rgba(255,255,255,0.3)" : avatarColor, color: "white", fontFamily: "var(--font-playfair)" }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: selected ? "white" : "#1a1a1a" }}>{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message textarea */}
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Write a message…"
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-4"
            style={{ background: "#f7f7f7", border: "1px solid #eeeeee", color: "#1a1a1a", fontFamily: "var(--font-dm-sans)" }}
          />

          <div className="space-y-2 pb-2">
            {sent ? (
              <div
                className="w-full py-4 rounded-2xl text-sm font-semibold text-center"
                style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                Message sent!
              </div>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={
                  canSend
                    ? { background: "#ff5757", color: "white" }
                    : { background: "#f7f7f7", color: "#cccccc", border: "1px solid #eeeeee" }
                }
              >
                {loading ? <Spinner /> : "Send"}
              </button>
            )}
            <button onClick={onClose} className="w-full py-3 rounded-2xl text-sm" style={{ color: "#999999" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Spinner() {
  return (
    <div
      className="w-4 h-4 rounded-full border-2 animate-spin"
      style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}
    />
  );
}
