import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

const bundledFirestoreDatabaseId = 'firestoreDatabaseId' in firebaseConfig
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId
};

const firestoreDatabaseId =
  import.meta.env.VITE_FIREBASE_DATABASE_ID ||
  (resolvedFirebaseConfig.projectId === firebaseConfig.projectId ? bundledFirestoreDatabaseId : undefined);

// Initialize Firebase SDK
const app = initializeApp(resolvedFirebaseConfig);
export const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    try {
      // Save user profile to Firestore when Firestore is configured and available.
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp()
        });
      }
    } catch (profileError) {
      console.warn('Google sign-in succeeded, but saving the Firestore profile failed.', profileError);
    }
    
    return user;
  } catch (error) {
    const authErrorCode = (error as { code?: string })?.code;
    if (
      typeof window !== 'undefined' &&
      (authErrorCode === 'auth/popup-blocked' ||
        authErrorCode === 'auth/operation-not-supported-in-this-environment')
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export { onAuthStateChanged };
export type { User };
