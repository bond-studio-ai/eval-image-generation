import { SignIn } from '@clerk/nextjs';
import '../sign-in-page.css';

export default function SignInPage() {
  return (
    <div className="auth-sign-in-page flex min-h-screen items-center justify-center bg-gray-50">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            footer: '!hidden',
            formFooter: '!hidden',
            footerAction: '!hidden',
            footerActionLink: '!hidden',
          },
        }}
        fallbackRedirectUrl="/"
      />
    </div>
  );
}
