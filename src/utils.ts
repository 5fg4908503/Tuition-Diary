/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tuition, SessionLog, SessionAdjustment } from './types';
import { formatDate } from './db';

// Helper to check if a tuition regularly occurs on a given day of week (0 = Sunday, ..., 6 = Saturday)
export function isScheduledDay(tuition: Tuition, date: Date): boolean {
  const dayOfWeek = date.getDay();
  return tuition.activeDays.includes(dayOfWeek);
}

export interface ResolvedSession {
  id: string; // "tuitionId-date" or "adj-id"
  tuitionId: string;
  tuition: Tuition;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  isAdjusted: boolean;
  adjustment?: SessionAdjustment;
  status: 'pending' | 'completed' | 'cancelled';
  log?: SessionLog;
}

// Resolves all scheduled classes for a specific date
export function resolveSessionsForDate(
  date: Date,
  tuitions: Tuition[],
  sessionLogs: SessionLog[],
  adjustments: SessionAdjustment[]
): ResolvedSession[] {
  const dateStr = formatDate(date);
  const dayOfWeek = date.getDay();
  const resolved: ResolvedSession[] = [];

  // Find adjustments pointing TO this date (classes moved to today)
  const adjustmentsToToday = adjustments.filter(adj => adj.adjustedDate === dateStr);
  
  // Find adjustments pointing AWAY from today (classes moved from today)
  const adjustmentsAwayFromToday = adjustments.filter(adj => adj.sessionDate === dateStr);

  // 1. Core recurring classes
  tuitions.forEach(tuition => {
    const isRegularDay = tuition.activeDays.includes(dayOfWeek);
    
    // Check if this specific session has been adjusted away
    const hasAdjustmentAway = adjustmentsAwayFromToday.some(adj => adj.tuitionId === tuition.id);

    if (isRegularDay && !hasAdjustmentAway) {
      // Find if there is a same-date adjustment (e.g. time adjustment only)
      const sameDayAdj = adjustmentsToToday.find(adj => adj.tuitionId === tuition.id && adj.sessionDate === dateStr);
      
      const log = sessionLogs.find(l => l.tuitionId === tuition.id && l.date === dateStr);
      
      resolved.push({
        id: `${tuition.id}-${dateStr}`,
        tuitionId: tuition.id,
        tuition,
        date: dateStr,
        startTime: sameDayAdj ? sameDayAdj.adjustedStartTime : tuition.startTime,
        endTime: sameDayAdj ? sameDayAdj.adjustedEndTime : tuition.endTime,
        isAdjusted: !!sameDayAdj,
        adjustment: sameDayAdj,
        status: log ? log.status : 'pending',
        log
      });
    }
  });

  // 2. Classes adjusted TO today from another day
  adjustmentsToToday.forEach(adj => {
    // If it was already added as same-day adjustment, skip
    if (adj.sessionDate === dateStr) return;

    const tuition = tuitions.find(t => t.id === adj.tuitionId);
    if (!tuition) return;

    const log = sessionLogs.find(l => l.tuitionId === tuition.id && l.date === dateStr);

    resolved.push({
      id: `adj-${adj.id}`,
      tuitionId: tuition.id,
      tuition,
      date: dateStr,
      startTime: adj.adjustedStartTime,
      endTime: adj.adjustedEndTime,
      isAdjusted: true,
      adjustment: adj,
      status: log ? log.status : 'pending',
      log
    });
  });

  // Sort by starting time
  return resolved.sort((a, b) => {
    return convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime);
  });
}

// Convert "10:00 AM" or "01:30 PM" or "18:00" to minutes from midnight for sorting
export function convertTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/^(\d+):(\d+)\s*(AM|PM)?$/);
  
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm) {
    if (ampm === 'PM' && hours < 12) {
      hours += 12;
    }
    if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
  }
  
  return hours * 60 + minutes;
}

// Calculate remaining time string (e.g. "1hr 30m Left" or "15m Left")
export function calculateTimeLeft(endTimeStr: string): string {
  // We use current mock system date 24 May 2026.
  // For standard user viewing, calculate dynamic offset
  const now = new Date();
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const endMinutes = convertTimeToMinutes(endTimeStr);
  
  const diff = endMinutes - currentMinutes;
  
  if (diff <= 0) {
    return 'Session Ended';
  }
  
  if (diff < 60) {
    return `${diff}m Left`;
  }
  
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return mins > 0 ? `${hrs}hr ${mins}m Left` : `${hrs}hr Left`;
}
