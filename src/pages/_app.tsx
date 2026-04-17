import "@/styles/globals.css";
import type { AppProps } from "next/app";
import AppShell from "@/components/layouts/AppShell";
import { SessionProvider } from "next-auth/react";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}: AppProps) {
  // halaman tanpa layout
  const noLayout = ["/auth/login"];
  const isNoLayout = noLayout.includes(router.pathname);

  return (
    <SessionProvider session={session}>
      {isNoLayout ? (
        <Component {...pageProps} />
      ) : (
        <AppShell>
          <Component {...pageProps} />
        </AppShell>
      )}
    </SessionProvider>
  );
}