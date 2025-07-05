import { SignUp } from "@clerk/nextjs";
import Image from "next/image";

export default function SignUpPage() {
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
          <p className="text-gray-600">Join the PAX AI Client Portal</p>
        </div>

        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
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
              footer: "border-t border-gray-100 pt-4 mt-6",
              footerAction: "text-center",
              footerActionText: "text-sm text-gray-600",
            },
          }}
        />
      </div>
    </div>
  );
}
