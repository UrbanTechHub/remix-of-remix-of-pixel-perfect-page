import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LogOut, Plus, Users, Wallet, ArrowLeftRight, KeyRound, Check, X, Pencil, Trash2 } from "lucide-react";

interface Profile { id: string; user_id: string; email: string; full_name: string | null; phone: string | null; transfer_pin: string | null; created_at?: string; }
interface Account { id: string; user_id: string; account_type: string; account_name: string; account_number: string; balance: number; available_balance: number; }
interface Transfer { id: string; user_id: string; from_account_id: string | null; transfer_type: string; amount: number; currency: string | null; recipient_name: string | null; recipient_account: string | null; recipient_bank: string | null; status: string; created_at: string; details: unknown; admin_note: string | null; }
interface Transaction { id: string; account_id: string; user_id: string; description: string; amount: number; transaction_type: string; status: string; transaction_date: string; }

const applyBalanceDelta = async (accountId: string, delta: number) => {
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, balance")
    .eq("id", accountId)
    .single();

  if (accountError) throw accountError;

  const nextBalance = Number(account.balance) + Number(delta);
  const { error: updateError } = await supabase
    .from("accounts")
    .update({ balance: nextBalance, available_balance: nextBalance })
    .eq("id", accountId);

  if (updateError) throw updateError;
};

const applyTransactionEffect = async (
  previous: { account_id: string; amount: number } | null,
  next: { account_id: string; amount: number } | null,
) => {
  if (previous) {
    await applyBalanceDelta(previous.account_id, -Number(previous.amount));
  }

  if (next) {
    await applyBalanceDelta(next.account_id, Number(next.amount));
  }
};

const AdminDashboard = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/admin/login"); return; }
    if (!isAdmin) { navigate("/dashboard"); return; }
    void syncUsersAndRefresh();
  }, [user, isAdmin, loading]);

  useEffect(() => {
    if (!isAdmin) return;
    const syncTimer = window.setInterval(() => { void syncUsersAndRefresh(); }, 20000);
    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "transfers" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => refresh())
      .subscribe();
    return () => { window.clearInterval(syncTimer); void supabase.removeChannel(channel); };
  }, [isAdmin]);

  const refresh = async () => {
    const [{ data: p }, { data: a }, { data: t }, { data: tx }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("transfers").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("transaction_date", { ascending: false }).limit(200),
    ]);
    setProfiles(p || []);
    setAccounts(a || []);
    setTransfers(t || []);
    setTransactions(tx || []);
  };

  const syncUsersAndRefresh = async () => {
    await supabase.functions.invoke("admin-sync-users");
    await refresh();
  };

  const handleLogout = async () => { await signOut(); navigate("/admin/login"); };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-primary text-primary-foreground px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate">Bank Admin Console</h1>
          <p className="text-[11px] sm:text-xs opacity-80 truncate">{user?.email}</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary shrink-0">
          <LogOut className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Sign out</span>
        </Button>
      </header>

      <div className="p-3 sm:p-6">
        <Tabs defaultValue="users">
          <TabsList className="bg-background w-full sm:w-auto grid grid-cols-4 sm:inline-flex h-auto">
            <TabsTrigger value="users" className="text-xs sm:text-sm"><Users className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Users</span></TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs sm:text-sm"><Wallet className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Accounts</span></TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs sm:text-sm">Transactions</TabsTrigger>
            <TabsTrigger value="transfers" className="text-xs sm:text-sm"><ArrowLeftRight className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Transfers</span></TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <UsersPanel profiles={profiles} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="accounts" className="mt-4">
            <AccountsPanel accounts={accounts} profiles={profiles} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="transactions" className="mt-4">
            <TransactionsPanel transactions={transactions} accounts={accounts} profiles={profiles} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="transfers" className="mt-4">
            <TransfersPanel transfers={transfers} profiles={profiles} accounts={accounts} onRefresh={refresh} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

