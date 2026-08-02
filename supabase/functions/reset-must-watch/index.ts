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

  // Lets the digest compute "resets in N days" without a hardcoded day.
  const { error: configErr } = await supabase
    .from("app_config")
    .upsert({ key: "must_watch_last_reset_at", value: new Date().toISOString() }, { onConflict: "key" })
  if (configErr) console.error("reset-must-watch: failed to record reset timestamp", configErr)

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
