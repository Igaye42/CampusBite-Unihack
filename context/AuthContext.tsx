import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  studentData: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  studentData: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [studentData, setStudentData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeData: any = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Real-time listener for the student's profile data
        const studentRef = doc(db, "students", firebaseUser.uid);
        unsubscribeData = onSnapshot(studentRef, (docSnap) => {
          if (docSnap.exists()) {
            setStudentData(docSnap.data());
          } else {
            setStudentData(null);
          }
          setLoading(false);
        }, (error) => {
          console.log("Snapshot error (likely permissions, ignoring):", error);
          setStudentData(null);
          setLoading(false);
        });
      } else {
        setStudentData(null);
        setLoading(false);
        if (unsubscribeData) unsubscribeData();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeData) unsubscribeData();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, studentData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
