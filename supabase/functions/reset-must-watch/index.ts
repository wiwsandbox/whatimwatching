import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )
  const { error } = await supabase
    .from("profiles")
    .update({ must_watch_remaining: 3 })
    .neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) return new Response(JSON.stringify({ error }), { status: 500 })
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
