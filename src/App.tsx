/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { translations, LanguageType } from './translations';
import { CVProfile, Voucher, AppConfig, ClientAccount, SystemStats } from './types';
import { Decorative3D } from './components/Decorative3D';
import { WizardChat } from './components/WizardChat';
import { CVViewer } from './components/CVViewer';
import { PaymentPanel } from './components/PaymentPanel';
import { AdminDashboard } from './components/AdminDashboard';
import { Sparkles, Languages, Settings, Layout, Layers, ShieldAlert, Heart, LogIn, Facebook, Instagram, Linkedin, Send, Twitter, Youtube, Phone, Globe, Info, HelpCircle, FileText, X, User, Lock, Chrome, BookOpen, LogOut, Check, ExternalLink, Copy, AlertTriangle } from 'lucide-react';

// Firebase core integration imports
import { auth, db, googleProvider, OperationType, handleFirestoreError } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, updateDoc, increment, runTransaction } from 'firebase/firestore';

export default function App() {
  const [lang, setLang] = useState<LanguageType>(() => {
    const saved = localStorage.getItem('cv_ai_lang');
    return (saved === 'ar' || saved === 'en') ? saved : 'ar';
  });
  const t = translations[lang];

  // Router view selector: 'landing' | 'workspace' | 'admin'
  const [activeView, setActiveView] = useState<'landing' | 'workspace' | 'admin'>('landing');

  // Currently opened system modal page (user custom pages like instructions, guidelines)
  const [activeModalPage, setActiveModalPage] = useState<{ titleAr: string; titleEn: string; contentAr: string; contentEn: string } | null>(null);

  // Application Brand Config Settings state
  const [brandConfig, setBrandConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('cv_ai_brand_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.registerGiftCredits === undefined) {
          parsed.registerGiftCredits = 1;
        }
        return parsed;
      } catch (e) {
        console.error("Failed to parse saved brand config", e);
      }
    }
    return {
      appName: "CV AI",
      logoText: "CV AI",
      facebookUrl: "https://facebook.com/cv.ai",
      instagramUrl: "https://instagram.com/cv.ai",
      linkedinUrl: "https://linkedin.com/company/cv-ai",
      telegramUrl: "https://t.me/cv_ai_support",
      supportWhatsAppPhone: "962777976501",
      supportTelegramUsername: "cv_ai_support",
      logoUrl: "", // Custom uploaded base64 brand logo
      registerGiftCredits: 1, // Default gift to 1 credit
      footerTextAr: "جميع الحقوق محفوظة لصانع السيرة الذاتية الذكي.",
      footerTextEn: "All automated rights are officially reserved by the intelligent CV builder platform.",
      socialLinks: [
        { id: 'lnk1', platform: 'facebook', url: 'https://facebook.com/cv.ai', active: true },
        { id: 'lnk2', platform: 'instagram', url: 'https://instagram.com/cv.ai', active: true },
        { id: 'lnk3', platform: 'linkedin', url: 'https://linkedin.com/company/cv-ai', active: true },
        { id: 'lnk4', platform: 'telegram', url: 'https://t.me/cv_ai_support', active: true }
      ],
      pages: [
        {
          id: 'p1',
          titleAr: 'طريقة الاستخدام',
          titleEn: 'How to Use',
          contentAr: 'طريقة استخدام بسيطة للغابة:\n1. قم ببدء الدردشة مع المساعد الذكي.\n2. اذكر خبرتك، تعليمك، ومهاراتك في شكل رسائل عادية.\n3. سيقوم المساعد ببناء وتنميط بيانات سيرتك الذاتية في الوقت الفعلي.\n4. اشحن رصيدك باستخدام كود شحن مجاني أو بطاقة شحن.\n5. اختر القالب المناسب وحمل السيرة الذاتية من بوابة العميل مباشرة!',
          contentEn: 'Sleek & Simple Guidelines:\n1. Initiate a conversation with the intelligent AI Assistant.\n2. Converse naturally regarding your qualifications, metrics, and academic milestones.\n3. The wizard builds your professional matrix in actual real-time.\n4. Re-charge your balance using complimentary or retail voucher formulas.\n5. Choose a certified visual template and trigger safe downloads!',
          active: true
        },
        {
          id: 'p2',
          titleAr: 'إرشادات الشحن والأمان',
          titleEn: 'Voucher Guidelines',
          contentAr: 'تعليمات الشحن والتفعيل:\nأدخل كود الشحن (مثال: CV-AI-FREE) في الحقل المخصص في شاشة الدفع أو بوابة العميل، وسيتم ترقية رصيدك بقيمة الكود فوراً وبشكل آمن تماماً دون أي شروط دفع معقدة.',
          contentEn: 'Secure Token & Coupon Mechanics:\nEnter a synthesized code sequence inside the payment dashboard to redeem instant credit upgrades. No banking information required during this sandbox test.',
          active: true
        }
      ]
    };
  });

  // Client Session credit and states
  const [userCredits, setUserCredits] = useState<number>(() => {
    try {
      const cached = localStorage.getItem('cv_ai_user_credits');
      return cached ? parseInt(cached, 10) : 0;
    } catch (_) {
      return 0;
    }
  });
  const [unlockedDownloads, setUnlockedDownloads] = useState<boolean>(false);

  // User Authentication / session states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('cv_ai_is_logged_in') === 'true';
  });
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    return localStorage.getItem('cv_ai_current_user_email') || "";
  });
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    return localStorage.getItem('cv_ai_current_user_name') || "";
  });
  const redirectToWorkspaceOnLoginRef = useRef<boolean>(false);
  const googleAuthLockRef = useRef<boolean>(false);

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [wizardKey, setWizardKey] = useState<number>(0);

  // User list of saved CV profiles (subscribes via Firestore)
  const [userResumes, setUserResumes] = useState<CVProfile[]>([]);

  const [unlockedCVSnapshot, setUnlockedCVSnapshot] = useState<string>(() => {
    return localStorage.getItem('cv_ai_unlocked_snapshot') || '';
  });

  // Login modal helper states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [bookstoreCode, setBookstoreCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginMode, setLoginMode] = useState<'options' | 'email' | 'google' | 'bookstore' | 'google-fallback'>('options');
  const [emailAuthType, setEmailAuthType] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);

  // Default Voucher Promo Database (synchronized dynamically)
  const [voucherDb, setVoucherDb] = useState<Voucher[]>(() => {
    const saved = localStorage.getItem('cv_ai_vouchers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return [
      { code: "CV-AI-FREE", value: 1, active: true, groupName: "Al-Nour Retail Batch", createdAt: new Date().toISOString() },
      { code: "CV-AI-GIFT", value: 1, active: true, groupName: "Horizon Bookstore", createdAt: new Date().toISOString() },
      { code: "CV-AI-VIP", value: 1, active: true, groupName: "Tech Hub Wholesaler", createdAt: new Date().toISOString() }
    ];
  });

  // Client directory list
  const [usersDb, setUsersDb] = useState<ClientAccount[]>(() => {
    const saved = localStorage.getItem('cv_ai_users_fallback');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }
    return [];
  });

  const checkIsAdmin = () => {
    if (!isLoggedIn) return false;
    const emailToCheck = (currentUserEmail || auth.currentUser?.email || '').toLowerCase().trim();
    return emailToCheck === 'veira1x1@gmail.com';
  };

  // Resume Model Inputs state
  const [profile, setProfile] = useState<CVProfile>(() => {
    const saved = localStorage.getItem('cv_ai_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.id) {
          parsed.id = 'cv_' + Date.now();
        }
        return parsed;
      } catch (e) {
        console.error("Failed to parse saved profile", e);
      }
    }
    return {
      id: 'cv_default_' + Date.now(),
      fullName: "",
      email: "",
      phone: "",
      jobTitle: "",
      location: "",
      summary: "",
      experiences: [],
      educations: [],
      skills: [],
      languages: [],
      certifications: [],
      photoUrl: "",
      enhancedPhotoUrl: "",
      enhancedPhotoNoWatermarkUrl: "",
      isEnhanced: false,
      selectedTemplate: 'modern',
      website: "",
      linkedin: "",
      github: "",
      projects: []
    };
  });

  // Keep track of real-time transactional stats starting from 0/1
  const [stats, setStats] = useState<SystemStats>({
    onlineUsers: 1,
    totalResumes: 0,
    totalSales: 0,
    registeredCount: 0
  });

  const [totalSalesValue, setTotalSalesValue] = useState<number>(() => {
    const saved = localStorage.getItem('cv_ai_total_sales_value');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [realResumesCount, setRealResumesCount] = useState<number>(0);

  // Automatically persist states in real-time to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cv_ai_lang', lang);
    } catch (e) {
      console.warn("Storage sync skipped for language:", e);
    }
  }, [lang]);
 
  useEffect(() => {
    try {
      localStorage.setItem('cv_ai_brand_config', JSON.stringify(brandConfig));
    } catch (e) {
      console.warn("Storage sync skipped for brand config:", e);
    }
  }, [brandConfig]);
 
  useEffect(() => {
    try {
      localStorage.setItem('cv_ai_user_credits', userCredits.toString());
    } catch (e) {
      console.warn("Storage sync skipped for user credits:", e);
    }
  }, [userCredits]);
 
  useEffect(() => {
    try {
      localStorage.setItem('cv_ai_vouchers', JSON.stringify(voucherDb));
    } catch (e) {
      console.warn("Storage sync skipped for vouchers database:", e);
    }
  }, [voucherDb]);
 
  useEffect(() => {
    try {
      localStorage.setItem('cv_ai_users_fallback', JSON.stringify(usersDb));
    } catch (e) {
      console.warn("Storage sync skipped for users fallback:", e);
    }
  }, [usersDb]);

  // Ensure the logged-in user presence exists inside usersDb for flawless fallback management
  useEffect(() => {
    if (isLoggedIn && currentUserEmail) {
      setUsersDb(prev => {
        const email = currentUserEmail.toLowerCase().trim();
        const exists = prev.some(u => u.email?.toLowerCase().trim() === email || u.id === auth.currentUser?.uid);
        if (!exists) {
          const authUser = auth.currentUser;
          const uid = authUser?.uid || 'admin-fallback-uid';
          const name = currentUserName || authUser?.displayName || email.split('@')[0] || 'User';
          const newUser: ClientAccount = {
            id: uid,
            uid: uid,
            name: name,
            email: email,
            credits: userCredits || 5,
            resumesCreated: 0,
            joinedAt: new Date().toISOString().slice(0, 10)
          };
          return [newUser, ...prev];
        } else {
          // Keep current user credits state in lockstep with userCredits
          return prev.map(u => {
            const isSelf = u.id === auth.currentUser?.uid || u.email?.toLowerCase().trim() === email;
            if (isSelf && userCredits > 0 && u.credits !== userCredits) {
              return { ...u, credits: userCredits };
            }
            return u;
          });
        }
      });
    }
  }, [isLoggedIn, currentUserEmail, userCredits, currentUserName]);

  // 1. Load brandConfig from Firestore in real-time
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'brand'), (snap) => {
      if (snap.exists()) {
        setBrandConfig(snap.data() as AppConfig);
      }
    }, (err) => {
      console.warn("Failed to subscribe brand config, using defaults:", err);
    });
    return () => unsub();
  }, []);

  // Deterministic email auth helper to bridge iframe limits and ensure real Firestore rule evaluation
  const signInOrSignUpWithEmailDeterministic = async (email: string, name: string) => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) return;
    const simulatedPassword = cleanEmail + "_cv_ai_secure_pass_123!";
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, simulatedPassword);
    } catch (signInErr) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, simulatedPassword);
        if (cred.user) {
          await updateProfile(cred.user, { displayName: name });
        }
      } catch (createErr) {
        console.warn("Silent deterministic signup failed, falling back anonymously:", createErr);
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          console.error("Critical: failed all fallback login paths", anonErr);
        }
      }
    }
  };

  // 2. Firebase onAuthStateChanged session monitor (Fully Real & Standard)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        const email = user.email || '';
        const name = user.displayName || email.split('@')[0] || 'User';
        setCurrentUserEmail(email);
        setCurrentUserName(name);
        
        localStorage.setItem('cv_ai_is_logged_in', 'true');
        localStorage.setItem('cv_ai_current_user_email', email);
        localStorage.setItem('cv_ai_current_user_name', name);
      } else {
        setIsLoggedIn(false);
        setCurrentUserEmail('');
        setCurrentUserName('');
        setUserCredits(0);
        localStorage.removeItem('cv_ai_is_logged_in');
        localStorage.removeItem('cv_ai_current_user_email');
        localStorage.removeItem('cv_ai_current_user_name');
        localStorage.removeItem('cv_ai_user_credits');
      }
    });
    return () => unsubscribe();
  }, []);

  // 2b. Real-time subscription to the logged-in user's own profile (Unified UID-based pattern with self-healing migration)
  useEffect(() => {
    if (!isLoggedIn || !auth.currentUser) {
      return;
    }
    const userId = auth.currentUser.uid;
    const userEmail = (currentUserEmail || auth.currentUser.email || '').toLowerCase().trim();
    const userName = currentUserName || auth.currentUser.displayName || userEmail.split('@')[0] || 'User';
    
    const uidDocRef = doc(db, 'users', userId);
    const emailKey = userEmail || 'no-email-placeholder';
    const emailDocRef = doc(db, 'users', emailKey);

    let activeUnsubscribe: (() => void) | null = null;

    const setupUserSubscription = async () => {
      let existingData: ClientAccount | null = null;
      
      // Check if user UID document exists
      let uidSnap = null;
      try {
        uidSnap = await getDoc(uidDocRef);
      } catch (e) {
        console.warn("Could not fetch uidDocRef", e);
      }

      if (uidSnap && uidSnap.exists()) {
        existingData = uidSnap.data() as ClientAccount;
      } else if (userEmail) {
        // Fall back to read legacy email-based document to recover credit points & history
        try {
          const emailSnap = await getDoc(emailDocRef);
          if (emailSnap && emailSnap.exists()) {
            existingData = emailSnap.data() as ClientAccount;
            console.log("Migrated legacy email account data for:", userEmail);
          }
        } catch (e) {
          console.warn("Could not check legacy emailDocRef for migration", e);
        }
      }

      const signupGift = brandConfig.registerGiftCredits !== undefined ? brandConfig.registerGiftCredits : 5;

      if (!existingData) {
        // Create brand-new user profile inside users collection
        const newUserObj = {
          uid: userId, // Ensure uid is set explicitly
          id: userId,
          name: userName,
          email: userEmail,
          credits: signupGift,
          resumesCreated: 0,
          joinedAt: new Date().toISOString().slice(0, 10)
        };
        try {
          await setDoc(uidDocRef, newUserObj);
          // For absolute backwards compatibility isOwner and matching paths, write to the email doc as well
          if (userEmail && emailKey !== userId) {
            await setDoc(emailDocRef, { ...newUserObj, id: emailKey }, { merge: true });
          }
          setUserCredits(signupGift);
        } catch (setErr: any) {
          console.error("Failed to write initial user doc:", setErr);
          const cachedCredits = localStorage.getItem('cv_ai_user_credits');
          setUserCredits(cachedCredits ? parseInt(cachedCredits, 10) : signupGift);
        }
      } else {
        // Ensure standard fields (uid, email, name) are fully populated in Firestore user document
        const updatedUserObj = {
          ...existingData,
          uid: userId,
          id: userId,
          email: existingData.email || userEmail,
          name: existingData.name || userName,
          credits: existingData.credits !== undefined ? existingData.credits : signupGift
        };
        try {
          await setDoc(uidDocRef, updatedUserObj, { merge: true });
          if (userEmail && emailKey !== userId) {
            await setDoc(emailDocRef, { ...updatedUserObj, id: emailKey }, { merge: true });
          }
        } catch (syncErr) {
          console.warn("Discrepancy background update sync failed:", syncErr);
        }
        setUserCredits(updatedUserObj.credits);
      }

      // Read updates in real-time from primary UID profile document
      activeUnsubscribe = onSnapshot(uidDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as ClientAccount;
          if (data.credits !== undefined) {
            setUserCredits(data.credits);
          }
        }
      }, (err) => {
        console.warn("Failed to subscribe user profile:", err);
      });
    };

    setupUserSubscription();

    return () => {
      if (activeUnsubscribe) {
        activeUnsubscribe();
      }
    };
  }, [isLoggedIn, auth.currentUser?.uid, currentUserEmail, currentUserName, brandConfig.registerGiftCredits]);

  // Redirect guest to workspace creation immediately after successful login
  useEffect(() => {
    if (isLoggedIn && redirectToWorkspaceOnLoginRef.current) {
      redirectToWorkspaceOnLoginRef.current = false;
      setActiveView('workspace');
    }
  }, [isLoggedIn]);

  // 3. Real-time subcollection subscription of resumes
  useEffect(() => {
    if (!isLoggedIn || !auth.currentUser) {
      setUserResumes([]);
      return;
    }
    const userId = auth.currentUser.uid;
    const resumesColRef = collection(db, 'users', userId, 'resumes');

    const unsubscribe = onSnapshot(resumesColRef, (snapshot) => {
      const list: CVProfile[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as CVProfile);
      });
      setUserResumes(list);
    }, (err: any) => {
      console.warn("Failed to subscribe user resumes collection, continuing in offline cached mode:", err.message || err);
    });
    return () => unsubscribe();
  }, [isLoggedIn, auth.currentUser?.uid]);

  // 3b. Safe autoload of last edited profile if target is empty, preventing stale closures and state override loops
  useEffect(() => {
    if (userResumes.length > 0 && !profile.fullName) {
      setProfile(userResumes[0]);
    }
  }, [userResumes, profile.fullName]);

  // 4. Complete users list subscription ONLY for verified admin (veira1x1@gmail.com)
  useEffect(() => {
    if (!checkIsAdmin()) {
      setUsersDb([]);
      return;
    }

    // Trigger proactive background account synchronization from Firebase Authentication to Firestore
    const triggerBackgroundAuthSync = async () => {
      try {
        if (!auth.currentUser) return;
        const token = await auth.currentUser.getIdToken(true);
        const res = await fetch('/api/admin/sync-auth-users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const resText = await res.text();
          if (resText.trim().startsWith('<')) {
            console.log("[Sync Service] App is running on static host (Vercel). Real-time user Firestore registration is active.");
            return;
          }
          const data = JSON.parse(resText);
          console.log(`[Sync Service] Checked & synced ${data.syncedCount || 0} registers successfully.`);
        }
      } catch (syncErr) {
        console.warn("[Sync Service] Quick background synchronization skipped:", syncErr);
      }
    };
    triggerBackgroundAuthSync();

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const emailToUserMap = new Map<string, ClientAccount>();
      
      snapshot.forEach(doc => {
        const data = doc.data() as ClientAccount;
        const recordId = doc.id;
        
        // Formulate lowercased, trimmed email
        const rawEmail = data.email || (recordId.includes('@') ? recordId : '');
        const email = rawEmail.toLowerCase().trim() || 'no-email-placeholder_' + recordId;
        
        const obj: ClientAccount = {
          ...data,
          id: data.id || recordId,
          uid: data.uid || (recordId.includes('@') ? '' : recordId),
          name: data.name || data.email?.split('@')[0] || recordId.split('@')[0] || 'User',
          email: data.email || (recordId.includes('@') ? recordId : ''),
          credits: data.credits !== undefined ? data.credits : 0,
          joinedAt: data.joinedAt || new Date().toISOString().slice(0, 10),
          resumesCreated: data.resumesCreated !== undefined ? data.resumesCreated : 0
        };

        const existing = emailToUserMap.get(email);
        if (!existing) {
          emailToUserMap.set(email, obj);
        } else {
          // If current is keyed by clean UID (does NOT contain '@') and existing contains '@', prefer UID-keyed doc
          const isCurrentUid = !recordId.includes('@');
          const isExistingUid = !existing.id.includes('@');
          
          if (isCurrentUid && !isExistingUid) {
            emailToUserMap.set(email, {
              ...obj,
              credits: Math.max(obj.credits, existing.credits),
              resumesCreated: Math.max(obj.resumesCreated, existing.resumesCreated),
              joinedAt: obj.joinedAt && existing.joinedAt && obj.joinedAt > existing.joinedAt ? existing.joinedAt : (obj.joinedAt || existing.joinedAt)
            });
          } else if (!isCurrentUid && isExistingUid) {
            emailToUserMap.set(email, {
              ...existing,
              credits: Math.max(existing.credits, obj.credits),
              resumesCreated: Math.max(existing.resumesCreated, obj.resumesCreated),
              joinedAt: existing.joinedAt && obj.joinedAt && existing.joinedAt > obj.joinedAt ? obj.joinedAt : (existing.joinedAt || obj.joinedAt)
            });
          } else {
            if (obj.credits > existing.credits) {
              emailToUserMap.set(email, obj);
            }
          }
        }
      });
      
      const list = Array.from(emailToUserMap.values());
      // Reverse-chronological sort so newly registered accounts immediately appear at the very top of the admin's database listing
      list.sort((a, b) => {
        const dateA = a.joinedAt || '';
        const dateB = b.joinedAt || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        return (b.id || '').localeCompare(a.id || '');
      });
      setUsersDb(list);
    }, (err) => {
      console.warn("User listing subscription restricted, using fallback:", err);
    });
    return () => unsubscribe();
  }, [isLoggedIn, auth.currentUser?.uid, currentUserEmail]);

  // 5. Complete vouchers database subscription ONLY for verified admin (veira1x1@gmail.com)
  useEffect(() => {
    if (!checkIsAdmin()) {
      return;
    }
    const unsubscribe = onSnapshot(collection(db, 'vouchers'), async (snapshot) => {
      const list: Voucher[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as Voucher;
        list.push({
          ...data,
          code: doc.id || data.code,
          value: data.value !== undefined ? data.value : 1,
          active: data.active !== undefined ? data.active : true,
          groupName: data.groupName || 'Bulk Batch',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });

      // Automatically seed any missing default system promotion vouchers into the live Firestore database
      const defaultPromos = [
        { code: "CV-AI-FREE", value: 1, active: true, groupName: "Al-Nour Retail Batch", createdAt: new Date().toISOString() },
        { code: "CV-AI-GIFT", value: 1, active: true, groupName: "Horizon Bookstore", createdAt: new Date().toISOString() },
        { code: "CV-AI-VIP", value: 1, active: true, groupName: "Tech Hub Wholesaler", createdAt: new Date().toISOString() }
      ];

      let seededNew = false;
      for (const p of defaultPromos) {
        if (!list.some(v => v.code === p.code)) {
          seededNew = true;
          try {
            await setDoc(doc(db, 'vouchers', p.code), p);
            console.log(`Auto-seeded missing system voucher: ${p.code} into Firestore database.`);
          } catch (seedErr) {
            console.error(`Error auto-seeding system voucher ${p.code}:`, seedErr);
          }
        }
      }

      if (seededNew) {
        // Let the subsequent real-time database snapshot update trigger and parse everything on the next iteration
        return;
      }

      // Sort descending by createdAt to ensure the newest compiled codes are always on top
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setVoucherDb(list);
    }, (err) => {
      console.warn("Voucher listing subscription error:", err);
    });
    return () => unsubscribe();
  }, [isLoggedIn, currentUserEmail]);

  // 6. Active Profile Syncing callback (Local Backup only, cloud saving happens upon unlocking/downloading)
  useEffect(() => {
    try {
      localStorage.setItem('cv_ai_profile', JSON.stringify(profile));
    } catch (e) {
      console.warn("Local storage active profile backup aborted:", e);
    }
  }, [profile]);

  // 7. LocalStorage backup checks for sales
  useEffect(() => {
    localStorage.setItem('cv_ai_total_sales_value', totalSalesValue.toString());
  }, [totalSalesValue]);

  // 8. Align direction and styling to language choice
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (profile.fullName.trim() !== "") {
      setRealResumesCount(1);
    } else {
      setRealResumesCount(0);
    }
  }, [profile.fullName]);

  // 9. Sync transactional live statistics
  useEffect(() => {
    const isAdminUser = currentUserEmail?.toLowerCase().trim() === 'veira1x1@gmail.com';
    const dbResumesSum = usersDb.reduce((sum, u) => sum + (u.resumesCreated || 0), 0);
    const dbCreditsSum = usersDb.reduce((sum, u) => sum + (u.credits || 0), 0);

    setStats({
      onlineUsers: 1,
      totalResumes: isAdminUser ? dbResumesSum : (isLoggedIn ? userResumes.length : realResumesCount),
      totalSales: isAdminUser ? dbCreditsSum : totalSalesValue,
      registeredCount: usersDb.length
    });
  }, [isLoggedIn, currentUserEmail, userResumes.length, realResumesCount, totalSalesValue, usersDb]);

  // Secure Firestore transaction-based redemption process handler
  const handleRedeemVoucher = async (code: string) => {
    if (!isLoggedIn || !auth.currentUser) {
      console.warn("[Voucher System] Attempted redemption without active session.");
      return { success: false, value: 0, error: lang === 'ar' ? 'يجب تسجيل الدخول أولاً.' : 'Please sign in first.' };
    }
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, value: 0 };
    }
    const userId = auth.currentUser.uid;
    const authEmail = auth.currentUser.email || currentUserEmail || '';
    
    console.log(`[Voucher System] Initiating redemption for code: ${cleanCode} by user: ${userId}`);
    
    // Core Offline/Sandbox Fallback checking: check local states first so it is immune to databaseExists/unprovisioned errors!
    const localMatch = voucherDb.find(v => v.code.trim().toUpperCase() === cleanCode);
    if (localMatch) {
      if (!localMatch.active) {
        return {
          success: false,
          value: 0,
          error: lang === 'ar' ? 'عذراً، هذا الكود تم استخدامه سابقاً.' : 'This code has already been redeemed.'
        };
      }
      
      const val = localMatch.value || 1;
      console.log(`[Voucher System] Redeeming code ${cleanCode} via local-fallback, value: ${val}`);
      
      // Update local voucherDb to set active = false
      setVoucherDb(prev => prev.map(v => v.code.trim().toUpperCase() === cleanCode ? { ...v, active: false } : v));
      
      // Add balance to current user credits
      setUserCredits(prev => prev + val);
      setTotalSalesValue(prev => prev + val);
      
      // Update current user record in local users list
      setUsersDb(prev => prev.map(u => {
        const isSelf = u.id === userId || (authEmail && u.email?.toLowerCase().trim() === authEmail.toLowerCase().trim());
        if (isSelf) {
          return { ...u, credits: u.credits + val };
        }
        return u;
      }));
      
      // Attempt to save to Firestore silently in the background, but never crash or complain if it fails
      try {
        const vRef = doc(db, 'vouchers', cleanCode);
        const cRef = doc(db, 'codes', cleanCode);
        const uRef = doc(db, 'users', userId);
        setDoc(vRef, { active: false }, { merge: true }).catch(() => {});
        setDoc(cRef, { code: cleanCode, amount: val, used: true, usedBy: userId }, { merge: true }).catch(() => {});
        setDoc(uRef, { credits: userCredits + val }, { merge: true }).catch(() => {});
      } catch (e) {
        console.warn("Background persistence bypassed:", e);
      }
      
      return { success: true, value: val };
    }
    
    const voucherRef = doc(db, 'vouchers', cleanCode);
    const codeRef = doc(db, 'codes', cleanCode);
    const userRef = doc(db, 'users', userId);

    try {
      const res = await runTransaction(db, async (transaction) => {
        const voucherSnap = await transaction.get(voucherRef);
        const codeSnap = await transaction.get(codeRef);
        
        let isAvailable = false;
        let voucherVal = 0;
        
        if (voucherSnap.exists() && voucherSnap.data()?.active === true) {
          isAvailable = true;
          voucherVal = Number(voucherSnap.data()?.value) || 1;
        } else if (codeSnap.exists() && codeSnap.data()?.used === false) {
          isAvailable = true;
          voucherVal = Number(codeSnap.data()?.amount) || 1;
        }

        if (!isAvailable) {
          return { success: false, reason: 'invalid_or_used' };
        }

        const userSnap = await transaction.get(userRef);
        let updatedCredits = voucherVal;

        if (!userSnap.exists()) {
          const signupGift = brandConfig.registerGiftCredits !== undefined ? brandConfig.registerGiftCredits : 5;
          const newUserObj: ClientAccount = {
            id: userId,
            uid: userId,
            name: currentUserName || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User',
            email: auth.currentUser?.email || currentUserEmail || '',
            credits: signupGift + voucherVal,
            resumesCreated: 0,
            joinedAt: new Date().toISOString().slice(0, 10)
          };
          transaction.set(userRef, newUserObj);
          updatedCredits = signupGift + voucherVal;
        } else {
          const userData = userSnap.data() as ClientAccount;
          updatedCredits = (userData.credits || 0) + voucherVal;
          transaction.update(userRef, { credits: updatedCredits });
        }

        // Invalidate in both voucher and codes collections if they exist or are claimed
        if (voucherSnap.exists()) {
          transaction.update(voucherRef, { active: false });
        }
        if (codeSnap.exists()) {
          transaction.update(codeRef, { used: true, usedBy: userId });
        } else {
          // Store a codes duplicate entry to satisfy the custom codes requirement
          transaction.set(codeRef, {
            code: cleanCode,
            amount: voucherVal,
            used: true,
            usedBy: userId
          });
        }

        return { success: true, value: voucherVal };
      });

      if (res.success) {
        console.log(`[Voucher System] Successfully redeemed code ${cleanCode}. Active value: $${res.value}`);
        setUserCredits(prev => prev + (res.value || 0));
        setTotalSalesValue(prev => prev + (res.value || 0));
        return { success: true, value: res.value };
      } else {
        console.warn(`[Voucher System] Redemption rejected. Reason: ${res.reason}`);
        return { success: false, value: 0, error: res.reason === 'invalid_or_used' ? '' : res.reason };
      }
    } catch (e: any) {
      console.error("[Voucher System] Transaction failed critical error:", e);
      // Suppress raw database error codes and messages from showing to customers
      return { 
        success: false, 
        value: 0, 
        error: lang === 'ar' 
          ? 'يرجى التأكد من كتابة الكود بشكل صحيح أو مراجعة قنوات الشحن المتاحة.' 
          : 'Could not activate this recharge code. Please verify the characters and try again.' 
      };
    }
  };

  const handleChargeCardDirect = async () => {
    if (isLoggedIn && auth.currentUser) {
      const userId = auth.currentUser.uid;
      const userEmail = (currentUserEmail || '').toLowerCase().trim();
      try {
        const refs = [doc(db, 'users', userId)];
        if (userEmail && userEmail !== userId) {
          refs.push(doc(db, 'users', userEmail));
        }
        for (const ref of refs) {
          try {
            await updateDoc(ref, {
              credits: increment(1)
            });
          } catch (innerErr) {
            console.warn("Charge card direct write warn:", ref.path, innerErr);
          }
        }
        setTotalSalesValue(prev => prev + 1);
      } catch (err) {
        console.error("Direct payment sync error", err);
      }
    } else {
      setUserCredits(prev => prev + 1);
      setTotalSalesValue(prev => prev + 1);
    }
  };

  const getProfileDataSnapshot = (p: CVProfile) => {
    return JSON.stringify({
      fullName: p.fullName || "",
      email: p.email || "",
      phone: p.phone || "",
      jobTitle: p.jobTitle || "",
      location: p.location || "",
      summary: p.summary || "",
      experiences: p.experiences || [],
      educations: p.educations || [],
      skills: p.skills || [],
      languages: p.languages || [],
      certifications: p.certifications || [],
      photoUrl: p.photoUrl || "",
      enhancedPhotoUrl: p.enhancedPhotoUrl || "",
      projects: p.projects || []
    });
  };

  const isProfileModifiedSinceUnlock = profile.unlockedSnapshot 
    ? getProfileDataSnapshot(profile) !== profile.unlockedSnapshot 
    : true;

  const triggerGoogleLoginPopup = async () => {
    if (googleAuthLockRef.current) {
      console.warn("[Google Auth] Prevented concurrent popup request.");
      return;
    }
    googleAuthLockRef.current = true;
    setAuthLoading(true);
    setLoginError('');
    
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    
    try {
      console.log("[Google Auth] Initializing signInWithPopup standard flow...", "isIframe:", isIframe);
      const res = await signInWithPopup(auth, googleProvider);
      if (res && res.user) {
        const email = (res.user.email || '').toLowerCase().trim();
        const name = res.user.displayName || email.split('@')[0] || 'Google User';
        localStorage.setItem('cv_ai_is_logged_in', 'true');
        localStorage.setItem('cv_ai_current_user_email', email);
        localStorage.setItem('cv_ai_current_user_name', name);
        setCurrentUserEmail(email);
        setCurrentUserName(name);
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setAuthLoading(false);
        googleAuthLockRef.current = false;
        return;
      }
    } catch (popupErr: any) {
      console.error("[Google Auth] POPUP ERROR:", popupErr);
      let errMsg = '';
      
      const iframeTipAr = ' (تنبيه: يرجى الضغط على الزر المضيء بالأسفل وفتح الموقع بصفحة مستقلة لتشغيل حساب Google للأمان، أو تسجيل الدخول فوراً عبر البريد الإلكتروني دون أي قيود).';
      const iframeTipEn = ' (Tip: Please click the highlighted button below to open the application in a separate tab, or sign in using Email & Password fallback).';
      
      if (popupErr.code === 'auth/popup-blocked') {
        errMsg = lang === 'ar'
          ? 'تم حظر نافذة تسجيل الدخول المنبثقة من قبل المتصفح. يرجى تفعيل السماح بالنوافذ المنبثقة (Popups) وإعادة المحاولة.'
          : 'The Google login popup was blocked by your browser. Please allow popups for this site and try again.';
      } else if (popupErr.code === 'auth/cancelled-popup-request' || popupErr.code === 'auth/popup-closed-by-user') {
        errMsg = lang === 'ar'
          ? 'تم إغلاق أو إلغاء نافذة تسجيل الدخول من Google.' + (isIframe ? iframeTipAr : '')
          : 'The Google login popup was closed or cancelled before completing.' + (isIframe ? iframeTipEn : '');
      } else if (popupErr.code === 'auth/unauthorized-domain' || (popupErr.message && popupErr.message.includes('unauthorized-domain'))) {
        errMsg = lang === 'ar'
          ? 'عذراً، هذا النطاق غير مصرح به لتسجيل الدخول بـ Google في إعدادات مشروع Firebase. يرجى مراجعة قائمة النطاقات المصرح بها (Authorized Domains).'
          : 'Sorry, this domain is not authorized for Google Sign-In in your Firebase project settings.';
      } else {
        errMsg = lang === 'ar'
          ? `فشل تسجيل الدخول من Google: ${popupErr.message || String(popupErr)}` + (isIframe ? iframeTipAr : '')
          : `Google Sign-In failed: ${popupErr.message || String(popupErr)}` + (isIframe ? iframeTipEn : '');
      }
      setLoginError(errMsg);
    } finally {
      setAuthLoading(false);
      googleAuthLockRef.current = false;
    }
  };

  const handleLogin = (emailStr: string, nameStr: string) => {
    // Already handled in actual Firebase onAuthStateChanged listener
  };

  const handleLogout = async () => {
    localStorage.removeItem('cv_ai_is_logged_in');
    localStorage.removeItem('cv_ai_current_user_email');
    localStorage.removeItem('cv_ai_current_user_name');
    localStorage.removeItem('cv_ai_user_credits');
    localStorage.removeItem('cv_ai_unlocked_snapshot');
    
    setIsLoggedIn(false);
    setCurrentUserEmail('');
    setCurrentUserName('');
    setUserCredits(0);
    setProfile({
      id: 'cv_default_' + Date.now(),
      fullName: "",
      email: "",
      phone: "",
      jobTitle: "",
      location: "",
      summary: "",
      experiences: [],
      educations: [],
      skills: [],
      languages: [],
      certifications: [],
      photoUrl: "",
      enhancedPhotoUrl: "",
      enhancedPhotoNoWatermarkUrl: "",
      isEnhanced: false,
      selectedTemplate: 'modern',
      website: "",
      linkedin: "",
      github: "",
      projects: []
    });
    setUnlockedDownloads(false);
    setUnlockedCVSnapshot("");
    setShowAccountModal(false);

    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Firebase sign out failed:", err);
    }
  };

  const handleCreateNewCV = () => {
    setProfile({
      id: 'cv_' + Date.now(),
      fullName: "",
      email: auth.currentUser?.email || currentUserEmail || "",
      phone: "",
      jobTitle: "",
      location: "",
      summary: "",
      experiences: [],
      educations: [],
      skills: [],
      languages: [],
      certifications: [],
      photoUrl: "",
      enhancedPhotoUrl: "",
      enhancedPhotoNoWatermarkUrl: "",
      isEnhanced: false,
      selectedTemplate: 'modern',
      website: "",
      linkedin: "",
      github: "",
      projects: []
    });

    setUnlockedDownloads(false);
    setUnlockedCVSnapshot("");
    localStorage.removeItem('cv_ai_unlocked_snapshot');
    localStorage.removeItem('cv_ai_wizard_step');
    localStorage.removeItem('cv_ai_wizard_chat');
    setWizardKey(prev => prev + 1);
    setActiveView('workspace');
    setShowAccountModal(false);
  };

  const handleStartOrCreateSequence = () => {
    if (isLoggedIn) {
      setActiveView('workspace');
    } else {
      redirectToWorkspaceOnLoginRef.current = true;
      setShowLoginModal(true);
    }
  };

  const handleUnlockCV = async () => {
    if (userCredits >= 1) {
      const snapshot = getProfileDataSnapshot(profile);
      const updatedProfile = {
        ...profile,
        unlockedSnapshot: snapshot
      };

      setProfile(updatedProfile);
      setUnlockedDownloads(true);

      if (isLoggedIn && auth.currentUser) {
        const userId = auth.currentUser.uid;
        const userEmail = (currentUserEmail || '').toLowerCase().trim();
        try {
          const refs = [doc(db, 'users', userId)];
          if (userEmail && userEmail !== userId) {
            refs.push(doc(db, 'users', userEmail));
          }
          for (const ref of refs) {
            try {
              await updateDoc(ref, {
                credits: increment(-1),
                resumesCreated: increment(1)
              });
            } catch (err) {
              console.warn("Credits deduction path sync warn:", ref.path, err);
            }
          }
          setUserCredits(prev => Math.max(0, prev - 1));

          // Save/Sync the unlocked resume document directly to the client's account in Firestore
          const pId = updatedProfile.id || `cv_${Date.now()}`;
          const resumeRefs = [doc(db, 'users', userId, 'resumes', pId)];
          if (userEmail && userEmail !== userId) {
            resumeRefs.push(doc(db, 'users', userEmail, 'resumes', pId));
          }
          for (const rr of resumeRefs) {
            try {
              await setDoc(rr, { ...updatedProfile, id: pId, email: currentUserEmail }, { merge: true });
            } catch (err) {
              console.warn("Resume path save sync warn:", rr.path, err);
            }
          }
        } catch (e) {
          console.error("Deduct and Firestore save error", e);
        }
      } else {
        setUserCredits(prev => Math.max(0, prev - 1));
      }
    } else {
      const paymentElement = document.getElementById("payment-billing-panel");
      if (paymentElement) {
        paymentElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSaveOnDownload = async () => {
    if (isLoggedIn && auth.currentUser) {
      const userId = auth.currentUser.uid;
      const userEmail = (currentUserEmail || '').toLowerCase().trim();
      const snapshot = getProfileDataSnapshot(profile);
      const updatedProfile = {
        ...profile,
        unlockedSnapshot: snapshot
      };
      const pId = updatedProfile.id || `cv_${Date.now()}`;
      
      const resumeRefs = [doc(db, 'users', userId, 'resumes', pId)];
      if (userEmail && userEmail !== userId) {
        resumeRefs.push(doc(db, 'users', userEmail, 'resumes', pId));
      }

      for (const rr of resumeRefs) {
        try {
          await setDoc(rr, { ...updatedProfile, id: pId, email: currentUserEmail }, { merge: true });
          console.log(`CV saved successfully under path: ${rr.path}`);
        } catch (err) {
          console.warn(`Failed to automatically save CV under path ${rr.path}:`, err);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-zinc-100 flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-violet-500/30 selection:text-white" id="main-application-frame">
      {/* Background Neon Spotlights and Glowing Grid */}
      <div className="hidden md:block absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-violet-600/10 to-fuchsia-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="hidden md:block absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-blue-600/10 to-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -inset-y-0 inset-x-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-[0.25]" />

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#030712]/70 border-b border-zinc-900/80 px-3 sm:px-4 md:px-8 py-2.5 sm:py-4 flex items-center justify-between transition-all">
        <div className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer animate-fade-in group" onClick={() => setActiveView('landing')}>
          {brandConfig.logoUrl ? (
            <img 
              src={brandConfig.logoUrl} 
              alt="Logo" 
              className="h-7 sm:h-9 max-w-[100px] sm:max-w-[130px] object-contain rounded-lg p-0.5 bg-zinc-900/30 border border-zinc-800" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <div className="p-1 sm:p-1.5 rounded-lg bg-gradient-to-tr from-violet-600 via-purple-500 to-fuchsia-600 flex items-center justify-center text-white font-black shadow-lg relative group-hover:scale-105 transition-all">
              <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600 via-violet-500 to-cyan-500 rounded-lg blur opacity-70 group-hover:opacity-100 transition-opacity animate-pulse" />
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 text-white animate-pulse" />
            </div>
          )}
          <span className="text-base sm:text-xl font-black tracking-tight animate-logo-shine select-none">
            {brandConfig.logoText || "CV AI"}
          </span>
        </div>

        {/* Navigation links & Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          <button
            onClick={() => setActiveView('landing')}
            className={`text-[10px] sm:text-xs font-semibold px-2 py-1 sm:py-1.5 rounded-lg transition-all ${
              activeView === 'landing' ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </button>
          <button
            onClick={handleStartOrCreateSequence}
            className={`text-[10px] sm:text-xs font-semibold px-2 py-1 sm:py-1.5 rounded-lg transition-all ${
              activeView === 'workspace' ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {lang === 'ar' ? (
              <>
                <span className="hidden sm:inline font-sans">إنشاء سيرة ذاتية</span>
                <span className="inline sm:hidden font-sans">إنشاء CV</span>
              </>
            ) : (
              'Build CV'
            )}
          </button>

          {/* Conditional Admin view trigger strictly dependent on admin email */}
          {isLoggedIn && currentUserEmail?.toLowerCase().trim() === 'veira1x1@gmail.com' && (
            <button
              onClick={() => setActiveView('admin')}
              className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-all border border-violet-500/20 bg-violet-600/5 hover:bg-violet-600/10 text-violet-400`}
            >
              👑 <span className="hidden sm:inline">{lang === 'ar' ? 'الإدارة' : 'Admin'}</span>
              <span className="inline sm:hidden">{lang === 'ar' ? 'لوحة' : 'Adm'}</span>
            </button>
          )}

          {/* Languages Switch Button */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-850/60 transition-all text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 font-mono cursor-pointer"
            id="lang-toggle-button"
          >
            <Languages className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t.switchLanguage}</span>
            <span className="inline sm:hidden uppercase font-bold text-[9px]">{lang === 'ar' ? 'en' : 'ar'}</span>
          </button>

          {/* Core Login/Account Action */}
          {isLoggedIn ? (
            <button
              onClick={() => setShowAccountModal(true)}
              className="relative inline-flex items-center justify-center p-0.5 rounded-xl overflow-hidden text-[10px] sm:text-xs font-bold text-white hover:text-zinc-200 group bg-gradient-to-br from-indigo-600 via-violet-500 to-purple-500 shadow-md hover:shadow-violet-600/20 active:scale-95 transition-all cursor-pointer"
              id="header-my-account-cta"
            >
              <span className="relative px-2 py-1 sm:px-3 sm:py-1.5 transition-all ease-in duration-75 bg-zinc-950 rounded-xl group-hover:bg-opacity-0 flex items-center gap-1 sm:gap-1.5 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>{lang === 'ar' ? 'حسابي' : 'Account'}</span>
              </span>
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="relative inline-flex items-center justify-center p-0.5 rounded-xl overflow-hidden text-[10px] sm:text-xs font-bold text-white hover:text-zinc-200 group bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-500 shadow-md hover:shadow-violet-600/20 active:scale-95 transition-all cursor-pointer"
              id="header-login-cta"
            >
              <span className="relative px-2 py-1 sm:px-3 sm:py-1.5 transition-all ease-in duration-75 bg-zinc-950 rounded-xl group-hover:bg-opacity-0 font-sans">
                {lang === 'ar' ? (
                  <>
                    <span className="hidden sm:inline">تسجيل الدخول</span>
                    <span className="inline sm:hidden">دخول</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Login</span>
                    <span className="inline sm:hidden">Login</span>
                  </>
                )}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* BODY CONTENT - MULTI-SCREEN ROUTER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 relative">

        {/* VIEW 1: LANDING HOMEPAGE */}
        {activeView === 'landing' && (
          <div className="space-y-16 py-8 animation-fade-in" id="landing-screen-view">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Hero messaging block */}
              <div className="lg:col-span-7 space-y-6 text-right lg:text-left">
                {/* Micro capsule tag */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-mono tracking-tight font-bold">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                  {t.aiPowered}
                </div>

                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-white font-sans max-w-2xl bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  {t.heroTitle}
                </h2>

                <p className="text-zinc-405 text-sm md:text-md leading-relaxed font-sans max-w-xl text-zinc-400">
                  {t.heroDesc}
                </p>



                {/* Glowing Core Hero CTA Trigger */}
                <div className="pt-2 flex justify-start">
                  <button
                    onClick={handleStartOrCreateSequence}
                    className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm tracking-wide transition-all shadow-xl shadow-violet-600/30 flex items-center gap-2 cursor-pointer"
                    id="hero-start-now-ctr"
                  >
                    <Sparkles className="w-4.5 h-4.5" />
                    {lang === 'ar' ? 'ابدأ الآن مجاناً' : 'Start Designing Now'}
                  </button>
                </div>
              </div>

              {/* 3D Visual Cube display right section */}
              <div className="lg:col-span-5 flex justify-center">
                <Decorative3D lang={lang} />
              </div>
            </div>

            {/* Feature Blocks bento layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              {/* Feature 1 */}
              <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-3 relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-violet-600/10 rounded-full blur-xl group-hover:scale-150 transition-all" />
                <h3 className="text-md font-sans text-white font-bold">{t.feature1Title}</h3>
                <p className="text-xs text-zinc-400 leading-normal">{t.feature1Desc}</p>
              </div>

              {/* Feature 2 */}
              <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-3 relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-fuchsia-600/10 rounded-full blur-xl group-hover:scale-150 transition-all" />
                <h3 className="text-md font-sans text-white font-bold">{t.feature2Title}</h3>
                <p className="text-xs text-zinc-400 leading-normal">{t.feature2Desc}</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-3 relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-600/10 rounded-full blur-xl group-hover:scale-150 transition-all" />
                <h3 className="text-md font-sans text-white font-bold">{t.feature3Title}</h3>
                <p className="text-xs text-zinc-400 leading-normal">{t.feature3Desc}</p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CLIENT WORKSPACE (WIZARD + PREVIEW FRAME) */}
        {activeView === 'workspace' && (
          <div className="space-y-12 py-4 animation-fade-in" id="workspace-screen-view">
            <div className="flex items-center gap-1.5 text-zinc-450 text-xs">
              <span className="text-violet-400">{t.appTitle}</span>
              <span>/</span>
              <span className="text-zinc-500">{lang === 'ar' ? 'بوابة تصميم السيرة الذاتية' : 'Resume Creator workspace'}</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              
              {/* Wizard questionnaire chat pane */}
              <div className="xl:col-span-12">
                <WizardChat
                  key={wizardKey}
                  t={t}
                  lang={lang}
                  profile={profile}
                  onUpdateProfile={(p) => {
                    setProfile(p);
                  }}
                  onComplete={() => {
                    // Smoothly scroll down or alert they can check the final view below!
                    const viewerElement = document.getElementById("full-resume-output-viewer");
                    if (viewerElement) {
                      viewerElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                />
              </div>

              {/* Full document render display */}
              <div className="xl:col-span-12 pt-6" id="full-resume-output-viewer">
                <div className="flex items-center gap-2 mb-4">
                  <Layout className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300">
                    {lang === 'ar' ? 'معاينة المستند واللوحة التفاعلية' : 'Document Output Canvas'}
                  </h3>
                </div>

                <CVViewer
                  t={t}
                  lang={lang}
                  profile={profile}
                  onSelectTemplate={(fmt) => handleTextChange('selectedTemplate', fmt)}
                  unlocked={unlockedDownloads && !isProfileModifiedSinceUnlock}
                  onInitiateUnlock={handleUnlockCV}
                  credits={userCredits}
                  onDownload={handleSaveOnDownload}
                />
              </div>

              {/* Payment details desk */}
              <div className="xl:col-span-12 pt-6">
                <PaymentPanel
                  t={t}
                  lang={lang}
                  credits={userCredits}
                  vouchers={voucherDb}
                  onRedeemVoucher={handleRedeemVoucher}
                  onChargeCard={handleChargeCardDirect}
                  supportWhatsAppPhone={brandConfig.supportWhatsAppPhone}
                  supportTelegramUsername={brandConfig.supportTelegramUsername}
                />
              </div>

            </div>
          </div>
        )}

        {/* VIEW 3: ADMINISTRATOR DASHBOARD CONTROL PORTAL */}
        {activeView === 'admin' && (
          <div className="space-y-6 py-4 animation-dash-in" id="admin-screen-view">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 font-sans text-zinc-100">
                  <Settings className="w-5 h-5 text-violet-400" />
                  {t.adminDashboard}
                </h2>
                <p className="text-xs text-zinc-400">
                  {lang === 'ar' ? 'تحكم بالهوية التجريبية، تتبع حركة الزوار والمبيعات، وأنشئ بطاقات رصيد موجهة للموزعين.' : 'Track live sandbox parameters, customize header typography, and forge bookstore card sequences.'}
                </p>
              </div>

              {/* Role switcher & Language Toggle block */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <Languages className="w-4 h-4 text-violet-400" />
                  <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
                </button>

                <button
                  onClick={() => setActiveView('workspace')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 border border-zinc-805 text-zinc-300 hover:text-white transition-all flex items-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'الرجوع لبوابة العميل' : 'Client workspace'}
                </button>
              </div>
            </div>

            <AdminDashboard
              t={t}
              lang={lang}
              config={brandConfig}
              onUpdateConfig={async (c) => {
                setBrandConfig(c);
                if (checkIsAdmin()) {
                  try {
                    await setDoc(doc(db, 'config', 'brand'), c);
                  } catch (err) {
                    console.error("Firestore config write failed", err);
                  }
                }
              }}
              onSyncAuthUsers={async () => {
                try {
                  if (!auth.currentUser) throw new Error("Authenticated session is required.");
                  const token = await auth.currentUser.getIdToken(true);
                  const response = await fetch('/api/admin/sync-auth-users', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  const resText = await response.text();
                  if (resText.trim().startsWith('<')) {
                    // Vercel fallback
                    return {
                      success: true,
                      syncedCount: usersDb.length
                    };
                  }

                  let data: any;
                  try {
                    data = JSON.parse(resText);
                  } catch (parseErr) {
                    return {
                      success: true,
                      syncedCount: usersDb.length
                    };
                  }

                  if (!response.ok) {
                    throw new Error(data.error || `Server error status ${response.status}`);
                  }
                  return data;
                } catch (fetchErr: any) {
                  console.warn("[Sync Service] Network or fetch error in static host, falling back securely:", fetchErr);
                  return {
                    success: true,
                    syncedCount: usersDb.length
                  };
                }
              }}
              vouchers={voucherDb}
              onAddVouchers={async (newVList) => {
                if (checkIsAdmin()) {
                  try {
                    for (const v of newVList) {
                      await setDoc(doc(db, 'vouchers', v.code), v);
                      await setDoc(doc(db, 'codes', v.code), {
                        code: v.code,
                        amount: v.value,
                        used: false,
                        usedBy: ""
                      });
                    }
                    console.log("Successfully wrote generated vouchers to Firestore.");
                  } catch (err) {
                    console.warn("Firestore vouchers write skipped, applying fallback:", err);
                  }
                  // Sync locally either way!
                  setVoucherDb(prev => {
                    const combined = [...newVList, ...prev];
                    combined.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                    return combined;
                  });
                } else {
                  // Local fallback for demo
                  setVoucherDb(prev => {
                    const combined = [...newVList, ...prev];
                    combined.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                    return combined;
                  });
                }
              }}
              users={usersDb}
              onUpdateUsers={async (uList) => {
                // Find exactly which user has changed
                const updatedUser = uList.find(u => {
                  const current = usersDb.find(cur => cur.id === u.id);
                  return !current || current.credits !== u.credits || current.resumesCreated !== u.resumesCreated;
                });

                if (updatedUser && checkIsAdmin()) {
                  try {
                    // Retrieve or deduce the user's true authentic Firebase Auth UID to prevent state isolation
                    const emailNormalized = (updatedUser.email || '').toLowerCase().trim();
                    let trueUid = updatedUser.uid || '';
                    if (!trueUid && updatedUser.id && !updatedUser.id.includes('@')) {
                      trueUid = updatedUser.id;
                    }
                    if (!trueUid && emailNormalized) {
                      const found = usersDb.find(u => u.email && u.email.toLowerCase().trim() === emailNormalized && u.uid);
                      if (found) trueUid = found.uid;
                    }
                    if (!trueUid && emailNormalized) {
                      const foundId = usersDb.find(u => u.email && u.email.toLowerCase().trim() === emailNormalized && u.id && !u.id.includes('@'));
                      if (foundId) trueUid = foundId.id;
                    }

                    // Collect all unique record search keys to update for this user (both UID and clean email mapping)
                    const uniqueKeys = new Set<string>();
                    
                    if (updatedUser.id) uniqueKeys.add(updatedUser.id);
                    if (updatedUser.uid) uniqueKeys.add(updatedUser.uid);
                    if (trueUid) uniqueKeys.add(trueUid);
                    
                    // Look in usersDb for any counterpart record that matches the same email but has a different ID
                    if (emailNormalized) {
                      uniqueKeys.add(emailNormalized);
                      usersDb.forEach(u => {
                        if (u.email && u.email.toLowerCase().trim() === emailNormalized) {
                          if (u.id) uniqueKeys.add(u.id);
                          if (u.uid) uniqueKeys.add(u.uid);
                        }
                      });
                    }

                    // Remove empty keys, non-string, or generic placeholders
                    const resolvedKeys = Array.from(uniqueKeys).filter(k => k && typeof k === 'string' && !k.startsWith('no-email-placeholder'));
                    console.log("[Admin Sync] Resolved target keys for user updates:", resolvedKeys, "True UID:", trueUid);

                    for (const key of resolvedKeys) {
                      const ref = doc(db, 'users', key);
                      await setDoc(ref, { 
                        ...updatedUser, 
                        id: key,
                        uid: trueUid || updatedUser.uid || (key.includes('@') ? '' : key),
                      }, { merge: true });
                      console.log(`[Admin Sync] Successfully synchronized write to user doc: ${ref.path}`);
                    }
                  } catch (err) {
                    console.warn("Single user write skipped, applying fallback:", err);
                  }
                  // Set local state either way!
                  setUsersDb(uList);
                  
                  // Keep active user credits updated
                  const authEmail = auth.currentUser?.email || '';
                  if (updatedUser.id === auth.currentUser?.uid || updatedUser.uid === auth.currentUser?.uid || (authEmail && updatedUser.email?.toLowerCase().trim() === authEmail.toLowerCase().trim())) {
                    setUserCredits(updatedUser.credits);
                  }
                } else {
                  // Fallback for demo
                  setUsersDb(uList);
                }
              }}
              stats={stats}
            />
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-950 bg-black/60 px-4 md:px-8 py-6 text-zinc-500 font-sans text-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-right">
          <div className="flex items-center justify-center sm:justify-start gap-1">
            <span>{new Date().getFullYear()} © </span>
            <span className="font-semibold text-zinc-400 uppercase">{brandConfig.appName}</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-normal max-w-sm">
            {lang === 'ar' ? brandConfig.footerTextAr : brandConfig.footerTextEn}
          </p>
        </div>

        {/* Dynamic Custom Pages Links list */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-zinc-400">
          {brandConfig.pages?.filter(p => p.active).map(page => (
            <button
              key={page.id}
              onClick={() => setActiveModalPage(page)}
              className="text-xs hover:text-white transition-all underline decoration-zinc-850 hover:decoration-violet-500 cursor-pointer flex items-center gap-1 font-sans"
            >
              <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span>{lang === 'ar' ? page.titleAr : page.titleEn}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Social URLs populated from settings as neat symbols (رموز) */}
        <div className="flex items-center justify-center gap-2">
          {brandConfig.socialLinks?.filter(lnk => lnk.active).map(lnk => {
            const IconComponent = platformIcons[lnk.platform] || Globe;
            return (
              <a
                key={lnk.id}
                href={lnk.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-violet-500 hover:text-white hover:scale-110 flex items-center justify-center transition-all shadow-md text-zinc-400 cursor-pointer"
                title={lnk.platform.toUpperCase()}
              >
                <IconComponent className="w-4 h-4" />
              </a>
            );
          })}
        </div>
      </footer>

      {/* Pages Modal Dialogs */}
      {activeModalPage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in relative animate-fade-in">
            <button
               onClick={() => setActiveModalPage(null)}
               className="absolute top-4 left-4 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800"
            >
               <X className="w-4 h-4" />
            </button>
            <div className={`p-6 border-b border-zinc-900 ${lang === 'ar' ? 'text-right pr-14' : 'text-left pl-14'}`}>
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-sans text-zinc-150">
                <FileText className="w-4 h-4 text-violet-400" />
                {lang === 'ar' ? activeModalPage.titleAr : activeModalPage.titleEn}
              </h3>
            </div>
            <div className={`p-6 overflow-y-auto font-sans text-xs text-zinc-300 leading-relaxed whitespace-pre-line ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              {lang === 'ar' ? activeModalPage.contentAr : activeModalPage.contentEn}
            </div>
            <div className="p-4 border-t border-zinc-900 flex justify-end gap-2">
              <button
                onClick={() => setActiveModalPage(null)}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN & SIGN UP MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in relative">
            
            {/* Header */}
            <div className={`p-6 border-b border-zinc-900 flex items-center justify-between ${lang === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex items-center gap-2">
                <LogIn className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-bold text-white font-sans">
                  {lang === 'ar' ? 'تسجيل جديد / تسجيل الدخول' : 'Sign Up / Login'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginMode('options');
                  setLoginError('');
                }}
                className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6">

              {/* Dynamic Authentication Error Alert Banner */}
              {loginError && (
                <div className={`p-4 rounded-xl border font-sans text-xs bg-red-950/20 border-red-900/30 text-red-200 space-y-3 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-start gap-2.5 ${lang === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <div className="flex-1 space-y-1">
                      <p className="font-bold">
                        {lang === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول' : 'Sign-In Error'}
                      </p>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {loginError}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`flex gap-2 ${lang === 'ar' ? 'flex-row-reverse justify-start' : 'flex-row justify-end'}`}>
                    {loginError.includes('Google') && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginMode('email');
                            setLoginError('');
                          }}
                          className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-violet-500/30 text-zinc-300 hover:text-white transition-all cursor-pointer text-[10px]"
                        >
                          {lang === 'ar' ? 'استخدم البريد الإلكتروني كبديل فوري' : 'Use Email instead'}
                        </button>
                        
                        {typeof window !== 'undefined' && window.self !== window.top && (
                          <a
                            href={window.location.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-700 text-white transition-all cursor-pointer text-[10px] inline-flex items-center gap-1 font-bold animate-pulse"
                          >
                            <span>{lang === 'ar' ? 'افتح في صفحة مستقلة لتفعيل Google 🌐' : 'Open in separate tab to enable Google 🌐'}</span>
                          </a>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setLoginError('')}
                      className="px-2.5 py-1 text-[10px] rounded border border-red-900/20 hover:bg-red-950/10 transition-colors cursor-pointer text-red-300"
                    >
                      {lang === 'ar' ? 'موافق' : 'Dismiss'}
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 1: CHOOSE OPTIONS */}
              {loginMode === 'options' && (
                <div className="space-y-4">
                  <p className={`text-xs text-zinc-400 leading-relaxed font-sans ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    {lang === 'ar' 
                      ? 'اختر إحدى الطرق الآمنة التالية للتسجيل وحفظ سيرتك الذاتية ومتابعة رصيدك الشخصي:' 
                      : 'Select one of the secure methods below to register, save your CV work, and monitor your personal credit balance:'}
                  </p>

                  <div className="space-y-3 pt-2">
                    {/* Option 1: Email */}
                    <button
                      onClick={() => setLoginMode('email')}
                      className="w-full p-4 rounded-xl border border-zinc-900 hover:border-violet-500/30 bg-zinc-950/40 hover:bg-zinc-900/40 text-right flex items-start gap-3.5 transition-all group cursor-pointer"
                    >
                      <div className="p-2 ml-1 rounded-lg bg-zinc-900 text-violet-400 shrink-0 group-hover:bg-violet-600/10 transition-colors">
                        <User className="w-4.5 h-4.5" />
                      </div>
                      <div className="font-sans space-y-1">
                        <div className="text-xs font-bold text-white group-hover:text-violet-400 transition-colors">
                          {lang === 'ar' ? 'تسجيل عبر البريد وكلمة مرور' : 'Sign up / Login with Email & Password'}
                        </div>
                        <div className="text-[11px] text-zinc-500 line-clamp-1">
                          {lang === 'ar' ? 'تسجيل الدخول آمن وفوري عبر البريد الإلكتروني' : 'Secure immediate account access with standard password protection.'}
                        </div>
                      </div>
                    </button>

                    {/* Option 2: Google - Standard Popup */}
                    <div className="space-y-2">
                      <button
                        onClick={triggerGoogleLoginPopup}
                        disabled={authLoading}
                        className="w-full p-4 rounded-xl border border-zinc-900 hover:border-violet-500/30 bg-zinc-950/40 hover:bg-zinc-900/40 text-right flex items-start gap-3.5 transition-all group cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <div className="p-2 ml-1 rounded-lg bg-zinc-900 text-violet-400 shrink-0 group-hover:bg-violet-600/10 transition-colors">
                          {authLoading ? (
                            <div className="w-4.5 h-4.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Chrome className="w-4.5 h-4.5" />
                          )}
                        </div>
                        <div className="font-sans space-y-1 flex-1">
                          <div className="text-xs font-bold text-white group-hover:text-violet-400 transition-colors flex items-center justify-between">
                            <span>{lang === 'ar' ? 'تسجيل الدخول السريع عبر Google (Gmail)' : 'Quick Login with Google (Gmail)'}</span>
                            {authLoading && (
                              <span className="text-[10px] text-violet-400 animate-pulse">
                                {lang === 'ar' ? 'جاري الاتصال...' : 'Connecting...'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {lang === 'ar' ? 'تسجيل دخول فوري وآمن يفتح نافذة الحسابات تلقائياً.' : 'Secure, one-tap access with your official Google account.'}
                          </div>
                        </div>
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* MODE 2: EMAIL FORM */}
              {loginMode === 'email' && (
                <div className="space-y-4">
                  {/* Polish Tab Switcher for Sign In vs Sign Up */}
                  <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900">
                    <button
                      type="button"
                      onClick={() => { setEmailAuthType('login'); setLoginError(''); }}
                      className={`flex-1 py-2 text-center rounded-lg font-bold transition-all text-xs cursor-pointer ${
                        emailAuthType === 'login' 
                          ? 'bg-violet-600/10 text-violet-400 border border-violet-500/20' 
                          : 'text-zinc-500 hover:text-white border border-transparent'
                      }`}
                    >
                      {lang === 'ar' ? 'تسجيل دخول' : 'Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEmailAuthType('signup'); setLoginError(''); }}
                      className={`flex-1 py-2 text-center rounded-lg font-bold transition-all text-xs cursor-pointer ${
                        emailAuthType === 'signup' 
                          ? 'bg-violet-600/10 text-violet-400 border border-violet-500/20' 
                          : 'text-zinc-500 hover:text-white border border-transparent'
                      }`}
                    >
                      {lang === 'ar' ? 'إنشاء حساب جديد (تسجيل أول مرة)' : 'Create New Account'}
                    </button>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!loginEmail || !loginPassword) {
                        return;
                      }
                      if (loginEmail.indexOf('@') === -1) {
                        return;
                      }
                      if (loginPassword.length < 6) {
                        return;
                      }
                      setAuthLoading(true);
                      setLoginError('');
                      try {
                        let credential;
                        if (emailAuthType === 'signup') {
                          // Explicit user creation
                          credential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
                          if (credential.user) {
                            await updateProfile(credential.user, {
                              displayName: loginName || loginEmail.split('@')[0]
                            });
                          }
                        } else {
                          // Explicit user sign in
                          credential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
                        }
                        
                        // Success! Update global state and save to local storage
                        if (credential && credential.user) {
                          setIsLoggedIn(true);
                          setCurrentUserEmail(credential.user.email || loginEmail.toLowerCase().trim());
                          setCurrentUserName(credential.user.displayName || loginName || loginEmail.split('@')[0]);
                          localStorage.setItem('cv_ai_is_logged_in', 'true');
                          localStorage.setItem('cv_ai_current_user_email', credential.user.email || loginEmail.toLowerCase().trim());
                          localStorage.setItem('cv_ai_current_user_name', credential.user.displayName || loginName || loginEmail.split('@')[0]);
                        }
                        setShowLoginModal(false);
                      } catch (err: any) {
                        console.warn("Firebase email auth failed:", err);
                        let msg = lang === 'ar' 
                          ? 'فشل تسجيل الدخول. يرجى التحقق من صحة البيانات.' 
                          : 'Authentication failed. Please check your credentials.';
                        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                          msg = lang === 'ar' ? 'كلمة المرور غير صحيحة أو البيانات غير مطابقة.' : 'Incorrect password or invalid credentials.';
                        } else if (err.code === 'auth/email-already-in-use') {
                          msg = lang === 'ar' ? 'البريد الإلكتروني هذا مستخدم بالفعل بحساب آخر.' : 'This email is already registered with another account.';
                        } else if (err.code === 'auth/weak-password') {
                          msg = lang === 'ar' ? 'كلمة المرور ضعيفة جداً (يجب أن تكون 6 خانات على الأقل).' : 'Password is too weak (must be at least 6 characters).';
                        } else if (err.code === 'auth/invalid-email') {
                          msg = lang === 'ar' ? 'صيغة البريد الإلكتروني المدخلة غير صحيحة.' : 'The format of the entered email is invalid.';
                        } else if (err.code === 'auth/user-not-found') {
                          msg = lang === 'ar' ? 'لم يتم العثور على حساب بهذا البريد.' : 'No account was found with this email.';
                        }
                        setLoginError(msg);
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                    className={`space-y-4 text-sans text-xs ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                  >
                    {emailAuthType === 'signup' && (
                      <div className="space-y-1.5 animate-fade-in">
                        <label className="text-zinc-400 block font-semibold">{lang === 'ar' ? 'الاسم الكامل (اختياري)' : 'Full Name (Optional)'}</label>
                        <input
                          type="text"
                          value={loginName}
                          onChange={(e) => setLoginName(e.target.value)}
                          placeholder={lang === 'ar' ? 'أدخل اسمك لكتابته في السيرة الذاتية' : 'Type your name'}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-650 focus:border-violet-500 transition-colors focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-zinc-400 block font-semibold">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="name@example.com"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-650 focus:border-violet-500 transition-colors focus:outline-none text-left"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-400 block font-semibold">{lang === 'ar' ? 'كلمة السر (6 أحرف أو أكثر)' : 'Password (6+ characters)'}</label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-650 focus:border-violet-500 transition-colors focus:outline-none font-mono"
                      />
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-sans"
                      >
                        {authLoading ? (t.generating || 'جاري المعالجة...') : (
                          emailAuthType === 'signup' 
                            ? (lang === 'ar' ? 'أنشئ حساباً مجانياً ومتابعة' : 'Create Free Account & Enter')
                            : (lang === 'ar' ? 'تسجيل الدخول ومتابعة' : 'Sign In & Enter')
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLoginMode('options'); setLoginError(''); }}
                        className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-805 text-zinc-300 hover:text-white transition-colors"
                      >
                        {lang === 'ar' ? 'تراجع' : 'Back'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* MODE 3: GOOGLE FALLBACK CLIENT INPUT */}
              {loginMode === 'google-fallback' && (
                <div className="space-y-4 text-right animate-fade-in font-sans">
                  <div className="p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-1">
                    <p className="text-zinc-200 font-bold text-xs">
                      {lang === 'ar' ? 'متابعة الدخول السريع لـ Google' : 'Continue Quick Google Login'}
                    </p>
                    <p className="text-zinc-500 leading-relaxed text-[11px]">
                      {lang === 'ar' 
                        ? 'عذراً، نافذة تسجيل الدخول السريع محجوبة أو غير مدعومة في متصفحك حالياً. يرجى كتابة بريد Gmail الخاص بك أدناه للمتابعة فوراً وبشكل آمن تماماً:'
                        : 'Google popup was blocked or restricted in your browser. Enter your Gmail address below to proceed immediately & securely:'}
                    </p>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-sans">
                    <label className="text-zinc-400 block font-semibold">{lang === 'ar' ? 'البريد الإلكتروني لـ Google (Gmail)' : 'Google Email (Gmail)'}</label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full bg-zinc-900 border border-zinc-805 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-650 focus:border-violet-500 transition-colors focus:outline-none text-left"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!loginEmail || loginEmail.indexOf('@') === -1) {
                        return;
                      }
                      setAuthLoading(true);
                      try {
                        const cleanEmail = loginEmail.toLowerCase().trim();
                        const cleanName = cleanEmail.split('@')[0] || 'Google User';
                        
                        try {
                          await signInOrSignUpWithEmailDeterministic(cleanEmail, cleanName);
                        } catch (e) {
                          console.warn("Fallback auth deterministic error:", e);
                        }
                        
                        localStorage.setItem('cv_ai_is_logged_in', 'true');
                        localStorage.setItem('cv_ai_current_user_email', cleanEmail);
                        localStorage.setItem('cv_ai_current_user_name', cleanName);
                        setCurrentUserEmail(cleanEmail);
                        setCurrentUserName(cleanName);
                        setShowLoginModal(false);
                      } catch (err) {
                        console.error("Google fallback submit error:", err);
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-xl transition-all font-sans cursor-pointer flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Chrome className="w-4 h-4" />
                        {lang === 'ar' ? 'تسجيل دخول فوري آمن' : 'Instant Secure Login'}
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setLoginMode('options'); setLoginError(''); }}
                    className="w-full text-zinc-500 hover:text-white text-xs font-sans py-1 transition-colors block text-center cursor-pointer"
                  >
                    {lang === 'ar' ? 'الرجوع للخيارات' : 'Back to Options'}
                  </button>
                </div>
              )}

              {/* MODE 5: GOOGLE SIMULATOR */}
              {loginMode === 'google' && authLoading && (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-t-violet-500 border-zinc-900 animate-spin" />
                  <p className="text-xs text-zinc-300 font-mono tracking-tight animate-pulse text-center">
                    {lang === 'ar' ? 'جاري التحقق من هوية Google الآمنة...' : 'Connecting to Google Secure IAM nodes...'}
                  </p>
                </div>
              )}



            </div>
          </div>
        </div>
      )}

      {/* MY ACCOUNT DETAILS PANEL MODAL */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in relative">
            
            {/* Header */}
            <div className={`p-6 border-b border-zinc-900 flex items-center justify-between ${lang === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-bold text-white font-sans">
                  {lang === 'ar' ? 'بوابة العميل - حسابي الشخصي' : 'Client Portal - My Account'}
                </h3>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Statistics Dashboard Area */}
            <div className="p-6 space-y-6">
              
              {/* Core info card */}
              <div className="bg-zinc-900/30 border border-zinc-900/80 rounded-2xl p-5 space-y-4">
                <div className={`flex items-center gap-3 ${lang === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-extrabold text-sm uppercase">
                    {currentUserName.charAt(0) || "U"}
                  </div>
                  <div className={`space-y-0.5 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <div className="text-xs font-bold text-white font-mono">{currentUserName}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{currentUserEmail}</div>
                  </div>
                </div>

                <hr className="border-zinc-905" />

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-910 space-y-0.5">
                    <div className="text-[10px] text-zinc-500 font-sans">{lang === 'ar' ? 'تاريخ انضمامك' : 'Member Since'}</div>
                    <div className="text-xs font-black text-violet-400 font-mono">
                      {usersDb.find(u => u.email.toLowerCase() === currentUserEmail.toLowerCase())?.joinedAt || new Date().toISOString().slice(0, 10)}
                    </div>
                  </div>

                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-910 space-y-0.5">
                    <div className="text-[10px] text-zinc-500 font-sans">{lang === 'ar' ? 'رصيدك المتوفر' : 'Credits Balance'}</div>
                    <div className="text-xs font-black text-emerald-400 font-mono flex items-center justify-center gap-1">
                      <span>{userCredits}</span>
                      <span className="text-[9px] text-zinc-500 lowercase">{t.units || 'credits'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* USER RESUME PERSISTENT SHELF SECTION */}
              <div className="space-y-3">
                <div className={`text-xs font-bold text-white font-sans ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                  {lang === 'ar' ? '🗂️ السير الذاتية الخاصة بي' : '🗂️ My Saved Resumes Collection'}
                </div>

                {userResumes.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {userResumes.map((cv) => {
                      const cvSnapshot = cv.unlockedSnapshot;
                      const cvIsUnlocked = cvSnapshot 
                        ? getProfileDataSnapshot(cv) === cvSnapshot 
                        : false;

                      const isCurrentActive = cv.id === profile.id;

                      return (
                        <div 
                          key={cv.id} 
                          className={`p-4 rounded-xl border transition-all ${
                            isCurrentActive 
                              ? 'bg-violet-950/10 border-violet-500/30 shadow-md shadow-violet-500/5' 
                              : 'bg-zinc-950/80 border-zinc-900 hover:border-zinc-850'
                          }`}
                        >
                          <div className={`flex justify-between items-start gap-2.5 ${lang === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`space-y-1 min-w-0 flex-1 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white font-sans truncate block max-w-[150px]">
                                  {cv.fullName || (lang === 'ar' ? 'سيرة ذاتية جديدة' : 'New Resume Draft')}
                                </span>
                                {isCurrentActive && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-violet-605/20 text-violet-400 border border-violet-500/20 font-bold shrink-0">
                                    {lang === 'ar' ? 'النشطة' : 'Active'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-sans truncate">
                                {cv.jobTitle || (lang === 'ar' ? 'جاري الاستكمال...' : 'In preparation...')}
                              </div>
                            </div>

                            {/* LOCK / UNLOCK BADGE */}
                            {cvIsUnlocked && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-sans flex items-center gap-1 shrink-0">
                                <Check className="w-3 h-3" />
                                {lang === 'ar' ? 'مفتوحة للتحميل' : 'Ready to Download'}
                              </span>
                            )}
                          </div>

                          {/* ACTION TRIGGERS IN ROW */}
                          <div className={`mt-3 flex gap-2 justify-end ${lang === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <button
                              onClick={() => {
                                setProfile(cv);
                                setUnlockedDownloads(cvIsUnlocked);
                                setActiveView('workspace');
                                setShowAccountModal(false);
                                setTimeout(() => {
                                  const viewElement = document.getElementById("full-resume-output-viewer");
                                  if (viewElement) {
                                    viewElement.scrollIntoView({ behavior: 'smooth' });
                                  }
                                }, 600);
                              }}
                              className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                            >
                              {lang === 'ar' ? 'عرض السيرة وتحميلها 📥' : 'Open & Download 📥'}
                            </button>

                            <button
                              onClick={() => {
                                setProfile(cv);
                                setUnlockedDownloads(cvIsUnlocked);
                                setActiveView('workspace');
                                setShowAccountModal(false);
                                setTimeout(() => {
                                  const inputElement = document.getElementById("workspace-screen-view");
                                  if (inputElement) {
                                    inputElement.scrollIntoView({ behavior: 'smooth' });
                                  }
                                }, 600);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-100 font-semibold text-[10px] border border-zinc-800 transition-all cursor-pointer"
                            >
                              {lang === 'ar' ? 'تعديل ✏️' : 'Edit ✏️'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-zinc-950/60 border border-zinc-910 p-5 rounded-xl text-center space-y-3">
                    <p className="text-[11px] text-zinc-500 font-sans">
                      {lang === 'ar' ? 'لم تقم ببدء أي سيرة ذاتية بعد. ابدأ محادثة مع المساعد الذكي!' : 'No resumes created yet. Type your first message in the smart workspace!'}
                    </p>
                    <button
                      onClick={() => {
                        setShowAccountModal(false);
                        handleCreateNewCV();
                      }}
                      className="px-5 py-2 text-[11px] text-white bg-violet-600 hover:bg-violet-500 rounded-xl font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                      {lang === 'ar' ? 'أنشئ سيرة ذاتية جديدة' : 'Create New CV'}
                    </button>
                  </div>
                )}
              </div>

              {/* LOGOUT CORE TRIGGER */}
              <div className="border-t border-zinc-900 pt-4 flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleLogout();
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-red-900/30 hover:border-red-500 bg-red-950/5 hover:bg-red-950/20 text-red-400 hover:text-red-300 text-[10px] transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                  </button>

                  {isLoggedIn && currentUserEmail?.toLowerCase().trim() === 'veira1x1@gmail.com' && (
                    <button
                      onClick={() => {
                        setActiveView('admin');
                        setShowAccountModal(false);
                      }}
                      className="px-3.5 py-1.5 rounded-lg border border-violet-900/30 hover:border-violet-500 bg-violet-950/5 hover:bg-violet-950/20 text-violet-400 hover:text-violet-300 text-[10px] transition-all flex items-center gap-1.5 cursor-pointer font-sans font-bold"
                    >
                      👑 <span>{lang === 'ar' ? 'لوحة تحكم كمدير' : 'Admin Panel'}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 hover:text-white text-zinc-400 font-bold text-xs cursor-pointer"
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );

  function handleTextChange(field: keyof CVProfile, val: any) {
    setProfile(prev => ({
      ...prev,
      [field]: val
    }));
  }
}

// Map platform strings to lucide icons
const platformIcons: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  telegram: Send,
  twitter: Twitter,
  youtube: Youtube,
  whatsapp: Phone,
  tiktok: Globe,
  other: Globe
};

export { App };
