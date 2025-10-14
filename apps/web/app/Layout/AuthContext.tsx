"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged, type User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  initialized?: boolean;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  loading: true,
  signOut: async () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Avoid forced refresh to prevent repeated calls to securetoken API
          await user.getIdToken();
          setUser(user);
        } catch (error) {
          console.error('Error getting token:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      setInitialized(true);
    });
    
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    loading,
    signOut,
    initialized,
  };

  

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
