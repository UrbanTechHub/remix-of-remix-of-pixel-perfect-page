// Lightweight transfer state shared across the Pay & Transfer flow.
// Uses sessionStorage so refreshes inside the flow keep working but
// nothing leaks between sessions.

export type TransferType = "domestic" | "international" | "wire";

export interface TransferDraft {
  type: TransferType;
  fields: Record<string, string>;
  amount: string;
  currency?: string;
  email: string; // recipient email for OTP confirmation (the user's own email)
  fromAccountId?: string;
  fromAccountLabel?: string;
}

const KEY = "pendingTransfer";

export const saveTransferDraft = (d: TransferDraft) => {
  sessionStorage.setItem(KEY, JSON.stringify(d));
};

export const loadTransferDraft = (): TransferDraft | null => {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearTransferDraft = () => {
  sessionStorage.removeItem(KEY);
};

const PIN_KEY = "transferPin";
const EMAIL_KEY = "userEmail";

export const setUserPin = (pin: string) => localStorage.setItem(PIN_KEY, pin);
export const getUserPin = () => localStorage.getItem(PIN_KEY);
export const hasUserPin = () => Boolean(localStorage.getItem(PIN_KEY));

export const setUserEmail = (email: string) => localStorage.setItem(EMAIL_KEY, email);
export const getUserEmail = () => localStorage.getItem(EMAIL_KEY) || "";
