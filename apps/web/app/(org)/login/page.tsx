"use client";

import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { LoginForm } from "./form";
import { useAuthContext } from "@/app/Layout/AuthContext";

export default function LoginPage() {
  const { loading, initialized } = useAuthContext();

  // Show loading state while checking auth or redirecting
  if (loading || !initialized) {
    return (
      <div className="flex justify-center items-center w-full h-screen bg-gray-2">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If we get here, we're initialized and have no user - show the login form
  return (
    <div className="relative flex justify-center items-center w-full min-h-screen bg-gray-2">
      <div className="absolute top-10 left-10">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-gray-12 hover:opacity-75 transition-opacity"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>
      <LoginForm />
    </div>
  );
}
