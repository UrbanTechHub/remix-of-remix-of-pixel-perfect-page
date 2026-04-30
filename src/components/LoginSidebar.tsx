import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { setUserEmail } from "@/lib/transferState";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const LoginSidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Sign-up dialog state
  const [signupOpen, setSignupOpen] = useState(false);
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suName, setSuName] = useState("");
  const [suLoading, setSuLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Missing Information", description: "Enter email and password", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      setUserEmail(email.trim());
      // Send OTP
      const { data } = await supabase.functions.invoke("send-otp", {
        body: { email: email.trim(), purpose: "login" },
      });
      if (data?.emailSent) {
        toast({ title: "Verification code sent", description: `We sent a 6-digit code to ${email.trim()}.` });
      } else {
        toast({
          title: "Verification code (demo)",
          description: `Email isn't fully configured yet. Code: ${data?.devCode}`,
          duration: 12000,
        });
      }
      navigate("/otp", { state: { email: email.trim(), purpose: "login" } });
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err?.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suEmail.trim() || !suPassword.trim() || suPassword.length < 6) {
      toast({ title: "Invalid info", description: "Email + password (min 6) required", variant: "destructive" });
      return;
    }
    setSuLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email: suEmail.trim(),
        password: suPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: suName.trim() || suEmail.split("@")[0] },
        },
      });
      if (error) throw error;
      toast({ title: "Account created", description: "You can now log in with your credentials." });
      setEmail(suEmail.trim());
      setSignupOpen(false);
      setSuEmail(""); setSuPassword(""); setSuName("");
    } catch (err: any) {
      toast({ title: "Signup failed", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setSuLoading(false);
    }
  };

  return (
    <div className="w-full lg:w-80 flex-shrink-0">
      <form onSubmit={handleLogin} className="bg-primary p-6 rounded-sm">
        <div className="space-y-4">
          <Input
            type="email"
            placeholder="Email / Online ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-background border-0 h-12 text-foreground placeholder:text-muted-foreground"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-background border-0 h-12 text-foreground placeholder:text-muted-foreground"
          />

          <div className="flex items-center gap-2">
            <Checkbox id="saveId" className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary" />
            <label htmlFor="saveId" className="text-sm text-primary-foreground">
              Save Online ID
            </label>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            variant="outline"
            className="w-full h-12 border-primary-foreground text-primary-foreground bg-transparent hover:bg-primary-foreground hover:text-primary font-medium text-base"
          >
            {isLoading ? "Signing in..." : "Log In"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <a href="#" className="text-primary-foreground hover:underline">
              Forgot ID/Password?
            </a>
          </div>

          <div className="flex items-center justify-between text-sm">
            <a href="#" className="text-primary-foreground hover:underline">
              Security & Help
            </a>
            <button
              type="button"
              onClick={() => setSignupOpen(true)}
              className="text-primary-foreground hover:underline"
            >
              Enroll
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSignupOpen(true)}
            className="block w-full text-center text-primary-foreground hover:underline text-sm"
          >
            Open an Account
          </button>
        </div>
      </form>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
        <a href="#" className="flex items-center gap-3 bg-secondary text-secondary-foreground p-4 rounded-sm hover:bg-bank-blue-light transition-colors">
          <MapPin className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Find your closest financial center or ATM</span>
        </a>
        <a href="#" className="flex items-center gap-3 bg-secondary text-secondary-foreground p-4 rounded-sm hover:bg-bank-blue-light transition-colors">
          <Calendar className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Schedule an Appointment</span>
        </a>
      </div>

      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open an Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSignup} className="space-y-4 pt-2">
            <div>
              <Label>Full Name</Label>
              <Input value={suName} onChange={(e) => setSuName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Password (min 6 characters)</Label>
              <Input type="password" value={suPassword} onChange={(e) => setSuPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={suLoading} className="w-full bg-primary text-primary-foreground">
              {suLoading ? "Creating..." : "Create Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginSidebar;
