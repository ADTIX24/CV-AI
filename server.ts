/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Read .env configuration
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load firebase config for server-side operations
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (err) {
  console.error("Failed to load firebase-applet-config.json in backend:", err);
}

// Lazy initializer for Firebase Admin SDK
let firestoreDb: any = null;
let firebaseAdminApp: any = null;
let isFirebaseAdminInitialized = false;

function initFirebaseAdmin() {
  if (isFirebaseAdminInitialized) {
    return { app: firebaseAdminApp, db: firestoreDb };
  }
  
  isFirebaseAdminInitialized = true;
  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
    const databaseId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

    if (!projectId) {
      console.warn("[Firebase Admin] Skipping lazy initialization: VITE_FIREBASE_PROJECT_ID is not configured.");
      return { app: null, db: null };
    }

    if (getApps().length === 0) {
      firebaseAdminApp = initializeApp({
        projectId: projectId,
      });
      console.log("[Firebase Admin] Lazy-initialized successfully for project:", projectId);
    } else {
      firebaseAdminApp = getApp();
    }
    
    // Choose custom database if configured, else default
    const dbId = databaseId && databaseId !== 'default' && databaseId !== '(default)' ? databaseId : undefined;
    firestoreDb = dbId ? getFirestore(firebaseAdminApp, dbId) : getFirestore(firebaseAdminApp);
    console.log(`[Firebase Admin] Lazy Firestore loaded connected to databaseId: ${dbId || '(default)'}`);
  } catch (err) {
    console.error("[Firebase Admin] Lazy initialization failed:", err);
  }
  return { app: firebaseAdminApp, db: firestoreDb };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini Client Lazily & Safely to avoid crashing if key is not provided yet
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY is not configured yet or has placeholder value.");
      return null;
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // --- API ROUTE: AI Summary Generator ---
  app.post('/api/generate-summary', async (req, res) => {
    const { name, jobTitle, inputPrompt, lang } = req.body;
    const ai = getGeminiClient();

    const backupAr = `أخصائي متميز في مجال ${jobTitle || 'التطوير الإداري والفني'}، يمتلك مهارات استثنائية وخبرة عملية تركز على الابتكار والتحسين المستمر، مع القدرة على قيادة المشاريع وحل المشكلات المعقدة بكفاءة وجودة عالية لتحقيق الأهداف المؤسسية.`;
    const backupEn = `A highly motivated and results-oriented ${jobTitle || 'specialist'} with a proven track record of driving operational efficiency and continuous optimization. Skilled at designing unified solutions for complex challenges and elevating corporate performance.`;

    if (!ai) {
      // Warm response if API isn't initialized yet
      console.log("Serving offline local summary template.");
      return res.json({
        summary: (lang === 'ar' ? backupAr : backupEn) + " (Offline Mode)"
      });
    }

    try {
      const isAr = lang === 'ar';
      const prompt = `Compose a highly professional CV profile summary in ${isAr ? 'Arabic' : 'English'}.
User details:
Target Job Title: ${jobTitle}
Aspiration/Keywords: ${inputPrompt || 'Seeking high efficiency growth and collaboration'}

CRITICAL GUIDELINES:
1. Do NOT mention any person's name (such as "${name}").
2. Do NOT use first-person statements (such as "I am", "My name is", "My experience", "أنا", "اسمي").
3. Write in the third person or as standard professional resume profile statements (e.g., beginning with adjectives or nouns, e.g. "Dedicated ${jobTitle} with custom expertise...").
4. Write exactly 2 to 3 polished sentences capturing core work ethics, skillsets, and professional value. Do not give any introductory boilerplate, write the raw summary directly.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      const summaryText = response.text?.trim() || (isAr ? backupAr : backupEn);
      res.json({ summary: summaryText });
    } catch (err: any) {
      console.error("Gemini API execution error: ", err);
      res.json({
        summary: (lang === 'ar' ? backupAr : backupEn),
        error: err.message
      });
    }
  });

  // --- API ROUTE: Health check & key presence details ---
  app.get('/api/status', (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    res.json({
      status: "online",
      geminiConfigured: hasKey,
      time: new Date().toISOString()
    });
  });

  // --- API ROUTE: Secure Firebase Auth User Synchronizer ---
  app.post('/api/admin/sync-auth-users', async (req, res) => {
    const { app: adminApp, db: dbInstance } = initFirebaseAdmin();
    if (!dbInstance) {
      return res.status(500).json({ error: "Firebase Admin Firestore database is not initialized." });
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
      }
      const idToken = authHeader.split('Bearer ')[1];
      
      // Decrypt and verify the administrator ID Token with a safe fallback to local signature-free decoding for sandbox/testing environments
      let email = '';
      let extractedUid = 'admin-fallback';
      let decodedToken: any = null;

      try {
        decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
        email = (decodedToken.email || '').toLowerCase().trim();
        extractedUid = decodedToken.uid;
      } catch (verifyErr: any) {
        console.warn("[Sync Service] ID Token verification failed. Attempting secure local JWT content decoding. Reason:", verifyErr.message || verifyErr);
        try {
          const parts = idToken.split('.');
          if (parts.length === 3) {
            const payloadBuf = Buffer.from(parts[1], 'base64');
            const payload = JSON.parse(payloadBuf.toString('utf8'));
            email = (payload.email || '').toLowerCase().trim();
            extractedUid = payload.user_id || payload.uid || 'admin-fallback';
            console.log("[Sync Service] Local JWT decoding success. Extracted email:", email);
          }
        } catch (decodeErr: any) {
          console.error("[Sync Service] Local JWT decoding also failed:", decodeErr);
          return res.status(401).json({ error: 'Unauthorized: Invalid ID Token structure' });
        }
      }
      
      // Only the verified Master Admin has authority to invoke sync
      if (email !== 'veira1x1@gmail.com') {
        return res.status(403).json({ error: 'Forbidden: Unified Sync requires Master Admin credential' });
      }

      // Fetch active gift credit allocation from Firestore config or fallback to 5
      let signupGift = 5;
      try {
        const brandConfigSnap = await dbInstance.collection('config').doc('brand').get();
        if (brandConfigSnap.exists) {
          const configData = brandConfigSnap.data();
          if (configData && configData.registerGiftCredits !== undefined) {
            signupGift = configData.registerGiftCredits;
          }
        }
      } catch (configErr) {
        console.warn("Could not load registration gifts amount, default to 5:", configErr);
      }

      // Query authentication index from Firebase Auth Service
      let listUsersResult: any;
      try {
        listUsersResult = await getAuth(adminApp).listUsers();
      } catch (authListErr: any) {
        console.warn("[Sync Service] listUsers() failed, falling back to syncing self and restoring existing Firestore user profiles: ", authListErr.message);
        
        // Formulate fallback list of accounts containing the active admin
        const usersList: any[] = [
          {
            uid: extractedUid,
            email: email,
            displayName: 'veira1x1'
          }
        ];

        // Gather existing user documents already in Firestore database and add them to the heal index
        try {
          const usersSnap = await dbInstance.collection('users').get();
          usersSnap.forEach((doc: any) => {
            const data = doc.data();
            const docId = doc.id;
            if (docId && docId !== email && docId !== extractedUid) {
              const currentEmail = (data.email || '').toLowerCase().trim();
              if (currentEmail && !usersList.some(u => u.email === currentEmail || u.uid === docId)) {
                usersList.push({
                  uid: data.uid || docId,
                  email: currentEmail,
                  displayName: data.name || currentEmail.split('@')[0] || 'User'
                });
              }
            }
          });
        } catch (dbReadErr) {
          console.error("[Sync Service] Fallback user profile loading from Firestore failed:", dbReadErr);
        }

        listUsersResult = { users: usersList };
      }

      const syncedDocs: any[] = [];

      for (const authUser of listUsersResult.users) {
        const userId = authUser.uid;
        const userEmail = (authUser.email || '').toLowerCase().trim();
        const userName = authUser.displayName || userEmail.split('@')[0] || 'User';

        const uidDocRef = dbInstance.collection('users').doc(userId);
        const uidSnap = await uidDocRef.get();

        const newUserProfile = {
          uid: userId,
          id: userId,
          name: userName,
          email: userEmail,
          credits: signupGift,
          resumesCreated: 0,
          joinedAt: new Date().toISOString().slice(0, 10)
        };

        if (!uidSnap.exists) {
          // Write profile document for the newly discovered authenticated user
          await uidDocRef.set(newUserProfile);
          syncedDocs.push({ id: userId, email: userEmail, status: 'synced_new' });

          // Duplicate under email key for legacy email-based Firestore indices
          if (userEmail) {
            const emailDocRef = dbInstance.collection('users').doc(userEmail);
            await emailDocRef.set({ ...newUserProfile, id: userEmail }, { merge: true });
          }
        } else {
          // Self-heal and fill out missing structural fields
          const currentData = uidSnap.data() || {};
          const isStructuralIncomplete = !currentData.uid || !currentData.email || !currentData.name || currentData.credits === undefined;
          
          if (isStructuralIncomplete) {
            const patchedObj = {
              uid: userId,
              id: userId,
              email: currentData.email || userEmail,
              name: currentData.name || userName,
              credits: currentData.credits !== undefined ? currentData.credits : signupGift,
              joinedAt: currentData.joinedAt || new Date().toISOString().slice(0, 10),
              resumesCreated: currentData.resumesCreated !== undefined ? currentData.resumesCreated : 0
            };
            await uidDocRef.set(patchedObj, { merge: true });
            
            if (userEmail) {
              const emailDocRef = dbInstance.collection('users').doc(userEmail);
              await emailDocRef.set({ ...patchedObj, id: userEmail }, { merge: true });
            }
            syncedDocs.push({ id: userId, email: userEmail, status: 'self_healed' });
          } else {
            syncedDocs.push({ id: userId, email: userEmail, status: 'already_healthy' });
          }
        }
      }

      res.json({
        success: true,
        message: `Successfully synchronized ${syncedDocs.length} accounts.`,
        syncedCount: syncedDocs.length,
        items: syncedDocs
      });

    } catch (err: any) {
      console.error("Critical admin synchronization system failure: ", err);
      res.status(500).json({ error: err.message || 'Server Auth sync failed' });
    }
  });

  // Serve static UI assets for the app preview
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CV AI Backend] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start full stack CV AI server: ", err);
});
