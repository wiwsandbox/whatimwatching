import { NextResponse } from "next/server";

const API_KEY = "78c87308e5caf2d13af3381e0e94958c";

export async function GET() {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}&language=en-US`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
