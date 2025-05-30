"use client";

import { useState } from "react";
import { signIn} from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";

export function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await signIn("google", {
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.error) {
        toast.error("Authentication Error", {
          description: "Failed to sign in with Google. Please try again.",
        });
      } else if (result?.ok) {
        toast.success("Welcome!", {
          description: "Successfully signed in with Google.",
        });
      }
    } catch {
      toast.error("Something went wrong", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
          <Icons.logo className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to CRM Platform
        </CardTitle>
        <CardDescription className="text-gray-600">
          Sign in to access your customer relationship management dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full h-12 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
          variant="outline"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.google className="mr-2 h-5 w-5" />
          )}
          Continue with Google
        </Button>

        <div className="text-xs text-center text-gray-500 space-y-2">
          <p>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
          <div className="flex items-center justify-center space-x-4 text-blue-600">
            <a href="#" className="hover:underline">
              Terms
            </a>
            <span className="text-gray-300">•</span>
            <a href="#" className="hover:underline">
              Privacy
            </a>
            <span className="text-gray-300">•</span>
            <a href="#" className="hover:underline">
              Support
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
