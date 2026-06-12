import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Support Vercel / local production environments or fall back to default sandboxed configuration
const isAiStudioSandbox = typeof window !== 'undefined' && 
  (window.location.hostname.includes('.run.app') || 
   window.location.hostname.includes('ai.studio') ||
   window.location.hostname.includes('google.com'));

// User's dedicated production Firebase project configuration (from Vercel / custom domain)
const userProdConfig = {
  apiKey: "AIzaSyDCcdLB8kU_ATj0NSfbT1q4fXmWdcrONWE",
  authDomain: "cv-ai-platform.firebaseapp.com",
  projectId: "cv-ai-platform",
  storageBucket: "cv-ai-platform.firebasestorage.app",
  messagingSenderId: "785621576153",
  appId: "1:785621576153:web:b10356ccc14c2aa46f91c8",
};

const config = isAiStudioSandbox 
  ? {
      apiKey: ((import.meta as any).env?.VITE_FIREBASE_API_KEY as string) || firebaseConfig.apiKey,
      authDomain: ((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfig.authDomain,
      projectId: ((import.meta as any).env?.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfig.projectId,
      storageBucket: ((import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfig.storageBucket,
      messagingSenderId: ((import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfig.messagingSenderId,
      appId: ((import.meta as any).env?.VITE_FIREBASE_APP_ID as string) || firebaseConfig.appId,
      firestoreDatabaseId: ((import.meta as any).env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || firebaseConfig.firestoreDatabaseId || undefined,
    }
  : {
      apiKey: ((import.meta as any).env?.VITE_FIREBASE_API_KEY as string) || userProdConfig.apiKey,
      authDomain: ((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN as string) || userProdConfig.authDomain,
      projectId: ((import.meta as any).env?.VITE_FIREBASE_PROJECT_ID as string) || userProdConfig.projectId,
      storageBucket: ((import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET as string) || userProdConfig.storageBucket,
      messagingSenderId: ((import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || userProdConfig.messagingSenderId,
      appId: ((import.meta as any).env?.VITE_FIREBASE_APP_ID as string) || userProdConfig.appId,
      firestoreDatabaseId: ((import.meta as any).env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || undefined,
    };

const app = initializeApp(config);

// CRITICAL: Use custom firestoreDatabaseId if provided and not default, otherwise use standard default database
const dbId = config.firestoreDatabaseId && 
             config.firestoreDatabaseId !== 'default' && 
             config.firestoreDatabaseId !== '(default)'
  ? config.firestoreDatabaseId
  : undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
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
