import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings] = useState(false);
  const [authError] = useState(null);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      // If there's already a session (e.g. after a page refresh), use it
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Attempt anonymous sign-in so RLS authenticated-role policies apply.
        // If anonymous sign-ins are disabled in your Supabase project this fails
        // gracefully — the app still works because the DB has PUBLIC RLS policies
        // that allow the anon role to read and write all tables.
        await supabase.auth.signInAnonymously();
      }
    };
    initAuth();

    // Keep in sync with auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      if (u) {
        setUser({ id: u.id, email: u.email, full_name: u.user_metadata?.full_name ?? u.email });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    console.warn('navigateToLogin: no login page configured yet');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
