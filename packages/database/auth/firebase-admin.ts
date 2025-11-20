import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

// Initialize Firebase Admin in this package to avoid cross-package imports
const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

let adminApp: App | undefined;
try {
  adminApp = getApps().length === 0
    ? initializeApp(firebaseAdminConfig, 'admin')
    : getApps().find((app) => app.name === 'admin') || getApps()[0];
} catch {
  // swallow init errors; getAuth below will throw with clearer error if needed
}

export function getFirebaseAdminAuth(): Auth {
  if (!adminApp) {
    throw new Error('Firebase Admin app not initialized');
  }
  return getAuth(adminApp);
}


