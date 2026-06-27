/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Compresses and downscales a base64 image string to keep doc sizes small
 * and prevent QuotaExceededError in localStorage or Firestore sizes limits.
 */
export function compressImage(
  base64Str: string,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    // Check if we are running in a browser environment
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = base64Str;

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Only resize if the dimensions exceed constraints
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str); // Fallback on browser failures
        return;
      }

      // Draw active image data with smooth scaling
      try {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Preserve transparency by saving as image/png if original was png, webp or gif
        let mimeType = 'image/jpeg';
        if (base64Str.startsWith('data:image/png') || base64Str.startsWith('data:image/gif') || base64Str.startsWith('data:image/webp') || base64Str.startsWith('data:image/svg+xml')) {
          mimeType = 'image/png';
        }

        const compressedBase64 = mimeType === 'image/jpeg' 
          ? canvas.toDataURL('image/jpeg', quality)
          : canvas.toDataURL('image/png');
        resolve(compressedBase64);
      } catch (err) {
        console.warn("Canvas image compression failed, fallback to original", err);
        resolve(base64Str);
      }
    };

    img.onerror = (err) => {
      console.warn("Image onload parsing error during compression step", err);
      resolve(base64Str);
    };
  });
}

/**
 * Pure mathematical OKLCH to RGB/RGBA string converter to bypass html-to-image/SVG crashes on Tailwind v4 values
 */
export function convertPureOklchToRgb(oklchStr: string): string {
  if (!oklchStr || !oklchStr.includes('oklch')) return oklchStr;
  
  try {
    return oklchStr.replace(/oklch\s*\(([^)]+)\)/gi, (match, content) => {
      try {
        const parts = content.split('/');
        const colorPart = parts[0].trim();
        const opacityPart = parts[1] ? parts[1].trim() : null;

        const values = colorPart.split(/[\s,]+/).map((v: string) => v.trim()).filter(Boolean);
        if (values.length < 3) return match;

        const L_val = values[0];
        const C_val = values[1];
        const H_val = values[2];

        const L = L_val.endsWith('%') ? parseFloat(L_val) / 100 : parseFloat(L_val);
        const C = parseFloat(C_val);
        
        let H = parseFloat(H_val);
        if (H_val.endsWith('rad')) {
          H = H * (180 / Math.PI);
        } else if (H_val.endsWith('turn')) {
          H = H * 360;
        } else if (H_val.endsWith('grad')) {
          H = H * 0.9;
        }

        let alpha = 1;
        if (opacityPart) {
          alpha = opacityPart.endsWith('%') ? parseFloat(opacityPart) / 100 : parseFloat(opacityPart);
        }

        if (isNaN(L) || isNaN(C) || isNaN(H) || isNaN(alpha)) {
          return match;
        }

        // 1. Convert OKLCH to OKLab
        const H_rad = (H * Math.PI) / 180;
        const a = C * Math.cos(H_rad);
        const b = C * Math.sin(H_rad);

        // 2. Convert OKLab to LMS
        const l_lms = L + 0.3963377774 * a + 0.2158037573 * b;
        const m_lms = L - 0.1055613458 * a - 0.0638541728 * b;
        const s_lms = L - 0.0894841775 * a - 1.2914855414 * b;

        // 3. Cube LMS
        const l3 = l_lms * l_lms * l_lms;
        const m3 = m_lms * m_lms * m_lms;
        const s3 = s_lms * s_lms * s_lms;

        // 4. Convert LMS cubed to linear sRGB
        const r_lin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
        const g_lin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
        const b_lin = -0.0041960863 * l3 - 0.7034186145 * m3 + 1.7076147010 * s3;

        // 5. Convert linear sRGB to standard sRGB
        const transfer = (c: number): number => {
          if (c <= 0.0031308) return 12.92 * c;
          return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
        };

        const R = Math.max(0, Math.min(255, Math.round(transfer(r_lin) * 255)));
        const G = Math.max(0, Math.min(255, Math.round(transfer(g_lin) * 255)));
        const B = Math.max(0, Math.min(255, Math.round(transfer(b_lin) * 255)));

        if (alpha === 1) {
          return `rgb(${R}, ${G}, ${B})`;
        } else {
          return `rgba(${R}, ${G}, ${B}, ${alpha})`;
        }
      } catch (err) {
        return match;
      }
    });
  } catch (e) {
    return oklchStr;
  }
}

/**
 * Robustly sanitizes all element styles (inline & stylesheets) from OKLCH colors, 
 * returning functions to run the export, and safely restores stylesheets afterward.
 */
