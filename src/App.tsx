/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Home, Users, Landmark, LogOut, Sparkles, BookOpen, User, Phone, CheckCircle, HelpCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { HomeDashboard } from './components/HomeDashboard';
import { TuitionPage } from './components/TuitionPage';
import { FeesPage } from './components/FeesPage';
import { WeeklySchedule } from './components/WeeklySchedule';
import { dbService } from './db';
import { Tuition, SessionLog, SessionAdjustment, Payment } from './types';

// The Shell layout that displays when authenticated
const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'tuition' | 'fees' | 'weekly'>('home');
  
  // Storage State Datasets
  const [tuitions, setTuitions] = useState<Tuition[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [adjustments, setAdjustments] = useState<SessionAdjustment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Toast States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Helper trigger to show custom toast alerts
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync / query local system database
  const loadDatabase = async () => {
    if (!user) return;
    try {
      const ts = await dbService.getTuitions(user.id);
      const logs = await dbService.getSessionLogs();
      const adjs = await dbService.getSessionAdjustments();
      const pays = await dbService.getPayments();

      setTuitions(ts);
      setSessionLogs(logs);
      setAdjustments(adjs);
      setPayments(pays);
    } catch (e) {
      console.error('Error loading collections', e);
      showToast('Error syncing with database', 'error');
    }
  };

  useEffect(() => {
    loadDatabase();
  }, [user]);

  // If user is unauthenticated, redirect them directly to secure Auth Login forms
  if (!user) {
    return <AuthScreen showToast={showToast} />;
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-gray-800 flex flex-col md:flex-row relative">
      
      {/* Toast Alert Notice overlay */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className={`px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-white font-extrabold text-sm ${
            toast.type === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
          }`}>
            <CheckCircle size={16} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 1. DESKTOP PERMANENT LEFT SIDEBAR */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-[#E5E7EB] flex-col justify-between sticky top-0 h-screen z-25 p-5">
        <div className="space-y-6">
          {/* Logo brand design header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2563EB] text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-100">
              <BookOpen size={20} className="fill-blue-100/20" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 tracking-tight leading-none text-base">Tuition Diary</h2>
              <span className="text-[9px] font-black tracking-widest text-[#2563EB] uppercase">Tutor OS v1.0</span>
            </div>
          </div>

          {/* Navigation link items */}
          <nav className="space-y-1.5 pt-4">
            <button
              onClick={() => setActiveTab('home')}
              id="sidebar-tab-home"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                activeTab === 'home' || activeTab === 'weekly'
                  ? 'bg-[#EEF2FF] text-[#2563EB]'
                  : 'text-gray-500 hover:bg-gray-50/80 hover:text-gray-800'
              }`}
            >
              <Home size={18} />
              <span>Home Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('tuition')}
              id="sidebar-tab-tuition"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                activeTab === 'tuition'
                  ? 'bg-[#EEF2FF] text-[#2563EB]'
                  : 'text-gray-500 hover:bg-gray-50/80 hover:text-gray-800'
              }`}
            >
              <Users size={18} />
              <span>Tuitions Batches</span>
            </button>

            <button
              onClick={() => setActiveTab('fees')}
              id="sidebar-tab-fees"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                activeTab === 'fees'
                  ? 'bg-[#EEF2FF] text-[#2563EB]'
                  : 'text-gray-500 hover:bg-gray-50/80 hover:text-gray-800'
              }`}
            >
              <Landmark size={18} />
              <span>Fees & Collection</span>
            </button>
          </nav>
        </div>

        {/* User context footer */}
        <div className="border-t border-[#E5E7EB] pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-sm uppercase">
              {user.fullName.charAt(0)}
            </div>
            <div className="truncate max-w-[120px]">
              <p className="text-xs font-extrabold text-gray-800 truncate">{user.fullName}</p>
              <p className="text-[10px] text-gray-400 font-medium truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              showToast('Logged out securely', 'success');
            }}
            id="btn-sidebar-logout"
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl font-bold text-xs transition-all cursor-pointer border border-red-100"
          >
            <LogOut size={14} />
            <span>Log Out Account</span>
          </button>
        </div>
      </aside>

      {/* 2. CORE VIEW CONTENTS */}
      <main className="flex-1 min-h-screen overflow-x-hidden md:max-w-5xl">
        {activeTab === 'home' && (
          <HomeDashboard
            tuitions={tuitions}
            sessionLogs={sessionLogs}
            adjustments={adjustments}
            refreshData={loadDatabase}
            onNavigateToWeekly={() => setActiveTab('weekly')}
            showToast={showToast}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklySchedule
            tuitions={tuitions}
            sessionLogs={sessionLogs}
            adjustments={adjustments}
            onBack={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'tuition' && (
          <TuitionPage
            tuitions={tuitions}
            sessionLogs={sessionLogs}
            payments={payments}
            refreshData={loadDatabase}
            showToast={showToast}
          />
        )}

        {activeTab === 'fees' && (
          <FeesPage
            tuitions={tuitions}
            payments={payments}
            refreshData={loadDatabase}
            showToast={showToast}
          />
        )}
      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION TAB BAR */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E5E7EB] items-center justify-around z-35 px-2 pb-safe shadow-lg" id="mobile-nav-bar">
        <button
          onClick={() => setActiveTab('home')}
          id="btn-nav-home"
          className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-colors ${
            activeTab === 'home' || activeTab === 'weekly' ? 'text-blue-600 font-black scale-105' : 'text-gray-400'
          }`}
        >
          <Home size={18} />
          <span className="text-[10px] font-bold mt-1">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('tuition')}
          id="btn-nav-tuition"
          className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-colors ${
            activeTab === 'tuition' ? 'text-blue-600 font-black scale-105' : 'text-gray-400'
          }`}
        >
          <Users size={18} />
          <span className="text-[10px] font-bold mt-1">Tuition</span>
        </button>

        <button
          onClick={() => setActiveTab('fees')}
          id="btn-nav-fees"
          className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-colors ${
            activeTab === 'fees' ? 'text-blue-600 font-black scale-105' : 'text-gray-400'
          }`}
        >
          <Landmark size={18} />
          <span className="text-[10px] font-bold mt-1">Fees</span>
        </button>
        
        <button
          onClick={() => {
            logout();
            showToast('Logged out securely', 'success');
          }}
          id="btn-nav-logout"
          className="flex flex-col items-center justify-center p-1 cursor-pointer text-red-500/80 hover:text-red-600 transition-colors"
        >
          <LogOut size={17} />
          <span className="text-[10px] font-bold mt-1">Logout</span>
        </button>
      </nav>
      
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
