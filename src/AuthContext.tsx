import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setProfile({ id: user.uid, ...userDoc.data() } as UserProfile);
          } else {
            // Create a basic profile if it doesn't exist
            const newProfile = {
              displayName: user.displayName || 'Anonymous Guest',
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
              isVerified: false,
              interests: [],
              city: 'Global Citizen',
              bio: 'A fellow traveler and diner.',
              createdAt: Date.now()
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setProfile({ id: user.uid, ...newProfile } as UserProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { loginWithGoogle } = await import('./lib/firebase');
    await loginWithGoogle();
  };

  const signInWithMicrosoft = async () => {
    const { loginWithMicrosoft } = await import('./lib/firebase');
    await loginWithMicrosoft();
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const { auth } = await import('./lib/firebase');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    // Profile creation is handled by the onAuthStateChanged effect
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const { auth } = await import('./lib/firebase');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    const { logout } = await import('./lib/firebase');
    await logout();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signInWithMicrosoft, signUpWithEmail, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
