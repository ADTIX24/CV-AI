/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, ShieldAlert, FileText, Download, Lock, Check, BookOpen, AlertTriangle, Image, Save } from 'lucide-react';
import { CVProfile } from '../types';
import { AppTranslation } from '../translations';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  t: AppTranslation;
  lang: 'ar' | 'en';
  profile: CVProfile;
  onSelectTemplate: (t: string) => void;
  unlocked: boolean;
  onInitiateUnlock: () => void;
  credits: number;
  onDownload?: () => void;
  onSaveProfile?: () => Promise<boolean>;
}

interface TemplateConfig {
  layout: 'standard' | 'sidebar-left' | 'sidebar-right' | 'mono-grid' | 'banner-top';
  fontFamily: string;
  paperBg: string;
  textColor: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  sidebarBg?: string;
  sidebarTextColor?: string;
}

const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  modern: {
    layout: 'standard',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-zinc-850',
    accentText: 'text-blue-600',
    accentBg: 'bg-blue-600',
    accentBorder: 'border-blue-200'
  },
  classic: {
    layout: 'standard',
    fontFamily: 'font-serif',
    paperBg: 'bg-white',
    textColor: 'text-zinc-800',
    accentText: 'text-zinc-800',
    accentBg: 'bg-zinc-800',
    accentBorder: 'border-zinc-200'
  },
  indigoGlow: {
    layout: 'standard',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-zinc-850',
    accentText: 'text-indigo-600',
    accentBg: 'bg-indigo-600',
    accentBorder: 'border-indigo-100'
  },
  luxGold: {
    layout: 'standard',
    fontFamily: 'font-serif',
    paperBg: 'bg-[#fafaf6]', // Warm paper ivory
    textColor: 'text-zinc-900',
    accentText: 'text-amber-800',
    accentBg: 'bg-amber-800',
    accentBorder: 'border-amber-200'
  },
  claudia: {
    layout: 'sidebar-left',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-zinc-850',
    accentText: 'text-zinc-905',
    accentBg: 'bg-zinc-800',
    accentBorder: 'border-zinc-200',
    sidebarBg: 'bg-zinc-100/90',
    sidebarTextColor: 'text-zinc-800'
  },
  emeraldExec: {
    layout: 'standard',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-zinc-850',
    accentText: 'text-emerald-700',
    accentBg: 'bg-emerald-700',
    accentBorder: 'border-emerald-200'
  },
  slateMinimal: {
    layout: 'standard',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-zinc-900',
    accentText: 'text-zinc-900',
    accentBg: 'bg-zinc-900',
    accentBorder: 'border-zinc-300'
  },
  tealCreative: {
    layout: 'sidebar-right',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-zinc-800',
    accentText: 'text-teal-700',
    accentBg: 'bg-teal-700',
    accentBorder: 'border-teal-200',
    sidebarBg: 'bg-teal-50/40',
    sidebarTextColor: 'text-teal-950'
  },
  crimsonAuth: {
    layout: 'standard',
    fontFamily: 'font-serif',
    paperBg: 'bg-white',
    textColor: 'text-zinc-800',
    accentText: 'text-rose-800',
    accentBg: 'bg-rose-800',
    accentBorder: 'border-rose-200'
  },
  charcoalGrid: {
    layout: 'mono-grid',
    fontFamily: 'font-mono',
    paperBg: 'bg-white',
    textColor: 'text-zinc-800',
    accentText: 'text-zinc-900',
    accentBg: 'bg-zinc-900',
    accentBorder: 'border-zinc-400'
  },
  metroModern: {
    layout: 'standard',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-zinc-900',
    accentText: 'text-orange-600',
    accentBg: 'bg-orange-600',
    accentBorder: 'border-zinc-900'
  },
  corpNavy: {
    layout: 'banner-top',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-zinc-850',
    accentText: 'text-sky-900',
    accentBg: 'bg-sky-950',
    accentBorder: 'border-sky-850'
  },
  plumPremium: {
    layout: 'sidebar-left',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-zinc-805',
    accentText: 'text-violet-900',
    accentBg: 'bg-violet-900',
    accentBorder: 'border-violet-200',
    sidebarBg: 'bg-violet-50/50',
    sidebarTextColor: 'text-zinc-800'
  },
  botanical: {
    layout: 'standard',
    fontFamily: 'font-sans',
    paperBg: 'bg-[#fafaf8]',
    textColor: 'text-zinc-800',
    accentText: 'text-[#2d5a27]',
    accentBg: 'bg-[#2d5a27]',
    accentBorder: 'border-[#e3ebe2]'
  },
  techMono: {
    layout: 'mono-grid',
    fontFamily: 'font-mono',
    paperBg: 'bg-zinc-50/30',
    textColor: 'text-zinc-850',
    accentText: 'text-cyan-600',
    accentBg: 'bg-cyan-950',
    accentBorder: 'border-cyan-200'
  },
  serifCream: {
    layout: 'standard',
    fontFamily: 'font-serif',
    paperBg: 'bg-[#fcfaf2]',
    textColor: 'text-zinc-850',
    accentText: 'text-amber-950',
    accentBg: 'bg-amber-900',
    accentBorder: 'border-amber-200'
  },
  sunset: {
    layout: 'sidebar-right',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-zinc-800',
    accentText: 'text-amber-600',
    accentBg: 'bg-amber-500',
    accentBorder: 'border-amber-200',
    sidebarBg: 'bg-amber-50/30',
    sidebarTextColor: 'text-amber-950'
  },
  royalBanner: {
    layout: 'banner-top',
    fontFamily: 'font-serif',
    paperBg: 'bg-white',
    textColor: 'text-zinc-850',
    accentText: 'text-indigo-900',
    accentBg: 'bg-indigo-900',
    accentBorder: 'border-indigo-100'
  },
  splitColumn: {
    layout: 'sidebar-left',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-zinc-800',
    accentText: 'text-blue-900',
    accentBg: 'bg-blue-950',
    accentBorder: 'border-blue-900',
    sidebarBg: 'bg-zinc-50',
    sidebarTextColor: 'text-zinc-900'
  },
  vanguard: {
    layout: 'standard',
    fontFamily: 'font-sans',
    paperBg: 'bg-white',
    textColor: 'text-black',
    accentText: 'text-black',
    accentBg: 'bg-black',
    accentBorder: 'border-black'
  }
};

