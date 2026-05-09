"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { useApp } from "@/lib/store";
import { getClient } from "@/lib/supabase/client";
import AddFriendSheet from "@/components/AddFriendSheet";

export default function OnboardingBanner() {
  const { user, profile, profileLoading, loading } = useAuth();
  const { watchlist } = useApp();
  const [visible, setVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [tasks, setTasks] = useState({
    invitedFriend: false,
    addedWatched: false,
    ratedTitle: false,
    recommended: false,
  });
  const checkedRecs = useRef(false);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user || !profile) return;
    if (profile.onboarding_completed !== true) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem("wiw_banner_dismissed") === "true") return;
    // Only show to users who signed up on or after 2026-05-09
    if (profile.created_at && new Date(profile.created_at) < new Date("2026-05-09")) return;

    const invitedFriend = localStorage.getItem("wiw_invited_friend") === "true";
    const addedWatched = watchlist.some((w) => w.status === "watched");
    const ratedTitle = watchlist.some((w) => w.rating != null);
    const recommended = localStorage.getItem("wiw_has_recommended") === "true";

    const newTasks = { invitedFriend, addedWatched, ratedTitle, recommended };
    setTasks(newTasks);

    if (!Object.values(newTasks).every(Boolean)) {
      setVisible(true);
    } else {
      localStorage.setItem("wiw_banner_dismissed", "true");
    }
  }, [user, profile, loading, profileLoading, watchlist]);

  useEffect(() => {
    if (checkedRecs.current || tasks.recommended || !user || !visible) return;
    checkedRecs.current = true;
    const check = async () => {
      const supabase = getClient();
      const { count } = await supabase
        .from("recommendations")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", user.id);
      if ((count ?? 0) > 0) {
        localStorage.setItem("wiw_has_recommended", "true");
        setTasks((prev) => ({ ...prev, recommended: true }));
      }
    };
    check();
  }, [user, tasks.recommended, visible]);

  useEffect(() => {
    if (!visible) return;
    if (!Object.values(tasks).every(Boolean)) return;
    const t1 = setTimeout(() => setExiting(true), 800);
    const t2 = setTimeout(() => {
      localStorage.setItem("wiw_banner_dismissed", "true");
      setVisible(false);
      setExiting(false);
    }, 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [tasks, visible]);

  if (!visible) return null;

  const completedCount = Object.values(tasks).filter(Boolean).length;

  return (
    <>
      <div
        style={{
          background: "#ff5757",
          transform: exiting ? "translateY(100%)" : "translateY(0)",
          transition: "transform 400ms cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setSheetOpen(true)}
          className="w-full flex items-center gap-3 px-4"
          style={{ height: 56 }}
        >
          <div className="flex flex-col items-start gap-1.5 flex-1">
            <span className="text-xs font-bold text-white leading-none">
              {completedCount}/4 getting started tasks
            </span>
            <div
              className="w-full rounded-full"
              style={{ height: 4, background: "rgba(255,255,255,0.3)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(completedCount / 4) * 100}%`,
                  background: "white",
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
              See tasks
            </span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 3L9 7L5 11"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </button>
      </div>

      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-[80]"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-[90] rounded-t-3xl"
            style={{ background: "var(--surface)" }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
            </div>
            <div className="px-5 pt-2 pb-10">
              <h2
                className="text-xl font-bold mb-1"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair)" }}
              >
                Get started
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                {completedCount === 4
                  ? "You're all set!"
                  : `${4 - completedCount} task${4 - completedCount !== 1 ? "s" : ""} left`}
              </p>

              <div className="space-y-5">
                <TaskRow
                  done={tasks.invitedFriend}
                  label="Invite a friend"
                  subtitle="Share wiw with someone you know"
                  cta={
                    !tasks.invitedFriend ? (
                      <button
                        onClick={() => {
                          setSheetOpen(false);
                          setAddFriendOpen(true);
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-all active:scale-95"
                        style={{ background: "var(--brand)", color: "white" }}
                      >
                        Invite
                      </button>
                    ) : null
                  }
                />
                <TaskRow
                  done={tasks.addedWatched}
                  label="Add a watched title"
                  subtitle="Mark something you've already seen"
                  cta={
                    !tasks.addedWatched ? (
                      <Link
                        href="/search"
                        onClick={() => setSheetOpen(false)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-all active:scale-95"
                        style={{ background: "var(--brand)", color: "white" }}
                      >
                        Search
                      </Link>
                    ) : null
                  }
                />
                <TaskRow
                  done={tasks.ratedTitle}
                  label="Rate a title"
                  subtitle="Give a title a score out of 10"
                  cta={
                    !tasks.ratedTitle ? (
                      <Link
                        href="/watchlist"
                        onClick={() => setSheetOpen(false)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-all active:scale-95"
                        style={{ background: "var(--brand)", color: "white" }}
                      >
                        Rate
                      </Link>
                    ) : null
                  }
                />
                <TaskRow
                  done={tasks.recommended}
                  label="Recommend to a friend"
                  subtitle="Send a title to someone on wiw"
                  cta={
                    !tasks.recommended ? (
                      <Link
                        href="/search"
                        onClick={() => setSheetOpen(false)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-all active:scale-95"
                        style={{ background: "var(--brand)", color: "white" }}
                      >
                        Find title
                      </Link>
                    ) : null
                  }
                />
              </div>

              <button
                onClick={() => setSheetOpen(false)}
                className="w-full mt-8 py-3 text-sm font-semibold rounded-2xl transition-all active:scale-[0.97]"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      <AddFriendSheet
        isOpen={addFriendOpen}
        onClose={() => setAddFriendOpen(false)}
        onSuccess={() => {
          localStorage.setItem("wiw_invited_friend", "true");
          setTasks((prev) => ({ ...prev, invitedFriend: true }));
        }}
        elevated
      />
    </>
  );
}

function TaskRow({
  done,
  label,
  subtitle,
  cta,
}: {
  done: boolean;
  label: string;
  subtitle: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: done ? "#e8fff0" : "var(--surface-2)",
          border: `1.5px solid ${done ? "#10b981" : "var(--border)"}`,
        }}
      >
        {done && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="#10b981"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold"
          style={{
            color: done ? "var(--text-muted)" : "var(--text-primary)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {label}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      </div>
      {cta}
    </div>
  );
}
