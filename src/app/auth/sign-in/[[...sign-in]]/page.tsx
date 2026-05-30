import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import "../sign-in-page.css";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to the image generation evaluation console."
};

export default function SignInPage() {
  return (
    <div className="auth-sign-in-page bg-surface-muted flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            footer: "!hidden",
            formFooter: "!hidden",
            footerAction: "!hidden",
            footerActionLink: "!hidden"
          }
        }}
        fallbackRedirectUrl="/"
      />
    </div>
  );
}
