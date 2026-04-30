import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TransferLayout from "@/components/transfer/TransferLayout";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { setUserPin, loadTransferDraft, getUserEmail, setUserEmail } from "@/lib/transferState";
import { supabase } from "@/integrations/supabase/client";

const TransferPin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [mode, setMode] = useState<"set" | "enter" | "loading">("loading");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const draft = loadTransferDraft();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      // Always sync email
      if (user.email) setUserEmail(user.email);
      const { data: prof } = await supabase
        .from("profiles").select("transfer_pin").eq("user_id", user.id).maybeSingle();
      if (prof?.transfer_pin) {
        setStoredPin(prof.transfer_pin);
        setMode("enter");
      } else {
        setMode("set");
      }
    })();
  }, [navigate]);

  if (!draft) {
    return (
      <TransferLayout title="Transfer PIN">
        <p className="text-muted-foreground">No pending transfer. Start a new one.</p>
        <Button onClick={() => navigate("/pay-transfer")}>Back</Button>
      </TransferLayout>
    );
  }

  const proceedToOtp = async () => {
    const email = getUserEmail();
    if (!email) {
      toast({ title: "Missing email", description: "Please log in again.", variant: "destructive" });
      navigate("/");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { email, purpose: "transfer" },
      });
      if (error) throw error;
      if (data?.emailSent) {
        toast({ title: "Confirmation code sent", description: `Sent to ${email}.` });
      } else {
        toast({
          title: "Confirmation code (demo)",
          description: `Email isn't configured yet. Your code: ${data?.devCode}`,
          duration: 12000,
        });
      }
      navigate("/otp", { state: { email, purpose: "transfer", nextRoute: "/transfer/success" } });
    } catch (e) {
      console.error(e);
      toast({ title: "Could not send code", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSet = async () => {
    if (pin.length !== 4) return toast({ title: "PIN must be 4 digits", variant: "destructive" });
    if (pin !== confirm) return toast({ title: "PINs do not match", variant: "destructive" });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ transfer_pin: pin }).eq("user_id", user.id);
    }
    setUserPin(pin);
    toast({ title: "Transfer PIN set" });
    proceedToOtp();
  };

  const handleEnter = () => {
    if (pin !== storedPin) {
      toast({ title: "Incorrect PIN", variant: "destructive" });
      return;
    }
    proceedToOtp();
  };

  if (mode === "loading") {
    return <TransferLayout title="Transfer PIN"><p>Loading...</p></TransferLayout>;
  }

  return (
    <TransferLayout title={mode === "set" ? "Set Transfer PIN" : "Enter Transfer PIN"}>
      <div className="bg-muted rounded-md p-3 text-sm">
        <div className="font-medium text-foreground">Confirming:</div>
        <div className="text-muted-foreground capitalize">{draft.type} transfer</div>
        <div className="text-foreground font-semibold">{draft.currency || "USD"} {draft.amount}</div>
      </div>

      <p className="text-sm text-muted-foreground">
        {mode === "set"
          ? "Set a 4-digit PIN you'll use to authorize transfers."
          : "Enter your 4-digit transfer PIN to continue."}
      </p>

      <div className="flex justify-center">
        <InputOTP maxLength={4} value={pin} onChange={setPin}>
          <InputOTPGroup>
            {[0, 1, 2, 3].map((i) => (
              <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {mode === "set" && (
        <>
          <p className="text-sm text-muted-foreground text-center">Confirm PIN</p>
          <div className="flex justify-center">
            <InputOTP maxLength={4} value={confirm} onChange={setConfirm}>
              <InputOTPGroup>
                {[0, 1, 2, 3].map((i) => (
                  <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </>
      )}

      <Button
        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={loading || pin.length !== 4 || (mode === "set" && confirm.length !== 4)}
        onClick={mode === "set" ? handleSet : handleEnter}
      >
        {loading ? "Sending code..." : "Continue"}
      </Button>
    </TransferLayout>
  );
};

export default TransferPin;
