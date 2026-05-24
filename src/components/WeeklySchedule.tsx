/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Tuition, SessionLog, SessionAdjustment } from '../types';
import { resolveSessionsForDate } from '../utils';
import { formatDate, DAYS_OF_WEEK } from '../db';

interface WeeklyScheduleProps {
  tuitions: Tuition[];
  sessionLogs: SessionLog[];
  adjustments: SessionAdjustment[];
  onBack: () => void;
}

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  tuitions,
  sessionLogs,
  adjustments,
  onBack
}) => {
  // Start week from Sunday, May 24, 2026 (the current system date)
  const baseDate = new Date('2026-05-24T00:00:00');
  const [selectedDate, setSelectedDate] = useState<Date>(baseDate);

  // Generate 7 days of the week starting from baseDate
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    return d;
  });

  const selectedStr = formatDate(selectedDate);
  const resolvedSessions = resolveSessionsForDate(selectedDate, tuitions, sessionLogs, adjustments);

  return (
    <div className="bg-[#F6F7F9] min-h-screen pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-[#E5E7EB] sticky top-0 z-10 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-700 font-medium hover:text-blue-600 transition-colors"
          id="btn-weekly-back"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <span className="font-bold text-lg text-gray-800">Weekly Schedule</span>
        <div className="w-8"></div> {/* Spacer for visual balance */}
      </div>

      <div className="max-w-md mx-auto px-4 py-4 md:max-w-4xl">
        {/* Weekly Calendar Selector Header */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E7EB] mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-blue-600" size={18} />
            <h2 className="font-bold text-gray-800">Select Date</h2>
          </div>
          
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDays.map((day, idx) => {
              const dateStr = formatDate(day);
              const isSelected = dateStr === selectedStr;
              const hasClasses = resolveSessionsForDate(day, tuitions, sessionLogs, adjustments).length > 0;
              const dayNameShort = DAYS_OF_WEEK[day.getDay()].substring(0, 3);
              const dayOfMonth = day.getDate();

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  id={`btn-week-day-${idx}`}
                  className={`flex flex-col items-center py-3 rounded-xl transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100 scale-105'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className={`text-[10px] font-semibold tracking-wider uppercase ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                    {dayNameShort}
                  </span>
                  <span className="text-lg font-bold mt-1">
                    {dayOfMonth}
                  </span>
                  {hasClasses && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`}></span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 text-center text-xs text-gray-500 font-medium">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Classes List */}
        <h3 className="font-bold text-gray-800 text-lg mb-3">
          Classes for {DAYS_OF_WEEK[selectedDate.getDay()]} ({resolvedSessions.length})
        </h3>

        {resolvedSessions.length === 0 ? (
          <div className="bg-[#FFF7EE] rounded-2xl p-8 border border-amber-100 text-center flex flex-col items-center justify-center shadow-xs">
            <Clock size={40} className="text-amber-500/80 mb-3" />
            <p className="font-bold text-gray-800">No classes scheduled</p>
            <p className="text-sm text-gray-500 mt-1">Enjoy your free, relaxing day off!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {resolvedSessions.map((session, idx) => {
              return (
                <div
                  key={idx}
                  id={`weekly-session-card-${idx}`}
                  className="bg-[#FFF7EE] rounded-2xl p-4 border border-[#E5E7EB] shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      {/* Badge */}
                      <span className={`inline-block text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-full mb-2 ${
                        session.tuition.type === 'group'
                          ? 'bg-[#E0ECFF] text-[#2563EB]'
                          : 'bg-[#E6F8EF] text-[#15803D]'
                      }`}>
                        {session.tuition.type === 'group' ? 'Group Batch' : 'Single Student'}
                      </span>
                      <h4 className="font-bold text-[#1F2937] text-base">{session.tuition.tuitionName}</h4>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 font-semibold">
                        <Clock size={14} className="text-gray-400" />
                        <span>{session.startTime} - {session.endTime}</span>
                      </p>
                    </div>

                    {/* Status Icons Indicator */}
                    <div>
                      {session.status === 'completed' && (
                        <div className="flex items-center gap-1 text-[#16A34A] bg-[#DCFCE7] px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                          <CheckCircle2 size={14} />
                          <span>Done</span>
                        </div>
                      )}
                      {session.status === 'cancelled' && (
                        <div className="flex items-center gap-1 text-[#DC2626] bg-[#FEE2E2] px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                          <XCircle size={14} />
                          <span>Cancelled</span>
                        </div>
                      )}
                      {session.status === 'pending' && (
                        <div className="flex items-center gap-1 text-blue-600 bg-[#E0ECFF] px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                          <span>Scheduled</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {session.isAdjusted && (
                    <div className="mt-3 pt-3 border-t border-amber-200/50 flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50/50 p-2 rounded-lg">
                      <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Adjusted Class Session: </span>
                        {session.adjustment?.note || 'Time tweaked for this session.'}
                      </div>
                    </div>
                  )}

                  {session.log?.note && (
                    <div className="mt-2 text-xs text-gray-500 italic bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                      Note: "{session.log.note}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
