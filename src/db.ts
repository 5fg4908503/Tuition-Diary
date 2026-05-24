/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserProfile, Tuition, SessionLog, SessionAdjustment, Payment, Student } from './types';

// Helper to generate IDs
export function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

// Format Date YYYY-MM-DD
export function formatDate(date: Date): string {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

// Days of week constant
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Error Handling Definition
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// SEED DATASETS FOR GORGEOUS PRE-AUTHENTICATED AND NEW USER EXPERIENCE
const INITIAL_DEMO_USER = {
  fullName: 'Tanvir Rahman',
  phone: '01712-345678',
  email: 'ar4908503@gmail.com',
  authProvider: 'local',
  createdAt: '2026-01-01'
};

const INITIAL_TUITIONS: Omit<Tuition, 'userId'>[] = [
  {
    id: 't-1',
    type: 'group',
    tuitionName: 'Rahim Group - Dhaka',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    monthlyFee: 500,
    activeDays: [0, 2, 4], // Sun, Tue, Thu
    primaryPhone: '01712-345678',
    students: [
      { id: 's-1', studentName: 'Rahim', guardianPhone: '01712-345678' },
      { id: 's-2', studentName: 'Faiza', guardianPhone: '01823-456789' },
      { id: 's-3', studentName: 'Mashrafi', guardianPhone: '01934-567890' }
    ],
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z'
  },
  {
    id: 't-2',
    type: 'single',
    tuitionName: 'Mashrafi Rahman',
    startTime: '01:30 PM',
    endTime: '02:30 PM',
    monthlyFee: 1000,
    activeDays: [1, 3, 5], // Mon, Wed, Fri
    primaryPhone: '01934-567890',
    students: [
      { id: 's-4', studentName: 'Mashrafi Rahman', guardianPhone: '01934-567890' }
    ],
    createdAt: '2026-05-02T10:00:00Z',
    updatedAt: '2026-05-02T10:00:00Z'
  },
  {
    id: 't-3',
    type: 'group',
    tuitionName: 'Physics Advanced Batch',
    startTime: '04:00 PM',
    endTime: '05:00 PM',
    monthlyFee: 500,
    activeDays: [6, 1, 3], // Sat, Mon, Wed
    primaryPhone: '01711-223344',
    students: [
      { id: 's-5', studentName: 'Hasib', guardianPhone: '01711-223344' },
      { id: 's-6', studentName: 'Tanvir', guardianPhone: '01822-334455' },
      { id: 's-7', studentName: 'Shahriar', guardianPhone: '01933-445566' }
    ],
    createdAt: '2026-05-03T10:00:00Z',
    updatedAt: '2026-05-03T10:00:00Z'
  },
  {
    id: 't-4',
    type: 'single',
    tuitionName: 'Faiza Ahmed',
    startTime: '06:00 PM',
    endTime: '07:00 PM',
    monthlyFee: 1000,
    activeDays: [0, 2, 4], // Sun, Tue, Thu
    primaryPhone: '01823-456789',
    students: [
      { id: 's-8', studentName: 'Faiza Ahmed', guardianPhone: '01823-456789' }
    ],
    createdAt: '2026-05-04T10:00:00Z',
    updatedAt: '2026-05-04T10:00:00Z'
  }
];

const INITIAL_SESSION_LOGS = [
  { id: 'log-1', tuitionId: 't-1', date: '2026-05-10', originalStartTime: '10:00 AM', originalEndTime: '11:00 AM', actualStartTime: '10:00 AM', actualEndTime: '11:00 AM', status: 'completed', createdAt: '2026-05-10T11:00:00Z' },
  { id: 'log-2', tuitionId: 't-1', date: '2026-05-12', originalStartTime: '10:00 AM', originalEndTime: '11:00 AM', actualStartTime: '10:00 AM', actualEndTime: '11:00 AM', status: 'completed', createdAt: '2026-05-12T11:00:00Z' },
  { id: 'log-3', tuitionId: 't-1', date: '2026-05-14', originalStartTime: '10:00 AM', originalEndTime: '11:00 AM', actualStartTime: '10:05 AM', actualEndTime: '11:05 AM', status: 'completed', createdAt: '2026-05-14T11:05:00Z' },
  { id: 'log-4', tuitionId: 't-1', date: '2026-05-17', originalStartTime: '10:00 AM', originalEndTime: '11:00 AM', actualStartTime: '10:00 AM', actualEndTime: '11:00 AM', status: 'completed', createdAt: '2026-05-17T11:00:00Z' },
  { id: 'log-5', tuitionId: 't-1', date: '2026-05-19', originalStartTime: '10:00 AM', originalEndTime: '11:00 AM', actualStartTime: '10:00 AM', actualEndTime: '11:00 AM', status: 'cancelled', note: 'Storm outside', createdAt: '2026-05-19T10:00:00Z' },
  { id: 'log-6', tuitionId: 't-1', date: '2026-05-21', originalStartTime: '10:00 AM', originalEndTime: '11:00 AM', actualStartTime: '10:15 AM', actualEndTime: '11:15 AM', status: 'completed', createdAt: '2026-05-21T11:15:00Z' },

  { id: 'log-7', tuitionId: 't-2', date: '2026-05-11', originalStartTime: '01:30 PM', originalEndTime: '02:30 PM', actualStartTime: '01:30 PM', actualEndTime: '02:30 PM', status: 'completed', createdAt: '2026-05-11T14:30:00Z' },
  { id: 'log-8', tuitionId: 't-2', date: '2026-05-13', originalStartTime: '01:30 PM', originalEndTime: '02:30 PM', actualStartTime: '01:30 PM', actualEndTime: '02:30 PM', status: 'completed', createdAt: '2026-05-13T14:30:00Z' },
  { id: 'log-9', tuitionId: 't-2', date: '2026-05-15', originalStartTime: '01:30 PM', originalEndTime: '02:30 PM', actualStartTime: '01:40 PM', actualEndTime: '02:40 PM', status: 'completed', note: 'Delayed 10 mins', createdAt: '2026-05-15T14:40:00Z' },
  { id: 'log-10', tuitionId: 't-2', date: '2026-05-18', originalStartTime: '01:30 PM', originalEndTime: '02:30 PM', actualStartTime: '01:30 PM', actualEndTime: '02:30 PM', status: 'completed', createdAt: '2026-05-18T14:30:00Z' },
  { id: 'log-11', tuitionId: 't-2', date: '2026-05-20', originalStartTime: '01:30 PM', originalEndTime: '02:30 PM', actualStartTime: '01:30 PM', actualEndTime: '02:30 PM', status: 'cancelled', note: 'Tutor in transit', createdAt: '2026-05-20T13:30:00Z' },
  { id: 'log-12', tuitionId: 't-2', date: '2026-05-22', originalStartTime: '01:30 PM', originalEndTime: '02:30 PM', actualStartTime: '01:30 PM', actualEndTime: '02:30 PM', status: 'completed', createdAt: '2026-05-22T14:30:00Z' }
];

const INITIAL_SESSION_ADJUSTMENTS = [
  { id: 'adj-1', tuitionId: 't-1', sessionDate: '2026-05-14', adjustedDate: '2026-05-14', adjustedStartTime: '10:05 AM', adjustedEndTime: '11:05 AM', note: 'Adjusted for dental visit', usedAdjustment: true, createdAt: '2026-05-13T18:00:00Z' }
];

const INITIAL_PAYMENTS = [
  { id: 'p-1', tuitionId: 't-1', studentId: 's-1', studentName: 'Rahim', amount: 500, paymentMonth: '2026-04', paymentDate: '2026-04-05', status: 'paid', createdAt: '2026-04-05T12:00:00Z' },
  { id: 'p-2', tuitionId: 't-1', studentId: 's-1', studentName: 'Rahim', amount: 500, paymentMonth: '2026-03', paymentDate: '2026-03-05', status: 'paid', createdAt: '2026-03-05T12:00:00Z' },
  { id: 'p-3', tuitionId: 't-1', studentId: 's-2', studentName: 'Faiza', amount: 500, paymentMonth: '2026-04', paymentDate: '2026-04-05', status: 'paid', createdAt: '2026-04-05T12:00:00Z' },
  { id: 'p-4', tuitionId: 't-1', studentId: 's-2', studentName: 'Faiza', amount: 500, paymentMonth: '2026-03', paymentDate: '2026-03-05', status: 'paid', createdAt: '2026-03-05T11:00:00Z' },
  { id: 'p-5', tuitionId: 't-1', studentId: 's-3', studentName: 'Mashrafi', amount: 500, paymentMonth: '2026-04', paymentDate: '2026-04-06', status: 'paid', createdAt: '2026-04-06T14:00:00Z' },
  { id: 'p-6', tuitionId: 't-1', studentId: 's-3', studentName: 'Mashrafi', amount: 500, paymentMonth: '2026-03', paymentDate: '2026-03-07', status: 'paid', createdAt: '2026-03-07T12:00:00Z' },

  { id: 'p-7', tuitionId: 't-2', studentId: 's-4', studentName: 'Mashrafi Rahman', amount: 1000, paymentMonth: '2026-04', paymentDate: '2026-04-05', status: 'paid', createdAt: '2026-04-05T10:00:00Z' },
  { id: 'p-8', tuitionId: 't-2', studentId: 's-4', studentName: 'Mashrafi Rahman', amount: 1000, paymentMonth: '2026-03', paymentDate: '2026-03-05', status: 'paid', createdAt: '2026-03-05T10:00:00Z' },

  { id: 'p-9', tuitionId: 't-3', studentId: 's-5', studentName: 'Hasib', amount: 500, paymentMonth: '2026-04', paymentDate: '2026-04-05', status: 'paid', createdAt: '2026-04-05T10:00:00Z' },
  { id: 'p-10', tuitionId: 't-3', studentId: 's-6', studentName: 'Tanvir', amount: 500, paymentMonth: '2026-04', paymentDate: '2026-04-06', status: 'paid', createdAt: '2026-04-06T10:00:00Z' },
  { id: 'p-11', tuitionId: 't-3', studentId: 's-7', studentName: 'Shahriar', amount: 500, paymentMonth: '2026-04', paymentDate: '2026-04-07', status: 'paid', createdAt: '2026-04-07T10:00:00Z' },

  { id: 'p-12', tuitionId: 't-4', studentId: 's-8', studentName: 'Faiza Ahmed', amount: 1000, paymentMonth: '2026-04', paymentDate: '2026-04-05', status: 'paid', createdAt: '2026-04-05T10:00:00Z' },

  { id: 'p-13', tuitionId: 't-1', studentId: 's-1', studentName: 'Rahim', amount: 500, paymentMonth: '2026-05', paymentDate: '', status: 'unpaid', createdAt: '2026-05-01T00:00:00Z' },
  { id: 'p-14', tuitionId: 't-1', studentId: 's-2', studentName: 'Faiza', amount: 500, paymentMonth: '2026-05', paymentDate: '', status: 'unpaid', createdAt: '2026-05-01T00:00:00Z' },
  { id: 'p-15', tuitionId: 't-1', studentId: 's-3', studentName: 'Mashrafi', amount: 500, paymentMonth: '2026-05', paymentDate: '', status: 'unpaid', createdAt: '2026-05-01T00:00:00Z' },
  
  { id: 'p-16', tuitionId: 't-2', studentId: 's-4', studentName: 'Mashrafi Rahman', amount: 1000, paymentMonth: '2026-05', paymentDate: '', status: 'unpaid', createdAt: '2026-05-01T00:00:00Z' },

  { id: 'p-17', tuitionId: 't-3', studentId: 's-5', studentName: 'Hasib', amount: 500, paymentMonth: '2026-05', paymentDate: '', status: 'unpaid', createdAt: '2026-05-01T00:00:00Z' },
  { id: 'p-18', tuitionId: 't-3', studentId: 's-6', studentName: 'Tanvir', amount: 500, paymentMonth: '2026-05', paymentDate: '', status: 'unpaid', createdAt: '2026-05-01T00:00:00Z' },
  { id: 'p-19', tuitionId: 't-3', studentId: 's-7', studentName: 'Shahriar', amount: 500, paymentMonth: '2026-05', paymentDate: '', status: 'unpaid', createdAt: '2026-05-01T00:00:00Z' },

  { id: 'p-20', tuitionId: 't-4', studentId: 's-8', studentName: 'Faiza Ahmed', amount: 1000, paymentMonth: '2026-05', paymentDate: '', status: 'unpaid', createdAt: '2026-05-01T00:00:00Z' },

  { id: 'p-21', tuitionId: 't-1', studentId: 's-1', studentName: 'Rahim', amount: 500, paymentMonth: '2026-03', paymentDate: '', status: 'overdue', createdAt: '2026-03-01T00:00:00Z' },
  { id: 'p-22', tuitionId: 't-1', studentId: 's-2', studentName: 'Faiza', amount: 500, paymentMonth: '2026-03', paymentDate: '', status: 'overdue', createdAt: '2026-03-01T00:00:00Z' },
  { id: 'p-23', tuitionId: 't-2', studentId: 's-4', studentName: 'Mashrafi Rahman', amount: 1000, paymentMonth: '2026-03', paymentDate: '', status: 'overdue', createdAt: '2026-03-01T00:00:00Z' },
  { id: 'p-24', tuitionId: 't-3', studentId: 's-5', studentName: 'Hasib', amount: 1000, paymentMonth: '2026-03', paymentDate: '', status: 'overdue', createdAt: '2026-03-01T00:00:00Z' }
];

export class DatabaseService {
  constructor() {
    // Left for compatibility
  }

  // Seeding default sandbox data specifically for a user in Firestore if they are brand new
  async seedDefaultUser(uid: string, fullName: string, email: string, phone: string, authProvider: 'email' | 'phone' | 'google' | 'local') {
    try {
      // Check if user already exists
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        console.log('User already seeded or exists.');
        return;
      }

      // 1. Create user profile doc
      const userProfile: UserProfile = {
        id: uid,
        fullName,
        phone: phone || '01712-345678',
        email,
        authProvider,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', uid), userProfile);

      // 2. Create standard tuitions associated to this user
      for (const t of INITIAL_TUITIONS) {
        const docRef = doc(db, 'tuitions', t.id);
        await setDoc(docRef, {
          ...t,
          userId: uid
        });
      }

      // 3. Create pre-populated classes Completed/Cancelled logs
      for (const log of INITIAL_SESSION_LOGS) {
        const docRef = doc(db, 'session_logs', log.id);
        await setDoc(docRef, {
          ...log,
          userId: uid
        });
      }

      // 4. Create adjustments
      for (const adj of INITIAL_SESSION_ADJUSTMENTS) {
        const docRef = doc(db, 'session_adjustments', adj.id);
        await setDoc(docRef, {
          ...adj,
          userId: uid
        });
      }

      // 5. Create payment entries
      for (const p of INITIAL_PAYMENTS) {
        const docRef = doc(db, 'payments', p.id);
        await setDoc(docRef, {
          ...p,
          userId: uid
        });
      }

      console.log('Firebase seeding completed securely for user: ' + uid);
    } catch (e) {
      console.error('Seeding Firestore default collections failed:', e);
    }
  }

  // USER Auth Profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docSnap = await getDoc(doc(db, 'users', userId));
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      return null;
    }
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      await setDoc(doc(db, 'users', profile.id), profile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${profile.id}`);
    }
  }

  // TUITIONS
  async getTuitions(userId: string): Promise<Tuition[]> {
    try {
      const q = query(collection(db, 'tuitions'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const tuitions: Tuition[] = [];
      querySnapshot.forEach((doc) => {
        tuitions.push(doc.data() as Tuition);
      });
      return tuitions;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'tuitions');
      return [];
    }
  }

  async addTuition(tuition: Omit<Tuition, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tuition> {
    const id = 't-' + generateId();
    const newTuition: Tuition = {
      ...tuition,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'tuitions', id), newTuition);
      // Auto generate May 2026 payment records for students of this tuition
      await this.generateUnpaidRecordsForTuition(newTuition);
      return newTuition;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tuitions/${id}`);
      throw error;
    }
  }

  async updateTuition(tuitionId: string, data: Partial<Tuition>): Promise<void> {
    try {
      const tDoc = doc(db, 'tuitions', tuitionId);
      const updatedData = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(tDoc, updatedData);
      
      // Regenerate / sync payment student names if any changes
      if (data.students) {
        await this.syncPaymentStudentRecords(tuitionId, data.students);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tuitions/${tuitionId}`);
    }
  }

  async deleteTuition(tuitionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'tuitions', tuitionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tuitions/${tuitionId}`);
    }
  }

  // SESSION LOGS
  async getSessionLogs(): Promise<SessionLog[]> {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      const q = query(collection(db, 'session_logs'), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      const logs: SessionLog[] = [];
      querySnapshot.forEach((doc) => {
        logs.push(doc.data() as SessionLog);
      });
      return logs;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'session_logs');
      return [];
    }
  }

  async addSessionLog(log: Omit<SessionLog, 'id' | 'createdAt'>): Promise<SessionLog> {
    const id = 'log-' + generateId();
    const newLog: SessionLog = {
      ...log,
      id,
      createdAt: new Date().toISOString()
    };
    if (auth.currentUser?.uid) {
      (newLog as any).userId = auth.currentUser.uid;
    }
    try {
      await setDoc(doc(db, 'session_logs', id), newLog);
      return newLog;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `session_logs/${id}`);
      throw error;
    }
  }

  // ADJUSTMENTS
  async getSessionAdjustments(): Promise<SessionAdjustment[]> {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      const q = query(collection(db, 'session_adjustments'), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      const adjustments: SessionAdjustment[] = [];
      querySnapshot.forEach((doc) => {
        adjustments.push(doc.data() as SessionAdjustment);
      });
      return adjustments;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'session_adjustments');
      return [];
    }
  }

  async addSessionAdjustment(adj: Omit<SessionAdjustment, 'id' | 'createdAt'>): Promise<SessionAdjustment> {
    const id = 'adj-' + generateId();
    const newAdj: SessionAdjustment = {
      ...adj,
      id,
      createdAt: new Date().toISOString()
    };
    if (auth.currentUser?.uid) {
      (newAdj as any).userId = auth.currentUser.uid;
    }
    try {
      await setDoc(doc(db, 'session_adjustments', id), newAdj);
      return newAdj;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `session_adjustments/${id}`);
      throw error;
    }
  }

  // PAYMENTS
  async getPayments(): Promise<Payment[]> {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      const q = query(collection(db, 'payments'), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      const payments: Payment[] = [];
      querySnapshot.forEach((doc) => {
        payments.push(doc.data() as Payment);
      });
      return payments;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'payments');
      return [];
    }
  }

  async collectPayment(paymentId: string): Promise<void> {
    try {
      const pDoc = doc(db, 'payments', paymentId);
      await updateDoc(pDoc, {
        status: 'paid',
        paymentDate: formatDate(new Date())
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `payments/${paymentId}`);
    }
  }

  async addCustomPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    const id = 'p-' + generateId();
    const newPay: Payment = {
      ...payment,
      id,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'payments', id), newPay);
      return newPay;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `payments/${id}`);
      throw error;
    }
  }

  // Utility to generate direct unpaid receipts when creating a tuition
  private async generateUnpaidRecordsForTuition(tuition: Tuition) {
    try {
      for (const student of tuition.students) {
        const id = 'p-' + generateId();
        const mayRec: Payment = {
          id,
          tuitionId: tuition.id,
          studentId: student.id,
          studentName: student.studentName,
          userId: tuition.userId,
          amount: tuition.monthlyFee,
          paymentMonth: '2026-05',
          paymentDate: '',
          status: 'unpaid',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'payments', id), mayRec);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payments');
    }
  }

  private async syncPaymentStudentRecords(tuitionId: string, students: Student[]) {
    try {
      const q = query(collection(db, 'payments'), where('tuitionId', '==', tuitionId));
      const querySnapshot = await getDocs(q);
      for (const d of querySnapshot.docs) {
        const p = d.data() as Payment;
        const stud = students.find(s => s.id === p.studentId);
        if (stud && stud.studentName !== p.studentName) {
          await updateDoc(doc(db, 'payments', p.id), {
            studentName: stud.studentName
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payments');
    }
  }
}

export const dbService = new DatabaseService();
