import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getUserEmail } from "@/lib/transferState";

const OTPPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const state = (location.state || {}) as { email?: string; purpose?: "login" | "transfer"; nextRoute?: string };
  const email = state.email || getUserEmail();
  const purpose = state.purpose || "login";
  const nextRoute = state.nextRoute || (purpose === "transfer" ? "/transfer/success" : "/dashboard");

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter all 6 digits", variant: "destructive" });
      return;
    }
    if (!email) {
      toast({ title: "Missing email", description: "Please log in again.", variant: "destructive" });
      navigate("/");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email, code: otp, purpose },
      });
      if (error) throw error;
      if (data?.valid) {
        toast({ title: "Verified", description: "Code accepted." });
        navigate(nextRoute, { replace: true });
      } else {
        toast({ title: "Verification failed", description: data?.error || "Invalid code", variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Verification error", description: "Try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { email, purpose },
      });
      if (error) throw error;
      setOtp("");
      if (data?.emailSent) {
        toast({ title: "New code sent", description: `Check ${email}.` });
      } else {
        toast({
          title: "New code (demo)",
          description: `Email isn't configured yet. Your code: ${data?.devCode}`,
          duration: 12000,
        });
      }
    } catch (e) {
      toast({ title: "Resend failed", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary py-4 px-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-primary-foreground">Bank of America</h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {purpose === "transfer" ? "Confirm Your Transfer" : "Verify Your Identity"}
              </h2>
              <p className="text-muted-foreground">
                We sent a 6-digit verification code to{" "}
                <span className="font-medium text-foreground">{email || "your email"}</span>.
              </p>
            </div>

            <div className="flex justify-center mb-8">
              <InputOTP maxLength={6} value={otp} onChange={(v) => setOtp(v)}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl border-border" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              onClick={handleVerify}
              disabled={isLoading || otp.length !== 6}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base mb-4"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </Button>

            <div className="text-center">
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-secondary hover:underline text-sm disabled:opacity-50"
              >
                {resending ? "Sending..." : "Didn't receive the code? Resend"}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            For your security, this code will expire in 10 minutes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTPPage;
