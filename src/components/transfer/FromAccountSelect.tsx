import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export interface FromAccountInfo {
  id: string;
  label: string;
  balance: number;
}

interface Props {
  value: string;
  onChange: (id: string, info: FromAccountInfo | null) => void;
}

const fmt = (n: number) =>
  `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FromAccountSelect = ({ value, onChange }: Props) => {
  const [accounts, setAccounts] = useState<Array<{ id: string; account_type: string; account_name: string; account_number: string; balance: number }>>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("accounts")
        .select("id, account_type, account_name, account_number, balance")
        .in("account_type", ["checking", "savings"])
        .order("account_type");
      setAccounts(data || []);
      if (!value && data && data.length > 0) {
        const first = data[0];
        const label = `${first.account_name} (${first.account_number})`;
        onChange(first.id, { id: first.id, label, balance: Number(first.balance) });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Label>Debit From Account</Label>
      <Select
        value={value}
        onValueChange={(v) => {
          const a = accounts.find((x) => x.id === v);
          if (!a) { onChange(v, null); return; }
          const label = `${a.account_name} (${a.account_number})`;
          onChange(v, { id: a.id, label, balance: Number(a.balance) });
        }}
      >
        <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.account_name} · {a.account_number} — {fmt(Number(a.balance))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FromAccountSelect;