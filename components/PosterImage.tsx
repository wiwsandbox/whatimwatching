"use client";

import Image from "next/image";
import { useState } from "react";
import { tmdbImage } from "@/lib/tmdb";

interface PosterImageProps {
  path: string | null;
  alt: string;
  size?: "w92" | "w185" | "w342" | "w500";
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

export default function PosterImage({
  path,
  alt,
  size = "w342",
  className = "",
  fill = false,
  width,
  height,
}: PosterImageProps) {
  const [error, setError] = useState(false);

  if (!path || error) {
    return (
      <div
        className={`bg-surface-2 flex items-center justify-center ${className}`}
        style={!fill ? { width, height } : undefined}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" opacity="0.3">
          <rect x="2" y="2" width="20" height="20" rx="2" stroke="#666" strokeWidth="2" />
          <path d="M2 16L8 10L12 14L16 10L22 16" stroke="#666" strokeWidth="2" strokeLinecap="round" />
          <circle cx="15" cy="7" r="2" fill="#666" />
        </svg>
      </div>
    );
  }

  const src = tmdbImage(path, size);

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${className}`}
        onError={() => setError(true)}
        sizes="(max-width: 390px) 100vw, 390px"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 100}
      height={height || 150}
      className={`object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
}
