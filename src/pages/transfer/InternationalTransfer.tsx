import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TransferLayout from "@/components/transfer/TransferLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveTransferDraft, getUserEmail } from "@/lib/transferState";
import { useToast } from "@/hooks/use-toast";
import FromAccountSelect, { FromAccountInfo } from "@/components/transfer/FromAccountSelect";

const InternationalTransfer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fromAccountId, setFromAccountId] = useState("");
  const [fromAccountInfo, setFromAccountInfo] = useState<FromAccountInfo | null>(null);
  const [f, setF] = useState({
    recipientName: "",
    recipientAddress: "",
    accountOrIban: "",
    bankName: "",
    bankAddress: "",
    swift: "",
    country: "",
    currency: "USD",
    amount: "",
    purpose: "",
    transferDate: new Date().toISOString().slice(0, 10),
    intermediaryBank: "",
    fees: "SHA",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const handleContinue = () => {
    const required = ["recipientName", "recipientAddress", "accountOrIban", "bankName", "bankAddress", "swift", "country", "amount"];
    for (const k of required) {
      if (!String((f as any)[k]).trim()) {
        toast({ title: "Missing field", description: `Please fill in ${k}`, variant: "destructive" });
        return;
      }
    }
    if (!fromAccountId) {
      toast({ title: "Select account", description: "Please choose an account to debit from.", variant: "destructive" });
      return;
    }
    const amt = parseFloat(f.amount);
    if (fromAccountInfo && amt > fromAccountInfo.balance) {
      toast({ title: "Insufficient funds", description: "Selected account does not have enough balance.", variant: "destructive" });
      return;
    }
    saveTransferDraft({
      type: "international",
      fields: {
        "Recipient Name": f.recipientName,
        "Recipient Address": f.recipientAddress,
        "Account / IBAN": f.accountOrIban,
        "Bank Name": f.bankName,
        "Bank Address": f.bankAddress,
        "SWIFT/BIC": f.swift,
        Country: f.country,
        Purpose: f.purpose,
        "Intermediary Bank": f.intermediaryBank,
        "Who Pays Fees": f.fees,
        "Transfer Date": f.transferDate,
      },
      amount: f.amount,
      currency: f.currency,
      email: getUserEmail(),
      fromAccountId,
      fromAccountLabel: fromAccountInfo?.label,
    });
    navigate("/transfer/pin");
  };

  return (
    <TransferLayout title="International Transfer">
      <FromAccountSelect value={fromAccountId} onChange={(id, info) => { setFromAccountId(id); setFromAccountInfo(info); }} />
      <Field label="Recipient Full Name" v={f.recipientName} onChange={(v) => set("recipientName", v)} />
      <div>
        <Label>Recipient Address</Label>
        <Textarea value={f.recipientAddress} onChange={(e) => set("recipientAddress", e.target.value)} />
      </div>
      <Field label="Account Number or IBAN" v={f.accountOrIban} onChange={(v) => set("accountOrIban", v)} />
      <Field label="Recipient Bank Name" v={f.bankName} onChange={(v) => set("bankName", v)} />
      <div>
        <Label>Bank Address</Label>
        <Textarea value={f.bankAddress} onChange={(e) => set("bankAddress", e.target.value)} />
      </div>
      <Field label="SWIFT / BIC Code" v={f.swift} onChange={(v) => set("swift", v)} />
      <Field label="Country of Destination" v={f.country} onChange={(v) => set("country", v)} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Currency</Label>
          <Select value={f.currency} onValueChange={(v) => set("currency", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "CNY", "INR"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Field label="Amount" v={f.amount} onChange={(v) => set("amount", v)} type="number" />
      </div>

      <Field label="Purpose of Transfer" v={f.purpose} onChange={(v) => set("purpose", v)} />
      <Field label="Transfer Date" v={f.transferDate} onChange={(v) => set("transferDate", v)} type="date" />

      <Field label="Intermediary Bank Info (optional)" v={f.intermediaryBank} onChange={(v) => set("intermediaryBank", v)} />

      <div>
        <Label>Who Pays Fees</Label>
        <RadioGroup value={f.fees} onValueChange={(v) => set("fees", v)} className="mt-2 space-y-2">
          {[
            ["OUR", "OUR (you pay all fees)"],
            ["SHA", "SHA (shared)"],
            ["BEN", "BEN (recipient pays)"],
          ].map(([val, label]) => (
            <div key={val} className="flex items-center gap-2">
              <RadioGroupItem id={`fee-${val}`} value={val} />
              <Label htmlFor={`fee-${val}`} className="font-normal">{label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleContinue}>
        Continue
      </Button>
    </TransferLayout>
  );
};

const Field = ({
  label, v, onChange, type = "text",
}: { label: string; v: string; onChange: (v: string) => void; type?: string }) => (
  <div>
    <Label>{label}</Label>
    <Input value={v} onChange={(e) => onChange(e.target.value)} type={type} />
  </div>
);

export default InternationalTransfer;
