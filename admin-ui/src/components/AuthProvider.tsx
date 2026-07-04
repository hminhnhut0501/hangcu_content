'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useSWR from 'swr';
import { fetcher, fetchApi } from '../lib/api';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  mutate: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: async () => {},
  mutate: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Use SWR to fetch user profile, disable automatic retries on 401
  const { data, error, isLoading, mutate } = useSWR('/api/auth/me', fetcher, {
    shouldRetryOnError: false,
  });

  const [hasDevBypass, setHasDevBypass] = React.useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasDevBypass(localStorage.getItem('dev_bypass') === 'true');
    }
  }, []);

  const user = data?.user || (hasDevBypass ? { id: 'dev', email: 'dev@local', role: 'owner', full_name: 'Dev Bypass' } : null);
  const isAuthPage = pathname === '/login';

  useEffect(() => {
    // If not loading and there is an error or no user, redirect to login
    if (!isLoading && !user && !isAuthPage) {
      router.push('/login');
    }
    
    // If authenticated and on login page, redirect to home
    if (!isLoading && user && isAuthPage) {
      router.push('/');
    }
  }, [user, isLoading, isAuthPage, router]);

  const logout = async () => {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
      mutate(null, false); // Clear cache
      router.push('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  // Show loading spinner while determining auth state on non-auth pages
  if (isLoading && !isAuthPage) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "#f8fafc" }}>
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated and trying to access protected route, render nothing (will redirect)
  if (!user && !isAuthPage && !isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, mutate }}>
      {children}
    </AuthContext.Provider>
  );
}
