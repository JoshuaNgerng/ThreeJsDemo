import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";

export function AuthGate({ children }: { children: ReactNode }) {
  const { signedIn, error, signIn } = useAuth();

  if (!signedIn) {
    return (
      <div className="screen">
        <h2>Sign in</h2>
        <p>Sign in with Google to view the data.</p>
        {error && <p>{error}</p>}
        <button onClick={() => signIn()}>Sign in with Google</button>
      </div>
    );
  }
  return <>{children}</>;
}