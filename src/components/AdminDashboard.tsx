/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ToggleLeft, Database, Settings2, BarChart3, Users, Ticket, Copy, FileSpreadsheet, Plus, ShieldCheck, Heart, Share2, Trash2, Globe, FileText, Link, Languages, Gift } from 'lucide-react';
import { Voucher, AppConfig as AppConfigType, ClientAccount, SystemStats, SocialLink, CustomPage } from '../types';
import { AppTranslation } from '../translations';

interface Props {
  t: AppTranslation;
  lang: 'ar' | 'en';
  config: AppConfigType;
  onUpdateConfig: (c: AppConfigType) => void;
  vouchers: Voucher[];
  onAddVouchers: (vList: Voucher[]) => void;
  users: ClientAccount[];
  onUpdateUsers: (uList: ClientAccount[]) => void;
  stats: SystemStats;
}

export function AdminDashboard({ t, lang, config, onUpdateConfig, vouchers, onAddVouchers, users, onUpdateUsers, stats }: Props) {
  // Brand Editing state
  const [logoText, setLogoText] = useState(config.logoText);
  const [appName, setAppName] = useState(config.appName);

  // New Client Registration Credit Gift state
  const [registerGiftCredits, setRegisterGiftCredits] = useState<number>(config.registerGiftCredits !== undefined ? config.registerGiftCredits : 1);

  // Footer text state
  const [footerTextAr, setFooterTextAr] = useState(config.footerTextAr || '');
  const [footerTextEn, setFooterTextEn] = useState(config.footerTextEn || '');

  // Support Contacts state
  const [supportWhatsAppPhone, setSupportWhatsAppPhone] = useState(config.supportWhatsAppPhone || '962777976501');
  const [supportTelegramUsername, setSupportTelegramUsername] = useState(config.supportTelegramUsername || 'cv_ai_support');

  // Custom pages states
  const [pages, setPages] = useState<CustomPage[]>(config.pages || []);
  const [newPageTitleAr, setNewPageTitleAr] = useState('');
  const [newPageTitleEn, setNewPageTitleEn] = useState('');
  const [newPageContentAr, setNewPageContentAr] = useState('');
  const [newPageContentEn, setNewPageContentEn] = useState('');

  // Dynamic Social Links states
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(config.socialLinks || []);
  const [newSocialPlatform, setNewSocialPlatform] = useState<SocialLink['platform']>('facebook');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  // Voucher generation states
  const [voucherValue, setVoucherValue] = useState(1);
  const [voucherCount, setVoucherCount] = useState(10);
  const [batchMerchant, setBatchMerchant] = useState('');

  // Keep live visitor counts synced with true stats
  const [onlineTicking, setOnlineTicking] = useState(stats.onlineUsers);
  const [successStatus, setSuccessStatus] = useState('');
  const [errorStatus, setErrorStatus] = useState('');
  const [customCreditInputs, setCustomCreditInputs] = useState<Record<string, string>>({});
  const [userSearchTerm, setUserSearchTerm] = useState('');

  useEffect(() => {
    setOnlineTicking(stats.onlineUsers);
  }, [stats.onlineUsers]);

  // Sync state modifications to config
  const saveBranding = () => {
    onUpdateConfig({
      appName: appName.trim(),
      logoText: logoText.trim(),
      logoUrl: config.logoUrl, // Keep logoUrl intact
      footerTextAr: footerTextAr.trim(),
      footerTextEn: footerTextEn.trim(),
      socialLinks: socialLinks,
      pages: pages,
      supportWhatsAppPhone: supportWhatsAppPhone.trim(),
      supportTelegramUsername: supportTelegramUsername.trim(),
      registerGiftCredits: registerGiftCredits
    });
    setSuccessStatus(lang === 'ar' ? 'تم حفظ التعديلات وتحديث الموقع بنجاح! ✦' : 'Layout parameters and custom guides applied!');
    setTimeout(() => setSuccessStatus(''), 2500);
  };

  // Synthesize voucher codes
  const handleVoucherSynthesis = async () => {
    const freshVouchers: Voucher[] = [];
    const targetOwner = batchMerchant.trim() || (lang === 'ar' ? 'مكتبة الموزع' : 'Local Retail Library');

    for (let i = 0; i < voucherCount; i++) {
      const serial = 'CV-AI-' + Math.random().toString(36).substr(2, 4).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
      freshVouchers.push({
        code: serial,
        value: voucherValue,
        active: true,
        groupName: targetOwner,
        createdAt: new Date().toISOString()
      });
    }

    try {
      setErrorStatus('');
      await onAddVouchers(freshVouchers);
      setBatchMerchant('');
      setSuccessStatus(lang === 'ar' ? `تم توليد عدد ${voucherCount} كود شحن بنجاح!` : `Synthesized ${voucherCount} secure voucher codes!`);
      setTimeout(() => setSuccessStatus(''), 2500);
    } catch (err: any) {
      console.error("Voucher batch synthesis error:", err);
      setErrorStatus(lang === 'ar' 
        ? `فشل في شحن الأكواد وحفظها بـ Firestore: ${err?.message || err}` 
        : `Failed storing codes in live Firestore: ${err?.message || err}`);
      setTimeout(() => setErrorStatus(''), 5500);
    }
  };

  // Grant Credits Manually within Directory with typeable input
  const addCreditsToUser = async (userId: string) => {
    const amtStr = customCreditInputs[userId] || '10';
    const amt = Math.max(1, parseInt(amtStr) || 1);
    const updatedUsers = users.map(usr => {
      if (usr.id === userId) {
        return { ...usr, credits: usr.credits + amt };
      }
      return usr;
    });

    try {
      setErrorStatus('');
      await onUpdateUsers(updatedUsers);
      setSuccessStatus(lang === 'ar' ? `تمت إضافة ${amt} كريدت بنجاح!` : `Granted ${amt} credits successfully!`);
      setTimeout(() => setSuccessStatus(''), 2500);
    } catch (err: any) {
      console.error("Manual credit award failed:", err);
      setErrorStatus(lang === 'ar' 
        ? `عذراً، لم نتمكن من تعديل رصيد العميل بـ Firestore: ${err?.message || err}` 
        : `Could not alter client credit balance in Firestore: ${err?.message || err}`);
      setTimeout(() => setErrorStatus(''), 5500);
    }
  };

  // Copy codes utilities
  const copyAllToClipboard = () => {
    const activeGroup = vouchers.map(v => `${v.code} ($${v.value} - ${v.groupName})`).join('\n');
    navigator.clipboard.writeText(activeGroup);
    setSuccessStatus(lang === 'ar' ? 'تم نسخ جميع الأكواد إلى الحافظة!' : 'All codes copied to clipboard!');
    setTimeout(() => setSuccessStatus(''), 2500);
  };

  // Simulated export to CSV file download
  const downloadFakeCSV = () => {
    const content = "Code,Value,Merchant,Status,Date\n" + vouchers.map(v => `${v.code},${v.value},${v.groupName},${v.active ? 'VALID' : 'USED'},${v.createdAt}`).join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Vouchers_${batchMerchant || 'Batch'}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8" id="admin-management-portal">
      {/* Visual notice */}
      {successStatus && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-500 text-black px-5 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 animate-bounce">
          <ShieldCheck className="w-5 h-5" />
          <span>{successStatus}</span>
        </div>
      )}

      {errorStatus && (
        <div className="fixed bottom-5 right-5 z-50 bg-red-600 text-white px-5 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 animate-bounce">
          <div className="w-5 h-5 bg-red-800 rounded-full flex items-center justify-center font-bold text-white shrink-0">!</div>
          <span>{errorStatus}</span>
        </div>
      )}

      {/* 1. Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">{t.onlineUsersStat}</span>
            <span className="text-xl font-bold text-emerald-400 font-mono animate-pulse">{onlineTicking}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">{t.registeredUsersStat}</span>
            <span className="text-xl font-bold text-white font-mono">{users.length}</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">{t.cvCreatedStat}</span>
            <span className="text-xl font-bold text-violet-400 font-mono">{stats.totalResumes}</span>
          </div>
          <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">{lang === 'ar' ? 'القيمة الإجمالية للرصيد المشحون' : 'Voucher credit liquidity'}</span>
            <span className="text-xl font-bold text-amber-500 font-mono">${stats.totalSales + vouchers.reduce((acc, curr) => acc + (curr.active ? 0 : curr.value), 0)}</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Ticket className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Brand guidelines customizer & User credit override blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Brand identity Settings */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-900">
            <Settings2 className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-100">{t.logoDesignTitle}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-mono">{t.appNameLabel}</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full bg-zinc-900 text-xs border border-zinc-800 p-2.5 rounded text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-mono">{t.logoTextLabel}</label>
              <input
                type="text"
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                className="w-full bg-zinc-900 text-xs border border-zinc-800 p-2.5 rounded text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-3">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-mono">
                {lang === 'ar' ? 'رقم الواتساب للدعم' : 'Support WhatsApp Phone'}
              </label>
              <input
                type="text"
                value={supportWhatsAppPhone}
                onChange={(e) => setSupportWhatsAppPhone(e.target.value.replace(/[^\d+]/g, ''))}
                className="w-full bg-zinc-900 text-xs border border-zinc-800 p-2.5 rounded text-white font-mono"
                placeholder="962777976501"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-mono">
                {lang === 'ar' ? 'معرّف التلغرام (Username)' : 'Support Telegram Username'}
              </label>
              <input
                type="text"
                value={supportTelegramUsername}
                onChange={(e) => setSupportTelegramUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="w-full bg-zinc-900 text-xs border border-zinc-800 p-2.5 rounded text-white font-mono"
                placeholder="cv_ai_support"
              />
            </div>
          </div>

          {/* New Customer Registration Gift Setting */}
          <div className="border-t border-zinc-900 pt-3.5 space-y-3">
            <span className="text-zinc-300 font-bold font-sans text-xs flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-violet-400" />
              {lang === 'ar' ? 'هدية العميل الجديد (الرصيد الترحيبي)' : 'New User Welcome Gift (Credits)'}
            </span>
            <div className={`space-y-1.5 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              <label className="text-[11px] text-zinc-400 font-mono">
                {lang === 'ar' ? 'كمية الكريدت الهدية ترحيباً بالعميل الجديد عند التسجيل' : 'Quantity of gift credits awarded upon registering a new account'}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={registerGiftCredits}
                  onChange={(e) => setRegisterGiftCredits(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 bg-zinc-900 text-xs text-white border border-zinc-800 p-2 text-center rounded font-mono"
                />
                <span className="text-[11px] text-zinc-400 font-sans">
                  {lang === 'ar' ? 'رصيد كريدت (مثال: بمجرد التسجيل يربح هذا العدد)' : 'Credits (signup rewards)'}
                </span>
              </div>
            </div>
          </div>

          {/* New Custom Brand Logo File Upload Box with Recommended Guidelines details */}
          <div className="space-y-2 border-t border-zinc-900 pt-3.5">
            <label className="text-[11.5px] font-semibold text-zinc-300 font-sans block">
              {lang === 'ar' ? 'تحميل شعار مخصص للموقع من جهازك' : 'Upload Client Brand Logo'}
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
              {/* Logo Preview Square */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 h-28 relative overflow-hidden group">
                {config.logoUrl ? (
                  <>
                    <img 
                      src={config.logoUrl} 
                      alt="Uploaded Brand Logo" 
                      className="max-h-16 max-w-full object-contain duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateConfig({ ...config, logoUrl: "" });
                      }}
                      className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-[9px] transition-all cursor-pointer font-sans"
                    >
                      {lang === 'ar' ? 'حذف' : 'Remove'}
                    </button>
                  </>
                ) : (
                  <div className="text-zinc-550 text-[10px] text-center font-mono select-none p-2">
                    {lang === 'ar' ? 'الشعار الافتراضي (الأيقونة الرسمية)' : 'Default Shiny Motif Logo'}
                  </div>
                )}
              </div>

              {/* Upload controls & specifications detail list instructions */}
              <div className="md:col-span-8 space-y-1.5 text-right md:text-left">
                <input 
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        onUpdateConfig({ ...config, logoUrl: reader.result as string });
                        setSuccessStatus(lang === 'ar' ? 'تم رفع الشعار وحفظه بنجاح ✦' : 'Dynamic brand logo synthesized successfully!');
                        setTimeout(() => setSuccessStatus(''), 2500);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="block w-full text-[10.5px] text-zinc-400 file:mr-3 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-violet-600/10 file:text-violet-400 hover:file:bg-violet-600/20 file:cursor-pointer"
                />
                
                {/* Visual Guidelines details panel */}
                <div className="rounded-xl bg-zinc-950 border border-zinc-900 p-3 text-[10px] leading-relaxed text-zinc-400 space-y-1">
                  <span className="font-bold text-[10.5px] text-zinc-300 block pb-1 border-b border-zinc-900">
                    {lang === 'ar' ? '📐 مقاسات الشعار ونوعه الموصى به:' : '📐 Recommended Dimensions & Format:'}
                  </span>
                  {lang === 'ar' ? (
                    <ul className="list-disc list-inside space-y-0.5 text-zinc-400 font-sans">
                      <li>تفضيل خلفية شفافة من صيغة <code className="text-amber-400 bg-black px-1.5 py-0.5 rounded font-mono font-bold">PNG</code> أو <code className="text-amber-400 bg-black px-1.5 py-0.5 rounded font-mono font-bold">SVG</code></li>
                      <li>شعار مربع للأيقونات: <code className="text-zinc-200 font-mono">256 × 256 بكسل</code> (نسبة العرض 1:1)</li>
                      <li>شعار هيدر عريض: <code className="text-zinc-200 font-mono font-semibold">512 × 128 بكسل</code> (نسبة العرض 4:1)</li>
                    </ul>
                  ) : (
                    <ul className="list-disc list-inside space-y-0.5 text-zinc-400 font-sans">
                      <li>Use transparent background <code className="text-amber-400 bg-black px-1 rounded font-mono">PNG</code> or <code className="text-amber-400 bg-black px-1 rounded font-mono">SVG</code> formats.</li>
                      <li>Square Icon motifs: <code className="text-zinc-200 font-mono">256 × 256 px</code> (Ratio 1:1)</li>
                      <li>Horizontal brand header banners: <code className="text-zinc-200 font-mono font-semibold">512 × 128 px</code> (Ratio 4:1)</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>



          {/* Footer Text customization fields */}
          <div className="border-t border-zinc-900 pt-3.5 space-y-3">
            <span className="text-zinc-300 font-bold font-sans text-xs flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-violet-400" />
              {lang === 'ar' ? 'تخصيص نص تذييل الصفحة (حقوق الملكية)' : 'Customize Footer copyright label'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 uppercase">{lang === 'ar' ? 'نص التذييل بالعربية' : 'Arabic Footer Text'}</label>
                <input
                  type="text"
                  value={footerTextAr}
                  onChange={(e) => setFooterTextAr(e.target.value)}
                  placeholder="جميع الحقوق محفوظة..."
                  className="w-full bg-zinc-900 text-xs border border-zinc-800 p-2.5 rounded text-zinc-200"
                />
              </div>
              <div className="space-y-1 text-left sm:text-right">
                <label className="text-[10px] font-mono text-zinc-500 uppercase">{lang === 'ar' ? 'نص التذييل بالإنجليزية' : 'English Footer Text'}</label>
                <input
                  type="text"
                  value={footerTextEn}
                  onChange={(e) => setFooterTextEn(e.target.value)}
                  placeholder="All rights reserved..."
                  className="w-full bg-zinc-900 text-xs border border-zinc-800 p-2.5 rounded text-zinc-200"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Social Links CRUD Panel */}
          <div className="border-t border-zinc-900 pt-3.5 space-y-4">
            <span className="text-zinc-300 font-bold font-sans text-xs flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-violet-400" />
              {lang === 'ar' ? 'أيقونات ووسائل التواصل الاجتماعي (يمكن إضافة المزيد ✦)' : 'Interactive Social Media Icons (Can Add More ✦)'}
            </span>

            {/* Dynamic list */}
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {socialLinks.length === 0 ? (
                <p className="text-[11px] italic text-zinc-650 text-center py-2">
                  {lang === 'ar' ? 'لا توجد وسائل تواصل تفاعلية مضافة.' : 'No social icons configured.'}
                </p>
              ) : (
                socialLinks.map(link => (
                  <div key={link.id} className="flex items-center justify-between p-2 rounded bg-zinc-900/80 border border-zinc-850 text-xs text-zinc-300 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-950 font-mono text-[9px] uppercase font-bold text-violet-400">
                        {link.platform}
                      </span>
                      <span className="text-[10px] text-zinc-400 select-all max-w-[140px] truncate">{link.url}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = socialLinks.map(l => l.id === link.id ? { ...l, active: !l.active } : l);
                          setSocialLinks(updated);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold cursor-pointer ${link.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}
                      >
                        {link.active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'معطل' : 'Disabled')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = socialLinks.filter(l => l.id !== link.id);
                          setSocialLinks(updated);
                        }}
                        className="p-1 rounded text-red-400 hover:bg-red-500/10 cursor-pointer"
                        title={lang === 'ar' ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Creation panel */}
            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-850/60 flex flex-col sm:flex-row gap-2 items-end">
              <div className="space-y-1 flex-1 w-full text-right sm:text-left">
                <label className="text-[9.5px] font-mono text-zinc-500 block uppercase">{lang === 'ar' ? 'الشبكة' : 'Platform'}</label>
                <select
                  value={newSocialPlatform}
                  onChange={(e) => setNewSocialPlatform(e.target.value as any)}
                  className="w-full bg-zinc-950 text-xs border border-zinc-805 p-2 rounded text-zinc-200"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="telegram">Telegram</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="youtube">YouTube</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="tiktok">TikTok</option>
                  <option value="other">Other Link</option>
                </select>
              </div>
              <div className="space-y-1 flex-[2] w-full text-right sm:text-left">
                <label className="text-[9.5px] font-mono text-zinc-500 block uppercase">{lang === 'ar' ? 'الرابط الإلكتروني' : 'URL Link'}</label>
                <input
                  type="url"
                  value={newSocialUrl}
                  onChange={(e) => setNewSocialUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-950 text-xs border border-zinc-805 p-2 rounded text-zinc-200"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!newSocialUrl.trim()) return;
                  const newLinkObj: SocialLink = {
                    id: 'lnk_' + Math.random().toString(36).substr(2, 9),
                    platform: newSocialPlatform,
                    url: newSocialUrl.trim(),
                    active: true
                  };
                  setSocialLinks([...socialLinks, newLinkObj]);
                  setNewSocialUrl('');
                }}
                className="px-3.5 py-2 rounded bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-semibold cursor-pointer w-full sm:w-auto shrink-0 flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
              </button>
            </div>
          </div>

          <button
            onClick={saveBranding}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            {t.saveBrandingChanges}
          </button>
        </div>

        {/* User directory credits manager */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-zinc-100">{t.userManagementTitle}</h3>
              </div>
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث بالاسم، الايميل أو المعرّف...' : 'Search by name, email or UID...'}
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-48 font-sans"
              />
            </div>

            <div className="divide-y divide-zinc-900 overflow-y-auto max-h-[500px] pr-2 mt-4 space-y-2.5">
              {(() => {
                const filtered = users.filter(usr => {
                  const q = userSearchTerm.toLowerCase().trim();
                  if (!q) return true;
                  return (usr.name || '').toLowerCase().includes(q) || 
                         (usr.email || '').toLowerCase().includes(q) || 
                         (usr.id || '').toLowerCase().includes(q);
                });
                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-zinc-500 text-xs font-sans">
                      {lang === 'ar' ? 'لم يتم العثور على أي مستخدم يطابق البحث.' : 'No users found matching your search term.'}
                    </div>
                  );
                }
                return filtered.map((usr) => (
                  <div key={usr.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 text-xs gap-3">
                    <div className="text-right sm:text-left">
                      <span className="text-zinc-150 font-sans font-semibold block">{usr.name}</span>
                      <span className="text-[10.5px] text-zinc-500 block font-mono">{usr.email}</span>
                    </div>
                    
                    {/* Premium credit management inputs with exact typeable count support */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="font-mono text-amber-500 bg-amber-500/10 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold shrink-0">
                        {usr.credits} {lang === 'ar' ? 'كريدت' : 'Credits'}
                      </span>
                      
                      {/* Numeric input & add button integrated into a sleek visual capsule */}
                      <div className="flex items-center border border-zinc-800 bg-zinc-900 rounded-lg overflow-hidden shrink-0">
                        <input
                          type="number"
                          min="1"
                          placeholder="10"
                          title={lang === 'ar' ? 'کمية الكريدت' : 'Credit amount'}
                          value={customCreditInputs[usr.id] !== undefined ? customCreditInputs[usr.id] : '10'}
                          onChange={(e) => setCustomCreditInputs({
                            ...customCreditInputs,
                            [usr.id]: e.target.value
                          })}
                          className="w-14 bg-zinc-950 text-white text-[10.5px] font-mono py-1.5 focus:outline-none text-center border-r border-zinc-800"
                        />
                        <button
                          onClick={() => addCreditsToUser(usr.id)}
                          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold font-sans transition-colors cursor-pointer flex items-center gap-0.5"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          {lang === 'ar' ? 'إضافة رصيد' : 'Add Credit'}
                        </button>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
          
          <div className="pt-4 border-t border-zinc-900 mt-4 text-[10px] text-zinc-500 text-center font-mono uppercase tracking-widest">
            {lang === 'ar' ? 'التحكم اليدوي المباشر كمدير مع ميزة المحاكاة المتكاملة' : 'Direct manual overwrite simulation channel ACTIVE'}
          </div>
        </div>
      </div>

      {/* 3. Wholesale Recharge Coupons Generator */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-900 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-zinc-100">{t.voucherEngineTitle}</h3>
          </div>
          {vouchers.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={downloadFakeCSV}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs flex items-center gap-1.5 transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                {t.exportCsvBtn}
              </button>
              <button
                onClick={copyAllToClipboard}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs flex items-center gap-1.5 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                {t.copyCodesBtn}
              </button>
            </div>
          )}
        </div>

        {/* Generation Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-zinc-900/40 p-4 rounded-xl border border-zinc-900">
          <div className="space-y-1.5 text-left">
            <label className="text-[11px] text-zinc-400 font-mono">{t.voucherValLabel}</label>
            <input
              type="number"
              min={1}
              value={voucherValue}
              onChange={(e) => setVoucherValue(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white"
            />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[11px] text-zinc-400 font-mono">{t.voucherCountLabel}</label>
            <input
              type="number"
              min={1}
              value={voucherCount}
              onChange={(e) => setVoucherCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white"
            />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[11px] text-zinc-400 font-mono">{t.voucherBatchName}</label>
            <input
              type="text"
              placeholder="e.g. Horizon Bookstore"
              value={batchMerchant}
              onChange={(e) => setBatchMerchant(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white"
            />
          </div>

          <button
            onClick={handleVoucherSynthesis}
            className="sm:col-span-3 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all"
            id="admin-generate-vouchers-trigger"
          >
            {t.generateVouchersBtn}
          </button>
        </div>

        {/* Voucher Batch list displaying generated keys */}
        <div className="overflow-x-auto border border-zinc-900 rounded-xl max-h-[300px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 font-mono text-[10px] border-b border-zinc-800">
                <th className="py-2.5 px-4 text-center">{t.codeLabel}</th>
                <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'القدرة الشرائية' : 'Value'}</th>
                <th className="py-2.5 px-4 text-center">{t.merchantLabel}</th>
                <th className="py-2.5 px-4 text-center">{t.statusLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 bg-zinc-950/60 font-mono text-center">
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500 italic">
                    {lang === 'ar' ? 'لا توجود مخرجات شحن نشطة حالياً. استخدم المولد أعلاه لإصدار أكواد دفعة واحدة.' : 'No wholesale vouchers synthesized. Use controls above to generate.'}
                  </td>
                </tr>
              ) : (
                vouchers.map((v, i) => (
                  <tr key={i} className="hover:bg-zinc-900/40">
                    <td className="py-2 px-4 text-zinc-200 font-bold select-all">{v.code}</td>
                    <td className="py-2 px-4 text-amber-500 font-bold">${v.value}</td>
                    <td className="py-2 px-4 text-zinc-400">{v.groupName}</td>
                    <td className="py-2 px-4">
                      {v.active ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] border border-emerald-500/20">
                          {t.activeStatus}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[9px] border border-red-500/20">
                          {t.usedStatus}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Dynamic Pages Manager (مكان إضافة صفحات مخصصة كالإرشادات والاستخدام) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-100 font-sans">
              {lang === 'ar' ? 'إدارة الصفحات المفرزة (طريقة الاستخدام والإرشادات)' : 'Informational Wiki & Usage Pages Manager'}
            </h3>
          </div>
          <span className="text-[9.5px] font-mono text-zinc-500 uppercase tracking-wider block">DEPLOYED WIKI PAGES</span>
        </div>

        {/* Existing Pages and Creation Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider block font-sans">
              {lang === 'ar' ? '📄 الصفحات المضافة والمحررة' : '📄 Currently Active Saved Pages'}
            </h4>
            
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {pages.length === 0 ? (
                <p className="text-xs italic text-zinc-650 text-center py-6 font-sans">
                  {lang === 'ar' ? 'لم يتم صياغة أي صفحات إرشادية بعد.' : 'No wiki pages configured.'}
                </p>
              ) : (
                pages.map(page => (
                  <div key={page.id} className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850 flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2 text-right">
                      <div className="text-right sm:text-left">
                        <span className="text-xs font-bold text-white block font-sans">{lang === 'ar' ? page.titleAr : page.titleEn}</span>
                        <span className="text-[9px] font-mono text-violet-400 block tracking-widest">{page.id.toUpperCase()}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = pages.map(p => p.id === page.id ? { ...p, active: !p.active } : p);
                            setPages(updated);
                          }}
                          className={`px-2 py-0.5 rounded text-[9.5px] font-semibold cursor-pointer ${page.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                        >
                          {page.active ? (lang === 'ar' ? 'مرئية' : 'Visible') : (lang === 'ar' ? 'مخفية' : 'Hidden')}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = pages.filter(p => p.id !== page.id);
                            setPages(updated);
                          }}
                          className="p-1 px-1.5 rounded bg-zinc-950 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer flex items-center justify-center border border-zinc-850"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-[10.5px] text-zinc-400 leading-relaxed bg-zinc-950 p-2.5 rounded border border-zinc-900/70 whitespace-pre-line font-sans max-h-24 overflow-y-auto text-right">
                      {lang === 'ar' ? page.contentAr : page.contentEn}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Creation Form side */}
          <div className="space-y-4 border-t lg:border-t-0 lg:border-r border-zinc-900 pt-4 lg:pt-0 lg:pr-6">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider block font-sans">
              {lang === 'ar' ? '➕ صياغة جديدة مخصصة' : '➕ Forge Dynamic Wiki Page'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
              <div className="space-y-1">
                <label className="text-[9.5px] font-mono text-zinc-500 uppercase">{lang === 'ar' ? 'العنوان بالعربية' : 'Arabic Title'}</label>
                <input
                  type="text"
                  value={newPageTitleAr}
                  onChange={(e) => setNewPageTitleAr(e.target.value)}
                  placeholder="طريقة الاستخدام"
                  className="w-full bg-zinc-900 text-xs border border-zinc-800 p-2.5 rounded text-zinc-200 font-sans"
                />
              </div>
              <div className="space-y-1 text-left sm:text-right">
                <label className="text-[9.5px] font-mono text-zinc-500 uppercase">{lang === 'ar' ? 'العنوان بالإنجليزية' : 'English Title'}</label>
                <input
                  type="text"
                  value={newPageTitleEn}
                  onChange={(e) => setNewPageTitleEn(e.target.value)}
                  placeholder="How to use..."
                  className="w-full bg-zinc-900 text-xs border border-zinc-800 p-2.5 rounded text-zinc-200 font-sans"
                />
              </div>
            </div>

            <div className="space-y-1 text-right">
              <label className="text-[9.5px] font-mono text-zinc-500 block uppercase">{lang === 'ar' ? 'المحتوى بالعربية (أدخل أسطر متعددة للتعليمات)' : 'Arabic Description'}</label>
              <textarea
                value={newPageContentAr}
                onChange={(e) => setNewPageContentAr(e.target.value)}
                placeholder="أدخل إرشادات الاستخدام خطوة بخطوة..."
                rows={3}
                className="w-full bg-zinc-900 text-xs border border-zinc-800 p-2.5 rounded text-zinc-200 resize-none font-sans"
              />
            </div>

            <div className="space-y-1 text-right">
              <label className="text-[9.5px] font-mono text-zinc-500 block uppercase text-left sm:text-right">{lang === 'ar' ? 'المحتوى بالإنجليزية' : 'English Description'}</label>
              <textarea
                value={newPageContentEn}
                onChange={(e) => setNewPageContentEn(e.target.value)}
                placeholder="Step-by-step guidance guidelines..."
                rows={3}
                className="w-full bg-zinc-900 text-xs border border-zinc-800 p-2.5 rounded text-zinc-200 resize-none font-sans text-left sm:text-right"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (!newPageTitleAr.trim() || !newPageTitleEn.trim()) return;
                const newPageObj: CustomPage = {
                  id: 'page_' + Math.random().toString(36).substr(2, 9),
                  titleAr: newPageTitleAr.trim(),
                  titleEn: newPageTitleEn.trim(),
                  contentAr: newPageContentAr.trim(),
                  contentEn: newPageContentEn.trim(),
                  active: true
                };
                setPages([...pages, newPageObj]);
                setNewPageTitleAr('');
                setNewPageTitleEn('');
                setNewPageContentAr('');
                setNewPageContentEn('');
              }}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة الصفحة الجديدة للمسودة' : 'Register Wiki Page'}</span>
            </button>
          </div>
        </div>

        {/* Global footer and pages configuration save trigger */}
        <div className="pt-4 border-t border-zinc-900 flex justify-end">
          <button
            onClick={saveBranding}
            className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-lg cursor-pointer font-sans"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lang === 'ar' ? 'حفظ كافة الصفحات والمظهر بصفة نهائية' : 'Deploy Layouts and Dynamic Pages'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
export default AdminDashboard;
