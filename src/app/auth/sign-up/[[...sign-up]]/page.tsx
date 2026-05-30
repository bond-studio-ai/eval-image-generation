import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign Up" };

export default function SignUpPage() {
  return (
    <div className="bg-surface-muted flex min-h-screen items-center justify-center">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto"
          }
        }}
        fallbackRedirectUrl="/"
        signInUrl="/auth/sign-in"
      />
    </div>
  );
}
