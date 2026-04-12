"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Provider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
}

// Canonical service name map — variant → canonical
const SERVICE_ALIASES: Record<string, string> = {
  "Netflix Basic with Ads": "Netflix",
  "Netflix Standard with Ads": "Netflix",
  "Netflix with Ads": "Netflix",
  "Max Amazon Channel": "Max",
  "HBO Max": "Max",
  "Disney+ Basic": "Disney+",
  "Disney+ with Ads": "Disney+",
  "Hulu with Ads": "Hulu",
  "Apple TV+ Amazon Channel": "Apple TV+",
  "Paramount+ with Showtime": "Paramount+",
  "Paramount+ Amazon Channel": "Paramount+",
  "Peacock Premium": "Peacock",
  "Peacock Premium Plus": "Peacock",
  "Amazon Prime Video": "Prime Video",
  "Amazon Video": "Prime Video",
};

function normalizeProviders(raw: Provider[]): Provider[] {
  const seen = new Set<string>();
  const result: Provider[] = [];
  for (const p of raw) {
    const canonical = SERVICE_ALIASES[p.provider_name] ?? p.provider_name;
    if (!seen.has(canonical)) {
      seen.add(canonical);
      result.push({ ...p, provider_name: canonical });
    }
  }
  return result;
}

// Module-level cache shared across all instances
const cache = new Map<string, Provider[]>();
const inflight = new Map<string, Promise<Provider[]>>();

async function fetchProviders(id: number, mediaType: string): Promise<Provider[]> {
  const key = `${mediaType}-${id}`;
  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = fetch(
    `https://api.themoviedb.org/3/${mediaType}/${id}/watch/providers?api_key=78c87308e5caf2d13af3381e0e94958c`
  )
    .then((r) => (r.ok ? r.json() : { results: {} }))
    .then((data): Provider[] => {
      const raw: Provider[] = data.results?.US?.flatrate || [];
      const normalized = normalizeProviders(raw);
      cache.set(key, normalized);
      inflight.delete(key);
      return normalized;
    })
    .catch(() => {
      cache.set(key, []);
      inflight.delete(key);
      return [] as Provider[];
    });

  inflight.set(key, p);
  return p;
}

interface StreamingProvidersProps {
  id: number;
  mediaType: string;
  maxShow?: number;
  size?: "sm" | "md";
}

export default function StreamingProviders({
  id,
  mediaType,
  maxShow = 4,
  size = "sm",
}: StreamingProvidersProps) {
  const [providers, setProviders] = useState<Provider[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProviders(id, mediaType).then((p) => {
      if (!cancelled) setProviders(p);
    });
    return () => { cancelled = true; };
  }, [id, mediaType]);

  if (!providers || providers.length === 0) return null;

  const iconSize = size === "sm" ? 18 : 26;
  const radius = size === "sm" ? "rounded" : "rounded-lg";

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {providers.slice(0, maxShow).map((p) => (
        <div
          key={p.provider_name}
          className={`overflow-hidden flex-shrink-0 ${radius}`}
          title={p.provider_name}
          style={{ width: iconSize, height: iconSize }}
        >
          <Image
            src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
            alt={p.provider_name}
            width={iconSize}
            height={iconSize}
            className="object-cover"
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
