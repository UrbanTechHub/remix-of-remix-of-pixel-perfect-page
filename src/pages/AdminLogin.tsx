import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import { verifyAdminAccess } from "@/lib/adminAuth";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@mail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Try to ensure admin user exists on first load
  useEffect(() => {
    supabase.functions.invoke("seed-admin").catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const isAdmin = await verifyAdminAccess(signInData.session.access_token);

      if (!isAdmin) {
        await supabase.auth.signOut();
        toast({ title: "Access denied", description: "Not an admin account.", variant: "destructive" });
        return;
      }
      toast({ title: "Welcome admin" });
      navigate("/admin");
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-admin");
      if (error) throw error;
      toast({ title: "Admin ready", description: data?.message || "Admin seeded" });
     } catch (e: any) {
      toast({ title: "Seed failed", description: e?.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background rounded-lg shadow-lg border border-border p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary text-primary-foreground p-3 rounded-full">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
            <p className="text-sm text-muted-foreground">Bank of America</p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label>Admin Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground h-11">
            {loading ? "Signing in..." : "Sign In as Admin"}
          </Button>
          <Button type="button" variant="ghost" disabled={seeding} onClick={handleSeed} className="w-full text-xs">
            {seeding ? "Setting up..." : "Initialize admin account (first time)"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
