// auth/AuthProvider.tsx
import { useState, type ReactNode } from "react";
import { googleLogout } from "@react-oauth/google";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = () => { setSignedIn(true); setError(null); };
  const fail = () => setError("Google sign-in failed. Please try again.");
  const signOut = () => { googleLogout(); setSignedIn(false); };

  return (
    <AuthContext.Provider value={{ signedIn, error, signIn, fail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}