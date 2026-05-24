/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Calendar, Plus, Clock, ChevronRight, AlertTriangle, BookOpen, Edit2, Check, Sparkles, Menu, Moon, Sun, Info, LogOut, User, X } from 'lucide-react';
import { Tuition, SessionLog, SessionAdjustment } from '../types';
import { useAuth } from '../context/AuthContext';
import { dbService, formatDate } from '../db';
import { resolveSessionsForDate, calculateTimeLeft, convertTimeToMinutes } from '../utils';

interface HomeDashboardProps {
  tuitions: Tuition[];
  sessionLogs: SessionLog[];
  adjustments: SessionAdjustment[];
  refreshData: () => void;
  onNavigateToWeekly: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  tuitions,
  sessionLogs,
  adjustments,
  refreshData,
  onNavigateToWeekly,
  showToast
}) => {
  const { user, updateProfile, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(user?.fullName || '');

  // Check dark mode state on mount
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Update localStorage and document class when changed
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);
  
  // Completed/Cancelled simple notes states
  const [activeLogAction, setActiveLogAction] = useState<{ session: any; status: 'completed' | 'cancelled' } | null>(null);
  const [logNote, setLogNote] = useState('');

  // Adjustment Modal States
  const [adjustingSession, setAdjustingSession] = useState<any | null>(null);
  const [adjDate, setAdjDate] = useState(formatDate(new Date('2026-05-24')));
  const [adjStartTime, setAdjStartTime] = useState('10:00 AM');
  const [adjEndTime, setAdjEndTime] = useState('11:00 AM');
  const [adjNote, setAdjNote] = useState('');

  // System Date is Sun, May 24, 2026
  const getSystemDate = () => {
    return new Date('2026-05-24T10:14:18Z');
  };

  // 1. Calculate dynamic greeting based on system local hour
  useEffect(() => {
    const sysDate = getSystemDate();
    const hr = sysDate.getHours();
    
    if (hr >= 5 && hr < 12) {
      setGreeting('Good Morning');
    } else if (hr >= 12 && hr < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  // Update classes list whenever tuitions, logs, or adjustments change
  useEffect(() => {
    const sysDate = getSystemDate();
    const resolved = resolveSessionsForDate(sysDate, tuitions, sessionLogs, adjustments);
    setTodayClasses(resolved);
  }, [tuitions, sessionLogs, adjustments]);

  // Handle Mark Done or Cancel with optional comment
  const handleOpenLogModal = (session: any, status: 'completed' | 'cancelled') => {
    setActiveLogAction({ session, status });
    setLogNote('');
  };

  const handleSaveLog = async () => {
    if (!activeLogAction) return;
    const { session, status } = activeLogAction;

    try {
      await dbService.addSessionLog({
        tuitionId: session.tuitionId,
        date: session.date,
        originalStartTime: session.startTime,
        originalEndTime: session.endTime,
        actualStartTime: session.startTime,
        actualEndTime: session.endTime,
        status,
        note: logNote
      });

      showToast(`Class session marked as ${status === 'completed' ? 'completed successfully' : 'cancelled'}.`, 'success');
      refreshData();
    } catch (e) {
      showToast('Error saving status.', 'error');
    } finally {
      setActiveLogAction(null);
    }
  };

  // Handle Adjust Request
  const handleOpenAdjustment = (session: any) => {
    // Check if adjustment has already been applied for this session
    // Rules: Applies ONLY once per session.
    const alreadyAdjusted = adjustments.some(adj => adj.tuitionId === session.tuitionId && adj.sessionDate === session.date);
    if (alreadyAdjusted) {
      showToast('This session has already been adjusted. You can only adjust a session once.', 'error');
      return;
    }

    setAdjustingSession(session);
    setAdjDate(session.date);
    setAdjStartTime(session.startTime);
    setAdjEndTime(session.endTime);
    setAdjNote('');
  };

  const handleSaveAdjustment = async () => {
    if (!adjustingSession) return;

    // Validate times
    const startMins = convertTimeToMinutes(adjStartTime);
    const endMins = convertTimeToMinutes(adjEndTime);

    if (endMins <= startMins) {
      showToast('End time must be later than the start time.', 'error');
      return;
    }

    // Protect against duplicate adjustments (Just in case)
    const alreadyAdjusted = adjustments.some(adj => adj.tuitionId === adjustingSession.tuitionId && adj.sessionDate === adjustingSession.date);
    if (alreadyAdjusted) {
      showToast('This session is already adjusted once.', 'error');
      return;
    }

    // Overlap checking on target date
    const targetDate = new Date(adjDate + 'T00:00:00');
    const existingSessionsForTargetDate = resolveSessionsForDate(targetDate, tuitions, sessionLogs, adjustments);

    const isOverlap = existingSessionsForTargetDate.some(s => {
      // Skip the self if matching
      if (s.tuitionId === adjustingSession.tuitionId && s.date === adjDate) return false;

      const sStart = convertTimeToMinutes(s.startTime);
      const sEnd = convertTimeToMinutes(s.endTime);

      // Check if candidate starts during existing OR ends during existing
      const overlap = (startMins >= sStart && startMins < sEnd) ||
                      (endMins > sStart && endMins <= sEnd) ||
                      (startMins <= sStart && endMins >= sEnd);
      return overlap;
    });

    if (isOverlap) {
      showToast('Schedule overlap detected! Another class is scheduled during this time on that date.', 'error');
      return;
    }

    try {
      await dbService.addSessionAdjustment({
        tuitionId: adjustingSession.tuitionId,
        sessionDate: adjustingSession.date,
        adjustedDate: adjDate,
        adjustedStartTime: adjStartTime,
        adjustedEndTime: adjEndTime,
        note: adjNote,
        usedAdjustment: true
      });

      showToast('Class adjusted successfully.', 'success');
      refreshData();
    } catch (e) {
      showToast('Error creating adjustment.', 'error');
    } finally {
      setAdjustingSession(null);
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    try {
      await updateProfile(profileName, user?.phone || '');
      showToast('Profile updated!', 'success');
      setShowProfileModal(false);
    } catch (err) {
      showToast('Failed to save profile', 'error');
    }
  };

  return (
    <div className="bg-[#F6F7F9] min-h-screen pb-24 md:pb-8">
      {/* Banner / Greeting Area */}
      <div className="bg-white px-4 pt-6 pb-4 border-b border-[#E5E7EB] sticky top-0 z-10 shadow-3xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dashboard</span>
          <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            Tuition Diary
            <Sparkles size={18} className="text-amber-500 fill-amber-300" />
          </h1>
        </div>
        <button
          onClick={() => setIsMenuOpen(true)}
          className="p-2 ml-auto cursor-pointer rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-705 text-gray-700 dark:text-gray-300 transition-all shadow-3xs"
          id="btn-hamburger-menu"
          aria-label="Open Menu"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 md:max-w-4xl space-y-6">
        {/* Good Morning Teacher Banner Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-xs relative overflow-hidden flex items-center gap-4">
          {/* Avatar Area */}
          <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
            <svg viewBox="0 0 40 40" className="w-12 h-12 text-blue-600">
              <path fill="currentColor" d="M20 20c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 4c-5.333 0-16 2.682-16 8v4h32v-4c0-5.318-10.667-8-16-8z" />
            </svg>
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
              {greeting},
            </h2>
            <p className="text-lg font-bold text-gray-700 mt-1">
              Teacher <span className="border-b-2 border-dashed border-blue-500 text-blue-600 font-extrabold px-1">{user?.fullName || '_______'}</span>
            </p>
          </div>

          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-60 z-0"></div>
        </div>

        {/* Schedule Section */}
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-gray-800 text-lg uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600" />
            <span>Today's Schedule</span>
          </h3>
          <button
            onClick={onNavigateToWeekly}
            className="text-xs font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 group transition-colors"
            id="btn-see-all-weekly"
          >
            <span>see all</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Classes List */}
        {todayClasses.length === 0 ? (
          <div className="bg-[#FFF7EE] rounded-3xl p-8 border border-amber-100 text-center flex flex-col items-center justify-center shadow-xs">
            <Clock size={44} className="text-amber-500/80 mb-3" />
            <p className="font-extrabold text-[#1F2937] text-base">No scheduled classes today</p>
            <p className="text-sm text-gray-500 mt-1">Take some rest or review weekly logs using "see all"!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayClasses.map((session, idx) => {
              const remainsStr = calculateTimeLeft(session.endTime);
              const isSessionAdjusted = adjustments.some(adj => adj.tuitionId === session.tuitionId && adj.sessionDate === session.date);

              return (
                <div
                  key={session.id}
                  id={`today-session-card-${idx}`}
                  className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs overflow-hidden flex flex-col divide-y divide-[#E5E7EB]"
                >
                  <div className="p-5 flex gap-4">
                    {/* Time Side Container */}
                    <div className="text-center shrink-0 pr-4 border-r border-[#E5E7EB] flex flex-col justify-center min-w-[90px]">
                      <span className="font-extrabold text-gray-800 text-sm">{session.startTime}</span>
                      <div className="h-4 w-[2px] bg-gray-200 mx-auto my-1"></div>
                      <span className="font-extrabold text-gray-400 text-xs">{session.endTime}</span>
                    </div>

                    {/* Class Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full tracking-wider ${
                          session.tuition.type === 'group'
                            ? 'bg-[#E0ECFF] text-[#2563EB]'
                            : 'bg-[#E6F8EF] text-[#15803D]'
                        }`}>
                          {session.tuition.type === 'group' ? 'Group Batch' : 'Single Student'}
                        </span>

                        {isSessionAdjusted && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full">
                            Adjusted
                          </span>
                        )}

                        {session.status !== 'pending' && (
                          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            session.status === 'completed' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEE2E2] text-[#DC2626]'
                          }`}>
                            {session.status}
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-[#1F2937] text-base leading-tight">
                        {session.tuition.tuitionName}
                      </h4>
                      
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mt-1">
                        <Clock size={12} className="text-gray-400" />
                        <span>{remainsStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  {session.status === 'pending' ? (
                    <div className="grid grid-cols-3 divide-x divide-[#E5E7EB] bg-gray-50/50">
                      <button
                        onClick={() => handleOpenLogModal(session, 'completed')}
                        id={`btn-done-${idx}`}
                        className="py-3 text-sm font-bold text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle size={16} />
                        <span>Done</span>
                      </button>
                      <button
                        onClick={() => handleOpenLogModal(session, 'cancelled')}
                        id={`btn-cancel-${idx}`}
                        className="py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle size={16} />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={() => handleOpenAdjustment(session)}
                        id={`btn-adjust-${idx}`}
                        className="py-3 text-sm font-bold text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Calendar size={16} />
                        <span>Adjust</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50/50 text-center text-xs text-gray-500 font-bold flex items-center justify-center gap-1">
                      <Check size={14} className={session.status === 'completed' ? 'text-green-600' : 'text-red-500'} />
                      <span>Session marked as {session.status}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note Popup Modal (Mark Completed / Cancelled) */}
      {activeLogAction && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm sm:max-w-md p-6 shadow-2xl border border-gray-100 animate-slide-up">
            <h3 className="font-extrabold text-lg text-gray-800">
              Mark Class Session as {activeLogAction.status === 'completed' ? 'Completed' : 'Cancelled'}?
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Write an optional note or comment about this session for attendance logs.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Note (Optional)</label>
              <textarea
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                placeholder={activeLogAction.status === 'completed' ? "e.g. Completed topic: Physics Motion laws" : "e.g. Tutor unwell / Stormy weather"}
                className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-24 font-medium"
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={() => setActiveLogAction(null)}
                className="py-3 bg-white border border-[#D1D5DB] rounded-2xl text-[#374151] font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all text-center"
              >
                Go Back
              </button>
              <button
                onClick={handleSaveLog}
                className={`py-3 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all text-center ${
                  activeLogAction.status === 'completed' ? 'bg-[#16A34A] hover:bg-[#14833c]' : 'bg-[#DC2626] hover:bg-[#b01e1e]'
                }`}
              >
                Confirm State
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Popup Modal */}
      {adjustingSession && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-amber-600" size={20} />
              <h3 className="font-extrabold text-lg text-gray-800">Adjust Class Schedule</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-200 flex items-start gap-1.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Adjustments apply strictly to this upcoming session. The core weekly schedule remains completely unchanged. This schedule change can only be made <strong>ONCE</strong>.
              </span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Target Date</label>
                <input
                  type="date"
                  value={adjDate}
                  onChange={(e) => setAdjDate(e.target.value)}
                  min="2026-05-24"
                  className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3 text-sm font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Start Time</label>
                  <select
                    value={adjStartTime}
                    onChange={(e) => setAdjStartTime(e.target.value)}
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3 text-sm font-semibold focus:outline-none focus:border-blue-500"
                  >
                    {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'].map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">End Time</label>
                  <select
                    value={adjEndTime}
                    onChange={(e) => setAdjEndTime(e.target.value)}
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3 text-sm font-semibold focus:outline-none focus:border-blue-500"
                  >
                    {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'].map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Adjustment Note</label>
                <input
                  type="text"
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                  placeholder="e.g. Rescheduled due to medical appointment"
                  className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3 text-sm font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setAdjustingSession(null)}
                className="py-3 bg-white border border-[#D1D5DB] rounded-2xl text-[#374151] font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdjustment}
                className="py-3 bg-amber-500 hover:bg-amber-600 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all text-center"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-Bar Sidebar Drawer Menu overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/55 z-55 transition-opacity duration-300 backdrop-blur-3xs flex justify-end"
          onClick={() => setIsMenuOpen(false)}
        >
          {/* Drawer container (sliding in from the right) */}
          <div 
            className="w-80 max-w-[85vw] bg-white dark:bg-slate-900 border-l border-gray-100 dark:border-slate-800 h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Drawer Header with Close Button */}
              <div className="flex items-center justify-between mb-8">
                <span className="text-xs font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase">Tutor Hub Menu</span>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Profile Card Header */}
              <div className="bg-blue-50/50 dark:bg-slate-800/80 rounded-2xl p-4 border border-blue-100/50 dark:border-slate-700/50 shadow-3xs flex items-center gap-3.5 mb-8">
                <div className="relative shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150" 
                    alt="Tutor Avatar" 
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700"
                  />
                  <div className="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-800"></div>
                </div>
                <div className="truncate">
                  <h4 className="font-extrabold text-[#111827] dark:text-gray-100 text-sm leading-snug truncate">
                    {user?.fullName || 'Tutor Name'}
                  </h4>
                  <p className="text-[10px] font-black tracking-wider uppercase text-blue-600 dark:text-blue-400">
                    Senior Private Educator
                  </p>
                </div>
              </div>

              {/* Solid thin divider line */}
              <div className="h-px bg-gray-100 dark:bg-slate-800 mb-6"></div>

              {/* Drawer Menu Items */}
              <div className="space-y-1">
                {/* 1. Edit Profile option */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setProfileName(user?.fullName || '');
                    setShowProfileModal(true);
                  }}
                  className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-bold text-sm text-gray-750 dark:text-gray-250 hover:bg-blue-50/50 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer text-left"
                >
                  <User size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />
                  <span>Profile Settings</span>
                </button>

                {/* 2. Theme / Dark Mode toggle option */}
                <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left select-none">
                  <div className="flex items-center gap-3.5 text-gray-750 dark:text-gray-250 font-bold text-sm">
                    {darkMode ? (
                      <Sun size={18} className="text-amber-500 shrink-0" />
                    ) : (
                      <Moon size={18} className="text-gray-500 dark:text-gray-450 shrink-0" />
                    )}
                    <span>Dark Mode Style</span>
                  </div>
                  
                  {/* Switch container */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={darkMode} 
                      onChange={() => setDarkMode(!darkMode)} 
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* 3. About Us option */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowAboutModal(true);
                  }}
                  className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-bold text-sm text-gray-750 dark:text-gray-250 hover:bg-blue-50/50 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer text-left"
                >
                  <Info size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />
                  <span>About Tuition Diary</span>
                </button>
              </div>
            </div>

            {/* Red Logout Row pinned bottom */}
            <div className="border-t border-gray-100 dark:border-slate-800 pt-5 mt-8">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  logout();
                  showToast('Logged out securely', 'success');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 hover:bg-red-100/80 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/20 rounded-xl font-extrabold text-xs transition-all cursor-pointer text-center"
              >
                <LogOut size={14} />
                <span>Sign Out Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Us Popup Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-55 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 border border-gray-100 dark:border-slate-800 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-2.5 mb-3 border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white leading-tight">About Tuition Diary</h3>
                <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">Tutor OS v1.0</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              <strong>Tuition Diary</strong> is a secure, high-craft, feature-complete tuition management suite built for private educators. Safely balances academic commitments, logs attendance sessions, handles reschedule alerts and guarantees structured student ledger monitoring.
            </p>

            <div className="bg-[#FAF8F5] dark:bg-slate-850 rounded-2xl p-3 border border-dashed border-gray-200 dark:border-slate-700/85 mb-5 text-[11px] text-gray-500 dark:text-gray-400 space-y-1.5">
              <div className="flex items-center gap-2">
                <Check size={12} className="text-green-500 shrink-0" />
                <span className="font-bold">Real-Time Schedule Matrix Planner</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={12} className="text-green-500 shrink-0" />
                <span className="font-bold">Safe, Non-Destructive Session Rescheduling</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={12} className="text-green-500 shrink-0" />
                <span className="font-bold">Full Financial Balances Ledger System</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={12} className="text-green-500 shrink-0" />
                <span className="font-bold">Persistent Theme Styles Configuration</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowAboutModal(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition-all text-center shadow-md shadow-blue-100 dark:shadow-none"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-up">
            <h3 className="font-extrabold text-lg text-gray-800 mb-1">Edit Tutor Profile</h3>
            <p className="text-xs text-gray-500 mb-4">Update the name shown in the greeting card.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter tutor name"
                  className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3 text-sm font-semibold focus:outline-none focus:border-blue-500"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setShowProfileModal(false)}
                className="py-3 bg-white border border-[#D1D5DB] rounded-2xl text-[#374151] font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm cursor-pointer transition-all text-center"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
