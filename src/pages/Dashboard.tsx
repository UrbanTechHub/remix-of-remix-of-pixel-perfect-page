import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu, Mail, ShoppingCart, LogOut, Search, ChevronRight, ChevronUp, ChevronDown,
  DollarSign, Smartphone, Receipt, TrendingUp, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import boaLogo from "@/assets/boa-logo.png";
import checkIcon from "@/assets/check-icon.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Account { id: string; account_type: string; account_name: string; account_number: string; balance: number; }
interface Transaction { id: string; account_id: string; description: string; amount: number; transaction_date: string; status?: string; clears_at?: string | null; display_style?: string | null; running_balance?: number | null; }
interface Profile { full_name: string | null; email: string; phone: string | null; }

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"accounts" | "dashboard">("accounts");
  const [bankingOpen, setBankingOpen] = useState(true);
  const [creditCardsOpen, setCreditCardsOpen] = useState(true);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = async () => {
    await supabase.functions.invoke("ensure-user-records");

    const [{ data: accts }, { data: txs }, { data: prof }] = await Promise.all([
      supabase.from("accounts").select("*").order("account_type"),
      supabase.from("transactions").select("*").order("transaction_date", { ascending: false }).limit(30),
      supabase.from("profiles").select("full_name, email, phone").eq("user_id", user!.id).maybeSingle(),
    ]);

    setAccounts(accts || []);
    setTransactions(txs || []);
    setProfile(prof as Profile | null);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/"); return; }
    void load();
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;

    const accountChannel = supabase
      .channel(`dashboard-accounts-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts", filter: `user_id=eq.${user.id}` },
        () => { void load(); },
      )
      .subscribe();

    const transactionChannel = supabase
      .channel(`dashboard-transactions-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` },
        () => { void load(); },
      )
      .subscribe();

    const transferChannel = supabase
      .channel(`dashboard-transfers-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transfers", filter: `user_id=eq.${user.id}` },
        () => { void load(); },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(accountChannel);
      void supabase.removeChannel(transactionChannel);
      void supabase.removeChannel(transferChannel);
    };
  }, [user?.id]);

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const fmt = (n: number) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const banking = accounts.filter((a) => a.account_type === "checking" || a.account_type === "savings");
  const credit = accounts.filter((a) => a.account_type === "credit");
  const acctNumLabel = (a: Account) => a.account_number?.replace("xxxx", "");
  const handleInboxClick = () => toast({ title: "Inbox", description: "No new secure messages right now." });
  const handleProductsClick = () => toast({ title: "Products", description: "Your product overview is already shown below." });
  const profileName = profile?.full_name?.trim() || user?.user_metadata?.full_name || profile?.email?.split("@")[0] || user?.email?.split("@")[0] || "Customer";

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-3 sm:px-4 py-3 gap-2">
          <button className="flex flex-col items-center text-foreground shrink-0">
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[10px] sm:text-xs mt-1">Menu</span>
          </button>
          <div className="flex items-center gap-3 sm:gap-6">
            <button onClick={handleInboxClick} className="flex flex-col items-center text-foreground relative">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs mt-1">Inbox</span>
            </button>
            <button onClick={handleProductsClick} className="flex flex-col items-center text-foreground relative">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs mt-1">Products</span>
            </button>
            <button onClick={handleLogout} className="flex flex-col items-center text-foreground">
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[10px] sm:text-xs mt-1">Log out</span>
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto flex">
          <button onClick={() => setActiveTab("accounts")} className={`flex-1 py-3 text-center font-medium text-base sm:text-lg transition-colors ${activeTab === "accounts" ? "text-primary border-b-4 border-primary" : "text-muted-foreground"}`}>Accounts</button>
          <button onClick={() => setActiveTab("dashboard")} className={`flex-1 py-3 text-center font-medium text-base sm:text-lg transition-colors ${activeTab === "dashboard" ? "text-primary border-b-4 border-primary" : "text-muted-foreground"}`}>Dashboard</button>
        </div>
      </div>

      <div className="bg-muted p-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input placeholder="How can we help?" className="pl-10 h-12 bg-background border-border text-foreground" />
          </div>
          <button className="relative bg-primary rounded-full w-12 h-12 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-primary-foreground flex items-center justify-center">
              <div className="w-6 h-1 bg-primary rounded-full"></div>
              <div className="absolute w-6 h-1 bg-primary rounded-full rotate-90"></div>
            </div>
            <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">4</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 max-w-5xl w-full mx-auto">
        <div className="bg-background rounded-lg shadow-sm p-4">
          <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">
            Welcome, {profileName}
          </h2>
          <div className="border-t border-border mt-3 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                You've been enjoying Preferred Rewards<br />since today. <span className="text-secondary font-medium">My Summary</span>
              </p>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Banking */}
        <div className="bg-background rounded-lg shadow-sm overflow-hidden">
          <div className="h-1 flex"><div className="flex-1 bg-primary"></div><div className="flex-1 bg-secondary"></div></div>
          <button onClick={() => setBankingOpen(!bankingOpen)} className="w-full flex items-center justify-between p-4">
            <h3 className="text-lg font-bold text-foreground">Banking</h3>
            {bankingOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {bankingOpen && (
            <div className="border-t border-border">
              {banking.length === 0 && <p className="p-4 text-sm text-muted-foreground">No accounts yet.</p>}
              {banking.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/account/${a.id}`)}
                  className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${i < banking.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">BANK OF AMERICA</p>
                      <p className="font-medium text-foreground">{a.account_name}</p>
                      <p className="text-foreground capitalize">{a.account_type} - {acctNumLabel(a)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={boaLogo} alt="Bank of America" className="w-8 h-8 object-contain" />
                      <div className="text-right"><p className="text-lg font-medium text-foreground">{fmt(a.balance)}</p></div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Credit */}
        <div className="bg-background rounded-lg shadow-sm overflow-hidden">
          <div className="h-1 flex"><div className="flex-1 bg-primary"></div><div className="flex-1 bg-secondary"></div></div>
          <button onClick={() => setCreditCardsOpen(!creditCardsOpen)} className="w-full flex items-center justify-between p-4">
            <h3 className="text-lg font-bold text-foreground">Credit Cards</h3>
            {creditCardsOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {creditCardsOpen && (
            <div className="border-t border-border">
              {credit.length === 0 && <p className="p-4 text-sm text-muted-foreground">No credit cards.</p>}
              {credit.map((a) => (
                <button key={a.id} onClick={() => navigate(`/account/${a.id}`)} className="w-full text-left p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">BANK OF AMERICA</p>
                      <p className="font-medium text-foreground">{a.account_name}</p>
                      <p className="text-foreground">Cash Rewards - {acctNumLabel(a)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={boaLogo} alt="Bank of America" className="w-8 h-8 object-contain" />
                      <div className="text-right"><p className="text-lg font-medium text-foreground">{fmt(a.balance)}</p></div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="bg-background rounded-lg shadow-sm overflow-hidden">
          <div className="h-1 flex"><div className="flex-1 bg-primary"></div><div className="flex-1 bg-secondary"></div></div>
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">Transaction History</h3>
            <p className="text-xs text-muted-foreground">Recent activity across all accounts</p>
          </div>
          {transactions.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <ul>
              {transactions.map((t, idx) => {
                const acct = accounts.find((a) => a.id === t.account_id);
                const isPending = t.status === "pending" && t.clears_at;
                const isCheck = t.display_style === "check_deposit";
                const dateLabel = new Date(t.transaction_date).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                });
                const amt = Number(t.amount);
                const amtAbs = Math.abs(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return (
                  <li key={t.id} className={`px-4 py-4 ${idx < transactions.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      {isCheck && (
                        <div className="shrink-0 mt-1">
                          <img src={checkIcon} alt="Check deposit" className="w-14 h-10 object-contain" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {isPending ? (
                          <p className="text-sm text-muted-foreground">Hold</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">{dateLabel}</p>
                        )}
                        <p className="font-bold text-foreground leading-snug whitespace-pre-line">
                          {isPending ? "Deposit Hold" : t.description}
                        </p>
                        {acct && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {acct.account_name} {acctNumLabel(acct)}
                          </p>
                        )}
                        {isPending && (
                          <p className="text-sm text-muted-foreground mt-1 leading-snug">
                            ${amtAbs} Total amount delayed, available{" "}
                            {new Date(t.clears_at as string).toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "America/Chicago" })}{" "}
                            at{" "}
                            {new Date(t.clears_at as string)
                              .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Chicago" })
                              .toLowerCase()}{" "}
                            CT
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-secondary">
                          {amt < 0 ? "-" : ""}${amtAbs}
                        </p>
                        {t.running_balance != null && (
                          <p className="text-xs text-muted-foreground mt-1">${Number(t.running_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-background border-t border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-around py-3 px-1 gap-1">
          <button className="flex flex-col items-center text-secondary min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full border-2 border-secondary flex items-center justify-center"><DollarSign className="w-4 h-4" /></div>
            <span className="text-[10px] sm:text-xs mt-1 font-medium truncate">Accounts</span>
          </button>
          <button onClick={() => navigate("/pay-transfer")} className="flex flex-col items-center text-muted-foreground hover:text-secondary min-w-0 flex-1">
            <RefreshCw className="w-6 h-6" />
            <span className="text-[10px] sm:text-xs mt-1 truncate">Transfer | Zelle®</span>
          </button>
          <button className="flex flex-col items-center text-muted-foreground min-w-0 flex-1">
            <Receipt className="w-6 h-6" />
            <span className="text-[10px] sm:text-xs mt-1 truncate">Bill Pay</span>
          </button>
          <button className="flex flex-col items-center text-muted-foreground min-w-0 flex-1">
            <Smartphone className="w-6 h-6" />
            <span className="text-[10px] sm:text-xs mt-1 truncate">Deposit Checks</span>
          </button>
          <button className="flex flex-col items-center text-muted-foreground min-w-0 flex-1">
            <TrendingUp className="w-6 h-6" />
            <span className="text-[10px] sm:text-xs mt-1 truncate">Invest</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
