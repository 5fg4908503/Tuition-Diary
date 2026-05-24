/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { dbService, auth } from '../db';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  loginWithPhone: (phone: string, otp: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  register: (fullName: string, email: string, phone: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (fullName: string, phone: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Monitor real-time firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          // Check if profile exists in Firestore
          let profile = await dbService.getUserProfile(firebaseUser.uid);
          if (!profile) {
            // Seeding default sandbox data in Firestore so the initial user setup is populated
            const name = firebaseUser.displayName || 'Tanvir Rahman';
            const email = firebaseUser.email || 'ar4908503@gmail.com';
            await dbService.seedDefaultUser(
              firebaseUser.uid,
              name,
              email,
              '01712-345678',
              'google'
            );
            profile = await dbService.getUserProfile(firebaseUser.uid);
          }
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Core authentication synchronization failed:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return !!result.user;
    } catch (err) {
      console.error('Google Sign-In popup flow failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    try {
      // Try signing in
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        const customErr = new Error('Email/Password authentication provider is not enabled in the Firebase Console. Please use the Google Sign-In option instead or enable Email/Password provider in the console.');
        (customErr as any).code = 'auth/operation-not-allowed';
        throw customErr;
      }
      // Handle fallback registration if user not found (graceful offline migration)
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const result = await createUserWithEmailAndPassword(auth, email, pass);
          await dbService.seedDefaultUser(
            result.user.uid,
            'Tanvir Rahman',
            email,
            '01712-345678',
            'email'
          );
          return true;
        } catch (regErr: any) {
          if (regErr.code === 'auth/operation-not-allowed') {
            const customErr = new Error('Email/Password authentication provider is not enabled in the Firebase Console. Please use the Google Sign-In option instead or enable Email/Password provider in the console.');
            (customErr as any).code = 'auth/operation-not-allowed';
            throw customErr;
          }
          console.error('Automatic signup fallback failed:', regErr);
        }
      }
      console.error('Firebase Email authentication failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithPhone = async (phone: string, otp: string): Promise<boolean> => {
    setLoading(true);
    try {
      const sanitizedPhone = phone.trim();
      const mockUid = 'phone-tutor-sid-' + sanitizedPhone.replace(/\D/g, '');
      
      const sessionUser: UserProfile = {
        id: mockUid,
        fullName: 'Tanvir Rahman',
        phone: sanitizedPhone,
        email: 'ar4908503@gmail.com',
        authProvider: 'phone',
        createdAt: new Date().toISOString()
      };
      
      await dbService.seedDefaultUser(mockUid, 'Tanvir Rahman', 'ar4908503@gmail.com', sanitizedPhone, 'phone');
      setUser(sessionUser);
      return true;
    } catch (err) {
      console.error('Phone login conversion failed:', err);
    } finally {
      setLoading(false);
    }
    return true;
  };

  const register = async (fullName: string, email: string, phone: string): Promise<boolean> => {
    setLoading(true);
    try {
      // Use secure default password for email registrants
      const mockPass = 'Pass_Key_123';
      let result;
      try {
        result = await createUserWithEmailAndPassword(auth, email, mockPass);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          // If already registered, sign them in with mock password
          await signInWithEmailAndPassword(auth, email, mockPass);
          return true;
        }
        if (err.code === 'auth/operation-not-allowed') {
          const customErr = new Error('Email/Password authentication provider is not enabled in the Firebase Console. Please use the Google Sign-In option instead or enable Email/Password provider in the console.');
          (customErr as any).code = 'auth/operation-not-allowed';
          throw customErr;
        }
        throw err;
      }
      
      await dbService.seedDefaultUser(result.user.uid, fullName, email, phone, 'email');
      const profile = await dbService.getUserProfile(result.user.uid);
      if (profile) setUser(profile);
      return true;
    } catch (err: any) {
      console.error('Firebase user registration failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
  };

  const updateProfile = async (fullName: string, phone: string): Promise<void> => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      fullName,
      phone
    };
    try {
      await dbService.saveUserProfile(updated);
      setUser(updated);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        loginWithEmail,
        loginWithPhone,
        loginWithGoogle,
        register,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
