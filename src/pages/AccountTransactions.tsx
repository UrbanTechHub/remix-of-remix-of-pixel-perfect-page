import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Mail, ShoppingCart, LogOut, ChevronDown, Info, DollarSign, Smartphone, Receipt, TrendingUp, RefreshCw } from "lucide-react";
import boaLogo from "@/assets/boa-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Account {
  id: string;
  account_type: string;
  account_name: string;
  account_number: string;
  balance: number;
  available_balance: number;
}

interface Transaction {
  id: string;
  account_id: string;
  description: string;
  amount: number;
  transaction_date: string;
  status?: string;
  clears_at?: string | null;
}

const AccountTransactions = () => {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const { user, loading, signOut } = useAuth();

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const load = async () => {
    if (!accountId) return;
    const [{ data: acct }, { data: txs }] = await Promise.all([
      supabase.from("accounts").select("*").eq("id", accountId).maybeSingle(),
      supabase
        .from("transactions")
        .select("*")
        .eq("account_id", accountId)
        .order("transaction_date", { ascending: false })
        .limit(100),
    ]);
    setAccount(acct as Account | null);
    setTransactions((txs || []) as Transaction[]);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/");
      return;
    }
    void load();
  }, [user, loading, accountId]);

  useEffect(() => {
    if (!user || !accountId) return;
    const ch = supabase
      .channel(`acct-tx-${accountId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `account_id=eq.${accountId}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts", filter: `id=eq.${accountId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user?.id, accountId]);

  const fmt = (n: number) => {
    const v = Number(n);
    const sign = v < 0 ? "-" : "";
    return `${sign}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const acctNumLabel = account?.account_number?.replace("xxxx", "") ?? "";
  const accountTitle = useMemo(() => {
    if (!account) return "";
    return `${(account.account_name || account.account_type).toUpperCase()} - ${acctNumLabel}`;
  }, [account, acctNumLabel]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Compute running balance after each transaction (most recent first).
  // Latest row's "after" balance equals current account balance.
  const rowsWithRunning = useMemo(() => {
    if (!account) return [] as Array<Transaction & { runningAfter: number }>;
    let running = Number(account.balance);
    const out: Array<Transaction & { runningAfter: number }> = [];
    for (const t of transactions) {
      const after = running;
      out.push({ ...t, runningAfter: after });
      running = running - Number(t.amount);
    }
    return out;
  }, [transactions, account]);

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Top bar */}
      <div className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-3 sm:px-4 py-3 gap-2">
          <button onClick={() => navigate(-1)} className="flex items-center text-foreground shrink-0" aria-label="Back">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 sm:gap-6">
            <img src={boaLogo} alt="Bank of America" className="w-8 h-8 object-contain" />
            <button className="flex flex-col items-center text-foreground">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs mt-1">Inbox</span>
            </button>
            <button className="flex flex-col items-center text-foreground">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs mt-1">Products</span>
            </button>
            <button onClick={handleLogout} className="flex flex-col items-center text-foreground">
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs mt-1">Log out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl w-full mx-auto p-4 space-y-4">
        {/* Header card */}
        <div className="bg-background rounded-lg shadow-sm">
          <div className="flex items-start justify-between p-4 pb-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{accountTitle || "Account"}</h1>
            <button className="text-secondary font-medium text-sm uppercase tracking-wide hover:underline">
              Edit
            </button>
          </div>
          <div className="px-4 pb-6 text-center">
            <p className="text-3xl sm:text-4xl font-bold text-foreground">
              {account ? fmt(account.balance) : "—"}
            </p>
            <div className="mt-2 flex items-center justify-center gap-1 text-muted-foreground text-sm">
              <span>Available balance</span>
              <Info className="w-4 h-4 text-secondary" />
            </div>
          </div>

          <button className="w-full flex items-center justify-between border-t border-border px-4 py-3 text-foreground">
            <span>Account &amp; Routing #</span>
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Recent transactions */}
        <div className="bg-background rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Recent transactions</p>
          </div>

          {rowsWithRunning.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <ul>
              {rowsWithRunning.map((t, idx) => {
                const positive = Number(t.amount) >= 0;
                const isPending = t.status === "pending" && t.clears_at;
                const dateLabel = new Date(t.transaction_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                return (
                  <li
                    key={t.id}
                    className={`px-4 py-4 ${idx < rowsWithRunning.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isPending ? (
                          <p className="text-sm text-muted-foreground">Hold</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">{dateLabel}</p>
                        )}
                        <p className="font-bold text-foreground leading-snug">
                          {isPending ? "Deposit Hold" : t.description}
                        </p>
                        {isPending && (
                          <p className="text-sm text-muted-foreground mt-1 leading-snug">
                            {fmt(Math.abs(Number(t.amount)))} Total amount delayed, available{" "}
                            {new Date(t.clears_at as string).toLocaleDateString("en-US", {
                              month: "numeric",
                              day: "numeric",
                              timeZone: "America/Chicago",
                            })}{" "}
                            at{" "}
                            {new Date(t.clears_at as string)
                              .toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                                timeZone: "America/Chicago",
                              })
                              .toLowerCase()}{" "}
                            CT
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold ${positive ? "text-secondary" : "text-secondary"}`}>
                          {positive ? "" : "-"}${Math.abs(Number(t.amount)).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{fmt(t.runningAfter)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="bg-background border-t border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-around py-3 px-1 gap-1">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex flex-col items-center text-secondary min-w-0 flex-1"
          >
            <div className="w-8 h-8 rounded-full border-2 border-secondary flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-[10px] sm:text-xs mt-1 font-medium truncate">Accounts</span>
          </button>
          <button
            onClick={() => navigate("/pay-transfer")}
            className="flex flex-col items-center text-muted-foreground hover:text-secondary min-w-0 flex-1"
          >
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

export default AccountTransactions;