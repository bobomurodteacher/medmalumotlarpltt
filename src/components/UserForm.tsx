import React, { useState } from 'react';
import { MedicalWorkerSubmission } from '../types';
import { isJshshirRegistered } from '../services/storageService';
import { cyrillicToLatin } from '../utils/transliterate';
import {
  Stethoscope,
  CheckCircle2,
  Lock,
  User,
  Building2,
  Briefcase,
  Phone,
  CreditCard,
  Hash,
  Check,
  ChevronDown,
  ShieldCheck,
  HeartPulse,
  Send,
  AlertCircle
} from 'lucide-react';

interface UserFormProps {
  positions: string[];
  workplaces: string[];
  submissions?: MedicalWorkerSubmission[];
  onSubmitData: (data: Omit<MedicalWorkerSubmission, 'id' | 'createdAt'>) => Promise<MedicalWorkerSubmission> | MedicalWorkerSubmission;
  onOpenAdminLogin: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({
  positions,
  workplaces,
  submissions = [],
  onSubmitData,
  onOpenAdminLogin
}) => {
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [passport, setPassport] = useState('');
  const [jshshir, setJshshir] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<MedicalWorkerSubmission | null>(null);

  const checkJshshirDuplicate = (val: string): boolean => {
    const clean = val.trim();
    if (!clean) return false;
    const existsInProps = submissions.some((s) => s.jshshir === clean);
    const existsInStorage = isJshshirRegistered(clean);
    return existsInProps || existsInStorage;
  };

  const handleJshshirChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 14);
    setJshshir(cleaned);
    
