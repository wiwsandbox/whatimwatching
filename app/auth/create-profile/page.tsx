"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { getClient } from "@/lib/supabase/client";

export default function CreateProfilePage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const supabase = getClient();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (val: string) => {
    setUsername(val.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20));
  };

  const handleSubmit = async () => {
    const name = displayName.trim();
    const uname = username.trim();

    if (!name) { setError("Display name is required"); return; }
    if (uname.length < 3) { setError("Username must be at least 3 characters"); return; }
    if (!/^[a-z0-9_]+$/.test(uname)) {
      setError("Username can only contain lowercase letters, numbers, and underscores");
      return;
    }
    if (!user) { setError("Not authenticated"); return; }

    setError(null);
    setLoading(true);

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", uname)
      .neq("id", user.id)
      .single();

    if (existing) {
      setError("That username is already taken");
      setLoading(false);
      return;
    }

    const { error: profileError } = await updateProfile({ display_name: name, username: uname });
    setLoading(false);
    if (profileError) setError(profileError);
    else router.replace("/");
  };

  const canSubmit = displayName.trim().length > 0 && username.length >= 3;

  return (
    <div className="flex flex-col min-h-screen px-6 py-14" style={{ background: "#ffffff" }}>
      {/* wiw wordmark */}
      <div className="mb-10 text-center">
        <span
          style={{
            fontFamily: "var(--font-playfair)",
            fontWeight: 900,
            fontSize: "40px",
            lineHeight: 1,
            color: "#ff5757",
            letterSpacing: "-1px",
          }}
        >
          wiw
        </span>
      </div>

      <h2 className="text-3xl font-bold leading-none mb-2" style={{ color: "#1a1a1a" }}>
        Create your profile
      </h2>
      <p className="text-sm mb-8" style={{ color: "#999999" }}>
        How should your friends know you?
      </p>

      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm mb-5"
          style={{ background: "rgba(255,87,87,0.08)", color: "#ff5757", border: "1px solid rgba(255,87,87,0.2)" }}
        >
          {error}
        </div>
      )}

      <div className="space-y-4 mb-8">
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest block mb-1.5" style={{ color: "#999999" }}>
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
            placeholder="How friends will see you"
            autoComplete="name"
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: "#f7f7f7",
              border: "1px solid #eeeeee",
              color: "#1a1a1a",
              fontFamily: "var(--font-dm-sans)",
            }}
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-widest block mb-1.5" style={{ color: "#999999" }}>
            Username
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm select-none" style={{ color: "#cccccc" }}>
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="lowercase_only"
              autoComplete="username"
              className="w-full pl-8 pr-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: "#f7f7f7",
                border: "1px solid #eeeeee",
                color: "#1a1a1a",
                fontFamily: "var(--font-dm-sans)",
              }}
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color: "#cccccc" }}>
            Lowercase letters, numbers, and underscores only
          </p>
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{
            background: canSubmit ? "#ff5757" : "#f7f7f7",
            color: canSubmit ? "white" : "#cccccc",
            border: canSubmit ? "none" : "1px solid #eeeeee",
          }}
        >
          {loading ? <Spinner /> : "Let's go"}
        </button>
      </div>
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
