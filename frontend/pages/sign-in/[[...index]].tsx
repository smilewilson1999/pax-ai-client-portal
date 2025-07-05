import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/router";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const redirectUrl = router.query.redirect_url as string;

  // if user is signed in, redirect to the redirectUrl
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const targetUrl = redirectUrl || "/";
      router.replace(targetUrl);
    }
  }, [isLoaded, isSignedIn, router, redirectUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/pax-logo.svg"
            alt="PAX Logo"
            width={80}
            height={40}
            className="object-contain mx-auto mb-4"
          />
          <p className="text-gray-600">Sign in to your PAX AI Client Portal</p>
        </div>

        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          forceRedirectUrl={redirectUrl || "/"}
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl border-0 rounded-md",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton:
                "border border-gray-200 hover:border-gray-300",
              formButtonPrimary:
                "bg-purple-600 hover:bg-purple-700 text-sm normal-case",
              footerActionLink: "text-purple-600 hover:text-purple-700",
            },
          }}
        />
      </div>
    </div>
  );
}
