"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";

const COUNTRY_CODES = [
  { code: "+1",   flag: "🇺🇸", name: "US" },
  { code: "+44",  flag: "🇬🇧", name: "GB" },
  { code: "+61",  flag: "🇦🇺", name: "AU" },
  { code: "+64",  flag: "🇳🇿", name: "NZ" },
  { code: "+353", flag: "🇮🇪", name: "IE" },
  { code: "+1",   flag: "🇨🇦", name: "CA" },
  { code: "+33",  flag: "🇫🇷", name: "FR" },
  { code: "+49",  flag: "🇩🇪", name: "DE" },
  { code: "+34",  flag: "🇪🇸", name: "ES" },
  { code: "+39",  flag: "🇮🇹", name: "IT" },
  { code: "+81",  flag: "🇯🇵", name: "JP" },
  { code: "+82",  flag: "🇰🇷", name: "KR" },
  { code: "+91",  flag: "🇮🇳", name: "IN" },
  { code: "+55",  flag: "🇧🇷", name: "BR" },
  { code: "+52",  flag: "🇲🇽", name: "MX" },
];

type Step = "phone" | "otp";

export default function AuthPage() {
  const router = useRouter();
  const { sendOtp, verifyOtp, user, profile, loading } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!loading && user) {
      if (profile) router.replace("/search");
      else router.replace("/auth/create-profile");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const formatPhoneDisplay = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (countryCode === "+1") {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    return digits;
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    const maxLen = countryCode === "+1" ? 10 : 15;
    setPhone(digits.slice(0, maxLen));
  };

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) { setError("Please enter a valid phone number"); return; }
    setError(null);
    setSubmitting(true);
    const full = `${countryCode}${digits}`;
    setFullPhone(full);
    const { error } = await sendOtp(full);
    setSubmitting(false);
    if (error) {
      // Show the raw error so misconfiguration (e.g. phone provider not enabled,
      // bad Twilio credentials) is visible rather than silently swallowed.
      setError(error);
    } else {
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setResendCooldown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6);
      if (digits.length === 6) {
        setOtp(digits.split(""));
        otpRefs.current[5]?.focus();
        return;
      }
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((prev) => { const next = [...prev]; next[index] = digit; return next; });
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }, []);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        setOtp((prev) => { const n = [...prev]; n[index] = ""; return n; });
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
        setOtp((prev) => { const n = [...prev]; n[index - 1] = ""; return n; });
      }
    }
  }, [otp]);

  useEffect(() => {
    if (step === "otp" && otp.every((d) => d !== "")) handleVerifyOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  const handleVerifyOtp = async () => {
    const token = otp.join("");
    if (token.length < 6) return;
    setError(null);
    setSubmitting(true);
    const { error, isNewUser } = await verifyOtp(fullPhone, token);
    setSubmitting(false);
    if (error) {
      setError(error.includes("invalid") || error.includes("expired")
        ? "Invalid or expired code. Please try again."
        : error.includes("rate") || error.includes("many")
        ? "Too many attempts. Please request a new code."
        : error);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } else if (isNewUser) {
      router.replace("/auth/create-profile");
    } else {
      router.replace("/search");
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setOtp(["", "", "", "", "", ""]);
    const { error } = await sendOtp(fullPhone);
    if (error) setError(error);
    else {
      setResendCooldown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

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

      {step === "phone" && (
        <PhoneStep
          countryCode={countryCode}
          setCountryCode={(c) => { setCountryCode(c); setPhone(""); setError(null); }}
          phone={phone}
          displayPhone={formatPhoneDisplay(phone)}
          onPhoneChange={handlePhoneChange}
          onSubmit={handleSendOtp}
          error={error}
          loading={submitting}
        />
      )}

      {step === "otp" && (
        <OtpStep
          phone={fullPhone}
          otp={otp}
          otpRefs={otpRefs}
          onChange={handleOtpChange}
          onKeyDown={handleOtpKeyDown}
          onBack={() => { setStep("phone"); setError(null); setOtp(["","","","","",""]); }}
          onResend={handleResend}
          resendCooldown={resendCooldown}
          error={error}
          loading={submitting}
        />
      )}
    </div>
  );
}

function PhoneStep({
  countryCode, setCountryCode,
  phone, displayPhone, onPhoneChange,
  onSubmit, error, loading,
}: {
  countryCode: string;
  setCountryCode: (c: string) => void;
  phone: string;
  displayPhone: string;
  onPhoneChange: (v: string) => void;
  onSubmit: () => void;
  error: string | null;
  loading: boolean;
}) {
  const canSubmit = phone.replace(/\D/g, "").length >= 7;

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-3xl font-bold leading-none mb-2" style={{ color: "#1a1a1a" }}>
        What&apos;s your number?
      </h2>
      <p className="text-sm mb-8" style={{ color: "#999999" }}>
        We&apos;ll text you a code to sign in.
      </p>

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-2 mb-4">
        <div className="relative flex-shrink-0">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="appearance-none h-full px-3 rounded-xl text-sm font-semibold outline-none pr-7"
            style={{
              background: "#f7f7f7",
              border: "1px solid #eeeeee",
              color: "#1a1a1a",
              fontFamily: "var(--font-dm-sans)",
              minWidth: "80px",
            }}
          >
            {COUNTRY_CODES.map((c, i) => (
              <option key={i} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <input
          type="tel"
          inputMode="numeric"
          value={displayPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && onSubmit()}
          placeholder="(555) 000-0000"
          autoComplete="tel"
          autoFocus
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background: "#f7f7f7",
            border: "1px solid #eeeeee",
            color: "#1a1a1a",
            fontFamily: "var(--font-dm-sans)",
          }}
        />
      </div>

      <div className="mt-auto">
        <button
          onClick={onSubmit}
          disabled={!canSubmit || loading}
          className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{
            background: canSubmit ? "#ff5757" : "#f7f7f7",
            color: canSubmit ? "white" : "#cccccc",
            border: canSubmit ? "none" : "1px solid #eeeeee",
          }}
        >
          {loading ? <Spinner /> : "Send code"}
        </button>
        <p className="text-xs text-center mt-4" style={{ color: "#cccccc" }}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function OtpStep({
  phone, otp, otpRefs, onChange, onKeyDown,
  onBack, onResend, resendCooldown, error, loading,
}: {
  phone: string;
  otp: string[];
  otpRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onChange: (i: number, v: string) => void;
  onKeyDown: (i: number, e: React.KeyboardEvent) => void;
  onBack: () => void;
  onResend: () => void;
  resendCooldown: number;
  error: string | null;
  loading: boolean;
}) {
  const masked = phone.length > 4
    ? phone.slice(0, phone.length - 4).replace(/\d(?=\d)/g, "*") + phone.slice(-2)
    : phone;

  return (
    <div className="flex flex-col flex-1">
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-sm transition-opacity active:opacity-60"
        style={{ color: "#999999" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8L10 12" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Change number
      </button>

      <h2 className="text-3xl font-bold leading-none mb-2" style={{ color: "#1a1a1a" }}>
        Enter the code
      </h2>
      <p className="text-sm mb-8" style={{ color: "#999999" }}>
        Sent to <span style={{ color: "#666666" }}>{masked}</span>
      </p>

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-3 justify-center mb-8">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { otpRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className="w-12 h-14 rounded-xl text-center text-xl font-bold outline-none transition-all"
            style={{
              background: digit ? "#fff0f0" : "#f7f7f7",
              border: `2px solid ${digit ? "#ff5757" : "#eeeeee"}`,
              color: "#1a1a1a",
              fontFamily: "var(--font-dm-sans)",
            }}
          />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center mb-6">
          <Spinner color="#ff5757" />
        </div>
      )}

      <div className="text-center mt-auto">
        {resendCooldown > 0 ? (
          <p className="text-sm" style={{ color: "#cccccc" }}>
            Resend code in <span style={{ color: "#666666" }}>{resendCooldown}s</span>
          </p>
        ) : (
          <button
            onClick={onResend}
            className="text-sm font-semibold transition-opacity active:opacity-60"
            style={{ color: "#ff5757" }}
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="px-4 py-3 rounded-xl text-sm mb-5"
      style={{ background: "rgba(255,87,87,0.08)", color: "#ff5757", border: "1px solid rgba(255,87,87,0.2)" }}
    >
      {message}
    </div>
  );
}

function Spinner({ color = "#ff5757" }: { color?: string }) {
  return (
    <div
      className="w-5 h-5 rounded-full border-2 animate-spin"
      style={{ borderColor: `${color}33`, borderTopColor: color }}
    />
  );
}
