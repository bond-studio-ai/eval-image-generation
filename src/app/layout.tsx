import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { QueryProvider } from "@/components/query-provider";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToasterProvider } from "@/components/ui/toaster";
import { isLocalAuthBypassEnabled } from "@/lib/local-auth-bypass";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const clerkLocalization = {
  signIn: {
    start: {
      title: "Access AI Image Eval",
      subtitle: "Sign in to continue"
    }
  }
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#2563eb",
    colorText: "#111827",
    colorTextSecondary: "#4b5563",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#111827",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif"
  },
  elements: {
    formButtonPrimary: "bg-primary-600 hover:bg-primary-700 text-text-inverse shadow-xs rounded-button",
    card: "shadow-card border border-border rounded-card"
  }
};

export const metadata: Metadata = {
  title: "AI Image Eval",
  description: "Quality assurance and testing platform for evaluating AI image generation results"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const localAuthBypass = isLocalAuthBypassEnabled();
  const app = (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} bg-bg-app text-text-primary antialiased`}>
        <QueryProvider>
          <ToasterProvider>
            <ConfirmProvider>
              <AppShell localAuthBypass={localAuthBypass}>{children}</AppShell>
            </ConfirmProvider>
          </ToasterProvider>
        </QueryProvider>
      </body>
    </html>
  );

  return localAuthBypass ? app : <ClerkProvider localization={clerkLocalization} appearance={clerkAppearance}>{app}</ClerkProvider>;
}
