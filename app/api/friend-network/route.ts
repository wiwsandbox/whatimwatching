import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const friendId = searchParams.get("friendId");
  if (!friendId) return NextResponse.json({ error: "friendId required" }, { status: 400 });

  // Verify caller is authenticated
  const serverSupabase = await createServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use service role to bypass RLS when reading another user's friendships
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

  const { data: fofData } = await supabase
    .from("friendships")
    .select("friend:friend_id(id, username, display_name, avatar_url)")
    .eq("user_id", friendId)
    .eq("status", "accepted");

  const friends = (fofData ?? [])
    .map((row: { friend: unknown }) => (Array.isArray(row.friend) ? row.friend[0] : row.friend))
    .filter(Boolean)
    .filter((f: { id: string }) => f.id !== user.id);

  // Fetch caller's own friendships so the client can show Add/Pending/Friends state
  const { data: myFriends } = await supabase
    .from("friendships")
    .select("friend_id, status")
    .eq("user_id", user.id);

  return NextResponse.json({ friends, myFriends: myFriends ?? [], currentUserId: user.id });
}
