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

const WireTransfer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scope, setScope] = useState<"domestic" | "international">("domestic");
  const [f, setF] = useState({
    senderName: "",
    senderAccount: "",
    recipientName: "",
    recipientAddress: "",
    recipientAccount: "",
    bankName: "",
    bankAddress: "",
    routingOrSwift: "",
    amount: "",
    currency: "USD",
    transferDate: new Date().toISOString().slice(0, 10),
    memo: "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const handleContinue = () => {
    const required = ["senderName", "senderAccount", "recipientName", "recipientAddress", "recipientAccount", "bankName", "bankAddress", "routingOrSwift", "amount"];
    for (const k of required) {
      if (!String((f as any)[k]).trim()) {
        toast({ title: "Missing field", description: `Please fill in ${k}`, variant: "destructive" });
        return;
      }
    }
    saveTransferDraft({
      type: "wire",
      fields: {
        "Wire Type": scope === "domestic" ? "Domestic Wire" : "International Wire",
        "Sender Name": f.senderName,
        "Sender Account": f.senderAccount,
        "Recipient Name": f.recipientName,
        "Recipient Address": f.recipientAddress,
        "Recipient Account / IBAN": f.recipientAccount,
        "Recipient Bank Name": f.bankName,
        "Bank Address": f.bankAddress,
        [scope === "domestic" ? "Routing Number" : "SWIFT/BIC"]: f.routingOrSwift,
        "Transfer Date": f.transferDate,
        Memo: f.memo,
      },
      amount: f.amount,
      currency: f.currency,
      email: getUserEmail(),
    });
    navigate("/transfer/pin");
  };

  return (
    <TransferLayout title="Wire Transfer">
      <div>
        <Label>Wire Type</Label>
        <RadioGroup value={scope} onValueChange={(v) => setScope(v as any)} className="mt-2 flex gap-4">
          <div className="flex items-center gap-2">
            <RadioGroupItem id="w-d" value="domestic" />
            <Label htmlFor="w-d" className="font-normal">Domestic (same-day)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem id="w-i" value="international" />
            <Label htmlFor="w-i" className="font-normal">International</Label>
          </div>
        </RadioGroup>
      </div>

      <Field label="Sender Name" v={f.senderName} onChange={(v) => set("senderName", v)} />
      <Field label="Sender Account Number" v={f.senderAccount} onChange={(v) => set("senderAccount", v)} />
      <Field label="Recipient Full Name" v={f.recipientName} onChange={(v) => set("recipientName", v)} />
      <div>
        <Label>Recipient Address</Label>
        <Textarea value={f.recipientAddress} onChange={(e) => set("recipientAddress", e.target.value)} />
      </div>
      <Field
        label={scope === "domestic" ? "Recipient Account Number" : "Recipient Account Number / IBAN"}
        v={f.recipientAccount}
        onChange={(v) => set("recipientAccount", v)}
      />
      <Field label="Recipient Bank Name" v={f.bankName} onChange={(v) => set("bankName", v)} />
      <div>
        <Label>Bank Address</Label>
        <Textarea value={f.bankAddress} onChange={(e) => set("bankAddress", e.target.value)} />
      </div>
      <Field
        label={scope === "domestic" ? "Routing Number (Domestic Wire)" : "SWIFT / BIC (International Wire)"}
        v={f.routingOrSwift}
        onChange={(v) => set("routingOrSwift", v)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" v={f.amount} onChange={(v) => set("amount", v)} type="number" />
        {scope === "international" ? (
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
        ) : (
          <Field label="Currency" v="USD" onChange={() => {}} />
        )}
      </div>

      <Field label="Transfer Date" v={f.transferDate} onChange={(v) => set("transferDate", v)} type="date" />
      <div>
        <Label>Memo / Reference</Label>
        <Textarea value={f.memo} onChange={(e) => set("memo", e.target.value)} />
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

export default WireTransfer;
