import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { verifyAdminAccess } from "@/lib/adminAuth";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getAdminStatus = async (userId: string) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await verifyAdminAccess();
    } catch (error) {
      if (attempt < 2) {
        await wait(500 * (attempt + 1));
      } else {
        console.error("Failed to load admin role", { userId, error });
      }
    }
  }

  return false;
};

interface AuthCtx {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const syncAuthState = async (sess: Session | null) => {
      if (!active) return;

      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(true);

      if (!sess?.user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const admin = await getAdminStatus(sess.user.id);
      if (!active) return;

      setIsAdmin(admin);
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      void syncAuthState(sess);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      void syncAuthState(s);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, user, isAdmin, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
