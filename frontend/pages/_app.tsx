import { Provider } from "jotai";
import { useEffect, useState } from "react";
import { StagewiseToolbar } from "@stagewise/toolbar-react";
import { ReactPlugin } from "@stagewise-plugins/react";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import type { AppProps } from "next/app";
import "../styles/globals.css";
import { neobrutalism } from "@clerk/themes";

export default function App({ Component, pageProps }: AppProps) {
  const [showToolbar, setShowToolbar] = useState(false);

  useEffect(() => {
    // Only initialize toolbar once and only in development
    if (process.env.NODE_ENV === "development") {
      setShowToolbar(true);
    }
  }, []);

  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      appearance={{ baseTheme: [neobrutalism] }}
    >
      <Provider>
        {showToolbar && (
          <StagewiseToolbar
            config={{
              plugins: [ReactPlugin],
            }}
          />
        )}
        <Component {...pageProps} />
        <Toaster />
      </Provider>
    </ClerkProvider>
  );
}
