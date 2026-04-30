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
    const { email, purpose } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const purposeStr = (purpose === "transfer" ? "transfer" : "login");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { error: insertError } = await supabase.from("otp_codes").insert({
      email: email.toLowerCase().trim(),
      code,
      purpose: purposeStr,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create OTP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to send via the Lovable transactional email function if it exists.
    // If it fails (e.g., no domain configured yet), fall back to returning the
    // code in the response so the demo still works.
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { error: sendError } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName:
              purposeStr === "transfer"
                ? "transfer-otp"
                : "login-otp",
            recipientEmail: email,
            idempotencyKey: `${purposeStr}-otp-${Date.now()}-${code}`,
            templateData: { code },
          },
        }
      );
      if (sendError) {
        emailError = sendError.message ?? String(sendError);
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        emailError,
        // Demo fallback: include the code so the UI can show it if email
        // hasn't been configured yet. Safe to remove once email is verified.
        devCode: code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-otp error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
