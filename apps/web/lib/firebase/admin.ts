import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

// Initialize Firebase Admin if it hasn't been initialized yet
let adminApp;

try {
  adminApp = getApps().length === 0 
    ? initializeApp(firebaseAdminConfig, 'admin') 
    : getApps().find(app => app.name === 'admin') || getApps()[0];

  if (!adminApp) {
    throw new Error('Failed to initialize Firebase Admin');
  }
} catch (error) {
  console.error('Firebase admin initialization error', error);
  throw new Error('Failed to initialize Firebase Admin');
}

export const adminAuth = getAuth(adminApp);
export const adminFirestore = getFirestore(adminApp);

// Helper function to get admin auth (for backward compatibility)
export function getFirebaseAdminAuth() {
  return adminAuth;
}