function withSanitizedStyles<T>(element: HTMLElement, action: () => Promise<T>): Promise<T> {
  const savedStyles: Array<{ element: HTMLElement; originalStyle: string }> = [];
  const savedSheets: Array<{ sheet: CSSStyleSheet; rules: Array<{ rule: CSSStyleRule; originalText: string }> }> = [];

  // 1. Sanitize element inline styles
  const sanitizeElement = (el: HTMLElement) => {
    if (el.style && el.style.cssText && el.style.cssText.includes('oklch')) {
      savedStyles.push({ element: el, originalStyle: el.style.cssText });
      el.style.cssText = convertPureOklchToRgb(el.style.cssText);
    }
  };

  sanitizeElement(element);
  element.querySelectorAll('*').forEach(child => sanitizeElement(child as HTMLElement));

  // 2. Sanitize stylesheets
  try {
    Array.from(document.styleSheets).forEach(sheet => {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          const savedRules: Array<{ rule: CSSStyleRule; originalText: string }> = [];
          for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            if (rule instanceof CSSStyleRule && rule.style && rule.style.cssText.includes('oklch')) {
              savedRules.push({ rule, originalText: rule.style.cssText });
              rule.style.cssText = convertPureOklchToRgb(rule.style.cssText);
            }
          }
          if (savedRules.length > 0) {
            savedSheets.push({ sheet, rules: savedRules });
          }
        }
      } catch (e) {
        // Ignore cross-origin stylesheet security errors
      }
    });
  } catch (e) {
    console.warn("Could not sanitize stylesheets", e);
  }

  // 3. Execute export action and restore afterward
  return action().finally(() => {
    savedStyles.forEach(item => {
      try {
        item.element.style.cssText = item.originalStyle;
      } catch (e) {}
    });
    savedSheets.forEach(item => {
      item.rules.forEach(r => {
        try {
          r.rule.style.cssText = r.originalText;
        } catch (e) {}
      });
    });
  });
}

/**
 * Captures the specified element as a high-quality PNG data URL
 */
