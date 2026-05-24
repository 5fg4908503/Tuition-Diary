/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Phone, Lock, User, Key, Check, Sliders, Milestone, BookOpen, Smartphone, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthScreenProps {
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ showToast }) => {
  const { loginWithEmail, loginWithPhone, loginWithGoogle, register } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'login-email' | 'login-phone' | 'register'>('login-email');
  const [loading, setLoading] = useState(false);
  const [showProviderAlert, setShowProviderAlert] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const success = await loginWithGoogle();
      if (success) {
        showToast('Successfully authenticated with Google!', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Google authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Form Field States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');

  // 1. Email Login Handler
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Please enter both email and password', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setLoading(true);
    try {
      const success = await loginWithEmail(email, password);
      if (success) {
        showToast('Successfully logged in!', 'success');
      }
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed' || err?.message?.includes('not enabled') || err?.message?.includes('operation-not-allowed')) {
        setShowProviderAlert(true);
        showToast('Provider not enabled. Please use Google Sign-In or follow configuration guide.', 'error');
      } else {
        showToast(err?.message || 'Authentication failed. Please verify credentials.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Phone OTP Login Handler
  const handlePhoneOTPRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      showToast('Please enter a valid phone number', 'error');
      return;
    }
    
    setLoading(true);
    // Simulate OTP trigger
    await new Promise(resolve => setTimeout(resolve, 800));
    setShowOtpField(true);
    setLoading(false);
    showToast('Demo OTP Code "123456" sent to your device!', 'success');
  };

  const handlePhoneOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== '123456') {
      showToast('Invalid verification OTP code. Use "123456" for demo.', 'error');
      return;
    }

    setLoading(true);
    try {
      const success = await loginWithPhone(phoneNumber, otpCode);
      if (success) {
        showToast('Successfully logged in via Phone OTP!', 'success');
      }
    } catch (err) {
      showToast('OTP verification failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 3. Register Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim() || !registerEmail.trim() || !registerPhone.trim()) {
      showToast('Please fill out all registration fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const success = await register(registerName, registerEmail, registerPhone);
      if (success) {
        showToast('Account registered successfully! Welcome.', 'success');
      }
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed' || err?.message?.includes('not enabled') || err?.message?.includes('operation-not-allowed')) {
        setShowProviderAlert(true);
        showToast('Provider not enabled. Please use Google Sign-In or follow configuration guide.', 'error');
      } else {
        showToast(err?.message || 'Registration failed.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F6F7F9] min-h-screen flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        {/* Visual Brand Icon */}
        <div className="w-16 h-16 bg-[#2563EB] text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-blue-100">
          <BookOpen size={32} className="fill-blue-100/20" />
        </div>
        
        <h2 className="text-3xl font-black tracking-tight text-gray-900">
          Tuition Diary
        </h2>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest max-w-xs mx-auto">
          Private tuition management software for educators
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-[#E5E7EB] shadow-2xl rounded-[32px] sm:px-10 Space-y-6">
          
          {/* Official Google Sign-In button */}
          <div className="space-y-4 mb-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 rounded-2xl text-sm font-extrabold text-gray-700 shadow-3xs cursor-pointer transition-all"
              id="btn-login-google"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" stroke="none" />
              </svg>
              <span>Continue securely with Google</span>
            </button>
            
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest">
              <span className="h-px bg-gray-200 flex-1"></span>
              <span className="px-3 text-center">or credentials login</span>
              <span className="h-px bg-gray-200 flex-1"></span>
            </div>
          </div>

          {showProviderAlert && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-left space-y-3 shadow-3xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-black text-amber-800">Email/Password Login Disabled</h4>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    The Email &amp; Password sign-in method is currently disabled in your Firebase project authentication settings.
                  </p>
                </div>
              </div>
              
              <div className="bg-white/80 p-3 rounded-xl border border-amber-100 text-xs text-amber-700 space-y-2 font-medium">
                <p className="font-bold text-amber-900">How to fix this:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Open your Firebase Console: <a href="https://console.firebase.google.com/project/turing-bulwark-jcf5x/authentication/providers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5">Authentication Settings <ExternalLink size={12} /></a></li>
                  <li>Click <strong>Add new provider</strong> and choose <strong>Email/Password</strong>.</li>
                  <li>Enable it and save.</li>
                </ol>
                <p className="pt-1 text-[11px] text-amber-600 font-bold">
                  Alternatively, you can skip configuration and hit <span className="text-blue-600">"Continue securely with Google"</span> above, which is already set up and enabled!
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => setShowProviderAlert(false)}
                className="w-full py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Acknowledge &amp; Dismiss
              </button>
            </div>
          )}

          {/* Navigation Tab controls */}
          <div className="flex bg-[#F6F7F9] p-1 rounded-2xl border border-[#E5E7EB] mb-6">
            <button
              onClick={() => {
                setActiveTab('login-email');
                setShowOtpField(false);
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                activeTab === 'login-email' ? 'bg-white text-blue-600 shadow-3xs' : 'text-gray-500'
              }`}
            >
              Email Login
            </button>
            <button
              onClick={() => {
                setActiveTab('login-phone');
                setShowOtpField(false);
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                activeTab === 'login-phone' ? 'bg-white text-blue-600 shadow-3xs' : 'text-gray-500'
              }`}
            >
              Phone OTP
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setShowOtpField(false);
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                activeTab === 'register' ? 'bg-white text-blue-600 shadow-3xs' : 'text-gray-500'
              }`}
            >
              Register
            </button>
          </div>

          {/* Form Content */}
          {activeTab === 'login-email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ar4908503@gmail.com"
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] pl-11 p-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-50500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] pl-11 p-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-4 bg-[#2563EB] hover:bg-blue-700 text-white rounded-2xl font-bold text-sm cursor-pointer transition-colors shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                  id="btn-login-email-submit"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Sign In to Tuition Diary</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'login-phone' && (
            <form onSubmit={showOtpField ? handlePhoneOTPVerify : handlePhoneOTPRequest} className="space-y-4">
              {!showOtpField ? (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. +8801712345678"
                      className="w-full bg-[#FFF7EE] border border-[#E5E7EB] pl-11 p-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">OTP Verification Code</label>
                  <p className="text-[10px] text-amber-600 font-bold mb-1.5">For demo review: please enter '123456'.</p>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter the 6-digit OTP"
                      className="w-full bg-[#FFF7EE] border border-[#E5E7EB] pl-11 p-3.5 rounded-2xl text-sm font-mono tracking-widest text-center text-lg font-black focus:outline-none focus:border-blue-500"
                      required
                      maxLength={6}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm cursor-pointer transition-colors shadow-lg shadow-blue-100 flex items-center justify-center"
                  id="btn-login-phone-submit"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>{showOtpField ? 'Verify OTP & Log In' : 'Request verification OTP'}</span>
                  )}
                </button>
              </div>

              {showOtpField && (
                <button
                  type="button"
                  onClick={() => setShowOtpField(false)}
                  className="text-center font-bold text-xs text-gray-400 block mx-auto hover:text-gray-600 mt-2"
                >
                  Change phone number
                </button>
              )}
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="e.g. Tanvir Rahman"
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] pl-11 p-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="e.g. ar4908503@gmail.com"
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] pl-11 p-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    placeholder="e.g. +8801712345678"
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] pl-11 p-3.5 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm cursor-pointer transition-colors shadow-lg shadow-blue-100 flex items-center justify-center"
                  id="btn-register-submit"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Create Free Tutor Account</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Assist credentials notice */}
          <div className="mt-6 pt-5 border-t border-[#E5E7EB] text-center">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider flex items-center justify-center gap-1">
              <ShieldCheck size={14} className="text-green-500" />
              <span>100% Secure Sandbox Environment</span>
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
