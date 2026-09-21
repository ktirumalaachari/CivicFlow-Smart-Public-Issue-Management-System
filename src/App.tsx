import React, { useState, useEffect, Suspense, lazy } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import CivicBot from './components/CivicBot.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { SkeletonLoader } from './components/common/SkeletonLoader.tsx';
import apiClient from './api/axios.ts';

const Login = lazy(() => import('./pages/Login.tsx'));
const Register = lazy(() => import('./pages/Register.tsx'));
const CitizenDashboard = lazy(() => import('./pages/CitizenDashboard.tsx'));
const OfficerDashboard = lazy(() => import('./pages/OfficerDashboard.tsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.tsx'));
const TransparencyPortal = lazy(() => import('./pages/TransparencyPortal.tsx'));

export default function App() {
  // Authentication & session variables
  const [token, setToken] = useState<string | null>(localStorage.getItem('civicflow_token'));
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State-based router (transparency, login, register, dashboard)
  const [currentPath, setCurrentPath] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token');
    const googleSignup = params.get('google_signup');

    if (googleSignup === 'true') {
      window.history.pushState({}, '', `/register?${params.toString()}`);
      setCurrentPath('/register');
      setLoading(false);
      return;
    }
    
    if (queryToken) {
      console.log('[CivicFlow] Detected session token in URL params. Setting active session...');
      localStorage.setItem('civicflow_token', queryToken);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${queryToken}`;
      setToken(queryToken);
      
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
      return;
    }

    const path = window.location.pathname;
    setCurrentPath(path);

    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Listen for message events from a successful OAuth popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token) {
        console.log('[CivicFlow] Received successful OAuth postMessage from popup.');
        toast.success('Google authentication verified successfully.');
        handleLoginSuccess(event.data.token, event.data.user);
      } else if (event.data?.type === 'OAUTH_REGISTRATION_REQUIRED') {
        console.log('[CivicFlow] Received OAUTH_REGISTRATION_REQUIRED from popup.');
        const { email, name, googleId, avatar } = event.data;
        const queryParams = new URLSearchParams({
          google_signup: 'true',
          email: email || '',
          name: name || '',
          googleId: googleId || '',
          avatar: avatar || ''
        });
        window.history.pushState({}, '', `/register?${queryParams.toString()}`);
        setCurrentPath('/register');
      } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
        toast.error(event.data.error || 'Google Sign-In failed.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      setUser(response.data.user);
    } catch (err) {
      console.warn('Session token expired or DB unreachable. Clearing credentials.');
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (newToken: string, loggedUser: any) => {
    localStorage.setItem('civicflow_token', newToken);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(loggedUser);
    setCurrentPath('/');
  };

  const handleRegisterSuccess = (newToken: string, registeredUser: any) => {
    localStorage.setItem('civicflow_token', newToken);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(registeredUser);
    setCurrentPath('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('civicflow_token');
    delete apiClient.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setCurrentPath('/');
    toast.success('Signed out securely.');
  };

  // Helper to intercept href navigations for single-page state routing
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    
    // Intercept standard clicks to avoid full page reloads and maintain deep-linking
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.getAttribute('href')?.startsWith('/')) {
        e.preventDefault();
        const href = anchor.getAttribute('href') || '/';
        window.history.pushState({}, '', href);
        setCurrentPath(href);
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      document.removeEventListener('click', handleAnchorClick);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center p-8 font-sans w-full max-w-7xl mx-auto">
        <SkeletonLoader type="dashboard" />
      </div>
    );
  }

  // Public Transparency Portal (Available directly without authentication)
  if (currentPath === '/transparency') {
    return (
      <ErrorBoundary>
        <Toaster position="top-right" reverseOrder={false} />
        <Suspense fallback={<div className="p-8 max-w-7xl mx-auto"><SkeletonLoader type="dashboard" /></div>}>
          <TransparencyPortal />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Redirect unauthenticated traffic to Registration or Login
  if (!user) {
    if (currentPath === '/register') {
      return (
        <ErrorBoundary>
          <Toaster position="top-right" reverseOrder={false} />
          <Suspense fallback={<div className="p-8 max-w-7xl mx-auto"><SkeletonLoader type="dashboard" /></div>}>
            <Register onRegisterSuccess={handleRegisterSuccess} />
          </Suspense>
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
        <Toaster position="top-right" reverseOrder={false} />
        <Suspense fallback={<div className="p-8 max-w-7xl mx-auto"><SkeletonLoader type="dashboard" /></div>}>
          <Login onLoginSuccess={handleLoginSuccess} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Authenticated Role Routing & Status Screens
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {user.status === 'PENDING' ? (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" id="pending_screen">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200">
              <svg className="w-8 h-8 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Officer Registration Pending</h2>
              <p className="text-sm text-slate-500">
                Your officer registration is awaiting administrator approval.
              </p>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg font-mono">
              Role: Officer &middot; Status: PENDING
            </p>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm py-2 px-4 rounded-lg transition-all"
            >
              Sign Out Securely
            </button>
          </div>
        </div>
      ) : user.status === 'REJECTED' ? (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" id="rejected_screen">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-200">
              <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Registration Rejected</h2>
              <p className="text-sm text-slate-500">
                Your officer registration was rejected.
              </p>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg font-mono">
              Role: Officer &middot; Status: REJECTED
            </p>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm py-2 px-4 rounded-lg transition-all"
            >
              Sign Out Securely
            </button>
          </div>
        </div>
      ) : user.status === 'SUSPENDED' ? (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" id="suspended_screen">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-200">
              <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-8V11m0 0a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Account Suspended</h2>
              <p className="text-sm text-slate-500">
                Access denied. Your account has been suspended.
              </p>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg font-mono">
              Status: SUSPENDED
            </p>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm py-2 px-4 rounded-lg transition-all"
            >
              Sign Out Securely
            </button>
          </div>
        </div>
      ) : (
        <ErrorBoundary>
          <Suspense fallback={<div className="p-8 max-w-7xl mx-auto"><SkeletonLoader type="dashboard" /></div>}>
            {user.role === 'Citizen' && <CitizenDashboard user={user} onLogout={handleLogout} />}
            {user.role === 'Officer' && <OfficerDashboard user={user} onLogout={handleLogout} />}
            {(user.role === 'Administrator' || user.role === 'ADMIN') && <AdminDashboard user={user} onLogout={handleLogout} />}
          </Suspense>
        </ErrorBoundary>
      )}
      <CivicBot user={user} />
    </>
  );
}
