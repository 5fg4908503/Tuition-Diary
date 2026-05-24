/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  authProvider: 'email' | 'phone' | 'google' | 'local';
  createdAt: string;
}

export interface Student {
  id: string;
  studentName: string;
  guardianPhone: string;
}

export interface Tuition {
  id: string;
  userId: string;
  type: 'group' | 'single';
  tuitionName: string;
  startTime: string; // "HH:MM AM/PM" or "HH:MM" 24 hour
  endTime: string;
  monthlyFee: number; // Fee per student
  activeDays: number[]; // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  primaryPhone: string;
  students: Student[]; // Embedded students for efficient querying & Firestore matches
  createdAt: string;
  updatedAt: string;
}

export interface SessionLog {
  id: string;
  tuitionId: string;
  date: string; // YYYY-MM-DD
  originalStartTime: string;
  originalEndTime: string;
  actualStartTime: string;
  actualEndTime: string;
  status: 'completed' | 'cancelled' | 'pending';
  note?: string;
  createdAt: string;
}

export interface SessionAdjustment {
  id: string;
  tuitionId: string;
  sessionDate: string; // YYYY-MM-DD (original date)
  adjustedDate: string; // YYYY-MM-DD (new date)
  adjustedStartTime: string;
  adjustedEndTime: string;
  note?: string;
  usedAdjustment: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  tuitionId: string;
  studentId: string; // Track which student's payment this is
  studentName: string;
  userId: string;
  amount: number;
  paymentMonth: string; // YYYY-MM
  paymentDate: string; // YYYY-MM-DD
  status: 'paid' | 'unpaid' | 'overdue';
  createdAt: string;
}
