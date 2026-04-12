"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/authContext";
import { getClient } from "@/lib/supabase/client";
import type { MediaType } from "@/lib/types";

interface Friend {
  id: string;
  username: string;
  display_name: string | null;
}

interface RecommendModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleName: string;
  posterPath?: string | null;
  tmdbId: number;
  mediaType: MediaType;
}

const MAX_NOTE = 150;

export default function RecommendModal({
  isOpen,
  onClose,
  titleName,
  posterPath,
  tmdbId,
  mediaType,
}: RecommendModalProps) {
  const { sendRecommendation } = useApp();
  const { user } = useAuth();
  const supabase = getClient();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [visible, setVisible] = useState(false);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("friend:friend_id(id, username, display_name)")
      .eq("user_id", user.id)
      .eq("status", "accepted");
    if (data) {
      setFriends(
        data
          .map((row) => (Array.isArray(row.friend) ? row.friend[0] : row.friend))
          .filter(Boolean) as Friend[]
      );
    }
  }, [user, supabase]);

  useEffect(() => {
    if (isOpen) loadFriends();
  }, [isOpen, loadFriends]);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedIds(new Set());
        setNote("");
        setSending(false);
      }, 300);
    }
  }, [isOpen]);

  const toggleFriend = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    const selectedFriends = friends.filter((f) => selectedIds.has(f.id));
    const friendIds = selectedFriends.map((f) => f.id);
    const friendNames = selectedFriends.map((f) =>
      (f.display_name || f.username).split(" ")[0]
    );
    await sendRecommendation(tmdbId, mediaType, titleName, posterPath ?? null, friendIds, friendNames, note);
    onClose();
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

        {/* Header */}
        <div className="px-5 mb-5">
          <h2
            className="text-xl font-bold leading-none mb-1"
            style={{ color: "#1a1a1a", fontFamily: "var(--font-dm-sans)" }}
          >
            Recommend
          </h2>
          <p className="text-xs line-clamp-1" style={{ color: "#999999" }}>
            {titleName}
          </p>
        </div>

        {/* Friends */}
        <div className="px-5 mb-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#999999" }}>
            Send to
          </p>
          {friends.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: "#cccccc" }}>
              No friends yet — add some in your profile
            </p>
          )}
          {friends.map((friend) => {
            const selected = selectedIds.has(friend.id);
            const name = friend.display_name || friend.username;
            return (
              <button
                key={friend.id}
                onClick={() => toggleFriend(friend.id)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]"
                style={{
                  background: selected ? "rgba(255,87,87,0.06)" : "#f7f7f7",
                  border: `1px solid ${selected ? "#ff5757" : "#eeeeee"}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: selected ? "#ff5757" : "#eeeeee", color: selected ? "white" : "#999999" }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>{name}</p>
                  <p className="text-xs" style={{ color: "#999999" }}>@{friend.username}</p>
                </div>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: selected ? "#ff5757" : "transparent",
                    border: `1.5px solid ${selected ? "#ff5757" : "#cccccc"}`,
                  }}
                >
                  {selected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4.5 7.5L8.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Note */}
        <div className="px-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#999999" }}>
              Add a note (optional)
            </p>
            <span className="text-[10px]" style={{ color: note.length > MAX_NOTE * 0.8 ? "#ff5757" : "#cccccc" }}>
              {note.length}/{MAX_NOTE}
            </span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
            placeholder="Why should they watch this?"
            rows={2}
            className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-[#cccccc]"
            style={{
              background: "#f7f7f7",
              border: "1px solid #eeeeee",
              color: "#1a1a1a",
              fontFamily: "var(--font-dm-sans)",
            }}
          />
        </div>

        {/* Send button */}
        <div className="px-5">
          <button
            onClick={handleSend}
            disabled={selectedIds.size === 0 || sending}
            className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={
              selectedIds.size === 0
                ? { background: "#f7f7f7", color: "#cccccc", border: "1px solid #eeeeee" }
                : { background: "#ff5757", color: "white" }
            }
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M14 2L2 6.5L7 8.5M14 2L9.5 14L7 8.5M14 2L7 8.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {selectedIds.size === 0
              ? "Select a friend"
              : `Send to ${selectedIds.size} friend${selectedIds.size > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </>
  );
}
