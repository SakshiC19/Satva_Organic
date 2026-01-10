import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Sign up with email and password
  const signup = async (email, password, displayName, phoneNumber) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    await updateProfile(userCredential.user, {
      displayName: displayName
    });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: email,
      displayName: displayName,
      phoneNumber: phoneNumber || '',
      role: 'user',
      createdAt: new Date(),
      wishlist: [],
      addresses: []
    });

    return userCredential;
  };

  // Find user by phone number
  const findUserByPhone = async (phoneNumber) => {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    }
    return null;
  };

  // Login with email and password
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Login with Google
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    // Check if user document exists, if not create one
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        role: 'user',
        createdAt: new Date(),
        wishlist: [],
        addresses: []
      });
    }

    return userCredential;
  };

  // Logout
  const logout = () => {
    return signOut(auth);
  };

  // Reset password
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Update User Profile
  const updateUserProfile = async (data) => {
    if (!currentUser) {
      throw new Error('No user is currently logged in');
    }

    try {
      // Update Firebase Auth profile
      const updateData = {
        displayName: data.displayName
      };
      
      // Only include photoURL if it's provided and not null
      if (data.photoURL !== undefined && data.photoURL !== null) {
        updateData.photoURL = data.photoURL;
      }

      await updateProfile(currentUser, updateData);
      
      // Update Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      const firestoreData = {
        displayName: data.displayName
      };
      
      if (data.photoURL !== undefined && data.photoURL !== null) {
        firestoreData.photoURL = data.photoURL;
      }

      if (data.is2FAEnabled !== undefined) {
        firestoreData.is2FAEnabled = data.is2FAEnabled;
      }
      
      await setDoc(userRef, firestoreData, { merge: true });

      console.log('Profile updated successfully in both Auth and Firestore');
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      throw error;
    }
  };

  // Fetch user role from Firestore
  const fetchUserRole = async (uid) => {
    try {
      console.log('AuthContext - Fetching role for UID:', uid);
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        console.log('AuthContext - Role fetched:', role);
        setUserRole(role);
        return role;
      } else {
        console.log('AuthContext - User document does not exist');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserRole(user.uid);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    findUserByPhone,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
    isAdmin: userRole === 'admin'
  };

  console.log('AuthContext - Provider value:', { 
    email: currentUser?.email, 
    userRole, 
    isAdmin: userRole === 'admin' 
  });

  return (
    <AuthContext.Provider value={value}>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div> : children}
    </AuthContext.Provider>
  );
};
