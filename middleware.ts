import { NextRequest, NextResponse } from "next/server";

// Auth guard disabled — app is freely accessible.
// Re-enable by replacing this file with the Supabase SSR middleware in middleware.disabled.ts
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.svg$|.*\\.png$|.*\\.ico$).*)",
  ],
};