export function CVViewer({ t, lang, profile, onSelectTemplate, unlocked, onInitiateUnlock, credits, onDownload, onSaveProfile }: Props) {
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [noCreditsError, setNoCreditsError] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSaveClick = async () => {
    if (!onSaveProfile) return;
    setSaveStatus('saving');
    try {
      const success = await onSaveProfile();
      if (success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (e) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Layout refinement states
  const [cvFontSize, setCvFontSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'xxl'>('md');
  const [photoShape, setPhotoShape] = useState<'circle' | 'square' | 'rounded'>('circle');
  const [cvFontFamily, setCvFontFamily] = useState<string>('default');
  const [logoPosition, setLogoPosition] = useState<'top-start' | 'top-center' | 'top-end' | 'none'>('top-center');
  const [logoSize, setLogoSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [photoSize, setPhotoSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [headingColor, setHeadingColor] = useState<string>('');
  const [primaryTextColor, setPrimaryTextColor] = useState<string>('');

  // Multi-tier text size scale lookup with 5 sizing levels
  const sText = (size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl') => {
    return {
      title: size === 'sm' ? 'text-2xl' : size === 'md' ? 'text-3xl' : size === 'lg' ? 'text-4xl' : size === 'xl' ? 'text-5xl' : 'text-6xl',
      subtitle: size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : size === 'lg' ? 'text-sm' : size === 'xl' ? 'text-base' : 'text-lg',
      sectionHeader: size === 'sm' ? 'text-[11px]' : size === 'md' ? 'text-xs' : size === 'lg' ? 'text-sm' : size === 'xl' ? 'text-base' : 'text-lg',
      body: size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-[11px]' : size === 'lg' ? 'text-xs' : size === 'xl' ? 'text-sm' : 'text-base',
      sub: size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[10px]' : size === 'lg' ? 'text-[11px]' : size === 'xl' ? 'text-xs' : 'text-sm'
    };
  };
  const fs = sText(cvFontSize);

  // Generate and download printable HTML file with responsive style embeds
  const getMappedFontCSS = () => {
    const activeFont = cvFontFamily === 'default' ? config.fontFamily : `font-${cvFontFamily}`;
    if (activeFont === 'font-tajawal' || activeFont === 'tajawal') return "'Tajawal', sans-serif";
    if (activeFont === 'font-amiri' || activeFont === 'amiri') return "'Amiri', serif";
    if (activeFont === 'font-harmattan' || activeFont === 'harmattan') return "'Harmattan', sans-serif";
    if (activeFont === 'font-cairo' || activeFont === 'cairo') return "'Cairo', 'Inter', sans-serif";
    if (activeFont === 'font-inter' || activeFont === 'inter') return "'Inter', sans-serif";
    if (activeFont === 'font-serif') return "'Amiri', serif";
    if (activeFont === 'font-mono') return "'JetBrains Mono', monospace";
    return "'Cairo', 'Inter', sans-serif";
  };

  const generateHighQualityCanvas = async (scaleVal: number): Promise<HTMLCanvasElement> => {
    const documentElement = document.getElementById("cv-rendered-document-face");
    if (!documentElement) throw new Error("Document face element not found");

    const options = {
      scale: scaleVal,
      useCORS: true,
      allowTaint: false, // Ensures toDataURL never crashes due to cross-origin images
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024, // Forces desktop viewport simulation
      onclone: (clonedDoc: Document) => {
        // Hide screenshot warnings
        const warning = clonedDoc.getElementById('screenshot-protection-panel');
        if (warning) {
          warning.style.setProperty('display', 'none', 'important');
        }
        const element = clonedDoc.getElementById('cv-rendered-document-face');
        if (element) {
          // Lock A4 dimensions to guarantee perfect layout and prevent squishing/mobile collapse
          element.style.setProperty('width', '210mm', 'important');
          element.style.setProperty('min-width', '210mm', 'important');
          element.style.setProperty('max-width', '210mm', 'important');
          element.style.setProperty('box-shadow', 'none', 'important');
          element.style.setProperty('border-radius', '0px', 'important');
          element.style.setProperty('border', 'none', 'important');

          // Force all elements inside the cloned tree to apply desktop/md: rules to bypass mobile screen media query limits:
          const allColl = element.querySelectorAll('*');
          allColl.forEach((item) => {
            const htmlItem = item as HTMLElement;
            const classes = htmlItem.className || '';

            // 1. Force Grid Columns
            if (classes.includes('md:grid-cols-12')) {
              htmlItem.style.setProperty('display', 'grid', 'important');
              htmlItem.style.setProperty('grid-template-columns', 'repeat(12, minmax(0, 1fr))', 'important');
            }
            if (classes.includes('md:grid-cols-1')) {
              htmlItem.style.setProperty('grid-template-columns', 'repeat(1, minmax(0, 1fr))', 'important');
            }

            // 2. Force Grid Col Spans
            const colSpanMatch = classes.match(/md:col-span-(\d+)/);
            if (colSpanMatch && colSpanMatch[1]) {
              htmlItem.style.setProperty('grid-column', `span ${colSpanMatch[1]} / span ${colSpanMatch[1]}`, 'important');
            }

            // 3. Force Flex Directions
            if (classes.includes('md:flex-row')) {
              htmlItem.style.setProperty('flex-direction', 'row', 'important');
              htmlItem.style.setProperty('display', 'flex', 'important');
            }

            // 4. Force Text Alignment
            if (classes.includes('md:text-left')) {
              htmlItem.style.setProperty('text-align', 'left', 'important');
            } else if (classes.includes('md:text-right')) {
              htmlItem.style.setProperty('text-align', 'right', 'important');
            }

            // 5. Force Justify and Align items
            if (classes.includes('md:justify-start')) {
              htmlItem.style.setProperty('justify-content', 'flex-start', 'important');
            } else if (classes.includes('md:justify-end')) {
              htmlItem.style.setProperty('justify-content', 'flex-end', 'important');
            } else if (classes.includes('md:justify-between')) {
              htmlItem.style.setProperty('justify-content', 'space-between', 'important');
            }

            // 6. Force Borders & Display Padding adjustments
            if (classes.includes('md:border-r')) {
              htmlItem.style.setProperty('border-right-width', '1px', 'important');
            }
            if (classes.includes('md:border-l')) {
              htmlItem.style.setProperty('border-left-width', '1px', 'important');
            }
            if (classes.includes('md:p-12')) {
              htmlItem.style.setProperty('padding', '3rem', 'important');
            }
          });
        }
      }
    };

    return await html2canvas(documentElement, options);
  };

  const downloadAsPDF = async () => {
    setPdfLoading(true);

    const scaleLevels = [2, 1.5, 1];
    let success = false;
    let lastError: any = null;

    for (const scaleVal of scaleLevels) {
      if (success) break;
      try {
        const canvas = await generateHighQualityCanvas(scaleVal);
        
        // Setup jsPDF A4 Document dimensions in mm
        const pdfWidth = 210; // 210mm wide (Standard A4 width)
        const pdfHeight = 297; // 297mm high (Standard A4 height)
        
        // Calculate aspect ratio
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const pdfRatio = pdfHeight / pdfWidth;
        const imgRatio = imgHeight / imgWidth;
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        if (imgRatio <= pdfRatio + 0.05) {
          // Fits inside 1 page
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        } else {
          // Multi-page document
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const renderedHeightMm = (imgHeight * pdfWidth) / imgWidth;
          let heightLeftMm = renderedHeightMm;
          let positionMm = 0;
          
          pdf.addImage(imgData, 'JPEG', 0, positionMm, pdfWidth, renderedHeightMm, undefined, 'FAST');
          heightLeftMm -= pdfHeight;
          
          while (heightLeftMm > 0) {
            positionMm -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, positionMm, pdfWidth, renderedHeightMm, undefined, 'FAST');
            heightLeftMm -= pdfHeight;
          }
        }

        // Save PDF output with sanitized name
        const sanitizedName = (profile.fullName || 'cv-professional').trim().replace(/[^a-zA-Z0-9\u0600-\u06FF\s-_]/g, '');
        pdf.save(`${sanitizedName || 'cv'}.pdf`);

        success = true;
        console.log(`PDF successfully generated with scale level: ${scaleVal}`);
        break;
      } catch (error) {
        console.warn(`PDF compilation with scale:${scaleVal} failed, attempting next scale value...`, error);
        lastError = error;
      }
    }

    setPdfLoading(false);

    if (!success) {
      console.error("All PDF generation level options failed:", lastError);
      alert(lang === 'ar' ? 'حدث خطأ غير متوقع أثناء تحميل ملف الـ PDF. يرجى تجربة متصفح آخر أو مراجعة الدعم الفني.' : 'Unexpected error during PDF generation. Please try another browser or contact support.');
    }
  };

  const downloadAsImage = async () => {
    setPdfLoading(true);

    const scaleLevels = [2, 1.5, 1];
    let success = false;
    let lastError: any = null;

    for (const scaleVal of scaleLevels) {
      if (success) break;
      try {
        const canvas = await generateHighQualityCanvas(scaleVal);
        
        // Export to lossless PNG format for ultimate font clarity
        const imgData = canvas.toDataURL('image/png');
        
        // Download via virtual link anchor
        const sanitizedName = (profile.fullName || 'cv-professional').trim().replace(/[^a-zA-Z0-9\u0600-\u06FF\s-_]/g, '');
        const filename = `${sanitizedName || 'cv'}.png`;

        const link = document.createElement('a');
        link.href = imgData;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        success = true;
        console.log(`Image successfully generated with scale level: ${scaleVal}`);
        break;
      } catch (error) {
        console.warn(`Image compilation with scale:${scaleVal} failed, attempting next scale value...`, error);
        lastError = error;
      }
    }

    setPdfLoading(false);

    if (!success) {
      console.error("All Image generation options failed:", lastError);
      alert(lang === 'ar' ? 'حدث خطأ غير متوقع أثناء تحميل ملف الصورة. يرجى تجربة متصفح آخر أو مراجعة الدعم الفني.' : 'Unexpected error during Image generation. Please try another browser or contact support.');
    }
  };

  // Generate and download fully formatted editable Word Document file (.doc)
  const downloadAsWord = () => {
    const documentElement = document.getElementById("cv-rendered-document-face");
    if (!documentElement) return;

    const htmlContent = documentElement.innerHTML;
    const rawWordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="UTF-8">
        <title>${profile.fullName || 'CV_AI'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=Cairo:wght@300;400;600;700;900&display=swap');
          body {
            font-family: ${getMappedFontCSS().replace(/'/g, "")}, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333333;
            padding: 20px;
          }
          h1, h2, h3, h4 { color: #111111; font-family: ${getMappedFontCSS().replace(/'/g, "")}, Arial, sans-serif; }
          .grid { display: block; }
          .flex { display: flex; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 4px; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    const blob = new Blob([rawWordContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${profile.fullName || 'Resume'}_CV.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Trigger actual file compilation & downloads delivery
  const handleExport = (format: 'pdf' | 'docx' | 'image') => {
    setCopiedText(true);
    setTimeout(() => {
      setCopiedText(false);
      if (format === 'pdf') {
        downloadAsPDF();
      } else if (format === 'image') {
        downloadAsImage();
      } else {
        downloadAsWord();
      }
    }, 1500);
  };

  const handleDownloadAttempt = (format: 'pdf' | 'docx' | 'image') => {
    if (unlocked) {
      handleExport(format);
      if (onDownload) {
        onDownload();
      }
    } else {
      if (credits >= 1) {
        onInitiateUnlock(); // Deducts 1 credit
        setCopiedText(true);
        setTimeout(() => {
          setCopiedText(false);
          handleExport(format);
          if (onDownload) {
            onDownload();
          }
        }, 1500);
      } else {
        setNoCreditsError(true);
        const paymentElement = document.getElementById("payment-billing-panel");
        if (paymentElement) {
          paymentElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  const templatesList = [
    { id: 'modern', name: lang === 'ar' ? 'الياقوت العصري' : 'Modern Sapphire', color: 'bg-blue-600' },
    { id: 'classic', name: lang === 'ar' ? 'القوالب الفاخرة' : 'Luxury Templates', color: 'bg-zinc-700' },
    { id: 'indigoGlow', name: lang === 'ar' ? 'التوهج البنفسجي' : 'Indigo Glow', color: 'bg-indigo-600' },
    { id: 'luxGold', name: lang === 'ar' ? 'الذهبي الفاخر' : 'Luxury Gold', color: 'bg-amber-500' },
    { id: 'claudia', name: lang === 'ar' ? 'كلوديا بورتفوليو' : 'Claudia Alves Styled', color: 'bg-slate-700' },
    { id: 'emeraldExec', name: lang === 'ar' ? 'الزمرد التنفيذي' : 'Emerald Executive', color: 'bg-emerald-600' },
    { id: 'slateMinimal', name: lang === 'ar' ? 'البساطة الحجرية' : 'Slate Minimalist', color: 'bg-stone-500' },
    { id: 'tealCreative', name: lang === 'ar' ? 'البترولي الإبداعي' : 'Teal Creative', color: 'bg-teal-600' },
    { id: 'crimsonAuth', name: lang === 'ar' ? 'القرمزي القيادي' : 'Crimson Authority', color: 'bg-rose-700' },
    { id: 'charcoalGrid', name: lang === 'ar' ? 'الشبكة الفحمية' : 'Charcoal Grid', color: 'bg-neutral-800' },
    { id: 'metroModern', name: lang === 'ar' ? 'مترو السويسري' : 'Metro Swiss', color: 'bg-orange-500' },
    { id: 'corpNavy', name: lang === 'ar' ? 'شريط الكحلي' : 'Corporate Navy', color: 'bg-sky-950' },
    { id: 'plumPremium', name: lang === 'ar' ? 'الأرجواني الفاخر' : 'Plum Premium', color: 'bg-violet-800' },
    { id: 'botanical', name: lang === 'ar' ? 'المريمية النباتي' : 'Botanical Sage', color: 'bg-green-700' },
    { id: 'techMono', name: lang === 'ar' ? 'التقني مونو' : 'Technical Mono', color: 'bg-cyan-600' },
    { id: 'serifCream', name: lang === 'ar' ? 'التحريري العاجي' : 'Editorial Serif', color: 'bg-amber-900' },
    { id: 'sunset', name: lang === 'ar' ? 'دفء الغروب' : 'Sunset Warmth', color: 'bg-amber-500' },
    { id: 'royalBanner', name: lang === 'ar' ? 'الشعار الملكي' : 'Royal Banner', color: 'bg-indigo-900' },
    { id: 'splitColumn', name: lang === 'ar' ? 'المنقسم المتباين' : 'Split Contrast 40/60', color: 'bg-zinc-900' },
    { id: 'vanguard', name: lang === 'ar' ? 'الرواد الجريء' : 'Vanguard Bold', color: 'bg-black' }
  ];

  const activeTemplateId = templatesList.some(item => item.id === profile.selectedTemplate)
    ? profile.selectedTemplate
    : 'modern';

  const config = TEMPLATE_CONFIGS[activeTemplateId] || TEMPLATE_CONFIGS.modern;
  const activeFontClass = cvFontFamily === 'default' ? config.fontFamily : `font-${cvFontFamily}`;

  const photoSizeClasses = {
    sm: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28',
    md: 'w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36',
    lg: 'w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44',
  };
  const activePhotoSizeClass = photoSizeClasses[photoSize] || photoSizeClasses.md;

  const getHeadingStyle = () => {
    return headingColor ? { color: headingColor } : undefined;
  };
  const getTextColorStyle = () => {
    return primaryTextColor ? { color: primaryTextColor } : undefined;
  };

  // REUSABLE DOCUMENT SUB-BLOCKS
  const photoBox = (profile.photoUrl || profile.enhancedPhotoUrl) ? (
    <div className={`relative ${activePhotoSizeClass} overflow-hidden bg-zinc-50 border-2 border-zinc-200 shadow-md flex items-center justify-center shrink-0 transition-all ${
      photoShape === 'circle' ? 'rounded-full' : photoShape === 'rounded' ? 'rounded-2xl' : 'rounded-none'
    }`}>
      {profile.enhancedPhotoNoWatermarkUrl ? (
        <img 
          src={unlocked ? profile.enhancedPhotoNoWatermarkUrl : profile.enhancedPhotoUrl} 
          alt="Corporate portrait" 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
        />
      ) : profile.photoUrl ? (
        <img 
          src={profile.photoUrl} 
          alt="Corporate portrait" 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
        />
      ) : null}
    </div>
  ) : null;

  const logoSizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  const logoBox = (profile.logoUrl && logoPosition !== 'none') ? (
    <div className={`${logoSizeClasses[logoSize] || 'w-14 h-14'} shrink-0 overflow-hidden flex items-center justify-center self-center md:self-start bg-transparent select-none p-1`}>
      <img 
        src={profile.logoUrl} 
        alt="Brand Logo" 
        className="max-w-full max-h-full object-contain mix-blend-multiply" 
        referrerPolicy="no-referrer" 
      />
    </div>
  ) : null;

  const summaryBio = profile.summary || "";

  const contactsMeta = (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 justify-center md:justify-start pt-2 ${fs.sub} text-zinc-550 font-mono`}>
      <span>{profile.email || 'ahmed@domain.com'}</span>
      <span>•</span>
      <span>{profile.phone || '+966 50 123 4567'}</span>
      <span>•</span>
      <span>{profile.location || (lang === 'ar' ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia')}</span>
      {profile.website && (
        <>
          <span>•</span>
          <span className="text-violet-600 hover:underline">{profile.website}</span>
        </>
      )}
      {profile.linkedin && (
        <>
          <span>•</span>
          <span className="text-blue-600 hover:underline">{profile.linkedin}</span>
        </>
      )}
      {profile.github && (
        <>
          <span>•</span>
          <span className="text-zinc-850 hover:underline">{profile.github}</span>
        </>
      )}
    </div>
  );

  const experiencesSection = profile.experiences.length === 0 ? null : (
    <div className="space-y-3">
      <h3 className={`${fs.sectionHeader} font-bold uppercase tracking-wider pb-1 border-b ${config.accentBorder} ${config.accentText}`} style={getHeadingStyle()}>
        {lang === 'ar' ? 'الخبرات المهنية والعملية' : 'Work Experience'}
      </h3>
      <div className="space-y-4">
        {profile.experiences.map((exp, id) => (
          <div key={id} className="space-y-1 text-start font-sans">
            <div className="flex flex-row justify-between items-start gap-3">
              <div className="space-y-0.5">
                <h4 className={`${fs.body} font-bold text-zinc-900`} style={getHeadingStyle()}>
                  {exp.company}
                </h4>
                <div className={`${fs.sub} font-semibold ${config.accentText}`} style={getHeadingStyle()}>
                  {exp.role}
                </div>
              </div>
              <span className={`${fs.sub} font-mono text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 whitespace-nowrap`}>
                {exp.startDate} - {exp.endDate}
              </span>
            </div>
            {exp.description && (
              <p className={`${fs.body} leading-relaxed text-zinc-600 mt-1`} style={getTextColorStyle()}>
                {exp.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const projectsSection = (!profile.projects || profile.projects.length === 0) ? null : (
    <div className="space-y-3 pt-2">
      <h3 className={`${fs.sectionHeader} font-bold uppercase tracking-wider pb-1 border-b ${config.accentBorder} ${config.accentText}`} style={getHeadingStyle()}>
        {lang === 'ar' ? 'المشاريع البارزة ومعرض الأعمال' : 'Key Projects & Portfolio'}
      </h3>
      <div className="space-y-3">
        {profile.projects.map((proj, id) => (
          <div key={id} className="text-start font-sans space-y-1">
            <div className={`flex justify-between font-bold ${fs.body} text-zinc-850`} style={getHeadingStyle()}>
              <span>{proj.name} <span className="font-normal text-zinc-500">({proj.role})</span></span>
              {proj.link && (
                <a 
                  href={proj.link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className={`${fs.sub} font-mono text-violet-600 hover:underline`}
                >
                  🚀 {lang === 'ar' ? 'رابط' : 'Link'}
                </a>
              )}
            </div>
            <p className={`${fs.body} text-zinc-600 leading-relaxed font-light`} style={getTextColorStyle()}>{proj.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const educationsSection = profile.educations.length === 0 ? null : (
    <div className="space-y-3 pt-2">
      <h3 className={`${fs.sectionHeader} font-bold uppercase tracking-wider pb-1 border-b ${config.accentBorder} ${config.accentText}`} style={getHeadingStyle()}>
        {lang === 'ar' ? 'المسيرة الأكاديمية والتعليم' : 'Education History'}
      </h3>
      <div className="space-y-3">
        {profile.educations.map((edu, id) => (
          <div key={id} className={`${fs.body} text-start`}>
            <div className="flex justify-between font-bold text-zinc-850" style={getHeadingStyle()}>
              <span>{edu.degree} {edu.field ? (lang === 'ar' ? `في ${edu.field}` : `in ${edu.field}`) : ''}</span>
              <span className={`${fs.sub} font-mono text-zinc-550`}>{edu.startDate} - {edu.endDate}</span>
            </div>
            <p className={`${fs.body} text-zinc-500`} style={getTextColorStyle()}>{edu.institution}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const skillsSection = profile.skills.length === 0 ? null : (
    <div className="space-y-2">
      <h3 className={`${fs.sectionHeader} font-bold pb-1 border-b ${config.accentBorder} ${config.accentText}`} style={getHeadingStyle()}>
        {lang === 'ar' ? 'المهارات والقدرات' : 'Core Expertise'}
      </h3>
      <div className="flex flex-wrap gap-1.5 pt-1.5">
        {profile.skills.map((s, id) => (
          <span key={id} className={`px-2 py-0.5 ${fs.sub} rounded ${
            config.layout === 'mono-grid' ? 'bg-cyan-950/20 border border-cyan-500/35 text-cyan-500 font-mono' : 'bg-zinc-100 border border-zinc-200 text-zinc-700'
          }`} style={getTextColorStyle()}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );

  const languagesSection = profile.languages.length === 0 ? null : (
    <div className="space-y-2">
      <h3 className={`${fs.sectionHeader} font-bold pb-1 border-b ${config.accentBorder} ${config.accentText}`} style={getHeadingStyle()}>
        {lang === 'ar' ? 'اللغات والترجمة' : 'Languages'}
      </h3>
      <div className="space-y-2 pt-1.5 text-start">
        {profile.languages.map((lng, id) => {
          let levelText = '';
          if (lng.proficiency === 5) {
            levelText = lang === 'ar' ? 'اللغة الأم' : 'Native Language';
          } else if (lng.proficiency === 4) {
            levelText = lang === 'ar' ? 'جيد جداً' : 'Very Good';
          } else if (lng.proficiency === 3) {
            levelText = lang === 'ar' ? 'جيد / متوسط' : 'Conversational';
          } else {
            levelText = lang === 'ar' ? 'مبتدئ' : 'Basic';
          }
          return (
            <div key={id} className={`${fs.body} text-zinc-700 font-sans flex justify-between items-center py-1 border-b border-zinc-100/50 last:border-0`} style={getTextColorStyle()}>
              <span className="font-bold">{lng.name}</span>
              <span className="text-zinc-500 font-medium text-[10px]">{levelText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const certsSection = profile.certifications.length === 0 ? null : (
    <div className="space-y-2">
      <h3 className={`${fs.sectionHeader} font-bold pb-1 border-b ${config.accentBorder} ${config.accentText}`} style={getHeadingStyle()}>
        {lang === 'ar' ? 'الدورات والشهادات' : 'Certifications'}
      </h3>
      <ul className={`list-disc list-inside space-y-1 ${fs.body} text-zinc-650 pt-1 text-start`} style={getTextColorStyle()}>
        {profile.certifications.map((crt, id) => (
          <li key={id}>{crt}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-6" id="cv-viewer-block">
      {/* Templates Switcher Panel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-zinc-950 p-4 border border-zinc-800 rounded-2xl font-sans">
        <div className="space-y-3 flex-1">
          <label className="text-xs font-bold text-zinc-400 block">{lang === 'ar' ? 'تصميم السيرة الذاتية (قوالب حصرية وضوابط تحكم)' : 'Select template & customization controls'}</label>
          <div className="flex flex-wrap items-center gap-3">
            {/* Extremely dynamic, large, colorful dropdown representing "All Templates" */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 p-0.5 rounded-xl shadow-lg shadow-violet-600/20 active:scale-[0.98] transition-all">
              <div className="bg-zinc-950 px-3 py-2 rounded-[10px] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-[11px] font-extrabold text-violet-300 whitespace-nowrap">
                  {lang === 'ar' ? 'كافة القوالب ★' : 'All Templates ★'}
                </span>
                <select
                  value={activeTemplateId}
                  onChange={(e) => onSelectTemplate(e.target.value)}
                  className="bg-transparent text-white text-xs font-black font-sans px-1 outline-none cursor-pointer border-none focus:ring-0"
                  id="template-quick-select-dropdown"
                >
                  {templatesList.map(tpl => (
                    <option key={tpl.id} value={tpl.id} className="bg-zinc-950 text-zinc-200 font-sans font-medium">
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Font Size Selector (Now expanded with 5 sizes from A- to A+++) */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
              <span className="text-[10px] text-zinc-500 px-1 font-bold">{lang === 'ar' ? 'الخط:' : 'Size:'}</span>
              <button
                type="button"
                onClick={() => setCvFontSize('sm')}
                className={`text-[10px] font-bold w-6 h-6 rounded flex items-center justify-center transition-all ${
                  cvFontSize === 'sm' ? 'bg-violet-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
                title={lang === 'ar' ? 'خط صغير' : 'Small'}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setCvFontSize('md')}
                className={`text-[11px] font-bold w-6 h-6 rounded flex items-center justify-center transition-all ${
                  cvFontSize === 'md' ? 'bg-violet-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
                title={lang === 'ar' ? 'خط متوسط' : 'Medium'}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setCvFontSize('lg')}
                className={`text-[12px] font-bold w-6 h-6 rounded flex items-center justify-center transition-all ${
                  cvFontSize === 'lg' ? 'bg-violet-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
                title={lang === 'ar' ? 'خط كبير' : 'Large'}
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setCvFontSize('xl')}
                className={`text-[12px] font-bold w-7 h-6 rounded flex items-center justify-center transition-all ${
                  cvFontSize === 'xl' ? 'bg-violet-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
                title={lang === 'ar' ? 'خط كبير جداً' : 'Extra Large'}
              >
                A++
              </button>
              <button
                type="button"
                onClick={() => setCvFontSize('xxl')}
                className={`text-[12px] font-bold w-8 h-6 rounded flex items-center justify-center transition-all ${
                  cvFontSize === 'xxl' ? 'bg-violet-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
                title={lang === 'ar' ? 'خط ضخم' : 'Huge'}
              >
                A+++
              </button>
            </div>

            {/* Photo Shape Selector */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
              <span className="text-[10px] text-zinc-500 px-1.5 font-bold">{lang === 'ar' ? 'تأطير الصورة:' : 'Crop:'}</span>
              <button
                type="button"
                onClick={() => setPhotoShape('circle')}
                className={`text-[10px] font-semibold px-2 py-1 rounded flex items-center justify-center gap-1 transition-all ${
                  photoShape === 'circle' ? 'bg-violet-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                ⚪ {lang === 'ar' ? 'دائري' : 'Circle'}
              </button>
              <button
                type="button"
                onClick={() => setPhotoShape('rounded')}
                className={`text-[10px] font-semibold px-2 py-1 rounded flex items-center justify-center gap-1 transition-all ${
                  photoShape === 'rounded' ? 'bg-violet-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                🔲 {lang === 'ar' ? 'منحني' : 'Rounded'}
              </button>
              <button
                type="button"
                onClick={() => setPhotoShape('square')}
                className={`text-[10px] font-semibold px-2 py-1 rounded flex items-center justify-center gap-1 transition-all ${
                  photoShape === 'square' ? 'bg-violet-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                ⬛ {lang === 'ar' ? 'مربع' : 'Square'}
              </button>
            </div>

            {/* Photo Size Selector */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
              <span className="text-[10px] text-zinc-500 px-1.5 font-bold">{lang === 'ar' ? 'مقاس الصورة:' : 'Photo Size:'}</span>
              <button
                type="button"
                onClick={() => setPhotoSize('sm')}
                className={`text-[10px] font-semibold px-2 py-1 rounded flex items-center justify-center gap-1 transition-all ${
                  photoSize === 'sm' ? 'bg-violet-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                {lang === 'ar' ? 'صغير' : 'Small'}
              </button>
              <button
                type="button"
                onClick={() => setPhotoSize('md')}
                className={`text-[10px] font-semibold px-2 py-1 rounded flex items-center justify-center gap-1 transition-all ${
                  photoSize === 'md' ? 'bg-violet-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                {lang === 'ar' ? 'وسط' : 'Medium'}
              </button>
              <button
                type="button"
                onClick={() => setPhotoSize('lg')}
                className={`text-[10px] font-semibold px-2 py-1 rounded flex items-center justify-center gap-1 transition-all ${
                  photoSize === 'lg' ? 'bg-violet-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                {lang === 'ar' ? 'كبير' : 'Large'}
              </button>
            </div>

            {/* Custom Color Wheels & All Spectrum Gradients for Headings and Core Text lines */}
            <div className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400">{lang === 'ar' ? 'لون العناوين والأسماء:' : 'Headings/Names Color:'}</span>
                <div className="flex items-center gap-1.5 align-middle">
                  <input
                    type="color"
                    value={headingColor || '#1f2937'}
                    onChange={(e) => setHeadingColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent"
                    title={lang === 'ar' ? 'اختر أي لون تريده' : 'Pick any custom color'}
                  />
                  {/* Preset Quick Buttons to suggest cool gradients/shades */}
                  <div className="flex items-center gap-1">
                    {['#1e3a8a', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#111827'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setHeadingColor(c)}
                        className="w-3.5 h-3.5 rounded-full border border-zinc-650 hover:scale-110 active:scale-95 transition-all"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                  {headingColor && (
                    <button
                      type="button"
                      onClick={() => setHeadingColor('')}
                      className="text-[9px] text-zinc-500 hover:text-white underline px-1"
                    >
                      {lang === 'ar' ? 'إعادة تعيين' : 'Reset'}
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden sm:inline w-[1px] h-3.5 bg-zinc-800 mx-1"></div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400">{lang === 'ar' ? 'لون خط النصوص والفقرات:' : 'Content Body Color:'}</span>
                <div className="flex items-center gap-1.5 align-middle">
                  <input
                    type="color"
                    value={primaryTextColor || '#4b5563'}
                    onChange={(e) => setPrimaryTextColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent"
                    title={lang === 'ar' ? 'اختر أي لون تريده' : 'Pick any custom color'}
                  />
                  {/* Preset Quick Buttons for Body texts */}
                  <div className="flex items-center gap-1">
                    {['#374151', '#4b5563', '#064e3b', '#78350f', '#0f172a', '#1e293b'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setPrimaryTextColor(c)}
                        className="w-3.5 h-3.5 rounded-full border border-zinc-650 hover:scale-110 active:scale-95 transition-all"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                  {primaryTextColor && (
                    <button
                      type="button"
                      onClick={() => setPrimaryTextColor('')}
                      className="text-[9px] text-zinc-500 hover:text-white underline px-1"
                    >
                      {lang === 'ar' ? 'إعادة تعيين' : 'Reset'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Font Family Selection Dropdown */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
              <span className="text-[10px] text-zinc-500 px-1 font-bold">{lang === 'ar' ? 'نوع الخط:' : 'Font:'}</span>
              <select
                value={cvFontFamily}
                onChange={(e) => setCvFontFamily(e.target.value as any)}
                className="bg-zinc-950 text-zinc-300 text-[10px] p-1 font-sans rounded border border-zinc-850 hover:border-zinc-700 outline-none focus:border-violet-500 font-medium"
                id="font-family-select-dropdown"
              >
                <option value="default">{lang === 'ar' ? 'الخط الافتراضي للموديل' : 'Template Default'}</option>
                <option value="tajawal">Tajawal (تاهجول)</option>
                <option value="amiri">Amiri (جلال الكلمات)</option>
                <option value="harmattan">Harmattan (هارماتان)</option>
                <option value="cairo">Cairo (كود القاهره)</option>
                <option value="inter">Inter (Classic English)</option>
              </select>
            </div>

            {/* Logo Placement Selection Dropdown */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
              <span className="text-[10px] text-zinc-500 px-1 font-bold">{lang === 'ar' ? 'شعار الشركة:' : 'Logo Position:'}</span>
              <select
                value={logoPosition}
                onChange={(e) => setLogoPosition(e.target.value as any)}
                className="bg-zinc-950 text-zinc-300 text-[10px] p-1 font-sans rounded border border-zinc-850 hover:border-zinc-700 outline-none focus:border-violet-500 font-medium"
                id="logo-position-select-dropdown"
              >
                <option value="top-start">{lang === 'ar' ? 'البداية (على المحاذاة)' : 'Alignment Side'}</option>
                <option value="top-center">{lang === 'ar' ? 'بالمُنتصف بالأعلى' : 'Standalone Center'}</option>
                <option value="top-end">{lang === 'ar' ? 'النهاية (الجانب والطرف الآخر)' : 'Opposite End'}</option>
                <option value="none">{lang === 'ar' ? 'إخفاء الشعار تماماً' : 'Hide Logo Record'}</option>
              </select>
            </div>

            {/* Logo Sizing Selection Dropdown (Only shown if logo is active) */}
            {profile.logoUrl && logoPosition !== 'none' && (
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
                <span className="text-[10px] text-zinc-500 px-1 font-bold">{lang === 'ar' ? 'حجم الشعار:' : 'Logo Size:'}</span>
                <select
                  value={logoSize}
                  onChange={(e) => setLogoSize(e.target.value as any)}
                  className="bg-zinc-950 text-zinc-300 text-[10px] p-1 font-sans rounded border border-zinc-850 hover:border-zinc-700 outline-none focus:border-violet-500 font-medium"
                  id="logo-size-select-dropdown"
                >
                  <option value="sm">{lang === 'ar' ? 'صغير' : 'Small'}</option>
                  <option value="md">{lang === 'ar' ? 'متوسط' : 'Medium'}</option>
                  <option value="lg">{lang === 'ar' ? 'كبير' : 'Large'}</option>
                  <option value="xl">{lang === 'ar' ? 'كبير جداً' : 'Extra Large'}</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Action downloads - always visible with credit check */}
        <div className="flex flex-wrap items-center gap-2 pt-2 xl:pt-0">
          <button
            onClick={() => handleDownloadAttempt('pdf')}
            disabled={copiedText}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
            id="unlocked-pdf-download-btn"
          >
            <Download className="w-4 h-4 animate-pulse" />
            {copiedText ? (lang === 'ar' ? 'جاري التحضير...' : 'Compiling PDF...') : (lang === 'ar' ? 'تحميل كـ PDF' : 'Download PDF')}
          </button>
          <button
            onClick={() => handleDownloadAttempt('image')}
            disabled={copiedText}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
            id="unlocked-image-download-btn"
          >
            <Image className="w-4 h-4 text-emerald-100" />
            {lang === 'ar' ? 'تحميل كصورة (فائق الدقة)' : 'Download Image'}
          </button>
          <button
            onClick={() => handleDownloadAttempt('docx')}
            disabled={copiedText}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
            id="unlocked-word-download-btn"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            {lang === 'ar' ? 'تحميل كـ Word' : 'Download DOCX'}
          </button>

          {onSaveProfile && (
            <button
              onClick={handleSaveClick}
              disabled={saveStatus === 'saving' || copiedText}
              className={`px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 duration-200 border ${
                saveStatus === 'saved'
                  ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-550'
                  : saveStatus === 'error'
                  ? 'bg-rose-900/80 hover:bg-rose-800/80 border-rose-800'
                  : 'bg-violet-600/90 hover:bg-violet-650 border-violet-500/30 hover:shadow-violet-600/20'
              }`}
              id="save-to-profile-action-btn"
            >
              <Save className={`w-4 h-4 ${saveStatus === 'saving' ? 'animate-spin' : ''}`} />
              <span>
                {lang === 'ar' ? (
                  saveStatus === 'saving' ? 'جاري الحفظ...' :
                  saveStatus === 'saved' ? 'تم الحفظ في حسابك! ✨' :
                  saveStatus === 'error' ? 'يرجى تسجيل الدخول أولاً' :
                  'حفظ في الملف الشخصي'
                ) : (
                  saveStatus === 'saving' ? 'Saving...' :
                  saveStatus === 'saved' ? 'Saved to Profile! ✨' :
                  saveStatus === 'error' ? 'Please log in first' :
                  'Save to Profile'
                )}
              </span>
            </button>
          )}
        </div>
      </div>

      {copiedText && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-sans">
          <Check className="w-4 h-4 animate-bounce" />
          <span>{lang === 'ar' ? 'تم البدء بمعالجة مستندك بدقة الطباعة الكاملة 300DPI بنجاح!' : 'Document synthesized in 300DPI Studio style! Triggering local print layout.'}</span>
        </div>
      )}

      {noCreditsError && (
        <div className="p-3.5 bg-amber-950/20 border border-amber-900/30 text-amber-200 text-xs rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 text-black font-extrabold rounded-full flex items-center justify-center shrink-0">!</div>
            <span>
              {lang === 'ar' 
                ? 'عذراً، ليس لديك رصيد كافٍ. يرجى شحن رصيدك لتتمكن من تحميل السيرة الذاتية بدقة وورد أو PDF كاملة.' 
                : 'You do not have enough credits. Please recharge your account to download.'}
            </span>
          </div>
          <button
            onClick={() => {
              const paymentElement = document.getElementById("payment-billing-panel");
              if (paymentElement) {
                paymentElement.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded-lg transition-colors cursor-pointer self-end sm:self-auto shrink-0"
          >
            {lang === 'ar' ? 'شحن الرصيد الآن' : 'Recharge Now'}
          </button>
        </div>
      )}

      {/* CV Interactive Stage */}
      <div 
        className={`group relative ${config.paperBg} text-zinc-900 duration-500 transition-colors p-8 md:p-12 shadow-2xl rounded-2xl mx-auto w-full max-w-[210mm] min-h-[297mm] overflow-visible cursor-crosshair select-text`}
        id="cv-rendered-document-face"
      >
        {/* PDF Rendering Premium Loader */}
        {pdfLoading && (
          <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center gap-4 cursor-wait font-sans select-none animate-fade-in rounded-2xl">
            <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-zinc-900 font-bold text-base text-center px-4 animate-pulse">
              {lang === 'ar' 
                ? '✦ جاري تصدير وتوليد ملف المستند الـ PDF بدقة هاتف عالية... يرجى الانتظار ثانية واحدة !' 
                : '✦ Capturing high-fidelity mobile-optimized PDF document... Please wait a second!'}
            </div>
          </div>
        )}

        {/* Anti-screenshot Watermark Overlays (Locked previews only) */}
        {!unlocked && (
          <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden flex flex-col justify-between p-12 opacity-[0.06]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div 
                key={i} 
                className="text-zinc-950 text-5xl font-extrabold tracking-widest uppercase text-center select-none"
                style={{ transform: 'rotate(-25deg)' }}
              >
                CV AI - PREVIEW NO RECHARGE
              </div>
            ))}
          </div>
        )}

        {/* Active anti-copy screen grab floating notice - Pure CSS Hardware Accelerated Group Hover state */}
        {!unlocked && (
          <div 
            className="absolute top-4 left-4 right-4 bg-zinc-900/95 text-zinc-100 p-3 rounded-xl shadow-2xl z-20 flex items-center gap-3 border border-zinc-800 transition-all duration-300 transform -translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none select-none justify-between font-sans"
            id="screenshot-protection-panel"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 shrink-0 text-violet-400 animate-pulse" />
              <span className="text-[10px] md:text-xs leading-normal font-medium">
                {t.screenshotAttemptWarn}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-violet-600/20 text-violet-300 shrink-0 text-[10px] font-mono border border-violet-500/20">
              💡 {lang === 'ar' ? 'تنبيه' : 'Tip'}
            </span>
          </div>
        )}

        {/* -------------------- DYNAMIC LAYOUT SWITCH RENDERER -------------------- */}
        
        {/* -------------------- DYNAMIC LAYOUT SWITCH RENDERER -------------------- */}
        
        {/* LAYOUT 1: STANDARD MULTI-COLUMN */}
        {config.layout === 'standard' && (
          <div className={`max-w-4xl mx-auto space-y-6 ${activeFontClass} ${config.textColor}`}>
            {logoPosition === 'top-center' && logoBox && (
              <div className="flex justify-center pb-2 border-b border-zinc-100/60 mb-2">
                {logoBox}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-6 border-b-2 border-zinc-200">
              {photoBox && (
                <div className="md:col-span-3 flex justify-center md:justify-start">
                  {photoBox}
                </div>
              )}
              <div className={`${photoBox ? 'md:col-span-9' : 'md:col-span-12'} space-y-2 text-center md:text-left flex flex-col md:flex-row justify-between items-start w-full`}>
                <div className="space-y-2 flex-1">
                  {logoPosition === 'top-start' && logoBox && (
                    <div className="mb-2 flex justify-center md:justify-start">
                      {logoBox}
                    </div>
                  )}
                  <h1 className={`${fs.title} font-extrabold tracking-tight`} style={getHeadingStyle()}>{profile.fullName || (lang === 'ar' ? 'أحمد عبد الله العتيبي' : 'Ahmed Al-Otaibi')}</h1>
                  <h2 className={`${fs.subtitle} uppercase tracking-wider font-bold ${config.accentText}`} style={getHeadingStyle()}>{profile.jobTitle || (lang === 'ar' ? 'مستشار إدارة المشاريع الفنية' : 'Technical PM Consultant')}</h2>
                  {summaryBio && <p className={`${fs.body} leading-relaxed text-zinc-650 max-w-2xl font-light`} style={getTextColorStyle()}>{summaryBio}</p>}
                  {contactsMeta}
                </div>
                {logoPosition === 'top-end' && logoBox && (
                  <div className="shrink-0 self-center md:self-start mt-4 md:mt-0">
                    {logoBox}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-8 space-y-6">
                {experiencesSection}
                {projectsSection}
                {educationsSection}
              </div>
              <div className="md:col-span-4 space-y-6">
                {skillsSection}
                {languagesSection}
                {certsSection}
              </div>
            </div>
          </div>
        )}

        {/* LAYOUT 2 & 3: SIDEBAR LEFT or SIDEBAR RIGHT */}
        {(config.layout === 'sidebar-left' || config.layout === 'sidebar-right') && (
          <div className={`max-w-4xl mx-auto ${activeFontClass} ${config.textColor} grid grid-cols-1 md:grid-cols-12 gap-0 border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-white`}>
            {/* Sidebar Column */}
            <div className={`p-6 ${config.sidebarBg || 'bg-zinc-50'} ${
              config.layout === 'sidebar-left' 
                ? 'md:col-span-4 md:border-r border-zinc-200 order-1'
                : 'md:col-span-4 md:border-l border-zinc-200 order-1 md:order-2'
            } space-y-6`}>
              <div className="flex flex-col items-center text-center space-y-4">
                {logoPosition === 'top-center' && logoBox && (
                  <div className="mb-1 flex justify-center">
                    {logoBox}
                  </div>
                )}
                {photoBox}
                <div>
                  <h1 className={`${fs.title} font-bold tracking-tight text-zinc-900 leading-snug`} style={getHeadingStyle()}>{profile.fullName || (lang === 'ar' ? 'أحمد عبد الله العتيبي' : 'Ahmed Al-Otaibi')}</h1>
                  <h2 className={`${fs.subtitle} uppercase tracking-wider font-bold mt-1 ${config.accentText}`} style={getHeadingStyle()}>{profile.jobTitle || (lang === 'ar' ? 'مستشار إدارة المشاريع الفنية' : 'Technical PM Consultant')}</h2>
                </div>
                {logoPosition === 'top-start' && logoBox && (
                  <div className="mt-1 flex justify-center">
                    {logoBox}
                  </div>
                )}
              </div>
              
              <div className="space-y-4 pt-4 border-t border-zinc-300">
                <div className={`space-y-1 ${fs.sub} font-mono break-all text-zinc-650 text-center md:text-left`}>
                  <div>{profile.email || 'ahmed@domain.com'}</div>
                  <div>{profile.phone || '+966 50 123 4567'}</div>
                  <div>{profile.location || (lang === 'ar' ? 'الرياض، السعودية' : 'Riyadh, KSA')}</div>
                  {profile.website && <div className="text-violet-600 font-bold">{profile.website}</div>}
                  {profile.linkedin && <div className="text-blue-600 font-bold">{profile.linkedin}</div>}
                  {profile.github && <div className="text-zinc-800 font-bold">{profile.github}</div>}
                </div>
                {skillsSection}
                {languagesSection}
                {certsSection}
                {logoPosition === 'top-end' && logoBox && (
                  <div className="mt-4 pt-4 border-t border-zinc-200 flex justify-center">
                    {logoBox}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content Column */}
            <div className={`p-8 space-y-6 bg-white ${
              config.layout === 'sidebar-left' ? 'md:col-span-8 order-2' : 'md:col-span-8 order-2 md:order-1'
            }`}>
              {summaryBio && (
                <div className="border-b pb-4 border-zinc-150">
                  <h3 className={`${fs.sectionHeader} uppercase tracking-wider font-bold mb-1.5 ${config.accentText}`} style={getHeadingStyle()}>{lang === 'ar' ? 'النبذة المهنية والملخص الشامل' : 'Professional Summary'}</h3>
                  <p className={`${fs.body} leading-relaxed text-zinc-650 font-light`} style={getTextColorStyle()}>{summaryBio}</p>
                </div>
              )}
              {experiencesSection}
              {projectsSection}
              {educationsSection}
            </div>
          </div>
        )}

        {/* LAYOUT 4: BANNER TOP COLOURED HEADSHOT */}
        {config.layout === 'banner-top' && (
          <div className={`max-w-4xl mx-auto space-y-6 ${activeFontClass} ${config.textColor}`}>
            {/* Header Banner */}
            <div className={`-mx-8 -mt-8 md:-mx-12 md:-mt-12 p-8 md:p-10 ${config.accentBg} text-white flex flex-col md:flex-row justify-between items-center gap-6`}>
              <div className="space-y-2 text-center md:text-left flex-1 col-span-1">
                <h1 className={`${fs.title} font-extrabold tracking-tight leading-none text-white`}>{profile.fullName || (lang === 'ar' ? 'أحمد عبد الله العتيبي' : 'Ahmed Al-Otaibi')}</h1>
                <h2 className={`${fs.subtitle} uppercase tracking-widest font-semibold opacity-90 text-amber-300`}>{profile.jobTitle || (lang === 'ar' ? 'مستشار إدارة المشاريع الفنية' : 'Technical PM Consultant')}</h2>
                <div className={`flex flex-wrap gap-x-4 gap-y-1 ${fs.sub} opacity-85 font-mono pt-2 justify-center md:justify-start`}>
                  <span>{profile.email || 'ahmed@domain.com'}</span>
                  <span>•</span>
                  <span>{profile.phone || '+966 50 123 4567'}</span>
                  <span>•</span>
                  <span>{profile.location || 'الرياض'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {logoPosition !== 'none' && profile.logoUrl && (
                  <div className="w-14 h-14 bg-white/10 backdrop-blur-sm p-1.5 rounded-lg border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                    <img src={profile.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain brightness-0 invert" referrerPolicy="no-referrer" />
                  </div>
                )}
                {photoBox && (
                  <div className="shrink-0 border-2 border-white/20 rounded-xl overflow-hidden shadow-lg">
                    {photoBox}
                  </div>
                )}
              </div>
            </div>

            {summaryBio && (
              <div className="pt-4">
                <p className={`${fs.body} leading-relaxed text-zinc-650 font-light pb-4 border-b border-zinc-200`} style={getTextColorStyle()}>
                  {summaryBio}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-8 space-y-6">
                {experiencesSection}
                {projectsSection}
                {educationsSection}
              </div>
              <div className="md:col-span-4 space-y-6">
                {skillsSection}
                {languagesSection}
                {certsSection}
              </div>
            </div>
          </div>
        )}

        {/* LAYOUT 5: MONOSPACE CRISP TECH GRID */}
        {config.layout === 'mono-grid' && (
          <div className={`max-w-4xl mx-auto space-y-6 ${activeFontClass} ${config.textColor}`}>
            <div className="border-4 border-zinc-900 p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {photoBox && (
                <div className="md:col-span-3 flex justify-center">
                  {photoBox}
                </div>
              )}
              <div className={`${photoBox ? 'md:col-span-9' : 'md:col-span-12'} space-y-2 text-center md:text-left flex flex-col md:flex-row justify-between items-start w-full`}>
                <div className="space-y-2 flex-1">
                  <span className="text-[9px] bg-zinc-900 text-white px-2 py-0.5 font-mono">CORE_IDENT_ACTIVE</span>
                  <h1 className={`${fs.title} font-black uppercase tracking-tight`} style={getHeadingStyle()}>{profile.fullName || 'أحمد عبد الله العتيبي'}</h1>
                  <h2 className={`${fs.subtitle} uppercase font-bold ${config.accentText}`} style={getHeadingStyle()}>{profile.jobTitle || 'مستشار إدارة المشاريع الفنية'}</h2>
                  <div className={`${fs.sub} space-y-0.5 text-zinc-550 font-mono`} style={getTextColorStyle()}>
                    <div>EMAIL_LINK: {profile.email || 'ahmed@domain.com'}</div>
                    <div>PHONE_CELL: {profile.phone || '+966 50 123 4567'}</div>
                    <div>LOCATION: {profile.location || 'Saudi Arabia'}</div>
                  </div>
                </div>
                {logoPosition !== 'none' && logoBox && (
                  <div className="shrink-0 font-mono rounded text-center text-xs flex items-center justify-center bg-transparent">
                    {logoBox}
                  </div>
                )}
              </div>
            </div>

            {summaryBio && (
              <div className="border border-zinc-300 p-4 bg-zinc-50/50">
                <h3 className={`${fs.sub} font-mono font-bold uppercase tracking-widest text-zinc-800 border-b pb-1 mb-2`} style={getHeadingStyle()}>SUMMARY_RECORD</h3>
                <p className={`${fs.body} leading-relaxed text-zinc-700 font-mono`} style={getTextColorStyle()}>{summaryBio}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-7 border border-zinc-200 p-4 space-y-6 bg-white">
                {experiencesSection}
                {projectsSection}
                {educationsSection}
              </div>
              <div className="md:col-span-5 border border-zinc-200 p-4 space-y-6 bg-white">
                {skillsSection}
                {languagesSection}
                {certsSection}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 20 TEMPLATES CARDS CATALOG DRAWER OVERLAY */}
      {showAllTemplates && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-4xl w-full relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-850">
              <div>
                <h3 className="text-md font-extrabold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-400" />
                  {lang === 'ar' ? 'دليل قوالب CV AI الفاخرة العشرين' : 'CV AI 20 Premium Templates Catalog'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {lang === 'ar' ? 'اختر وتنقّل بين 20 قالباً احترافياً متوازناً لتسليط الضوء على هيبتك المهنية' : 'Select from 20 industry-standard frameworks curated by HR and ATS optimization specialists'}
                </p>
              </div>
              <button 
                onClick={() => setShowAllTemplates(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-all flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-2">
              {templatesList.map((tpl) => {
                const cfg = TEMPLATE_CONFIGS[tpl.id] || TEMPLATE_CONFIGS.modern;
                const isSelected = activeTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      onSelectTemplate(tpl.id);
                      setShowAllTemplates(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between h-32 ${
                      isSelected 
                        ? 'border-violet-500 bg-violet-600/10 text-white shadow-xl shadow-violet-600/5' 
                        : 'border-zinc-850 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 hover:border-zinc-750'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`w-3 h-3 rounded-full ${tpl.color}`} />
                        <span className="text-[8px] uppercase tracking-wide font-mono px-1.5 py-0.5 bg-zinc-850 text-zinc-400 border border-zinc-800 rounded">
                          {cfg.layout}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold mt-2.5 leading-tight text-white">{tpl.name}</h4>
                      <p className="text-[9px] text-zinc-400 font-mono mt-1 capitalize leading-none">{cfg.fontFamily.replace('font-', '')} theme</p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-850 w-full text-[9px] text-zinc-500">
                      <span>{lang === 'ar' ? 'تطبيق القالب' : 'Use layout'}</span>
                      {isSelected && <span className="text-violet-400 font-bold font-mono">✦ ACTIVE</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CVViewer;
