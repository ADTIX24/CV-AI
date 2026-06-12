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
import { Sparkles, Languages, Settings, Layout, Layers, ShieldAlert, Heart, LogIn, Facebook, Instagram, Linkedin, Send, Twitter, Youtube, Phone, Globe, Info, HelpCircle, FileText, X, User, Lock, Chrome, BookOpen, LogOut, Check, ExternalLink } from 'lucide-react';

// Firebase core integration imports
import { auth, db, googleProvider, OperationType, handleFirestoreError } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
  const [userCredits, setUserCredits] = useState<number>(0);
  const [unlockedDownloads, setUnlockedDownloads] = useState<boolean>(false);

  // User Authentication / session states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const redirectToWorkspaceOnLoginRef = useRef<boolean>(false);

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
  const [loginMode, setLoginMode] = useState<'options' | 'email' | 'google' | 'bookstore'>('options');
  const [emailAuthType, setEmailAuthType] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);

  // Default Voucher Promo Database (synchronized dynamically)
  const [voucherDb, setVoucherDb] = useState<Voucher[]>([
    { code: "CV-AI-FREE", value: 1, active: true, groupName: "Al-Nour Retail Batch", createdAt: new Date().toISOString() },
    { code: "CV-AI-GIFT", value: 1, active: true, groupName: "Horizon Bookstore", createdAt: new Date().toISOString() },
    { code: "CV-AI-VIP", value: 1, active: true, groupName: "Tech Hub Wholesaler", createdAt: new Date().toISOString() }
  ]);

  // Client directory list
  const [usersDb, setUsersDb] = useState<ClientAccount[]>([]);

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
    localStorage.setItem('cv_ai_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('cv_ai_brand_config', JSON.stringify(brandConfig));
  }, [brandConfig]);

  useEffect(() => {
    localStorage.setItem('cv_ai_user_credits', userCredits.toString());
  }, [userCredits]);

  useEffect(() => {
    localStorage.setItem('cv_ai_vouchers', JSON.stringify(voucherDb));
  }, [voucherDb]);

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

  // 2. Firebase onAuthStateChanged session monitor
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        setCurrentUserEmail(user.email || '');
        setCurrentUserName(user.displayName || user.email?.split('@')[0] || 'User');
        localStorage.setItem('cv_ai_is_logged_in', 'true');
        localStorage.setItem('cv_ai_current_user_email', user.email || '');
        localStorage.setItem('cv_ai_current_user_name', user.displayName || '');

        // Generate / load user database document
        try {
          const userDocRef = doc(db, 'users', user.uid);
          let userSnap = null;
          try {
            userSnap = await getDoc(userDocRef);
          } catch (getErr: any) {
            console.error("Firestore getDoc error (may be offline or new user):", getErr.message || getErr);
          }

          if (!userSnap || !userSnap.exists()) {
            const signupGift = brandConfig.registerGiftCredits !== undefined ? brandConfig.registerGiftCredits : 5;
            const newUserObj: ClientAccount = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              credits: signupGift,
              resumesCreated: 0,
              joinedAt: new Date().toISOString().slice(0, 10)
            };
            try {
              await setDoc(userDocRef, newUserObj);
              console.log("Successfully created user profile document in Firestore as:", newUserObj);
              setUserCredits(signupGift);
            } catch (setErr: any) {
              console.error("Could not write initial user doc to Firestore. Error:", setErr?.message || setErr);
              // Fallback to offline cached credits
              const cachedCredits = localStorage.getItem('cv_ai_user_credits');
              setUserCredits(cachedCredits ? parseInt(cachedCredits, 10) : signupGift);
            }
          } else {
            const data = userSnap.data() as ClientAccount;
            setUserCredits(data.credits !== undefined ? data.credits : 0);
            console.log("Loaded existing user profile from Firestore:", data);
          }
        } catch (e: any) {
          console.error("Graceful recovery from user document retrieval failure:", e?.message || e);
          const cachedCredits = localStorage.getItem('cv_ai_user_credits');
          const parsedCredits = cachedCredits ? parseInt(cachedCredits, 10) : (brandConfig.registerGiftCredits !== undefined ? brandConfig.registerGiftCredits : 5);
          setUserCredits(parsedCredits);
        }
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
  }, [brandConfig.registerGiftCredits]);

  // 2b. Real-time subscription to the logged-in user's own profile with active self-healing
  useEffect(() => {
    if (!isLoggedIn || !auth.currentUser) {
      return;
    }
    const userId = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(userDocRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ClientAccount;
        if (data.credits !== undefined) {
          setUserCredits(data.credits);
        }
      } else {
        // Self-heal: Document is authenticated but missing in Firestore (often due to historical rule errors or offline signups)
        console.log("User doc missing in Firestore. Starting robust dynamic self-healing/creation...");
        const signupGift = brandConfig.registerGiftCredits !== undefined ? brandConfig.registerGiftCredits : 5;
        const newUserObj: ClientAccount = {
          id: userId,
          name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User',
          email: auth.currentUser?.email || '',
          credits: signupGift,
          resumesCreated: 0,
          joinedAt: new Date().toISOString().slice(0, 10)
        };
        try {
          await setDoc(userDocRef, newUserObj);
          console.log("Self-healing successful: Created user profile document in Firestore as:", newUserObj);
          setUserCredits(signupGift);
        } catch (setErr: any) {
          console.error("Self-healing failed to write user doc to Firestore:", setErr?.message || setErr);
        }
      }
    }, (err) => {
      console.warn("Failed to subscribe to user's profile real-time changes:", err);
    });

    return () => unsubscribe();
  }, [isLoggedIn, brandConfig.registerGiftCredits]);

  // Redirect guest to workspace creation immediately after successful login
  useEffect(() => {
    if (isLoggedIn && redirectToWorkspaceOnLoginRef.current) {
      redirectToWorkspaceOnLoginRef.current = false;
      handleCreateNewCV();
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

      // Try auto-loading their last edited profile if the active one is empty
      if (list.length > 0 && !profile.fullName) {
        setProfile(list[0]);
      }
    }, (err: any) => {
      console.warn("Failed to subscribe user resumes collection, continuing in offline cached mode:", err.message || err);
    });
    return () => unsubscribe();
  }, [isLoggedIn]);

  // 4. Complete users list subscription ONLY for verified admin (veira1x1@gmail.com)
  useEffect(() => {
    if (!isLoggedIn || !auth.currentUser || auth.currentUser.email !== 'veira1x1@gmail.com') {
      setUsersDb([]);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: ClientAccount[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as ClientAccount);
      });
      setUsersDb(list);
    }, (err) => {
      console.warn("User listing subscription restricted, using fallback:", err);
    });
    return () => unsubscribe();
  }, [isLoggedIn, currentUserEmail]);

  // 5. Complete vouchers database subscription ONLY for verified admin (veira1x1@gmail.com)
  useEffect(() => {
    if (!isLoggedIn || !auth.currentUser || auth.currentUser.email !== 'veira1x1@gmail.com') {
      return;
    }
    const unsubscribe = onSnapshot(collection(db, 'vouchers'), (snapshot) => {
      const list: Voucher[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as Voucher);
      });
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
    localStorage.setItem('cv_ai_profile', JSON.stringify(profile));
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
    setStats({
      onlineUsers: 1,
      totalResumes: isLoggedIn ? userResumes.length : realResumesCount,
      totalSales: totalSalesValue,
      registeredCount: usersDb.length
    });
  }, [isLoggedIn, userResumes.length, realResumesCount, totalSalesValue, usersDb.length]);

  // Secure Firestore transaction-based redemption process handler
  const handleRedeemVoucher = async (code: string) => {
    if (!isLoggedIn || !auth.currentUser) {
      return { success: false, value: 0 };
    }
    const userId = auth.currentUser.uid;
    const voucherRef = doc(db, 'vouchers', code);
    const userRef = doc(db, 'users', userId);

    try {
      const res = await runTransaction(db, async (transaction) => {
        const voucherSnap = await transaction.get(voucherRef);
        if (!voucherSnap.exists() || !voucherSnap.data()?.active) {
          return { success: false, reason: 'invalid_or_used' };
        }
        const voucherData = voucherSnap.data() as Voucher;

        const userSnap = await transaction.get(userRef);
        let updatedCredits = voucherData.value;

        // If user document is missing/not-created-yet in Firestore, create it on the fly
        if (!userSnap.exists()) {
          const signupGift = brandConfig.registerGiftCredits !== undefined ? brandConfig.registerGiftCredits : 5;
          const newUserObj: ClientAccount = {
            id: userId,
            name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User',
            email: auth.currentUser?.email || '',
            credits: signupGift + voucherData.value,
            resumesCreated: 0,
            joinedAt: new Date().toISOString().slice(0, 10)
          };
          transaction.set(userRef, newUserObj);
          updatedCredits = signupGift + voucherData.value;
        } else {
          const userData = userSnap.data() as ClientAccount;
          updatedCredits = (userData.credits || 0) + voucherData.value;
          transaction.update(userRef, { credits: updatedCredits });
        }

        // Invalidate voucher
        transaction.update(voucherRef, { active: false });

        return { success: true, value: voucherData.value };
      });

      if (res.success) {
        setUserCredits(prev => prev + (res.value || 0));
        setTotalSalesValue(prev => prev + (res.value || 0));
        return { success: true, value: res.value };
      }
      return { success: false, value: 0 };
    } catch (e) {
      console.error("Failed to redeem token securely via Transaction:", e);
      return { success: false, value: 0 };
    }
  };

  const handleChargeCardDirect = async () => {
    if (isLoggedIn && auth.currentUser) {
      const userId = auth.currentUser.uid;
      try {
        await updateDoc(doc(db, 'users', userId), {
          credits: increment(1)
        });
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

  const handleLogin = (emailStr: string, nameStr: string) => {
    // Already handled in actual Firebase onAuthStateChanged listener
  };

  const handleLogout = async () => {
    await signOut(auth);
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
    localStorage.removeItem('cv_ai_unlocked_snapshot');
    setShowAccountModal(false);
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
    setWizardKey(prev => prev + 1);
    setActiveView('workspace');
    setShowAccountModal(false);
  };

  const handleStartOrCreateSequence = () => {
    if (isLoggedIn) {
      handleCreateNewCV();
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
        try {
          await updateDoc(doc(db, 'users', userId), {
            credits: increment(-1),
            resumesCreated: increment(1)
          });
          setUserCredits(prev => Math.max(0, prev - 1));

          // Save/Sync the unlocked resume document directly to the client's account in Firestore
          const pId = updatedProfile.id || `cv_${Date.now()}`;
          const resumeRef = doc(db, 'users', userId, 'resumes', pId);
          await setDoc(resumeRef, { ...updatedProfile, id: pId, email: currentUserEmail }, { merge: true });
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
      const snapshot = getProfileDataSnapshot(profile);
      const updatedProfile = {
        ...profile,
        unlockedSnapshot: snapshot
      };
      const pId = updatedProfile.id || `cv_${Date.now()}`;
      const resumeRef = doc(db, 'users', userId, 'resumes', pId);
      try {
        await setDoc(resumeRef, { ...updatedProfile, id: pId, email: currentUserEmail }, { merge: true });
        console.log("CV saved successfully upon download.");
      } catch (err) {
        console.warn("Failed to automatically save CV on download:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-zinc-100 flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-violet-500/30 selection:text-white" id="main-application-frame">
      {/* Background Neon Spotlights and Glowing Grid */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-violet-600/10 to-fuchsia-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-blue-600/10 to-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
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
          {isLoggedIn && currentUserEmail === 'veira1x1@gmail.com' && (
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
                if (isLoggedIn && auth.currentUser && auth.currentUser.email === 'veira1x1@gmail.com') {
                  try {
                    await setDoc(doc(db, 'config', 'brand'), c);
                  } catch (err) {
                    console.error("Firestore config write failed", err);
                  }
                }
              }}
              vouchers={voucherDb}
              onAddVouchers={async (newVList) => {
                // Bulk write generated vouchers to Firestore vouchers collection
                setVoucherDb(prev => {
                  const combined = [...newVList, ...prev];
                  combined.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                  return combined;
                });
                if (isLoggedIn && auth.currentUser && auth.currentUser.email === 'veira1x1@gmail.com') {
                  try {
                    for (const v of newVList) {
                      await setDoc(doc(db, 'vouchers', v.code), v);
                    }
                  } catch (err) {
                    console.error("Vouchers write failed", err);
                  }
                }
              }}
              users={usersDb}
              onUpdateUsers={async (uList) => {
                // Find exactly which user has changed
                const updatedUser = uList.find(u => {
                  const current = usersDb.find(cur => cur.id === u.id);
                  return !current || current.credits !== u.credits || current.resumesCreated !== u.resumesCreated;
                });

                // Set local state
                setUsersDb(uList);

                if (updatedUser && isLoggedIn && auth.currentUser && auth.currentUser.email === 'veira1x1@gmail.com') {
                  try {
                    await setDoc(doc(db, 'users', updatedUser.id), updatedUser);
                    console.log(`Successfully updated user ${updatedUser.id} in Firestore`);
                  } catch (err) {
                    console.error("Single user write failed:", err);
                  }
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
              {loginError && (
                <div className={`p-3.5 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs font-sans leading-relaxed ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                  {loginError}
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

                    {/* Option 2: Google */}
                    <div className="space-y-2">
                      <button
                        onClick={async () => {
                          setAuthLoading(true);
                          setLoginError('');
                          try {
                            await signInWithPopup(auth, googleProvider);
                            setShowLoginModal(false);
                          } catch (err: any) {
                            console.error("Google auth issue: ", err);
                            const isPopupErr = err?.code === 'auth/popup-blocked' || 
                                               err?.code === 'auth/cancelled-popup-request' || 
                                               err?.code === 'auth/popup-closed-by-user' ||
                                               err?.message?.includes('popup') || 
                                               err?.message?.includes('blocked') || 
                                               err?.message?.includes('cancel');

                            if (isPopupErr) {
                              setLoginError(lang === 'ar' 
                                ? '⚠️ يرجى الضغط على زر "فتح الموقع في نافذة جديدة مستقلة" بالأسفل لتجاوز حظر المتصفح للنوافذ المنبثقة.' 
                                : '⚠️ Please use the "Open in Standalone New Window" button below to bypass browser popup blocks.');
                            } else {
                              // Suppress system/domain/configuration errors completely from setting ugly UI alerts
                              setLoginError('');
                            }
                          } finally {
                            setAuthLoading(false);
                          }
                        }}
                        className="w-full p-4 rounded-xl border border-zinc-900 hover:border-violet-500/30 bg-zinc-950/40 hover:bg-zinc-900/40 text-right flex items-start gap-3.5 transition-all group cursor-pointer"
                      >
                        <div className="p-2 ml-1 rounded-lg bg-zinc-900 text-violet-400 shrink-0 group-hover:bg-violet-600/10 transition-colors">
                          <Chrome className="w-4.5 h-4.5" />
                        </div>
                        <div className="font-sans space-y-1 flex-1">
                          <div className="text-xs font-bold text-white group-hover:text-violet-400 transition-colors">
                            {lang === 'ar' ? '2. تسجيل الدخول السريع عبر Google' : '2. Quick Login with Google'}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {lang === 'ar' ? 'وصول فوري آمن باستخدام حساب Gmail الخاص بك.' : 'One-tap authorization with your Google Gmail account.'}
                          </div>
                        </div>
                      </button>

                      {/* Dynamic Iframe Detection or Active Google Error bypass */}
                      {(typeof window !== 'undefined' && window.self !== window.top) && (
                        <div className="p-3 bg-violet-950/10 border border-violet-500/10 rounded-xl space-y-2 text-right">
                          <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                            {lang === 'ar' 
                              ? '💡 ملاحظة للمطور والعملاء: المتصفحات تمنع النوافذ المنبثقة لجوجل داخل إطار المعاينة. اضغط أدناه لفتح الموقع في نافذة جديدة مستقلة وسيعمل تسجيل الدخول الفوري بضغطة زر واحدة فورا وبدون أي حظر!' 
                              : '💡 Integration Notice: Browsers prevent popup redirects inside the sandbox. Click below to view the site as a standalone tab where Google Auth executes smoothly in one tap!'}
                          </p>
                          <a
                            href={typeof window !== 'undefined' ? window.location.href : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 font-bold text-center block transition-all font-sans text-[10.5px] flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-violet-500/5 hover:scale-[1.01]"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
                            <span>{lang === 'ar' ? 'فتح الموقع في نافذة كاملة مستقلة لتجاوز حظر المتصفح' : 'Open in Full Standalone Tab'}</span>
                          </a>
                        </div>
                      )}
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
                        setLoginError(lang === 'ar' ? 'الرجاء ملء حقول البريد وكلمة المرور' : 'Fill out both email and password');
                        return;
                      }
                      if (loginEmail.indexOf('@') === -1) {
                        setLoginError(lang === 'ar' ? 'بريد إلكتروني غير صالح' : 'Invalid email format');
                        return;
                      }
                      if (loginPassword.length < 6) {
                        setLoginError(lang === 'ar' ? 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters');
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
                          try {
                            credential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
                          } catch (signInErr: any) {
                            // User friendly prompt to switch to register if email does not exist
                            if (signInErr.code === 'auth/user-not-found' || signInErr.message?.includes('user-not-found')) {
                              setLoginError(lang === 'ar' 
                                ? '⚠️ هذا البريد غير مسجل مسبقاً. يرجى الضغط على زر "إنشاء حساب جديد" بالأعلى لتسجيل حسابك لأول مرة.' 
                                : '⚠️ This email is not registered. Please click the "Create New Account" tab above to sign up first.');
                              return;
                            } else {
                              throw signInErr;
                            }
                          }
                        }
                        setShowLoginModal(false);
                      } catch (err: any) {
                        console.error("Firebase email auth failed:", err);
                        if (err.code === 'auth/email-already-in-use') {
                          setLoginError(lang === 'ar' 
                            ? '⚠️ هذا البريد مسجل بالفعل. يرجى اختيار تبويب "تسجيل دخول" وادخال كلمة السر الخاصة بك.' 
                            : '⚠️ This email is already registered. Please use the "Sign In" tab.');
                        } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                          setLoginError(lang === 'ar' 
                            ? '⚠️ كلمة المرور المدخلة غير صحيحة أو البريد خاطئ.' 
                            : '⚠️ Incorrect password or invalid credentials.');
                        } else {
                          setLoginError(lang === 'ar' 
                            ? '⚠️ عذراً، تعذر إتمام العملية حالياً. يرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة.' 
                            : '⚠️ Sorry, we could not complete the operation. Please check your internet connection and try again.');
                        }
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
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-650 focus:border-violet-500 transition-colors focus:outline-none"
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

              {/* MODE 3: GOOGLE SIMULATOR */}
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

                  {isLoggedIn && currentUserEmail === 'veira1x1@gmail.com' && (
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
