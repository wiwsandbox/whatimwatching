"use client";

import { useState, useEffect } from "react";

const COUNTRY_CODES = [
  { code: "+1", flag: "🇺🇸", name: "US" },
  { code: "+44", flag: "🇬🇧", name: "GB" },
  { code: "+61", flag: "🇦🇺", name: "AU" },
  { code: "+64", flag: "🇳🇿", name: "NZ" },
  { code: "+353", flag: "🇮🇪", name: "IE" },
];

type ResultState =
  | { type: "found" }
  | { type: "invited" }
  | { type: "not_found" }
  | { type: "error"; message: string }
  | null;

export default function AddFriendSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState>(null);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setPhone("");
        setResult(null);
        setLoading(false);
      }, 300);
    }
  }, [isOpen]);

  const digits = phone.replace(/\D/g, "");

  const formatDisplay = (raw: string) => {
    const d = raw.replace(/\D/g, "");
    if (countryCode !== "+1") return d;
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  };

  const handlePhoneChange = (val: string) => {
    const d = val.replace(/\D/g, "");
    const max = countryCode === "+1" ? 10 : 15;
    setPhone(d.slice(0, max));
    setResult(null);
  };

  const handleSubmit = async () => {
    if (digits.length < 7) return;
    setLoading(true);
    setResult(null);

    const fullPhone = `${countryCode}${digits}`;

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const json = await res.json().catch(() => ({ error: `Server error ${res.status}` }));

      if (json.error) {
        setResult({ type: "error", message: json.error });
      } else if (json.found) {
        setResult({ type: "found" });
      } else if (json.smsSent) {
        setResult({ type: "invited" });
      } else if (json.smsError) {
        setResult({ type: "error", message: `Couldn't send invite: ${json.smsError}` });
      } else if (json.noTwilio) {
        setResult({ type: "error", message: "No wiw account found for that number and SMS invites aren't configured." });
      } else {
        setResult({ type: "not_found" });
      }
    } catch {
      setResult({ type: "error", message: "Network error — please try again" });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = digits.length >= 7 && !loading;

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
          <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a1a" }}>
            Add a friend
          </h2>
          <p className="text-xs mb-5" style={{ color: "#999999" }}>
            Enter their phone number. If they&apos;re on wiw, we&apos;ll send them a request. If not, we&apos;ll invite them.
          </p>

          {/* Phone input */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-shrink-0">
              <select
                value={countryCode}
                onChange={(e) => { setCountryCode(e.target.value); setPhone(""); setResult(null); }}
                className="appearance-none h-full px-3 pr-7 rounded-xl text-sm font-semibold outline-none"
                style={{
                  background: "#f7f7f7",
                  border: "1px solid #eeeeee",
                  color: "#1a1a1a",
                  minWidth: "80px",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code + c.name} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              value={formatDisplay(phone)}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
              placeholder="(555) 000-0000"
              autoComplete="tel"
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: "#f7f7f7",
                border: "1px solid #eeeeee",
                color: "#1a1a1a",
                fontFamily: "var(--font-dm-sans)",
              }}
            />
          </div>

          {/* Result feedback */}
          {result && (
            <div
              className="px-4 py-3 rounded-xl text-sm mb-4"
              style={
                result.type === "error"
                  ? { background: "rgba(255,87,87,0.08)", color: "#ff5757", border: "1px solid rgba(255,87,87,0.2)" }
                  : { background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }
              }
            >
              {result.type === "found" && "Friend request sent!"}
              {result.type === "invited" && "They're not on wiw yet — we've sent them an invite SMS."}
              {result.type === "not_found" && "No wiw account found for that number."}
              {result.type === "error" && result.message}
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-2 pb-2">
            {result?.type === "found" || result?.type === "invited" ? (
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-semibold text-sm"
                style={{ background: "#ff5757", color: "white" }}
              >
                Done
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={
                  canSubmit
                    ? { background: "#ff5757", color: "white" }
                    : { background: "#f7f7f7", color: "#cccccc", border: "1px solid #eeeeee" }
                }
              >
                {loading ? <Spinner /> : "Send request"}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-sm"
              style={{ color: "#999999" }}
            >
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
