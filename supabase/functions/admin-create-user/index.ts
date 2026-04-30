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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, fullName, phone } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: String(email).toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email.split("@")[0] },
    });
    if (createErr) throw createErr;

    await supabase.from("profiles").upsert(
      {
        user_id: created.user!.id,
        email: String(email).toLowerCase().trim(),
        full_name: fullName || email.split("@")[0],
        phone: phone || null,
      },
      { onConflict: "user_id" }
    );
    await supabase.from("user_roles").upsert(
      { user_id: created.user!.id, role: "user" },
      { onConflict: "user_id,role", ignoreDuplicates: true }
    );
    await supabase.from("accounts").insert([
      { user_id: created.user!.id, account_type: "checking", account_name: "Adv Plus Banking", account_number: `xxxx${makeSuffix()}`, balance: 0, available_balance: 0 },
      { user_id: created.user!.id, account_type: "savings", account_name: "Rewards Savings", account_number: `xxxx${makeSuffix()}`, balance: 0, available_balance: 0 },
      { user_id: created.user!.id, account_type: "credit", account_name: "Customized Cash Rewards", account_number: `xxxx${makeSuffix()}`, balance: 0, available_balance: 0 },
    ]);

    // Send welcome OTP / credential code automatically
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await supabase.from("otp_codes").insert({
      email: String(email).toLowerCase().trim(),
      code,
      purpose: "login",
    });

    let emailSent = false;
    try {
      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "login-otp",
          recipientEmail: email,
          idempotencyKey: `welcome-otp-${Date.now()}-${code}`,
          templateData: { code },
        },
      });
      if (!sendErr) emailSent = true;
    } catch {}

    return new Response(JSON.stringify({
      success: true, userId: created.user!.id, emailSent, devCode: code,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("admin-create-user error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
