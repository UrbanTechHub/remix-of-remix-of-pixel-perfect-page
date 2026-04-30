import { supabase } from "@/integrations/supabase/client";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const verifyWithToken = async (accessToken: string) => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-admin`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (response.status === 401) {
    return false;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not verify admin access");
  }

  const data = await response.json();
  return Boolean(data?.isAdmin);
};

const verifyWithSession = async () => {
  const { data, error } = await supabase.functions.invoke("verify-admin", { body: {} });

  if (error) {
    const message = error.message || "Could not verify admin access";
    if (message.includes("401")) {
      return false;
    }
    throw error;
  }

  return Boolean(data?.isAdmin);
};

export const verifyAdminAccess = async (accessToken?: string | null) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return accessToken ? await verifyWithToken(accessToken) : await verifyWithSession();
    } catch (error) {
      if (attempt === 4) {
        throw error;
      }
      await wait(500 * (attempt + 1));
    }
  }

  return false;
};