/* ---------- Users panel ---------- */
const UsersPanel = ({ profiles, onRefresh }: { profiles: Profile[]; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "" });
  const [pinUser, setPinUser] = useState<Profile | null>(null);
  const [newPin, setNewPin] = useState("");
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "" });
  const [deleting, setDeleting] = useState<string | null>(null);

  const createUser = async () => {
    if (!form.email || !form.password) {
      toast({ title: "Email and password required", variant: "destructive" }); return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: form });
      if (error) throw error;
      toast({
        title: "User created",
        description: data?.emailSent
          ? `Login OTP sent to ${form.email}`
          : `Login OTP (demo): ${data?.devCode}`,
        duration: 12000,
      });
      setForm({ email: "", password: "", fullName: "", phone: "" });
      setOpen(false);
      onRefresh();
    } catch (e: unknown) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const setPin = async () => {
    if (!pinUser || newPin.length !== 4) {
      toast({ title: "PIN must be 4 digits", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("profiles")
      .update({ transfer_pin: newPin }).eq("user_id", pinUser.user_id);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else { toast({ title: `PIN set for ${pinUser.email}` }); setPinUser(null); setNewPin(""); onRefresh(); }
  };

  const startEdit = (p: Profile) => {
    setEditUser(p);
    setEditForm({ full_name: p.full_name || "", phone: p.phone || "" });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    const { error } = await supabase.from("profiles")
      .update({ full_name: editForm.full_name || null, phone: editForm.phone || null })
      .eq("user_id", editUser.user_id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "User updated" });
    setEditUser(null);
    onRefresh();
  };

  const deleteUser = async (p: Profile) => {
    if (!confirm(`Delete ${p.email}? This permanently removes the user, all their accounts, transfers and transactions.`)) return;
    setDeleting(p.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { userId: p.user_id } });
      if (error) throw error;
      if (data && typeof data === "object" && "error" in data) throw new Error(String(data.error));
      toast({ title: "User deleted" });
      onRefresh();
    } catch (e: unknown) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" }) : "—";

  return (
    <div className="bg-background rounded-lg border border-border p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
        <h2 className="text-lg font-bold">Users ({profiles.length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Create User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Full Name</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div><Label>Phone (optional)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={createUser} disabled={creating} className="bg-primary text-primary-foreground">
                {creating ? "Creating..." : "Create & Send OTP"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Phone</th>
              <th className="p-2">Joined</th>
              <th className="p-2">PIN</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-2 font-medium">{p.full_name || "—"}</td>
                <td className="p-2">{p.email}</td>
                <td className="p-2">{p.phone || "—"}</td>
                <td className="p-2 text-xs text-muted-foreground">{fmtDate(p.created_at)}</td>
                <td className="p-2">{p.transfer_pin ? "Set" : "—"}</td>
                <td className="p-2">
                  <div className="flex gap-1 justify-end flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                      <Pencil className="w-3 h-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPinUser(p)}>
                      <KeyRound className="w-3 h-3 mr-1" />PIN
                    </Button>
                    <Button size="sm" variant="destructive" disabled={deleting === p.user_id} onClick={() => deleteUser(p)}>
                      <Trash2 className="w-3 h-3 mr-1" />{deleting === p.user_id ? "..." : "Delete"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {profiles.map((p) => (
          <div key={p.id} className="border border-border rounded-md p-3">
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{p.full_name || "—"}</p>
                <p className="text-sm text-muted-foreground truncate">{p.email}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{fmtDate(p.created_at)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span>📞 {p.phone || "—"}</span>
              <span>🔑 PIN: {p.transfer_pin ? "Set" : "Not set"}</span>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => startEdit(p)} className="flex-1 min-w-[80px]">
                <Pencil className="w-3 h-3 mr-1" />Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPinUser(p)} className="flex-1 min-w-[80px]">
                <KeyRound className="w-3 h-3 mr-1" />PIN
              </Button>
              <Button size="sm" variant="destructive" disabled={deleting === p.user_id} onClick={() => deleteUser(p)} className="flex-1 min-w-[80px]">
                <Trash2 className="w-3 h-3 mr-1" />{deleting === p.user_id ? "..." : "Delete"}
              </Button>
            </div>
          </div>
        ))}
        {profiles.length === 0 && (
          <p className="text-center text-muted-foreground py-6">No users yet.</p>
        )}
      </div>

      <Dialog open={Boolean(pinUser)} onOpenChange={(o) => !o && setPinUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Transfer PIN — {pinUser?.email}</DialogTitle></DialogHeader>
          <Input maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="4-digit PIN" />
          <DialogFooter><Button onClick={setPin} className="bg-primary text-primary-foreground">Save PIN</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editUser)} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User — {editUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={saveEdit} className="bg-primary text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- Accounts panel ---------- */
const AccountsPanel = ({ accounts, profiles, onRefresh }: { accounts: Account[]; profiles: Profile[]; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [edit, setEdit] = useState<Account | null>(null);
  const [op, setOp] = useState<"credit" | "debit" | "set">("credit");
  const [amount, setAmount] = useState("");

  const apply = async () => {
    if (!edit) return;
    const amt = parseFloat(amount);
    if (isNaN(amt)) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    let newBal = Number(edit.balance);
    if (op === "credit") newBal += amt;
    else if (op === "debit") newBal -= amt;
    else newBal = amt;
    const { error } = await supabase.from("accounts")
      .update({ balance: newBal, available_balance: newBal })
      .eq("id", edit.id);
    if (error) { toast({ title: "Failed", variant: "destructive" }); return; }

    // Log transaction
    if (op !== "set") {
      await supabase.from("transactions").insert({
        account_id: edit.id, user_id: edit.user_id,
        description: op === "credit" ? "Credit Adjustment" : "Debit Adjustment",
        amount: op === "credit" ? amt : -amt,
        transaction_type: op === "credit" ? "credit" : "debit",
        status: "completed",
      });
    }
    toast({ title: "Balance updated" });
    setEdit(null); setAmount(""); onRefresh();
  };

  const userOf = (uid: string) => profiles.find((p) => p.user_id === uid)?.email || uid.slice(0, 8);

  return (
    <div className="bg-background rounded-lg border border-border p-4">
      <h2 className="text-lg font-bold mb-4">Accounts ({accounts.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="p-2">User</th><th className="p-2">Type</th><th className="p-2">Name</th><th className="p-2">Number</th><th className="p-2 text-right">Balance</th><th className="p-2">Action</th></tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-2">{userOf(a.user_id)}</td>
                <td className="p-2 capitalize">{a.account_type}</td>
                <td className="p-2">{a.account_name}</td>
                <td className="p-2 font-mono">{a.account_number}</td>
                <td className="p-2 text-right font-medium">${Number(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-2">
                  <Button size="sm" variant="outline" onClick={() => setEdit(a)}>Adjust</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Balance — {edit?.account_name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Current: ${Number(edit?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <div>
            <Label>Operation</Label>
            <Select value={op} onValueChange={(v) => setOp(v as "credit" | "debit" | "set")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit (add)</SelectItem>
                <SelectItem value="debit">Debit (subtract)</SelectItem>
                <SelectItem value="set">Set exact balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <DialogFooter><Button onClick={apply} className="bg-primary text-primary-foreground">Apply</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- Transactions panel ---------- */
const TransactionsPanel = ({ transactions, accounts, profiles, onRefresh }: { transactions: Transaction[]; accounts: Account[]; profiles: Profile[]; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ account_id: "", description: "", amount: "", transaction_type: "debit", transaction_date: new Date().toISOString().slice(0, 16) });

  const acctLabel = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    if (!a) return id.slice(0, 8);
    const email = profiles.find((p) => p.user_id === a.user_id)?.email || "";
    return `${email} · ${a.account_name} ${a.account_number}`;
  };

  const submit = async () => {
    if (!form.account_id || !form.description || !form.amount) {
      toast({ title: "Fill all fields", variant: "destructive" }); return;
    }
    const acct = accounts.find((a) => a.id === form.account_id);
    if (!acct) return;
    const amt = parseFloat(form.amount);
    const signed = form.transaction_type === "debit" ? -Math.abs(amt) : Math.abs(amt);

    try {
      if (edit) {
        const { error } = await supabase.from("transactions").update({
          account_id: form.account_id, description: form.description,
          amount: signed, transaction_type: form.transaction_type,
          transaction_date: new Date(form.transaction_date).toISOString(),
        }).eq("id", edit.id);
        if (error) throw error;

        await applyTransactionEffect(
          { account_id: edit.account_id, amount: Number(edit.amount) },
          { account_id: form.account_id, amount: signed },
        );
        toast({ title: "Transaction updated" });
      } else {
        const { error } = await supabase.from("transactions").insert({
          account_id: form.account_id, user_id: acct.user_id,
          description: form.description, amount: signed,
          transaction_type: form.transaction_type, status: "completed",
          transaction_date: new Date(form.transaction_date).toISOString(),
        });
        if (error) throw error;

        await applyTransactionEffect(null, { account_id: form.account_id, amount: signed });
        toast({ title: "Transaction created" });
      }
    } catch (error) {
      toast({ title: "Could not save transaction", variant: "destructive" });
      return;
    }

    setOpen(false); setEdit(null);
    setForm({ account_id: "", description: "", amount: "", transaction_type: "debit", transaction_date: new Date().toISOString().slice(0, 16) });
    onRefresh();
  };

  const startEdit = (t: Transaction) => {
    setEdit(t);
    setForm({
      account_id: t.account_id, description: t.description,
      amount: String(Math.abs(Number(t.amount))),
      transaction_type: t.transaction_type,
      transaction_date: new Date(t.transaction_date).toISOString().slice(0, 16),
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    const existing = transactions.find((item) => item.id === id);

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;

      if (existing) {
        await applyTransactionEffect({ account_id: existing.account_id, amount: Number(existing.amount) }, null);
      }

      toast({ title: "Deleted" });
      onRefresh();
    } catch {
      toast({ title: "Could not delete transaction", variant: "destructive" });
    }
  };

  return (
    <div className="bg-background rounded-lg border border-border p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Transactions ({transactions.length})</h2>
        <Button onClick={() => { setEdit(null); setOpen(true); }} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />New Transaction
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="p-2">Date</th><th className="p-2">Account</th><th className="p-2">Description</th><th className="p-2 text-right">Amount</th><th className="p-2">Action</th></tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-2 text-xs">{new Date(t.transaction_date).toLocaleString()}</td>
                <td className="p-2 text-xs">{acctLabel(t.account_id)}</td>
                <td className="p-2">{t.description}</td>
                <td className={`p-2 text-right font-medium ${Number(t.amount) >= 0 ? "text-green-600" : "text-foreground"}`}>
                  {Number(t.amount) >= 0 ? "+" : ""}${Number(t.amount).toFixed(2)}
                </td>
                <td className="p-2 space-x-1">
                  <Button size="sm" variant="outline" onClick={() => startEdit(t)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(t.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? "Edit" : "New"} Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Account</Label>
              <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{acctLabel(a.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.transaction_type} onValueChange={(v) => setForm({ ...form, transaction_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (+)</SelectItem>
                  <SelectItem value="debit">Debit (−)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date & Time</Label><Input type="datetime-local" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={submit} className="bg-primary text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- Transfers panel ---------- */
const TransfersPanel = ({ transfers, profiles, accounts, onRefresh }: { transfers: Transfer[]; profiles: Profile[]; accounts: Account[]; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [view, setView] = useState<Transfer | null>(null);
  const [note, setNote] = useState("");

  const userOf = (uid: string) => profiles.find((p) => p.user_id === uid)?.email || uid.slice(0, 8);

  const decide = async (t: Transfer, status: "approved" | "rejected") => {
    try {
      const { error } = await supabase.from("transfers")
        .update({ status, admin_note: note || null }).eq("id", t.id);
      if (error) throw error;

      if (status === "approved") {
        const accountId = t.from_account_id || accounts.find((a) => a.user_id === t.user_id && a.account_type === "checking")?.id;

        if (accountId) {
          const signedAmount = -Math.abs(Number(t.amount));
          await applyBalanceDelta(accountId, signedAmount);

          const { error: txError } = await supabase.from("transactions").insert({
            account_id: accountId,
            user_id: t.user_id,
            description: `${t.transfer_type.toUpperCase()} Transfer to ${t.recipient_name || "Recipient"}`,
            amount: signedAmount,
            transaction_type: "transfer",
            status: "completed",
          });

          if (txError) throw txError;
        }
      }

      toast({ title: `Transfer ${status}` });
      setView(null); setNote(""); onRefresh();
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const pending = transfers.filter((t) => t.status === "pending");
  const others = transfers.filter((t) => t.status !== "pending");

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg border border-border p-4">
        <h2 className="text-lg font-bold mb-3">Pending Transfers ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">None pending.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr><th className="p-2">When</th><th className="p-2">User</th><th className="p-2">Type</th><th className="p-2">Recipient</th><th className="p-2 text-right">Amount</th><th className="p-2">Action</th></tr>
              </thead>
              <tbody>
                {pending.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="p-2 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="p-2 text-xs">{userOf(t.user_id)}</td>
                    <td className="p-2 capitalize">{t.transfer_type}</td>
                    <td className="p-2">{t.recipient_name} · {t.recipient_bank}</td>
                    <td className="p-2 text-right font-medium">{t.currency || "USD"} {Number(t.amount).toFixed(2)}</td>
                    <td className="p-2"><Button size="sm" variant="outline" onClick={() => setView(t)}>Review</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-background rounded-lg border border-border p-4">
        <h2 className="text-lg font-bold mb-3">Past Transfers ({others.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr><th className="p-2">When</th><th className="p-2">User</th><th className="p-2">Type</th><th className="p-2">Recipient</th><th className="p-2 text-right">Amount</th><th className="p-2">Status</th></tr>
            </thead>
            <tbody>
              {others.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-2 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="p-2 text-xs">{userOf(t.user_id)}</td>
                  <td className="p-2 capitalize">{t.transfer_type}</td>
                  <td className="p-2">{t.recipient_name}</td>
                  <td className="p-2 text-right">{t.currency || "USD"} {Number(t.amount).toFixed(2)}</td>
                  <td className={`p-2 capitalize font-medium ${t.status === "approved" ? "text-green-600" : "text-red-600"}`}>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={Boolean(view)} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Transfer Review</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-2 text-sm">
              <Row k="User" v={userOf(view.user_id)} />
              <Row k="Type" v={view.transfer_type} />
              <Row k="Amount" v={`${view.currency || "USD"} ${view.amount}`} />
              <Row k="Recipient" v={view.recipient_name || "—"} />
              <Row k="Account" v={view.recipient_account || "—"} />
              <Row k="Bank" v={view.recipient_bank || "—"} />
              {view.details && Object.entries(view.details).map(([k, v]) =>
                v ? <Row key={k} k={k} v={String(v)} /> : null
              )}
              <div className="pt-2">
                <Label>Admin note (optional)</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => view && decide(view, "rejected")}>
              <X className="w-4 h-4 mr-1" />Reject
            </Button>
            <Button onClick={() => view && decide(view, "approved")} className="bg-green-600 text-white hover:bg-green-700">
              <Check className="w-4 h-4 mr-1" />Approve & Debit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-3 border-b border-border py-1">
    <span className="text-muted-foreground">{k}</span><span className="text-foreground text-right">{v}</span>
  </div>
);

export default AdminDashboard;