export async function exportToPNG(elementId?: string): Promise<string> {
  const originalElement = document.getElementById(elementId || 'cv-preview-a4') || 
                          document.getElementById('cv-rendered-document-face') || 
                          document.querySelector('[id^="cv-preview"]') as HTMLElement;
                  
  if (!originalElement) {
    throw new Error("Preview element not found");
  }

  // Detect the actual direction (rtl for Arabic, ltr for English) of the target element
  const currentDir = originalElement.getAttribute('dir') || window.getComputedStyle(originalElement).direction || 'rtl';

  // Deep clone the original element to preserve computed styles and HTML structures cleanly
  const cloned = originalElement.cloneNode(true) as HTMLElement;
  cloned.id = "cloned-cv-preview";

  // 1. Create a completely isolated, hidden virtual iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    throw new Error("Failed to create isolated document");
  }

  // 2. Fetch all stylesheet and style tags to run inside the iframe
  let stylesHtml = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((styleElement) => {
    stylesHtml += styleElement.outerHTML;
  });

  // 3. Build the page inside iframe and inject strict layout rules to prevent any clipping from top or right
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html dir="${currentDir}" lang="${currentDir === 'rtl' ? 'ar' : 'en'}">
      <head>
        <meta charset="UTF-8">
        ${stylesHtml}
        <style>
          /* Force isolated environment dimensions without any distortion or margins */
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
            background: #ffffff !important; 
            width: 794px !important; 
            height: 1123px !important; 
            overflow: hidden !important; 
            direction: ${currentDir} !important;
            text-align: ${currentDir === 'rtl' ? 'right' : 'left'} !important;
          }
          
          /* تثبيت حجم العنصر الرئيسي فقط ومنع أي إزاحة */
          #cloned-cv-preview {
            width: 794px !important;
            height: 1123px !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            transform: scale(1) !important;
            transform-origin: top left !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          }

          /* منع أي تمدد تلقائي للصور واللوغو برؤية كوبايلوت */
          img, svg {
            max-width: 100% !important;
            height: auto !important;
            object-fit: contain !important;
          }
        </style>
      </head>
      <body dir="${currentDir}">
      </body>
    </html>
  `);
  iframeDoc.close();

  // Inject cloned element inside the body of the isolated iframe
  const iframeBody = iframeDoc.body;
  iframeBody.appendChild(cloned);

  // تطبيق الأبعاد الحقيقية الصارمة على الحاوية الخارجية فقط دون المساس بالعناصر الداخلية واللوغو
  cloned.style.width = '794px';
  cloned.style.height = '1123px';
  cloned.style.margin = '0';
  cloned.style.padding = '0';
  cloned.style.boxSizing = 'border-box';
  cloned.style.transform = 'scale(1)';
  cloned.style.transformOrigin = 'top left';
  cloned.style.overflow = 'hidden';
  cloned.style.position = 'absolute';
  cloned.style.left = '0';
  cloned.style.top = '0';
  cloned.setAttribute('dir', currentDir);
  cloned.style.direction = currentDir;

  // معالجة ألوان oklch فقط للعناصر الداخلية إن وجدت دون تغيير أبعادها ومقاساتها
  cloned.querySelectorAll('*').forEach(el => {
    const htmlEl = el as HTMLElement;
    const styles = window.getComputedStyle(htmlEl);
    if (styles.color && styles.color.includes('oklch')) {
      htmlEl.style.color = 'rgb(31, 41, 55)';
    }
  });

  if (iframeDoc.documentElement) {
    iframeDoc.documentElement.setAttribute('dir', currentDir);
  }
  if (iframeDoc.body) {
    iframeDoc.body.setAttribute('dir', currentDir);
    iframeDoc.body.style.direction = currentDir;
    iframeDoc.body.style.textAlign = currentDir === 'rtl' ? 'right' : 'left';
  }

  try {
    // Wait for fonts and complete DOM painting inside the new environment
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (iframeDoc.fonts) {
      await iframeDoc.fonts.ready;
    }

    // 4. Capture the clean dataUrl from cloned inside the iframe
    const dataUrl = await htmlToImage.toPng(cloned, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff'
    });

    // Cleanup
    document.body.removeChild(iframe);
    return dataUrl;
  } catch (error) {
    // Cleanup if something goes wrong
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    throw error;
  }
}

/**
 * دالة التصدير المباشرة لإنهاء مشكلة اللوغو والقص وتنزيل السيرة الذاتية بضغطة واحدة
 */
export const downloadCV = async () => {
  const originalElement = document.getElementById('cv-preview-a4');
  if (!originalElement) return;

  try {
    // 1. كشف الاتجاه الحالي تلقائياً (RTL أو LTR)
    const currentDir = originalElement.getAttribute('dir') || window.getComputedStyle(originalElement).direction || 'rtl';

    // 2. الاستنساخ العميق للعنصر الأصلي
    const cloned = originalElement.cloneNode(true) as HTMLElement;
    cloned.id = "cloned-cv-preview";

    // 3. إنشاء الـ iFrame المخفي في الخلفية بنفس أبعاد الـ A4
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // جلب كافة الستاينز والـ CSS من الصفحة الأساسية
    let stylesHtml = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((styleElement) => {
      stylesHtml += styleElement.outerHTML;
    });

    // 4. بناء هيكل المستند وتطبيق قواعد كوبايلوت الصارمة لحماية اللوغو والصور
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html dir="${currentDir}" lang="${currentDir === 'rtl' ? 'ar' : 'en'}">
        <head>
          ${stylesHtml}
          <style>
            body { 
              margin: 0 !important; 
              padding: 0 !important; 
              background: #ffffff !important; 
              width: 794px !important; 
              height: 1123px !important; 
              overflow: hidden !important; 
              direction: ${currentDir} !important;
              text-align: ${currentDir === 'rtl' ? 'right' : 'left'} !important;
            }
            
            /* تثبيت حجم العنصر الرئيسي فقط ومنع أي إزاحة */
            #cloned-cv-preview {
              width: 794px !important;
              height: 1123px !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              transform: scale(1) !important;
              transform-origin: top left !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
            }

            /* منع أي تمدد تلقائي للصور واللوغو برؤية كوبايلوت */
            img, svg {
              max-width: 100% !important;
              height: auto !important;
              object-fit: contain !important;
            }
          </style>
        </head>
        <body>
        </body>
      </html>
    `);
    iframeDoc.close();

    // حقن العنصر المستنسخ (الصافي وبدون تعديل عناصره الداخلية)
    iframeDoc.body.appendChild(cloned);

    // معالجة ألوان oklch فقط دون المساس بالأبعاد والـ widths
    cloned.querySelectorAll('*').forEach(el => {
      const htmlEl = el as HTMLElement;
      const styles = window.getComputedStyle(htmlEl);
      if (styles.color && styles.color.includes('oklch')) {
        htmlEl.style.color = 'rgb(31, 41, 55)';
      }
    });

    // 5. انتظار تحميل الخطوط والصور لضمان منع الـ reflow
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (iframeDoc.fonts) await iframeDoc.fonts.ready;

    // 6. التقاط الصورة من العنصر المستنسخ نفسه بدقة عالية
    const htmlToImage = (await import('html-to-image'));
    const imgData = await htmlToImage.toPng(cloned, {
      pixelRatio: 2,
      cacheBust: true
    });

    // 7. بناء الـ PDF بأبعاد مطابقة تماماً للصورة الناتجة
    const { jsPDF } = await import('jspdf');
    const img = new Image();
    img.src = imgData;
    await img.decode();

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: [img.width, img.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, img.width, img.height);
    pdf.save('cv-professional.pdf');

    // تنظيف الـ DOM
    document.body.removeChild(iframe);

  } catch (error) {
    console.error("Error during perfect render:", error);
    window.print();
  }
};

