import type { ReactNode } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../auth/AuthContext";

export function AuthGate({ children }: { children: ReactNode }) {
  const { signedIn, error, signIn, fail } = useAuth();

  if (!signedIn) {
    return (
      <div className="screen">
        <h2>Sign in</h2>
        <p>Sign in with Google to view the data.</p>
        <GoogleLogin
          onSuccess={() => signIn()}
          onError={fail}
          theme="filled_black"
        />
        {error && <p>{error}</p>}
      </div>
    );
  }

  return <>{children}</>;
}
