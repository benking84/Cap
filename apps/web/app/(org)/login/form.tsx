"use client";

import { getOrganization } from "@/actions/organization/get-organization";
import { trackEvent } from "@/app/utils/analytics";
import { NODE_ENV } from "@cap/env";
import { Button, Input, LogoBadge } from "@cap/ui";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import {
  faArrowLeft,
  faEnvelope,
  faExclamationCircle
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import Cookies from "js-cookie";
import { LucideArrowUpRight } from "lucide-react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/firebase/auth";

const MotionInput = motion(Input);
const MotionLogoBadge = motion(LogoBadge);
const MotionLink = motion(Link);
const MotionButton = motion(Button);

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [oauthError, setOauthError] = useState(false);
  const [showOrgInput, setShowOrgInput] = useState(false);
  const [organizationId, setOrganizationId] = useState("");
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const theme = Cookies.get("theme") || "light";

  useEffect(() => {
    theme === "dark"
      ? (document.body.className = "dark")
      : (document.body.className = "light");
    //remove the dark mode when we leave the dashboard
    return () => {
      document.body.className = "light";
    };
  }, [theme]);

  useEffect(() => {
    const error = searchParams?.get("error");
    const errorDesc = searchParams?.get("error_description");

    const handleErrors = () => {
      if (error === "OAuthAccountNotLinked" && !errorDesc) {
        setOauthError(true);
        return toast.error(
          "This email is already associated with a different sign-in method"
        );
      } else if (
        error === "profile_not_allowed_outside_organization" &&
        !errorDesc
      ) {
        return toast.error(
          "Your email domain is not authorized for SSO access. Please use your work email or contact your administrator."
        );
      } else if (error && errorDesc) {
        return toast.error(errorDesc);
      }
    };
    handleErrors();
  }, [searchParams]);

  // useEffect(() => {
  //   const pendingPriceId = localStorage.getItem("pendingPriceId");
  //   const pendingQuantity = localStorage.getItem("pendingQuantity") ?? "1";
    
  //   if (!emailSent || !pendingPriceId) return;
    
  //   // Clear the pending items immediately
  //   localStorage.removeItem("pendingPriceId");
  //   localStorage.removeItem("pendingQuantity");
    
  //   let mounted = true;

  //   const processSubscription = async () => {
  //     try {
  //       const response = await fetch(`/api/settings/billing/subscribe`, {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           priceId: pendingPriceId,
  //           quantity: parseInt(pendingQuantity),
  //         }),
  //       });

  //       if (!mounted) return;

  //       if (!response.ok) {
  //         throw new Error('Failed to process subscription');
  //       }

  //       const data = await response.json();
  //       console.log('Subscription data:', data);

  //       if (data?.url) {
  //         window.location.href = data.url;
  //       } else {
  //         // If no URL, redirect to dashboard
  //         window.location.href = next || '/dashboard';
  //       }
  //     } catch (error) {
  //       console.error('Error processing subscription:', error);
  //       // Redirect to dashboard on error to prevent loop
  //       window.location.href = next || '/dashboard';
  //     }
  //   };

  //   // Add a small delay to ensure the user is created
  //   const timer = setTimeout(processSubscription, 2000);

  //   return () => {
  //     mounted = false;
  //     clearTimeout(timer);
  //   };
  // }, [emailSent, next]); // Add next to dependencies

  const handleGoogleSignIn = async () => {
    trackEvent("Google Sign In Clicked", { location: "login" });
  
    try {
      setLoading(true);
      
      const result = await signInWithGoogle();
      // Get the ID token
      const idToken = await result.user.getIdToken();
      
      // Create the session cookie
      console.log('Creating session with ID token...');
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
        credentials: 'include',
      });
      
      console.log('Session response status:', sessionResponse.status);
      
      if (!sessionResponse.ok) {
        const error = await sessionResponse.json();
        console.error('Session creation failed:', error);
        throw new Error(error.error || 'Failed to create session');
      }
      
      const sessionData = await sessionResponse.json();
      console.log('Session created successfully:', sessionData);
      
      
      // Force a hard refresh to ensure all auth state is properly set
      const callbackUrl = next || '/dashboard';
      window.location.href = callbackUrl;
      
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };
  
  const handleFirebaseEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      let result;
      
      if (isSignUp) {
        result = await signUpWithEmail(email, password, name);
      } else {
        result = await signInWithEmail(email, password);
      }
      
      // Get the ID token
      const idToken = await result.user.getIdToken();
      
      // Create the session cookie
      console.log('Creating session with ID token...');
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
        credentials: 'include',
      });
      
      console.log('Session response status:', sessionResponse.status);
      
      if (!sessionResponse.ok) {
        const error = await sessionResponse.json();
        console.error('Session creation failed:', error);
        throw new Error(error.error || 'Failed to create session');
      }
      
      const sessionData = await sessionResponse.json();
      console.log('Session created successfully:', sessionData);
      
      
      // Force a hard refresh to ensure all auth state is properly set
      const callbackUrl = next || '/dashboard';
      window.location.href = callbackUrl;
      
    } catch (error: any) {
      console.error('Error during authentication:', error);
      toast.error(error.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  const handleOrganizationLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast.error("Please enter an organization ID");
      return;
    }

    try {
      const data = await getOrganization(organizationId);
      setOrganizationName(data.name);

      signIn("workos", undefined, {
        organization: data.organizationId,
        connection: data.connectionId,
      });
    } catch (error) {
      console.error("Lookup Error:", error);
      toast.error("Organization not found or SSO not configured");
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="mb-12 flex w-full justify-center">
          <MotionLogoBadge
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="h-10 w-auto"
          />
        </div>

        <motion.div
          layout
          className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-lg"
        >
          <motion.div layout className="space-y-6">
            <motion.div layout className="space-y-2 text-center">
              <motion.h1
                layout
                className="text-2xl font-bold text-foreground"
              >
                {isSignUp ? 'Create an account' : 'Welcome back'}
              </motion.h1>
              <motion.p
                layout
                className="text-sm text-muted-foreground"
              >
                {isSignUp
                  ? 'Enter your details to create an account'
                  : 'Enter your credentials to sign in to your account'}
              </motion.p>
            </motion.div>

            

            <AnimatePresence mode="wait">
                <form
                  onSubmit={handleFirebaseEmailSignIn}
                  className="flex flex-col space-y-3"
                >
                  <NormalLogin
                    setShowOrgInput={setShowOrgInput}
                    email={email}
                    emailSent={emailSent}
                    setEmail={setEmail}
                    loading={loading}
                    oauthError={oauthError}
                    handleGoogleSignIn={handleGoogleSignIn}
                  />
                </form>
            </AnimatePresence>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faGoogle} className="h-4 w-4" />
                <span>Continue with Google</span>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

const LoginWithSSO = ({
  handleOrganizationLookup,
  organizationId,
  setOrganizationId,
  organizationName,
}: {
  handleOrganizationLookup: (e: React.FormEvent) => void;
  organizationId: string;
  setOrganizationId: (organizationId: string) => void;
  organizationName: string | null;
}) => {
  return (
    <motion.form layout onSubmit={handleOrganizationLookup} className="relative space-y-2">
      <MotionInput
        id="organizationId"
        placeholder="Enter your Organization ID..."
        value={organizationId}
        onChange={(e) => setOrganizationId(e.target.value)}
        className="w-full max-w-full"
      />
      {organizationName && (
        <p className="text-sm text-muted-foreground">
          Signing in to: {organizationName}
        </p>
      )}
      <div>
        <Button type="submit" variant="dark" className="w-full max-w-full">
          Continue with SSO
        </Button>
      </div>
    </motion.form>
  );
};

const NormalLogin = ({
  setShowOrgInput,
  email,
  emailSent,
  setEmail,
  loading,
  oauthError,
  handleGoogleSignIn,
}: {
  setShowOrgInput: (show: boolean) => void;
  email: string;
  emailSent: boolean;
  setEmail: (email: string) => void;
  loading: boolean;
  oauthError: boolean;
  handleGoogleSignIn: () => void;
}) => {
  return (
    <motion.div>
      <motion.div layout className="flex flex-col space-y-3">
        <MotionInput
          id="email"
          name="email"
          autoFocus
          type="email"
          placeholder={emailSent ? "" : "tim@apple.com"}
          autoComplete="email"
          required
          value={email}
          disabled={emailSent || loading}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <MotionButton
          variant="primary"
          type="submit"
          disabled={loading || emailSent}
          icon={<FontAwesomeIcon className="mr-1 size-4" icon={faEnvelope} />}
        >
          {emailSent
            ? NODE_ENV === "development"
              ? "Email sent to your terminal"
              : "Email sent to your inbox"
            : "Login with email"}
        </MotionButton>
        {/* {NODE_ENV === "development" && (
                  <div className="flex justify-center items-center px-6 py-3 mt-3 bg-red-600 rounded-xl">
                    <p className="text-lg text-white">
                      <span className="font-medium text-white">
                        Development mode:
                      </span>{" "}
                      Auth URL will be logged to your dev console.
                    </p>
                  </div>
                )} */}
      </motion.div>
      <div className="flex gap-4 items-center my-4">
        <span className="flex-1 h-px bg-border" />
        <p className="text-sm text-center text-muted-foreground">OR</p>
        <span className="flex-1 h-px bg-border" />
      </div>
      <motion.div layout className="flex flex-col gap-3 justify-center items-center">
        {!oauthError && (
          <>
            <MotionButton
              variant="outline"
              type="button"
              className="flex gap-2 justify-center items-center w-full text-sm"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <Image src="/google.svg" alt="Google" width={16} height={16} />
              Login with Google
            </MotionButton>
          </>
        )}

        {oauthError && (
          <div className="flex gap-3 items-center p-3 bg-red-400 rounded-xl border border-red-600">
            <FontAwesomeIcon
              className="text-gray-50 size-8"
              icon={faExclamationCircle}
            />
            <p className="text-xs leading-5 text-gray-50">
              It looks like you've previously used this email to sign up via
              email login. Please enter your email below to receive a sign in
              link.
            </p>
          </div>
        )}
        <MotionButton
          variant="gray"
          type="button"
          className="w-full"
          layout
          onClick={() => setShowOrgInput(true)}
          disabled={loading}
        >
          <LucideArrowUpRight size={20} />
          Login with SAML SSO
        </MotionButton>
      </motion.div>
    </motion.div>
  );
};
