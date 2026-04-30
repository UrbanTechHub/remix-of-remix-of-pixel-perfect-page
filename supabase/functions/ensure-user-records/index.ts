import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const makeSuffix = () => Math.floor(Math.random() * 10000).toString().padStart(4, "0");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = user.email.toLowerCase().trim();
    const fullName = String(user.user_metadata?.full_name || email.split("@")[0]).trim();

    await admin.from("profiles").upsert(
      { user_id: user.id, email, full_name: fullName || email.split("@")[0] },
      { onConflict: "user_id" },
    );
    await admin.from("user_roles").upsert(
      { user_id: user.id, role: "user" },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );

    const { data: existingAccounts, error: accountsError } = await admin
      .from("accounts")
      .select("account_type")
      .eq("user_id", user.id);
    if (accountsError) throw accountsError;

    const existingTypes = new Set((existingAccounts || []).map((account) => account.account_type));
    const accountsToCreate = [
      { account_type: "checking", account_name: "Adv Plus Banking" },
      { account_type: "savings", account_name: "Rewards Savings" },
      { account_type: "credit", account_name: "Customized Cash Rewards" },
    ].filter((account) => !existingTypes.has(account.account_type));

    if (accountsToCreate.length > 0) {
      const { error: insertAccountsError } = await admin.from("accounts").insert(
        accountsToCreate.map((account) => ({
          user_id: user.id,
          account_type: account.account_type,
          account_name: account.account_name,
          account_number: `xxxx${makeSuffix()}`,
          balance: 0,
          available_balance: 0,
        })),
      );
      if (insertAccountsError) throw insertAccountsError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ensure-user-records error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});