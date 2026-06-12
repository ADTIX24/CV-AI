import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Support Vercel / local production environment variables or fall back to default sandboxed configuration
const config = {
  apiKey: ((import.meta as any).env?.VITE_FIREBASE_API_KEY as string) || firebaseConfig.apiKey,
  authDomain: ((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfig.authDomain,
  projectId: ((import.meta as any).env?.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfig.projectId,
  storageBucket: ((import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfig.storageBucket,
  messagingSenderId: ((import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfig.messagingSenderId,
  appId: ((import.meta as any).env?.VITE_FIREBASE_APP_ID as string) || firebaseConfig.appId,
  firestoreDatabaseId: ((import.meta as any).env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || firebaseConfig.firestoreDatabaseId || undefined,
};

const app = initializeApp(config);

// CRITICAL: The app will break without compiling with the configured firestoreDatabaseId
export const db = getFirestore(app, config.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
