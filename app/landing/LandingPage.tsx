"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode, CSSProperties } from "react";
import Link from "next/link";

// ── Intersection-observer reveal hook ─────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function RevealSection({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 500ms ease, transform 500ms ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Poster collage ─────────────────────────────────────────────────────────────
const FALLBACK_COLORS = [
  "#1a4a6e","#8B2635","#2d5a27","#6b3a8f","#c4621a",
  "#1e5a5a","#7a3a1e","#3a4a8f","#8f3a6b","#4a6e1a",
  "#6e1a4a","#1a6e5a","#8f6b1a","#2d3a6b","#6b2d5a",
  "#1a5a3a","#8f1a2d","#3a6b2d","#5a1a6e","#6e5a1a",
];

function PosterRow({ posters, rowIdx, topPx }: { posters: string[]; rowIdx: number; topPx: number }) {
  const count = 28;
  return (
    <div
      style={{
        position: "absolute",
        top: topPx,
        left: -120,
        display: "flex",
        gap: 8,
        transform: "rotate(-4deg)",
        transformOrigin: "center center",
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: count }, (_, i) => {
        const path = posters.length > 0
          ? posters[(rowIdx * 9 + i) % posters.length]
          : null;
        return path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={`https://image.tmdb.org/t/p/w185${path}`}
            alt=""
            width={62}
            height={93}
            style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0, display: "block" }}
          />
        ) : (
          <div
            key={i}
            style={{
              width: 62,
              height: 93,
              borderRadius: 8,
              flexShrink: 0,
              background: FALLBACK_COLORS[(rowIdx * 9 + i) % FALLBACK_COLORS.length],
            }}
          />
        );
      })}
    </div>
  );
}

// ── Phone mockup ──────────────────────────────────────────────────────────────
function MiniCard({
  posterColor,
  initial,
  avatarColor,
  name,
  time,
  title,
  format,
  rating,
  note,
  opacity = 1,
}: {
  posterColor: string;
  initial: string;
  avatarColor: string;
  name: string;
  time: string;
  title: string;
  format: string;
  rating: string;
  note?: string;
  opacity?: number;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid #f0e0d8",
        borderRadius: 10,
        padding: "7px 8px",
        marginBottom: 6,
        opacity,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: avatarColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            fontWeight: 700,
            color: "white",
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <span style={{ fontSize: 9, fontWeight: 600, color: "#1a1a1a", flex: 1 }}>{name}</span>
        <span style={{ fontSize: 8, color: "#999", marginLeft: "auto" }}>{time}</span>
        <span style={{ fontSize: 8, fontWeight: 700, color: "#ff5757", marginLeft: 4 }}>{rating}</span>
      </div>
      <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
        <div style={{ width: 30, height: 44, borderRadius: 5, background: posterColor, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#1a1a1a", marginBottom: 3, lineHeight: 1.2 }}>{title}</p>
          <span
            style={{
              fontSize: 8,
              color: "#ff5757",
              border: "0.5px solid #ff5757",
              borderRadius: 8,
              padding: "1px 5px",
              display: "inline-block",
              marginBottom: 4,
            }}
          >
            {format}
          </span>
          {note && (
            <p style={{ fontSize: 8, color: "#888", lineHeight: 1.3, marginBottom: 4 }}>"{note}"</p>
          )}
          <div
            style={{
              background: "#fff0ee",
              border: "0.5px solid #faccbc",
              borderRadius: 8,
              padding: "2px 6px",
              fontSize: 8,
              color: "#c44030",
              display: "inline-block",
            }}
          >
            + Watchlist
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div
      style={{
        width: 180,
        height: 340,
        borderRadius: 28,
        border: "6px solid #1a1a1a",
        background: "#fdfcfb",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
      }}
    >
      {/* Notch */}
      <div
        style={{
          width: 64,
          height: 16,
          background: "#1a1a1a",
          borderRadius: "0 0 12px 12px",
          margin: "0 auto",
        }}
      />
      {/* Content */}
      <div style={{ padding: "6px 10px 10px", height: "calc(100% - 16px)", display: "flex", flexDirection: "column" }}>
        {/* wiw wordmark */}
        <div
          style={{
            textAlign: "center",
            paddingBottom: 7,
            fontFamily: "var(--font-playfair)",
            fontSize: 18,
            fontWeight: 900,
            color: "#ff5757",
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
          wiw
        </div>
        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            background: "#fff0ec",
            borderRadius: 12,
            padding: 2,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              background: "#ff5757",
              borderRadius: 10,
              textAlign: "center",
              padding: "3px 0",
              fontSize: 8,
              fontWeight: 600,
              color: "white",
            }}
          >
            Recs
          </div>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              padding: "3px 0",
              fontSize: 8,
              fontWeight: 500,
              color: "#999",
            }}
          >
            Friends
          </div>
        </div>
        {/* Cards */}
        <MiniCard
          posterColor="#1a4a6e"
          initial="N"
          avatarColor="#ff5757"
          name="Nancy"
          time="2h ago"
          title="Andor"
          format="Series"
          rating="★ 9"
          note="Best thing on TV."
        />
        <MiniCard
          posterColor="#8B2635"
          initial="M"
          avatarColor="#3d6b2c"
          name="Mike"
          time="yesterday"
          title="The Bear"
          format="Series"
          rating="★ 8"
          opacity={0.65}
        />
      </div>
    </div>
  );
}

