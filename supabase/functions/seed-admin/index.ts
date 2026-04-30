import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "admin@mail.com";
const ADMIN_PASSWORD = "Admin3344@@";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find existing admin across all pages
    let user: any = null;
    let page = 1;
    while (!user) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      user = data.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
      if (user || data.users.length < 1000) break;
      page++;
    }

    if (!user) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Bank Administrator" },
      });
      if (createErr) {
        // If duplicate, fetch by email via getUserByEmail-style fallback
        if (String(createErr.message).toLowerCase().includes("already")) {
          // Re-scan all pages
          let p = 1;
          while (true) {
            const { data, error } = await admin.auth.admin.listUsers({ page: p, perPage: 1000 });
            if (error) throw error;
            const found = data.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
            if (found) { user = found; break; }
            if (data.users.length < 1000) break;
            p++;
          }
          if (!user) throw createErr;
        } else {
          throw createErr;
        }
      } else {
        user = created.user;
      }
    }

    // Reset password & confirm email
    await admin.auth.admin.updateUserById(user.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    // Ensure admin role
    await admin.from("user_roles").upsert(
      { user_id: user.id, role: "admin" },
      { onConflict: "user_id,role", ignoreDuplicates: true }
    );

    return new Response(
      JSON.stringify({ success: true, message: "Admin account ready", email: ADMIN_EMAIL, user_id: user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("seed-admin error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
