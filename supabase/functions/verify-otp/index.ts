import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, purpose } = await req.json();
    if (!email || !code) {
      return new Response(JSON.stringify({ error: "Email and code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const purposeStr = (purpose === "transfer" ? "transfer" : "login");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("purpose", purposeStr)
      .eq("consumed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ valid: false, error: "No active code" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(data.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ valid: false, error: "Code expired" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.code !== String(code).trim()) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid code" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("otp_codes").update({ consumed: true }).eq("id", data.id);

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-otp error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