// ── Sample recommendation cards (Section 2) ───────────────────────────────────
function SampleRecCard({
  posterColor,
  initial,
  avatarColor,
  name,
  time,
  rating,
  title,
  format,
  note,
  opacity = 1,
}: {
  posterColor: string;
  initial: string;
  avatarColor: string;
  name: string;
  time: string;
  rating: string;
  title: string;
  format: string;
  note?: string;
  opacity?: number;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "0.5px solid #eeddd8",
        borderRadius: 14,
        padding: "12px 14px",
        flex: 1,
        minWidth: 0,
        opacity,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: avatarColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "white",
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{name}</p>
          <p style={{ fontSize: 10, color: "#999" }}>{time}</p>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#ff5757",
            background: "#fff0ee",
            borderRadius: 8,
            padding: "2px 7px",
          }}
        >
          {rating}
        </span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 48,
            borderRadius: 5,
            background: posterColor,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{title}</p>
          <span
            style={{
              fontSize: 10,
              color: "#ff5757",
              border: "0.5px solid #ff5757",
              borderRadius: 20,
              padding: "2px 8px",
              display: "inline-block",
              marginBottom: note ? 6 : 0,
            }}
          >
            {format}
          </span>
          {note && (
            <p style={{ fontSize: 11, color: "#888", lineHeight: 1.5, marginTop: 4 }}>"{note}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main landing page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const [posters, setPosters] = useState<string[]>([]);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(
      "https://api.themoviedb.org/3/trending/movie/week?api_key=78c87308e5caf2d13af3381e0e94958c&language=en-US"
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.results) {
          setPosters(
            data.results
              .map((m: { poster_path?: string }) => m.poster_path)
              .filter(Boolean)
          );
        }
      })
      .catch(() => {});
  }, []);

  const scrollToHowItWorks = useCallback(() => {
    howItWorksRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        overflowX: "hidden",
        background: "#fdfcfb",
        zIndex: 100,
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* ── Sticky Navbar ──────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(253,252,251,0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "0.5px solid #eeddd8",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Wordmark */}
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span
              style={{
                fontFamily: "var(--font-playfair)",
                fontWeight: 900,
                fontSize: 22,
                color: "#ff5757",
                letterSpacing: "-0.5px",
                lineHeight: 1,
              }}
            >
              wiw
            </span>
            <span
              className="hidden sm:block"
              style={{
                fontSize: 10,
                color: "#999",
                letterSpacing: "0.06em",
                fontWeight: 400,
                lineHeight: 1,
                marginTop: 2,
              }}
            >
              What I&apos;m Watching
            </span>
          </div>

          {/* CTA */}
          <Link
            href="/auth"
            style={{
              background: "#ff5757",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 20px",
              borderRadius: 24,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Join wiw
          </Link>
        </div>
      </nav>

      {/* ── Section 1: Hero ────────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          minHeight: "min(100svh, 100vh)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Poster collage */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            opacity: 0.15,
            pointerEvents: "none",
          }}
        >
          <PosterRow posters={posters} rowIdx={0} topPx={30} />
          <PosterRow posters={posters} rowIdx={1} topPx={135} />
          <PosterRow posters={posters} rowIdx={2} topPx={240} />
        </div>

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(253,252,251,0.4) 0%, rgba(253,252,251,1) 85%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Hero content */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            padding: "80px 24px 100px",
            maxWidth: 560,
          }}
        >
          {/* Pill badge */}
          <div
            style={{
              display: "inline-block",
              background: "#fff0ee",
              border: "0.5px solid #faccbc",
              color: "#c44030",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              borderRadius: 20,
              padding: "4px 14px",
              marginBottom: 24,
            }}
          >
            What I&apos;m Watching
          </div>

          {/* Headline */}
          <h1
            className="text-[34px] sm:text-[52px]"
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 700,
              color: "#1a1a1a",
              lineHeight: 1.1,
              letterSpacing: "-0.5px",
              marginBottom: 20,
            }}
          >
            Stop scrolling.
            <br />
            Ask a friend.
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 15,
              color: "#666",
              lineHeight: 1.65,
              maxWidth: 380,
              margin: "0 auto 36px",
            }}
          >
            wiw is where your most trusted recommendations live — from the people whose taste you actually know.
          </p>

          {/* CTAs */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <Link
              href="/auth"
              style={{
                background: "#ff5757",
                color: "white",
                fontSize: 15,
                fontWeight: 600,
                padding: "13px 32px",
                borderRadius: 24,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Join wiw
            </Link>
            <Link
              href="/auth"
              style={{
                fontSize: 12,
                color: "#999",
                textDecoration: "none",
              }}
            >
              Got an invite? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 2: Why it exists ───────────────────────────────────────── */}
      <RevealSection>
        <section
          style={{
            background: "#fff8f5",
            padding: "80px 32px",
          }}
        >
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {/* Label */}
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#ff5757",
                marginBottom: 16,
              }}
            >
              Why wiw exists
            </p>

            {/* Pull quote */}
            <h2
              style={{
                fontFamily: "var(--font-playfair)",
                fontSize: 36,
                fontWeight: 700,
                color: "#1a1a1a",
                lineHeight: 1.2,
                marginBottom: 8,
              }}
            >
              &ldquo;You have to watch this.&rdquo;
            </h2>
            <p
              style={{
                fontFamily: "var(--font-playfair)",
                fontSize: 26,
                fontWeight: 400,
                color: "#ff5757",
                lineHeight: 1.2,
                marginBottom: 20,
              }}
            >
              Better than any algorithm. Your friends.
            </p>

            {/* Body */}
            <p
              style={{
                fontSize: 14,
                color: "#666",
                lineHeight: 1.75,
                marginBottom: 32,
              }}
            >
              The best thing you watched last year was probably recommended by someone you know. Not by Netflix. Not by a critic. By a person whose taste you trust. wiw gives that conversation a home.
            </p>

            {/* Sample cards */}
            <div
              className="flex flex-col sm:flex-row"
              style={{ gap: 12 }}
            >
              <SampleRecCard
                posterColor="#1a4a6e"
                initial="N"
                avatarColor="#ff5757"
                name="Nancy"
                time="2 hours ago"
                rating="★ 9"
                title="Andor"
                format="Series"
                note="Genuinely the best thing on TV."
              />
              <SampleRecCard
                posterColor="#8B2635"
                initial="M"
                avatarColor="#3d6b2c"
                name="Mike"
                time="yesterday"
                rating="★ 8"
                title="The Bear"
                format="Series"
                opacity={0.65}
              />
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Section 3: How it works ────────────────────────────────────────── */}
      <RevealSection>
        <section
          ref={howItWorksRef}
          style={{
            background: "#fdfcfb",
            padding: "80px 32px",
          }}
        >
          <div
            style={{
              maxWidth: 580,
              margin: "0 auto",
            }}
          >
            <div className="flex flex-col md:flex-row" style={{ gap: 48, alignItems: "center" }}>
              {/* Steps column */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#ff5757",
                    marginBottom: 28,
                  }}
                >
                  How it works
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {[
                    {
                      n: "1",
                      title: "Watch something",
                      body: "Add it to your list and mark it watched when you're done.",
                    },
                    {
                      n: "2",
                      title: "Rate and recommend",
                      body: "Give it a score out of 10 and send it to a friend you think will love it.",
                    },
                    {
                      n: "3",
                      title: "Discover from people you trust",
                      body: "Receive recommendations from friends and build your watchlist from theirs.",
                    },
                  ].map(({ n, title, body }) => (
                    <div key={n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#fff0ee",
                          border: "0.5px solid #faccbc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#c44030",
                          flexShrink: 0,
                        }}
                      >
                        {n}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#1a1a1a",
                            marginBottom: 4,
                          }}
                        >
                          {title}
                        </p>
                        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.65 }}>{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phone mockup */}
              <div
                className="flex justify-center"
                style={{ flexShrink: 0 }}
              >
                <PhoneMockup />
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Section 4: CTA footer ──────────────────────────────────────────── */}
      <RevealSection>
        <section
          style={{
            background: "#fff0ee",
            padding: "72px 32px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#ff5757",
              marginBottom: 16,
            }}
          >
            Ready to start?
          </p>

          <h2
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: 30,
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: 10,
              lineHeight: 1.25,
            }}
          >
            Your next favourite is a recommendation away.
          </h2>

          <p style={{ fontSize: 13, color: "#888", marginBottom: 32 }}>
            No algorithm. Just your people.
          </p>

          <div
            className="flex flex-col sm:flex-row"
            style={{ gap: 12, justifyContent: "center", alignItems: "center" }}
          >
            <Link
              href="/auth"
              style={{
                background: "#ff5757",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                padding: "12px 28px",
                borderRadius: 24,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Join wiw
            </Link>
            <button
              onClick={scrollToHowItWorks}
              style={{
                background: "transparent",
                color: "#ff5757",
                border: "1.5px solid #ff5757",
                fontSize: 14,
                fontWeight: 600,
                padding: "11px 28px",
                borderRadius: 24,
                cursor: "pointer",
              }}
            >
              How it works
            </button>
          </div>
        </section>
      </RevealSection>

      {/* ── Page footer ────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "0.5px solid #eeddd8",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fdfcfb",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 900,
              fontSize: 16,
              color: "#ff5757",
              letterSpacing: "-0.3px",
              lineHeight: 1,
            }}
          >
            wiw
          </span>
          <span style={{ fontSize: 10, color: "#bbb", lineHeight: 1 }}>
            What I&apos;m Watching
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#bbb" }}>getwiwapp.com</span>
      </footer>
    </div>
  );
}
