import { NextRequest, NextResponse } from "next/server";

const API_KEY = "78c87308e5caf2d13af3381e0e94958c";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mediaType = searchParams.get("mediaType") || "all";
  const timeWindow = searchParams.get("timeWindow") || "week";

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/${mediaType}/${timeWindow}?api_key=${API_KEY}&language=en-US`,
      { cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ results: [] }, { status: 200 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
