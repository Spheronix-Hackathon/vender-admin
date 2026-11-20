'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const checkAuth = async () => {
      if (isLoginPage) {
        setIsAuthenticated(false);
        return;
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      if (!token) {
        setIsAuthenticated(false);
        router.replace('/login');
        return;
      }
      
      try {
        await api.get('/auth/me');
        setIsAuthenticated(true);
      } catch (error: any) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
        }
        setIsAuthenticated(false);
        router.replace('/login');
      }
    };
    
    checkAuth();
  }, [pathname, isLoginPage]);

  // Show nothing while determining auth status
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f5f5f7]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007aff]" />
      </div>
    );
  }

  // Login page — render without sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Not authenticated — redirect handled in useEffect
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f5f5f7]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007aff]" />
      </div>
    );
  }

  // Authenticated — render full layout
  return (
    <div className="flex bg-[#f5f5f7] min-h-screen relative">
      <Sidebar />
      <main
        className="flex-1 transition-all duration-300 ease-in-out"
        style={{
          marginLeft: 'var(--sidebar-width)',
          padding: 'var(--main-padding)',
          minWidth: 0,
        }}
      >
        <div className="max-w-[1600px] mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
