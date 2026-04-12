"use client";

interface AppHeaderProps {
  right?: React.ReactNode;
}

export default function AppHeader({ right }: AppHeaderProps) {
  return (
    <div className="relative flex items-center justify-center px-4 pt-12 pb-1">
      <span
        style={{
          fontFamily: "var(--font-playfair)",
          fontWeight: 900,
          fontSize: "26px",
          lineHeight: 1,
          color: "#ff5757",
          letterSpacing: "-0.5px",
        }}
      >
        wiw
      </span>
      {right && <div className="absolute right-4">{right}</div>}
    </div>
  );
}
