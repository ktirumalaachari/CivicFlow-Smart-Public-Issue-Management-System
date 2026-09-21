import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Lock, User, Phone, Layers, ArrowLeft, ArrowRight, Briefcase, UserCheck, Shield, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface RegisterProps {
  onRegisterSuccess: (token: string, user: any) => void;
}

export default function Register({ onRegisterSuccess }: RegisterProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'Citizen' | 'Officer'>('Citizen');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Signup Flow detection
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [googleId, setGoogleId] = useState('');
  const [googleAvatar, setGoogleAvatar] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_signup') === 'true') {
      setIsGoogleSignup(true);
      setName(params.get('name') || '');
      setEmail(params.get('email') || '');
      setGoogleId(params.get('googleId') || '');
      setGoogleAvatar(params.get('avatar') || '');
      toast.success('Google authenticated! Please select your role below to complete registration.', { duration: 6000 });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !role) {
      toast.error('All asterisked fields are required.');
      return;
    }

    if (!isGoogleSignup) {
      if (!password || !confirmPassword) {
        toast.error('Password fields are required.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Confirm password does not match original password.');
        return;
      }
    }

    if (role === 'Officer' && !department) {
      toast.error('Department selection is required for Officers.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name,
        email,
        phone,
        role,
        department: role === 'Officer' ? department : null
      };

      if (isGoogleSignup) {
        payload.googleId = googleId;
        payload.avatar = googleAvatar;
      } else {
        payload.password = password;
      }

      const response = await axios.post('/api/auth/register', payload);

      if (role === 'Officer') {
        toast.success('Registration submitted! Awaiting administrator approval.', { duration: 6000 });
      } else {
        toast.success('Registration successful! Welcome aboard.');
      }
      onRegisterSuccess(response.data.token, response.data.user);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const triggerGoogleSignIn = () => {
    const width = 550;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    console.log('[CivicFlow] Opening Google OAuth popup from Register page...');
      const authUrl = `${window.location.origin}/auth/google?role=${role}`;    const popup = window.open(
      authUrl,
      'CivicFlowGoogleOAuth',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      toast('Popup blocked. Redirecting to Google Sign-In directly...', { icon: '⚠️', duration: 4000 });
      window.location.href = authUrl;
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 font-sans" id="register_page">
      {/* Left side branding */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-12 text-white flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="flex items-center space-x-3 z-10">
          <div className="p-2 bg-blue-600 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg text-white leading-none">CivicFlow</h1>
            <p className="text-[10px] text-blue-300 font-mono tracking-widest uppercase">Issue System</p>
          </div>
        </div>

        <div className="my-auto space-y-4 z-10">
          {isGoogleSignup ? (
            <>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                <Sparkles className="w-3 h-3 mr-1 text-yellow-400" /> Google Account Linked
              </div>
              <h2 className="text-3xl font-bold tracking-tight leading-tight">Complete Google Signup</h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
                You are authenticated via Google. Select your municipal role to establish your secure ledger dashboard.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold tracking-tight leading-tight">Create your CivicFlow account</h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
                Join the digital platform to file public issues, view resolving progress logs, and collaborate directly with verified municipal engineers.
              </p>
            </>
          )}
        </div>

        <div className="text-xs text-slate-400 font-mono z-10">
          CivicFlow Public Core v1.4.0 &middot; Secure registration
        </div>
      </div>

      {/* Right side form */}
      <div className="lg:col-span-7 flex flex-col justify-center px-4 sm:px-12 md:px-20 lg:px-24 py-12 overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-6">
          {/* Header */}
          <div>
            <a href="/" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-all mb-4">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </a>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isGoogleSignup ? 'Choose Account Role' : 'Register an Account'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Select your role first, then fill out the remaining details below.
            </p>
          </div>

          {/* Role selection screen BEFORE completing registration */}
          <div className="space-y-2" id="role_selection_screen">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">1. Select Account Role *</label>
            <div className="grid grid-cols-2 gap-3">
              {/* Citizen Card */}
              <button
                type="button"
                onClick={() => setRole('Citizen')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-32 ${
                  role === 'Citizen'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
                id="role_card_citizen"
              >
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 self-start">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Citizen Account</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Instant access. File complaints and track resolution.</p>
                </div>
              </button>

              {/* Officer Card */}
              <button
                type="button"
                onClick={() => setRole('Officer')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-32 ${
                  role === 'Officer'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
                id="role_card_officer"
              >
                <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 self-start">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Department Officer</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Requires admin authorization approval before login.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Form fields */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Anil Kumar"
                  className="w-full border border-slate-200 rounded-lg py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="email"
                  required
                  disabled={isGoogleSignup}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anil.kumar@example.com"
                  className="w-full border border-slate-200 rounded-lg py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full border border-slate-200 rounded-lg py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Conditional Department Select for Officers */}
            {role === 'Officer' && (
              <div className="space-y-1 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl animate-fade-in my-3">
                <label className="text-xs font-bold text-indigo-900 block flex items-center mb-1">
                  <Briefcase className="w-3.5 h-3.5 mr-1" /> Office Department *
                </label>
                <select
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select Government Department...</option>
                  <option value="Road">Roads & Transport Department</option>
                  <option value="Water">Water Works & Sewage Division</option>
                  <option value="Electricity">Electricity Board & Lighting</option>
                  <option value="Sanitation">Sanitation & Public Health</option>
                  <option value="Waste">Solid Waste Management Services</option>
                  <option value="Traffic">Traffic Regulation & Management</option>
                  <option value="Health">Community Health & Medicine</option>
                </select>
              </div>
            )}

            {/* Hide Passwords for Google Signup */}
            {!isGoogleSignup && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="&bull;&bull;&bull;&bull;&bull;&bull;"
                      className="w-full border border-slate-200 rounded-lg py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="&bull;&bull;&bull;&bull;&bull;&bull;"
                      className="w-full border border-slate-200 rounded-lg py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {role === 'Officer' && (
              <p className="text-[11px] text-slate-500 leading-normal italic pt-1">
                Note: Registering as an officer submits your profile as PENDING. You will not be able to log in until an administrator authorizes your account.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center space-x-1.5 active:scale-98 disabled:opacity-50 mt-4"
              id="btn_submit_registration"
            >
              <span>{role === 'Officer' ? 'Submit Officer Application' : 'Create Citizen Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Google Register option (only show when not already in Google Signup flow) */}
          {!isGoogleSignup && (
            <>
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[10px] uppercase tracking-wider font-semibold font-mono">Or Register with Google</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                onClick={triggerGoogleSignIn}
                disabled={loading}
                type="button"
                className="w-full flex items-center justify-center space-x-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm py-2 px-4 rounded-lg shadow-2xs transition-all active:scale-98 disabled:opacity-50"
                id="btn_google_register"
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
            </>
          )}

          <p className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
            Already have an account?{' '}
            <a href="/" className="font-semibold text-blue-600 hover:text-blue-700" id="link_signin">
              Sign in Instead
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
