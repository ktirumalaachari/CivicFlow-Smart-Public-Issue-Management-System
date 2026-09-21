import React, { useState } from 'react';
import axios from 'axios';
import { Layers, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [role, setRole] = useState("Citizen");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'Citizen' | 'Officer' | 'Administrator'>('Citizen');

  const handleGoogleSignIn = () => {
    window.location.href = `${window.location.origin}/auth/google`;
};

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 font-sans bg-slate-50" id="login_page">
      {/* LEFT PANEL: Branding & Visuals (Corporate Blue & Deep Slate) */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-12 text-white flex-col justify-between relative overflow-hidden">
        {/* Subtle abstract geometric grids */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="flex items-center space-x-3 z-10">
          <div className="p-2 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-xl tracking-tight leading-none">CivicFlow</h1>
            <p className="text-[10px] text-blue-300 font-mono tracking-widest uppercase">Issue System</p>
          </div>
        </div>

        {/* Visual mock presentation */}
        <div className="my-auto space-y-6 z-10">
          <h2 className="text-3xl font-bold tracking-tight leading-tight">
            Seamless Municipal & Civic Collaboration Engine
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
            Empowering citizens to report public issues instantly, enabling officers to collaborate with speed, 
            and equipping administrators with real-time analytics to drive community excellence.
          </p>

          <div className="pt-4 border-t border-blue-700/60 flex items-center space-x-3 text-xs text-blue-200">
            <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
            <span>GDPR Secure, Multi-Role Governance Certified</span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono z-10">
          CivicFlow Public Core v1.4.0 &middot; Built on modern full-stack standards
        </div>
      </div>

      {/* RIGHT PANEL: Professional Login Form */}
      <div className="lg:col-span-7 flex flex-col justify-center px-4 sm:px-12 md:px-20 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto space-y-8">
          {/* Header */}
          <div>
            <div className="flex lg:hidden items-center space-x-2 mb-6">
              <Layers className="w-8 h-8 text-blue-600" id="logo_mobile" />
              <span className="font-sans font-bold text-xl text-slate-900">CivicFlow AI</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight" id="login_heading">Sign in to your account</h2>
            <p className="text-sm text-slate-500 mt-2">
              CivicFlow AI uses Google OAuth for secure single sign-on. Please select your desired role to authenticate.
            </p>
          </div>

          {/* Role selector dropdown */}
          <div className="space-y-2">
            <label htmlFor="role_selector" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Login As
            </label>
            <div className="relative">
              <select
                id="role_selector"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full h-11 px-4 pr-10 border border-slate-300 bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm text-slate-800 font-semibold transition-all appearance-none cursor-pointer focus:outline-none"
              >
                <option value="Citizen">Citizen</option>
                <option value="Officer">Officer</option>
                <option value="Administrator">Administrator</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Google Sign In Button */}
          <div className="space-y-4 pt-2">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              type="button"
              className="w-full flex items-center justify-center space-x-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm py-3 px-4 rounded-lg shadow-2xs transition-all active:scale-98 disabled:opacity-50"
              id="btn_google_signin"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 2.99c.9-2.7 3.4-4.51 6.76-4.51z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.46h6.49c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.69-4.91 3.69-8.56z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.24 14.23c-.23-.69-.35-1.42-.35-2.18 0-.76.12-1.49.35-2.18L1.39 6.88C.5 8.65 0 10.62 0 12.7c0 2.08.5 4.05 1.39 5.82l3.85-2.99z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.02.68-2.33 1.09-3.96 1.09-3.36 0-5.86-1.81-6.76-4.51l-3.85 2.99C3.37 20.35 7.35 23 12 23z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Secure Instruction Grid */}
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-xs space-y-2 text-slate-600" id="role_instructions">
            <h4 className="font-bold text-blue-900 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1 text-blue-600 shrink-0" />
              Access & Governance Protocols:
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
              <li>
                <strong>Citizens:</strong> Auto-registers you with a Citizen portal immediately upon signing in if your account does not exist.
              </li>
              <li>
                <strong>Officers & Administrators:</strong> Accounts must be created and managed strictly by the Administrator. Once registered, selecting your respective role and signing in with your corresponding Google email allows secure access.
              </li>
            </ul>
          </div>

          {/* Portal link */}
          <div className="text-center pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Want to check public logs without login?{' '}
              <a href="/transparency" className="font-semibold text-slate-700 hover:text-slate-950 underline" id="link_transparency">
                Open Transparency Portal
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
