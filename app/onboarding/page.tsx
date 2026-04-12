"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { getClient } from "@/lib/supabase/client";

type Step = "avatar" | "bio" | "friend";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState<Step>("avatar");
  const [bio, setBio] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [friendResults, setFriendResults] = useState<
    { id: string; username: string; display_name: string | null }[]
  >([]);
  const [addedFriends, setAddedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getClient();

  const AVATAR_COLORS = ["#ff5757", "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899"];
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  const displayName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "?";

  const handleSaveAvatar = async () => {
    setLoading(true);
    await updateProfile({ avatar_url: `color:${selectedColor}` });
    setLoading(false);
    setStep("bio");
  };

  const handleSaveBio = async () => {
    setLoading(true);
    await updateProfile({ bio: bio.trim() || null });
    setLoading(false);
    setStep("friend");
  };

  const searchFriends = async (q: string) => {
    setFriendQuery(q);
    if (q.trim().length < 2) { setFriendResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .ilike("username", `%${q}%`)
      .neq("id", user?.id ?? "")
      .limit(5);
    setFriendResults(data ?? []);
  };

  const addFriend = async (friendId: string) => {
    if (!user || addedFriends.has(friendId)) return;
    await supabase.from("friendships").insert({
      user_id: user.id,
      friend_id: friendId,
      status: "accepted",
    });
    setAddedFriends((prev) => new Set([...prev, friendId]));
  };

  const steps: Step[] = ["avatar", "bio", "friend"];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="flex flex-col min-h-screen px-6 py-12" style={{ background: "#ffffff" }}>
      {/* wiw wordmark */}
      <div className="mb-6 text-center">
        <span
          style={{
            fontFamily: "var(--font-playfair)",
            fontWeight: 900,
            fontSize: "28px",
            lineHeight: 1,
            color: "#ff5757",
            letterSpacing: "-0.5px",
          }}
        >
          wiw
        </span>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {steps.map((s, i) => (
          <div
            key={s}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i <= stepIndex ? "#ff5757" : "#eeeeee" }}
          />
        ))}
      </div>

      {/* Step: Avatar */}
      {step === "avatar" && (
        <div className="flex flex-col flex-1">
          <h1 className="text-3xl font-bold leading-none mb-2" style={{ color: "#1a1a1a" }}>
            Pick your colour
          </h1>
          <p className="text-sm mb-8" style={{ color: "#999999" }}>
            Your avatar will use your initial and a colour.
          </p>

          <div className="flex justify-center mb-8">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold transition-all duration-200"
              style={{ background: selectedColor, fontFamily: "var(--font-playfair)", color: "white" }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="flex gap-4 justify-center mb-8">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className="w-12 h-12 rounded-full transition-all active:scale-90"
                style={{
                  background: color,
                  outline: selectedColor === color ? `3px solid #1a1a1a` : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>

          <div className="mt-auto">
            <button
              onClick={handleSaveAvatar}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: "#ff5757", color: "white" }}
            >
              {loading ? <Spinner /> : "Continue"}
            </button>
          </div>
        </div>
      )}

      {/* Step: Bio */}
      {step === "bio" && (
        <div className="flex flex-col flex-1">
          <h1 className="text-3xl font-bold leading-none mb-2" style={{ color: "#1a1a1a" }}>
            Tell people who you are
          </h1>
          <p className="text-sm mb-8" style={{ color: "#999999" }}>
            A short bio helps friends know your taste.
          </p>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#999999" }}>
              Bio (optional)
            </span>
            <span className="text-xs" style={{ color: bio.length > 120 ? "#ff5757" : "#cccccc" }}>
              {bio.length}/150
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 150))}
            placeholder="Film nerd. Always watching something."
            rows={3}
            className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none mb-6"
            style={{
              background: "#f7f7f7",
              border: "1px solid #eeeeee",
              color: "#1a1a1a",
              fontFamily: "var(--font-dm-sans)",
            }}
          />

          <div className="mt-auto space-y-3">
            <button
              onClick={handleSaveBio}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: "#ff5757", color: "white" }}
            >
              {loading ? <Spinner /> : "Continue"}
            </button>
            <button
              onClick={() => { setBio(""); setStep("friend"); }}
              className="w-full py-3 rounded-2xl text-sm"
              style={{ color: "#999999" }}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Step: Find first friend */}
      {step === "friend" && (
        <div className="flex flex-col flex-1">
          <h1 className="text-3xl font-bold leading-none mb-2" style={{ color: "#1a1a1a" }}>
            Find your first friend
          </h1>
          <p className="text-sm mb-6" style={{ color: "#999999" }}>
            Search by username to follow someone.
          </p>

          {error && (
            <div
              className="px-3 py-2 rounded-xl text-xs mb-3"
              style={{ background: "rgba(255,87,87,0.08)", color: "#ff5757" }}
            >
              {error}
            </div>
          )}

          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
            style={{ background: "#f7f7f7", border: "1px solid #eeeeee" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#cccccc" strokeWidth="2" />
              <path d="M21 21L16.65 16.65" stroke="#cccccc" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={friendQuery}
              onChange={(e) => searchFriends(e.target.value)}
              placeholder="Search by username…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "#1a1a1a", fontFamily: "var(--font-dm-sans)" }}
            />
          </div>

          <div className="flex-1 space-y-2">
            {friendResults.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: "#ffffff", border: "1px solid #eeeeee" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: "#ff5757", color: "white" }}
                >
                  {(f.display_name || f.username).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>
                    {f.display_name || f.username}
                  </p>
                  <p className="text-xs" style={{ color: "#999999" }}>@{f.username}</p>
                </div>
                <button
                  onClick={() => addFriend(f.id)}
                  disabled={addedFriends.has(f.id)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={
                    addedFriends.has(f.id)
                      ? { background: "#f7f7f7", color: "#cccccc", border: "1px solid #eeeeee" }
                      : { background: "#ff5757", color: "white" }
                  }
                >
                  {addedFriends.has(f.id) ? "Following" : "Follow"}
                </button>
              </div>
            ))}
            {friendQuery.length >= 2 && friendResults.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: "#cccccc" }}>
                No users found for &ldquo;{friendQuery}&rdquo;
              </p>
            )}
          </div>

          <div className="mt-auto space-y-3 pt-4">
            <button
              onClick={() => router.replace("/search")}
              className="w-full py-4 rounded-2xl font-semibold text-sm"
              style={{ background: "#ff5757", color: "white" }}
            >
              Go to my inbox
            </button>
            <button
              onClick={() => router.replace("/search")}
              className="w-full py-3 rounded-2xl text-sm"
              style={{ color: "#999999" }}
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </div>
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
