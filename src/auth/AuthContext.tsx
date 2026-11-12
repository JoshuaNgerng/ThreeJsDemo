import { createContext, useContext } from "react";


export interface AuthState {
  signedIn: boolean;
  error: string | null;
  signIn: () => void;
  fail: () => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
