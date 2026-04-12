"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store";

const navItems = [
  {
    href: "/",
    label: "Inbox",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z"
          stroke={active ? "#ff5757" : "#aaaaaa"}
          strokeWidth="2"
          fill={active ? "rgba(255,87,87,0.1)" : "none"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22 6L12 13L2 6"
          stroke={active ? "#ff5757" : "#aaaaaa"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle
          cx="11"
          cy="11"
          r="8"
          stroke={active ? "#ff5757" : "#aaaaaa"}
          strokeWidth="2"
          fill={active ? "rgba(255,87,87,0.1)" : "none"}
        />
        <path
          d="M21 21L16.65 16.65"
          stroke={active ? "#ff5757" : "#aaaaaa"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/watchlist",
    label: "Watchlist",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M19 21L12 16L5 21V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21Z"
          stroke={active ? "#ff5757" : "#aaaaaa"}
          strokeWidth="2"
          fill={active ? "rgba(255,87,87,0.1)" : "none"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="8"
          r="4"
          stroke={active ? "#ff5757" : "#aaaaaa"}
          strokeWidth="2"
          fill={active ? "rgba(255,87,87,0.1)" : "none"}
        />
        <path
          d="M4 20C4 17 7.58 14 12 14C16.42 14 20 17 20 20"
          stroke={active ? "#ff5757" : "#aaaaaa"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { inboxUnreadCount } = useApp();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-50"
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        borderTop: "1px solid #eeeeee",
      }}
    >
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 min-w-[56px] py-1"
            >
              <div className="relative">
                {item.icon(isActive)}
                {item.href === "/" && inboxUnreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-[3px]"
                    style={{ background: "#ff5757", lineHeight: 1 }}
                  >
                    {inboxUnreadCount > 99 ? "99+" : inboxUnreadCount}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium tracking-wide"
                style={{ color: isActive ? "#ff5757" : "#aaaaaa" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
