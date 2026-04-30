import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

    // Send via SMTP (user-configured provider)
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const host = Deno.env.get("SMTP_HOST");
      const portStr = Deno.env.get("SMTP_PORT") || "587";
      const username = Deno.env.get("SMTP_USERNAME");
      const password = Deno.env.get("SMTP_PASSWORD");
      const from = Deno.env.get("SMTP_FROM");
      if (!host || !username || !password || !from) {
        throw new Error("SMTP credentials not fully configured");
      }
      const port = parseInt(portStr, 10);
      const tls = port === 465;

      const client = new SMTPClient({
        connection: { hostname: host, port, tls, auth: { username, password } },
      });

      const subject =
        purposeStr === "transfer"
          ? "Your Bank of America transfer verification code"
          : "Your Bank of America sign-in verification code";
      const heading =
        purposeStr === "transfer" ? "Authorize your transfer" : "Sign in to your account";
      const intro =
        purposeStr === "transfer"
          ? "Use the verification code below to authorize your pending transfer. This code expires in 10 minutes."
          : "Use the verification code below to complete your sign-in. This code expires in 10 minutes.";

      const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:#012169;padding:20px 24px;color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:.3px;">
          Bank of America <span style="color:#e31837;">»</span>
        </td></tr>
        <tr><td style="height:4px;background:#e31837;"></td></tr>
        <tr><td style="padding:32px 28px;">
          <h1 style="margin:0 0 12px;font-size:22px;color:#012169;">${heading}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#444;">${intro}</p>
          <div style="text-align:center;margin:24px 0;">
            <div style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:bold;color:#012169;background:#f4f7fb;border:1px solid #d9e2ef;border-radius:6px;padding:16px 24px;">${code}</div>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#666;">If you did not request this code, please ignore this email or contact us immediately.</p>
        </td></tr>
        <tr><td style="background:#f4f4f4;padding:16px 24px;font-size:11px;color:#777;text-align:center;">
          © Bank of America Corporation. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

      await client.send({
        from,
        to: email,
        subject,
        content: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
        html,
      });
      await client.close();
      emailSent = true;
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
      console.error("SMTP send failed:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        emailError,
        // Demo fallback shown only if SMTP send failed
        devCode: emailSent ? undefined : code,
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
