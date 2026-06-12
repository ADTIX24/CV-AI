/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CreditCard, Tag, ShieldCheck, CheckCircle2, Ticket, Sparkles, XCircle } from 'lucide-react';
import { Voucher } from '../types';
import { AppTranslation } from '../translations';

interface Props {
  t: AppTranslation;
  lang: 'ar' | 'en';
  credits: number;
  vouchers: Voucher[];
  onRedeemVoucher: (code: string) => Promise<{ success: boolean; value: number }>;
  onChargeCard: () => void;
  supportWhatsAppPhone?: string;
  supportTelegramUsername?: string;
}

export function PaymentPanel({ 
  t, 
  lang, 
  credits, 
  vouchers, 
  onRedeemVoucher, 
  onChargeCard,
  supportWhatsAppPhone = '962777976501',
  supportTelegramUsername = 'cv_ai_support'
}: Props) {
  const [activeTab, setActiveTab] = useState<'card' | 'voucher'>('voucher');
  const [voucherInput, setVoucherInput] = useState('');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [loading, setLoading] = useState(false);

  const redeemCode = async () => {
    if (!voucherInput.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await onRedeemVoucher(voucherInput.trim());
      if (res.success) {
        setSuccessMsg(t.successAlertVoucher.replace('{val}', res.value.toString()));
        setVoucherInput('');
      } else {
        setErrorMsg(t.invalidVoucher);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t.invalidVoucher);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 relative overflow-hidden" id="payment-billing-panel">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-5 mb-6 gap-4">
        <div className="space-y-1">
          <h3 className="text-md font-sans font-semibold text-zinc-100 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-500" />
            {t.billingTitle}
          </h3>
          <p className="text-xs text-zinc-400 font-sans">
            {lang === 'ar' ? 'قم بشحن حسابك لتنزيل مستند السيرة الذاتية المهنية بلا علامات مائية.' : 'Add credits to export resume formats with no transparent watermarks.'}
          </p>
        </div>

        {/* Available credits bubble */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-500/20 px-4 py-2.5 rounded-xl flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 block font-mono uppercase tracking-wider">{t.currentCredits}</span>
            <span className="text-md font-bold text-amber-400 font-mono">{credits} {lang === 'ar' ? 'كريدت' : 'Credits'}</span>
          </div>
          <div className="p-1.5 rounded bg-amber-500 text-black">
            <Sparkles className="w-4 h-4 animate-bounce" />
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <XCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs selectors */}
      <div className="flex border-b border-zinc-900 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('voucher')}
          className={`pb-2.5 text-xs font-semibold px-4 transition-all relative ${
            activeTab === 'voucher' 
              ? 'text-amber-400' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          id="payment-tab-voucher"
        >
          {t.chargeMethodVoucher}
          {activeTab === 'voucher' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('card')}
          className={`pb-2.5 text-xs font-semibold px-4 transition-all relative ${
            activeTab === 'card' 
              ? 'text-amber-400' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          id="payment-tab-card"
        >
          {t.chargeMethodCard}
          {activeTab === 'card' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />}
        </button>
      </div>

      {activeTab === 'card' ? (
        <div className="space-y-6 max-w-2xl mx-auto py-2">
          <div className="text-center space-y-2">
            <h4 className="text-sm font-semibold text-zinc-100 font-sans">
              {lang === 'ar' ? 'اشحن رصيد حسابك بالتواصل المباشر مع الدعم الفني' : 'Recharge your account balance by contacting our live support'}
            </h4>
            <p className="text-xs text-zinc-400 font-sans max-w-md mx-auto leading-relaxed">
              {lang === 'ar' 
                ? 'إذا لم يكن لديك كود تفعيل جاهز، يمكنك طلب شحن الرصيد مباشرة من الدعم. نحن متواجدون على مدار الساعة لخدمتكم وتوفير الأكواد فوراً.' 
                : 'If you do not have a pre-generated voucher code, you can request an instant balance upgrade directly from our support team.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* WhatsApp Integration Button */}
            <a
              href={`https://wa.me/${supportWhatsAppPhone}?text=${encodeURIComponent(lang === 'ar' ? 'مرحبا، أريد شحن رصيد حسابي لتنزيل السيرة الذاتية' : 'Hello, I would like to recharge my account to download my resume')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-950/40 transition-all duration-300"
              id="whatsapp-support-link"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500 text-black group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.799.002-2.618-1.016-5.08-2.87-6.934C16.356 2.016 13.89 1 11.275 1c-5.41 0-9.81 4.403-9.813 9.805-.001 1.948.537 3.548 1.46 4.965l-.959 3.51 3.63-.949zm10.74-5.321c-.304-.153-1.8-.886-2.077-.988-.278-.102-.48-.153-.68.153-.2.304-.778.988-.952 1.191-.174.204-.349.229-.653.077-1.125-.565-1.957-1.025-2.73-2.35-.198-.339.198-.315.568-1.05.065-.134.032-.253-.016-.355-.048-.102-.48-1.156-.658-1.58-.173-.418-.344-.361-.48-.368-.124-.006-.266-.008-.408-.008-.142 0-.373.053-.568.266-.195.213-.746.729-.746 1.777s.762 2.058.868 2.2c.107.142 1.5 2.292 3.633 3.212.507.219.903.351 1.214.45.51.162.973.139 1.341.084.41-.061 1.8-.735 2.053-1.443.253-.707.253-1.314.177-1.443-.076-.128-.278-.204-.582-.357z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-emerald-400 block tracking-wide font-sans">
                    {lang === 'ar' ? 'الدعم الفني المباشر' : 'Live WhatsApp Agent'}
                  </span>
                  <span className="text-[10px] text-zinc-400 block font-sans">
                    {lang === 'ar' ? 'متصل ومستعد للمساعدة الآن' : 'Online & ready to assist'}
                  </span>
                </div>
              </div>
              <span className="text-emerald-500 font-bold text-xs bg-emerald-500/10 rounded-full px-2.5 py-1">
                {lang === 'ar' ? 'مراسلة' : 'Chat'} &rarr;
              </span>
            </a>

            {/* Telegram Integration Button */}
            <a
              href={`https://t.me/${supportTelegramUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-4 rounded-xl bg-sky-950/20 border border-sky-500/30 hover:border-sky-500 hover:bg-sky-950/40 transition-all duration-300"
              id="telegram-support-link"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-sky-500 text-black group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M11.944 0C5.344 0 0 5.344 0 12c0 6.656 5.344 12 12 12 6.656 0 12-5.344 12-12C24 5.344 18.656 0 11.944 0zm5.813 8.356c-.144.9-.994 5.913-1.413 8.163-.175.95-.525 1.269-.863 1.3-.738.069-1.3-.488-2.013-.956-1.119-.731-1.75-1.181-2.831-1.894-1.25-.825-.438-1.281.275-2.019.188-.194 3.425-3.138 3.488-3.4.006-.038.013-.181-.075-.256-.088-.075-.219-.05-.313-.031-.131.025-2.225 1.406-6.275 4.138-.594.406-1.131.606-1.613.594-.531-.013-1.556-.3-2.313-.544-.931-.3-1.675-.463-1.613-.975.031-.269.406-.55 1.113-.844 4.363-1.9 7.275-3.156 8.731-3.769 4.156-1.75 5.019-2.056 5.581-2.069.125-.003.394.028.569.172.15.125.194.294.213.419.019.1.037.406.012.7z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-sky-400 block tracking-wide font-sans">
                    {lang === 'ar' ? 'فريق الدعم الفوري' : 'Live Telegram Agent'}
                  </span>
                  <span className="text-[10px] text-zinc-400 block font-sans">
                    {lang === 'ar' ? 'استلام كود الشحن فوراً' : 'Receive instant vouchers'}
                  </span>
                </div>
              </div>
              <span className="text-sky-500 font-bold text-xs bg-sky-500/10 rounded-full px-2.5 py-1">
                {lang === 'ar' ? 'تواصل' : 'Contact'} &rarr;
              </span>
            </a>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3 mt-2">
            <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="space-y-1 text-left">
              <span className="text-xs font-semibold text-zinc-200 block">
                {lang === 'ar' ? 'كيف يعمل الشحن عبر الدعم؟' : 'How does support recharge work?'}
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                {lang === 'ar' 
                  ? 'راسلنا مباشرة عبر قنوات الدعم أعلاه. سنقوم بإرشادك لوسائل الدفع المتاحة وسنزودك بكود شحن فوري وخاص لتقوم بوضعه في خانة كود الشحن المجاورة لتفعيل رصيدك وتحميل المستندات فوراً.' 
                  : 'Get in touch via our support handles. We will assist you with the payment process and issue a custom high-priority recharge code to apply in the voucher tab.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Voucher Recharge Slot */
        <div className="space-y-4 max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
              placeholder={t.enterVoucherPlaceholder}
              className="w-full sm:flex-1 bg-zinc-900 border border-zinc-800 p-3.5 text-xs rounded-xl text-white tracking-wider font-mono placeholder:tracking-normal text-center focus:outline-none focus:border-amber-500"
              id="payment-voucher-field"
            />
            <button
              onClick={redeemCode}
              className="w-full sm:w-auto px-5 py-3.5 sm:py-0 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 duration-150"
              id="payment-apply-voucher"
            >
              <Tag className="w-4 h-4 text-black" />
              {t.applyVoucherBtn}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-850 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-left">
              <span className="text-xs font-semibold text-zinc-200 block">{lang === 'ar' ? 'التحقق الآمن من كوبونات الشحن' : 'Verified Merchant Redirection Shield'}</span>
              <p className="text-[11px] text-zinc-400 font-sans leading-normal">
                {lang === 'ar' 
                  ? 'أكواد الشحن مخصصة لشركائنا في المكتبات لتمكين الطلاب والباحثين عن مخرجات مطبوعة خالية تماماً من العلامات المائية في بضع ثوانٍ.' 
                  : 'Recharge voucher tokens are validated locally on behalf of bookstore merchant retailers to unlock clean high-definition CV downloads.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PaymentPanel;
