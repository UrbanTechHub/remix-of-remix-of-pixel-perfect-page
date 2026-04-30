import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const suffix = () => Math.floor(Math.random() * 10000).toString().padStart(4, "0");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const caller = userData?.user;
    if (userErr || !caller) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const users = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < 1000) break;
    }

    for (const authUser of users) {
      if (!authUser.email) continue;
      const email = authUser.email.toLowerCase().trim();
      const fullName = String(authUser.user_metadata?.full_name || email.split("@")[0]).trim();

      await admin.from("profiles").upsert({ user_id: authUser.id, email, full_name: fullName }, { onConflict: "user_id" });
      await admin.from("user_roles").upsert({ user_id: authUser.id, role: authUser.email === "admin@mail.com" ? "admin" : "user" }, { onConflict: "user_id,role", ignoreDuplicates: true });

      const { data: accounts, error: accountsError } = await admin.from("accounts").select("account_type").eq("user_id", authUser.id);
      if (accountsError) throw accountsError;
      const existing = new Set((accounts || []).map((account) => account.account_type));
      const missing = [
        { account_type: "checking", account_name: "Adv Plus Banking" },
        { account_type: "savings", account_name: "Rewards Savings" },
        { account_type: "credit", account_name: "Customized Cash Rewards" },
      ].filter((account) => !existing.has(account.account_type));

      if (missing.length > 0) {
        const { error: insertError } = await admin.from("accounts").insert(missing.map((account) => ({
          user_id: authUser.id,
          account_type: account.account_type,
          account_name: account.account_name,
          account_number: `xxxx${suffix()}`,
          balance: 0,
          available_balance: 0,
        })));
        if (insertError) throw insertError;
      }
    }

    return new Response(JSON.stringify({ success: true, synced: users.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("admin-sync-users error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});