import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TransferLayout from "@/components/transfer/TransferLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
import { loadTransferDraft, clearTransferDraft } from "@/lib/transferState";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TransferSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const draft = useMemo(() => loadTransferDraft(), []);
  const [refNumber, setRefNumber] = useState("");
  const [submitting, setSubmitting] = useState(true);

  useEffect(() => {
    const persist = async () => {
      if (!draft) { setSubmitting(false); return; }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");

        // Resolve source account (selected, fallback to checking)
        let fromAccountId = draft.fromAccountId || null;
        if (!fromAccountId) {
          const { data: acct } = await supabase
            .from("accounts").select("id")
            .eq("user_id", user.id).eq("account_type", "checking").maybeSingle();
          if (acct) fromAccountId = acct.id;
        }
        if (!fromAccountId) throw new Error("No source account available");

        const f = draft.fields;
        const amt = parseFloat(draft.amount);

        const { data, error } = await supabase.rpc("submit_user_transfer", {
          _from_account_id: fromAccountId,
          _transfer_type: draft.type,
          _amount: amt,
          _currency: draft.currency || "USD",
          _recipient_name: f["Recipient Name"] || f["Recipient Full Name"] || null,
          _recipient_account: f["Account Number"] || f["Recipient Account Number / IBAN"] || f["Recipient Account Number"] || null,
          _recipient_bank: f["Bank Name"] || f["Recipient Bank Name"] || null,
          _routing_number: f["Routing Number"] || f["Routing Number (ABA)"] || null,
          _swift_code: f["SWIFT/BIC"] || f["SWIFT/BIC Code"] || null,
          _bank_address: f["Bank Address"] || null,
          _memo: f["Memo"] || f["Memo / Description"] || f["Memo / Reference"] || null,
          _details: f as any,
        });
        if (error) throw error;

        setRefNumber("TRX-" + String(data).slice(0, 8).toUpperCase());
      } catch (e: any) {
        toast({ title: "Could not save transfer", description: e?.message, variant: "destructive" });
      } finally {
        setSubmitting(false);
      }
    };
    persist();
    return () => { clearTransferDraft(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft) {
    return (
      <TransferLayout title="Transfer">
        <p className="text-muted-foreground">No transfer to display.</p>
        <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </TransferLayout>
    );
  }

  return (
    <TransferLayout title="Transfer Submitted">
      <div className="text-center py-4">
        {submitting ? (
          <>
            <Clock className="w-16 h-16 text-secondary mx-auto mb-3 animate-pulse" />
            <h2 className="text-xl font-bold text-foreground">Submitting...</h2>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-foreground">Transfer Submitted</h2>
            <p className="text-muted-foreground text-sm">Reference: {refNumber || "—"}</p>
            <p className="text-xs text-amber-600 mt-2 font-medium">Status: Pending</p>
          </>
        )}
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <Row label="Type" value={`${draft.type[0].toUpperCase()}${draft.type.slice(1)} Transfer`} />
        <Row label="Amount" value={`${draft.currency || "USD"} ${draft.amount}`} />
        {draft.fromAccountLabel && <Row label="From Account" value={draft.fromAccountLabel} />}
        {Object.entries(draft.fields).map(([k, v]) =>
          v ? <Row key={k} label={k} value={v} /> : null
        )}
      </div>

      <Button
        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
        onClick={() => navigate("/dashboard")}
      >
        Back to Dashboard
      </Button>
    </TransferLayout>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground text-right">{value}</span>
  </div>
);

export default TransferSuccess;