    if (cleaned.length === 14 && checkJshshirDuplicate(cleaned)) {
      setErrors((prev) => ({
        ...prev,
        jshshir: "Ushbu JSHSHIR raqami bilan xodim allaqachon ro'yxatdan o'tgan! Qayta yuborish mumkin emas."
      }));
    } else if (errors.jshshir) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.jshshir;
        return copy;
      });
    }
  };

  const handlePassportChange = (val: string) => {
    const latinConverted = cyrillicToLatin(val);
    const formatted = latinConverted.toUpperCase().slice(0, 12);
    setPassport(formatted);
    if (errors.passport) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.passport;
        return copy;
      });
    }
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!fullName.trim()) err.fullName = "Familya va ismingizni kiriting";
    
    if (!position.trim()) {
      err.position = "Lavozimingizni tanlang";
    }

    if (!workplace.trim()) {
      err.workplace = "Ish joyingizni tanlang";
    }

    if (!passport.trim()) err.passport = "Passport seriya va raqamini kiriting";
    
    if (!jshshir.trim()) {
      err.jshshir = "JSHSHIR raqamini kiriting";
    } else if (jshshir.length !== 14) {
      err.jshshir = `JSHSHIR 14 ta raqam bo'lishi shart (${jshshir.length}/14)`;
    } else if (checkJshshirDuplicate(jshshir)) {
      err.jshshir = "Ushbu JSHSHIR raqami bilan xodim allaqachon ro'yxatdan o'tgan! Qayta yuborish mumkin emas.";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Automatically convert any Cyrillic text to Latin script
      const normalizedFullName = cyrillicToLatin(fullName.trim());
      const normalizedPosition = cyrillicToLatin(position.trim());
      const normalizedWorkplace = cyrillicToLatin(workplace.trim());
      const normalizedPassport = cyrillicToLatin(passport.trim()).toUpperCase();
      const normalizedPhone = phoneNumber.trim() ? cyrillicToLatin(phoneNumber.trim()) : '';

      const created = await onSubmitData({
        fullName: normalizedFullName,
        position: normalizedPosition,
        workplace: normalizedWorkplace,
        phoneNumber: normalizedPhone,
        passport: normalizedPassport,
        jshshir: jshshir.trim()
      });

      setSubmittedData(created);
      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting form:', err);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Ma'lumotlarni bazaga saqlashda xatolik yuz berdi. Internet aloqasini tekshirib qayta urinib ko'ring.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#06182a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.25),rgba(255,255,255,0))] flex flex-col justify-between p-3.5 sm:p-6 md:p-8 text-slate-100 font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header Bar with Admin Access */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-end pt-1 pb-3 px-1">
        <button
          id="btn-open-admin-login"
          onClick={onOpenAdminLogin}
          type="button"
          className="inline-flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-700 text-xs font-semibold text-slate-200 backdrop-blur-md transition-all duration-150 border border-slate-700 hover:border-teal-500/40 shadow-xs cursor-pointer shrink-0 min-h-[36px]"
        >
          <Lock className="w-3.5 h-3.5 text-teal-400" />
          <span>Admin</span>
        </button>
      </header>

      {/* Main Medical Form Container */}
      <main className="w-full max-w-xl mx-auto my-auto py-2">
        <div className="relative bg-slate-900/85 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-8 border border-teal-500/20 shadow-2xl shadow-black/50 transition-all duration-200">
          {/* Subtle Top Accent Line */}
          <div className="absolute top-0 left-6 sm:left-8 right-6 sm:right-8 h-[2px] bg-gradient-to-r from-transparent via-teal-400 to-transparent rounded-full opacity-60" />

          {/* Form Header */}
          <div className="flex flex-col items-center text-center mb-5 sm:mb-8">
            <div className="relative mb-3">
              {/* Medical Icon Ring */}
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 via-cyan-500/15 to-blue-600/20 flex items-center justify-center border border-teal-400/40 shadow-lg shadow-teal-500/10 backdrop-blur-md">
                <Stethoscope className="w-7 h-7 sm:w-11 sm:h-11 text-teal-300" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-teal-500 border-2 border-slate-900 flex items-center justify-center text-slate-950 shadow-md">
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-950" />
              </div>
            </div>

            <h1 className="text-base sm:text-2xl font-bold tracking-tight leading-snug text-white max-w-md px-1">
              Tibbiyot xodimlarini AXBOROT-KOMMUNIKATSIYA TEXNOLOGIYALARI bo'yicha O'qitilganligi to'g'risida malumot yuborish
            </h1>
            <p className="text-[11px] sm:text-sm text-slate-300/80 mt-1.5 sm:mt-2 max-w-sm flex items-center justify-center space-x-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Elektron ro'yxatga olish rasmiy shakli</span>
            </p>
          </div>

          {isSuccess ? (
            /* Success confirmation card */
            <div className="bg-slate-800/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 text-center border border-teal-500/40 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/60 flex items-center justify-center mx-auto mb-4 text-emerald-300 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2 tracking-tight">
                Ma'lumotlar muvaffaqiyatli yuborildi!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mb-5 max-w-sm mx-auto leading-relaxed">
                Siz kiritgan ma'lumotlar bulutli markaziy bazaga saqlandi va adminga yuborildi.
              </p>

              {submittedData && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-teal-500/20 text-left text-xs sm:text-sm space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Xodim:</span>
                    <span className="font-semibold text-white truncate max-w-[200px]">{submittedData.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Lavozim:</span>
                    <span className="text-slate-200 truncate max-w-[200px]">{submittedData.position}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Ish joyi:</span>
                    <span className="text-slate-200 truncate max-w-[200px]">{submittedData.workplace}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">JSHSHIR:</span>
                    <span className="font-mono text-slate-200">{submittedData.jshshir}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Main Form */
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5" noValidate>
              {/* 1. Familya Ismi */}
              <div>
                <label htmlFor="input-familya-ismi" className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-teal-400" />
                    <span>Familya Ismi</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </span>
                </label>
                <input
                  id="input-familya-ismi"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.fullName;
                        return copy;
                      });
                    }
                  }}
                  placeholder="Familya ismingizni kiriting"
                  className={`w-full px-4 py-3 sm:py-3.5 rounded-xl bg-slate-950/70 text-white placeholder-slate-500 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 transition-all duration-150 border shadow-inner ${
                    errors.fullName
                      ? 'border-rose-500 ring-2 ring-rose-500/30'
                      : 'border-slate-700/80 focus:border-teal-400 focus:ring-teal-400/20'
                  }`}
                />
                {errors.fullName && (
                  <p className="text-xs text-rose-400 mt-1.5 font-medium flex items-center">
                    ⚠️ {errors.fullName}
                  </p>
                )}
              </div>

              {/* 2. Lavozim */}
              <div>
                <label htmlFor="select-lavozim" className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Briefcase className="w-4 h-4 text-teal-400" />
                    <span>Lavozim</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </span>
                </label>
                <div className="relative">
                  <select
                    id="select-lavozim"
                    value={position}
                    disabled={positions.length === 0}
                    onChange={(e) => {
                      setPosition(e.target.value);
                      if (errors.position) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.position;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full px-4 py-3 sm:py-3.5 rounded-xl bg-slate-950/70 text-white text-base sm:text-sm font-medium focus:outline-none focus:ring-2 transition-all duration-150 border shadow-inner appearance-none cursor-pointer pr-10 ${
                      positions.length === 0
                        ? 'opacity-60 cursor-not-allowed border-slate-800 text-slate-500'
                        : errors.position
                        ? 'border-rose-500 ring-2 ring-rose-500/30'
                        : 'border-slate-700/80 focus:border-teal-400 focus:ring-teal-400/20'
                    }`}
                  >
                    <option value="" className="bg-slate-900 text-slate-400">
                      {positions.length > 0 ? "Lavozimingizni Tanlang" : "Lavozimlar mavjud emas (Admin kiritishi kutilmoqda)"}
                    </option>
                    {positions.map((pos) => (
                      <option key={pos} value={pos} className="bg-slate-900 text-white">
                        {pos}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {errors.position && (
                  <p className="text-xs text-rose-400 mt-1.5 font-medium flex items-center">
                    ⚠️ {errors.position}
                  </p>
                )}
              </div>

              {/* 3. Ish joyi */}
              <div>
                <label htmlFor="select-ish-joyi" className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-teal-400" />
                    <span>Ish joyi</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </span>
                </label>
                <div className="relative">
                  <select
                    id="select-ish-joyi"
                    value={workplace}
                    disabled={workplaces.length === 0}
                    onChange={(e) => {
                      setWorkplace(e.target.value);
                      if (errors.workplace) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.workplace;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full px-4 py-3 sm:py-3.5 rounded-xl bg-slate-950/70 text-white text-base sm:text-sm font-medium focus:outline-none focus:ring-2 transition-all duration-150 border shadow-inner appearance-none cursor-pointer pr-10 ${
                      workplaces.length === 0
                        ? 'opacity-60 cursor-not-allowed border-slate-800 text-slate-500'
                        : errors.workplace
                        ? 'border-rose-500 ring-2 ring-rose-500/30'
                        : 'border-slate-700/80 focus:border-teal-400 focus:ring-teal-400/20'
                    }`}
                  >
                    <option value="" className="bg-slate-900 text-slate-400">
                      {workplaces.length > 0 ? "Ish joyingizni Tanlang" : "Ish joylari mavjud emas (Admin kiritishi kutilmoqda)"}
                    </option>
                    {workplaces.map((wp) => (
                      <option key={wp} value={wp} className="bg-slate-900 text-white">
                        {wp}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {errors.workplace && (
                  <p className="text-xs text-rose-400 mt-1.5 font-medium flex items-center">
                    ⚠️ {errors.workplace}
                  </p>
                )}
              </div>

              {/* 4. Telefon Raqamingiz */}
              <div>
                <label htmlFor="input-telefon" className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Phone className="w-4 h-4 text-teal-400" />
                    <span>Telefon Raqamingiz</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">ixtiyoriy</span>
                </label>
                <input
                  id="input-telefon"
                  type="tel"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-4 py-3 sm:py-3.5 rounded-xl bg-slate-950/70 text-white placeholder-slate-500 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 border border-slate-700/80 focus:border-teal-400 focus:ring-teal-400/20 transition-all duration-150 shadow-inner"
                />
              </div>

              {/* 5. Passport seriya va raqam */}
              <div>
                <label htmlFor="input-passport" className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <CreditCard className="w-4 h-4 text-teal-400" />
                    <span>Passport seriya va raqam</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Masalan: AA 1234567</span>
                </label>
                <input
                  id="input-passport"
                  type="text"
                  value={passport}
                  onChange={(e) => handlePassportChange(e.target.value)}
                  placeholder="AA 1234567 yoki AD 1234567"
                  className={`w-full px-4 py-3 sm:py-3.5 rounded-xl bg-slate-950/70 text-white placeholder-slate-500 text-base sm:text-sm font-mono font-medium tracking-wide focus:outline-none focus:ring-2 transition-all duration-150 border shadow-inner ${
                    errors.passport
                      ? 'border-rose-500 ring-2 ring-rose-500/30'
                      : 'border-slate-700/80 focus:border-teal-400 focus:ring-teal-400/20'
                  }`}
                />
                {errors.passport && (
                  <p className="text-xs text-rose-400 mt-1.5 font-medium flex items-center">
                    ⚠️ {errors.passport}
                  </p>
                )}
              </div>

              {/* 6. JSHSHIR (14 raqam) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="input-jshshir" className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center space-x-1.5">
                    <Hash className="w-4 h-4 text-teal-400" />
                    <span>JSHSHIR (14 raqam)</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full transition-colors ${
                    jshshir.length === 14
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-400/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {jshshir.length === 14 ? (
                      <span className="flex items-center space-x-1">
                        <Check className="w-3 h-3 text-teal-400" />
                        <span>14 / 14</span>
                      </span>
                    ) : (
                      `${jshshir.length} / 14`
                    )}
                  </span>
                </div>
                <input
                  id="input-jshshir"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={14}
                  value={jshshir}
                  onChange={(e) => handleJshshirChange(e.target.value)}
                  placeholder="31204951234567"
                  className={`w-full px-4 py-3 sm:py-3.5 rounded-xl bg-slate-950/70 text-white placeholder-slate-500 text-base sm:text-sm font-mono font-bold tracking-wider focus:outline-none focus:ring-2 transition-all duration-150 border shadow-inner ${
                    errors.jshshir
                      ? 'border-rose-500 ring-2 ring-rose-500/30'
                      : 'border-slate-700/80 focus:border-teal-400 focus:ring-teal-400/20'
                  }`}
                />
                {errors.jshshir && (
                  <p className="text-xs text-rose-400 mt-1.5 font-medium flex items-center">
                    ⚠️ {errors.jshshir}
                  </p>
                )}
              </div>

              {/* Server Submission Error Banner */}
              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Ultra-Modern Healthcare Emerald & Cyan Submit Button */}
              <div className="pt-2 sm:pt-3">
                <button
                  id="btn-submit-form"
                  type="submit"
                  disabled={isSubmitting}
                  className={`group relative w-full overflow-hidden py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 active:scale-[0.98] text-white font-extrabold text-base sm:text-lg tracking-wide flex items-center justify-center space-x-2.5 transition-all duration-200 shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 border border-teal-300/40 cursor-pointer ${
                    isSubmitting ? 'opacity-80 cursor-wait' : ''
                  }`}
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
                  {isSubmitting ? (
                    <span className="relative z-10 flex items-center space-x-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Yuborilmoqda...</span>
                    </span>
                  ) : (
                    <>
                      <span className="relative z-10 tracking-wide font-bold">Ma'lumotlarni Yuborish</span>
                      <Send className="relative z-10 w-5 h-5 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

    </div>
  );
};
