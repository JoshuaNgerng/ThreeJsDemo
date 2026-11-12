import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./auth/AuthProvider";
import { DataGate } from "./components/DataGate";
import { AuthGate } from "./components/AuthGate";
import { GOOGLE_AUTH_CONFIG, GOOGLE_SHEETS_CONFIG } from "./config/google-sheet";
import App from "./App";
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_AUTH_CONFIG.clientId}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGate>
            <DataGate>
              <App />
            </DataGate>
          </AuthGate>
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);