/**
 * Captures the element and generates a high-quality single-page PDF with exact matching dimensions
 */
export async function exportToPDF(elementId?: string): Promise<Blob> {
  const element = document.getElementById(elementId || 'cv-preview-a4') || 
                  document.getElementById('cv-rendered-document-face') || 
                  document.querySelector('[id^="cv-preview"]') as HTMLElement;
                  
  if (!element) {
    throw new Error("Preview element not found");
  }

  // Generate crisp PNG image first
  const dataUrl = await exportToPNG(elementId);

  // Load the generated image to get its precise width and height
  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  // Initialize jsPDF with exact matching size of the generated PNG to guarantee single page
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [img.width, img.height],
    compress: true
  });

  pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height, undefined, 'FAST');
  return pdf.output('blob');
}

/**
 * Generates Word Document (DOCX/.doc) from the final preview DOM structure
 */
export async function exportToWord(elementId?: string, fullName?: string, lang: string = 'ar'): Promise<Blob> {
  const element = document.getElementById(elementId || 'cv-preview-a4') || 
                  document.getElementById('cv-rendered-document-face') || 
                  document.querySelector('[id^="cv-preview"]') as HTMLElement;
                  
  if (!element) {
    throw new Error("Preview element not found");
  }

  // Create a temporary virtual div to sanitize Word unsupported elements
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = element.innerHTML;

  // Remove base64 or large images which would crash Word or blow up file size
  const imgs = tempDiv.getElementsByTagName("img");
  for (let i = imgs.length - 1; i >= 0; i--) {
    const img = imgs[i];
    const src = img.getAttribute("src") || "";
    if (src.startsWith("data:") || src.length > 500) {
      const placeholder = document.createElement("div");
      placeholder.style.border = "1px dashed #dddddd";
      placeholder.style.padding = "12px";
      placeholder.style.margin = "10px 0";
      placeholder.style.textAlign = "center";
      placeholder.style.fontSize = "10pt";
      placeholder.style.color = "#666666";
      placeholder.style.backgroundColor = "#fafafa";
      placeholder.style.borderRadius = "6px";
      placeholder.style.fontWeight = "bold";
      
      const className = img.className || "";
      const alt = img.getAttribute("alt") || "";
      const isLogo = className.includes("Logo") || alt.includes("Logo");
      
      if (isLogo) {
        placeholder.innerText = lang === 'ar' 
          ? '📍 [شعار الشركة - متوفر في النسخة الرقمية وصيغتي PDF/PNG]' 
          : '📍 [Company Logo Place - Available in PDF/PNG and Online versions]';
      } else {
        placeholder.innerText = lang === 'ar' 
          ? '👤 [صورة الملف الشخصي - متوفرة في صيغتي PDF/PNG والنسخة الرقمية]' 
          : '👤 [Profile Photo - Available in PDF/PNG and Online versions]';
      }
      
      img.parentNode?.replaceChild(placeholder, img);
    }
  }

  // Remove SVGs
  const svgs = tempDiv.getElementsByTagName("svg");
  for (let i = svgs.length - 1; i >= 0; i--) {
    const svg = svgs[i];
    svg.parentNode?.removeChild(svg);
  }

  // Clean loaders and unwanted overlay/control elements
  const unwantedSelectors = [
    ".animate-pulse",
    ".animate-spin",
    ".absolute.inset-0",
    "#screenshot-protection-panel",
    ".screenshot-protection-panel",
    "button",
    "input",
    "select",
    ".select-none",
    "iframe"
  ];
  unwantedSelectors.forEach(selector => {
    tempDiv.querySelectorAll(selector).forEach(el => el.parentNode?.removeChild(el));
  });

  const htmlContent = tempDiv.innerHTML;
  const rawWordContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="UTF-8">
      <title>${fullName || 'CV_AI'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=Cairo:wght@300;400;600;700;900&display=swap');
        body {
          font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #333333;
          padding: 20px;
        }
        h1, h2, h3, h4 { color: #111111; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; }
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

  // Byte-Order Mark (BOM) \uFEFF ensures MS Word parses as UTF-8 properly
  return new Blob(['\ufeff' + rawWordContent], { type: 'application/vnd.ms-word;charset=utf-8' });
}
