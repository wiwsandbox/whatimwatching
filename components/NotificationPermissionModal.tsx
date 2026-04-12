"use client";

interface Props {
  onEnable: () => void;
  onDismiss: () => void;
}

export default function NotificationPermissionModal({ onEnable, onDismiss }: Props) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-[390px] rounded-3xl p-6"
        style={{ background: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bell icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(255,87,87,0.1)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="#ff5757"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.73 21a2 2 0 0 1-3.46 0"
              stroke="#ff5757"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2
          className="text-lg font-bold text-center mb-2"
          style={{ color: "#1a1a1a", fontFamily: "var(--font-playfair)" }}
        >
          Stay in the loop
        </h2>
        <p className="text-sm text-center mb-7" style={{ color: "#666666", lineHeight: 1.5 }}>
          Enable notifications to know when friends recommend something to you
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onEnable}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: "#ff5757", color: "white" }}
          >
            Enable notifications
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: "#f7f7f7", color: "#999999" }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
