"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

export default function ToastDisplay() {
  const { toast } = useApp();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (toast) {
      requestAnimationFrame(() => setShow(true));
      const t = setTimeout(() => setShow(false), 2300);
      return () => clearTimeout(t);
    } else {
      setShow(false);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="fixed z-[200] flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold pointer-events-none transition-all duration-300"
      style={{
        top: "56px",
        left: "50%",
        background: "#1a1a1a",
        color: "#ffffff",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        maxWidth: "320px",
        whiteSpace: "nowrap",
        opacity: show ? 1 : 0,
        transform: `translateX(-50%) translateY(${show ? "0px" : "-8px"})`,
      }}
    >
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "#ff5757" }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5L4.5 7.5L8.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {toast.message}
    </div>
  );
}
