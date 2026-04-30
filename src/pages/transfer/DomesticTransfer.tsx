import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TransferLayout from "@/components/transfer/TransferLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveTransferDraft, getUserEmail } from "@/lib/transferState";
import { useToast } from "@/hooks/use-toast";
import FromAccountSelect, { FromAccountInfo } from "@/components/transfer/FromAccountSelect";

const DomesticTransfer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fromAccountId, setFromAccountId] = useState("");
  const [fromAccountInfo, setFromAccountInfo] = useState<FromAccountInfo | null>(null);
  const [f, setF] = useState({
    recipientName: "",
    accountNumber: "",
    routingNumber: "",
    bankName: "",
    accountType: "checking",
    amount: "",
    speed: "standard",
    transferDate: new Date().toISOString().slice(0, 10),
    memo: "",
    saveRecipient: false,
    nickname: "",
    notifyRecipient: false,
    recipientEmail: "",
  });

  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const handleContinue = () => {
    const required = ["recipientName", "accountNumber", "routingNumber", "bankName", "amount"];
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
      type: "domestic",
      fields: {
        "Recipient Name": f.recipientName,
        "Account Number": f.accountNumber,
        "Routing Number": f.routingNumber,
        "Bank Name": f.bankName,
        "Account Type": f.accountType,
        "Transfer Speed": f.speed,
        "Transfer Date": f.transferDate,
        Memo: f.memo,
      },
      amount: f.amount,
      currency: "USD",
      email: getUserEmail(),
      fromAccountId,
      fromAccountLabel: fromAccountInfo?.label,
    });
    navigate("/transfer/pin");
  };

  return (
    <TransferLayout title="Domestic Transfer">
      <FromAccountSelect value={fromAccountId} onChange={(id, info) => { setFromAccountId(id); setFromAccountInfo(info); }} />
      <Field label="Recipient Full Name" v={f.recipientName} onChange={(v) => set("recipientName", v)} />
      <Field label="Recipient Account Number" v={f.accountNumber} onChange={(v) => set("accountNumber", v)} />
      <Field label="Routing Number (ABA)" v={f.routingNumber} onChange={(v) => set("routingNumber", v)} />
      <Field label="Bank Name" v={f.bankName} onChange={(v) => set("bankName", v)} placeholder="e.g. Bank of America, Chase" />

      <div>
        <Label>Account Type</Label>
        <Select value={f.accountType} onValueChange={(v) => set("accountType", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="checking">Checking</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Field label="Amount (USD)" v={f.amount} onChange={(v) => set("amount", v)} type="number" />

      <div>
        <Label>Transfer Speed</Label>
        <RadioGroup value={f.speed} onValueChange={(v) => set("speed", v)} className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <RadioGroupItem id="speed-standard" value="standard" />
            <Label htmlFor="speed-standard" className="font-normal">Standard (ACH)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem id="speed-sameday" value="sameday" />
            <Label htmlFor="speed-sameday" className="font-normal">Same-day</Label>
          </div>
        </RadioGroup>
      </div>

      <Field label="Transfer Date" v={f.transferDate} onChange={(v) => set("transferDate", v)} type="date" />

      <div>
        <Label>Memo / Description (optional)</Label>
        <Textarea value={f.memo} onChange={(e) => set("memo", e.target.value)} />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="save-r" checked={f.saveRecipient} onCheckedChange={(v) => set("saveRecipient", Boolean(v))} />
        <Label htmlFor="save-r" className="font-normal">Save recipient</Label>
      </div>
      {f.saveRecipient && (
        <Field label="Nickname" v={f.nickname} onChange={(v) => set("nickname", v)} />
      )}

      <div className="flex items-center gap-2">
        <Checkbox id="notify-r" checked={f.notifyRecipient} onCheckedChange={(v) => set("notifyRecipient", Boolean(v))} />
        <Label htmlFor="notify-r" className="font-normal">Email notification to recipient</Label>
      </div>
      {f.notifyRecipient && (
        <Field label="Recipient Email" v={f.recipientEmail} onChange={(v) => set("recipientEmail", v)} type="email" />
      )}

      <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleContinue}>
        Continue
      </Button>
    </TransferLayout>
  );
};

const Field = ({
  label, v, onChange, type = "text", placeholder,
}: { label: string; v: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
  <div>
    <Label>{label}</Label>
    <Input value={v} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} />
  </div>
);

export default DomesticTransfer;
