import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Create a secondary app helper to avoid logging out the current admin user when creating a new user
export async function registerAuthUserWithoutLoggingOut(email: string, pass: string) {
  const secondaryAppName = 'SecondaryAuthApp';
  let secondaryApp;
  try {
    const apps = getApps();
    const existingSec = apps.find(a => a.name === secondaryAppName);
    if (existingSec) {
      secondaryApp = existingSec;
    } else {
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    }
    const secondaryAuth = getAuth(secondaryApp);
    await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    console.log("Successfully pre-registered user in Firebase Auth:", email);
  } catch (error) {
    // If user already exists or other error, we log it and handle gracefully
    console.warn("Pre-register on secondary app info (can be ignored if user already exists):", error);
  }
}

// Test connection on boot as required by instructions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection established.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    }
  }
}
testConnection();

export const login = () => signInWithPopup(auth, googleProvider);
export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const logout = () => signOut(auth);
