import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, X, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  correctPassword: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  correctPassword,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === correctPassword) {
      setError('');
      setPassword('');
      onSuccess();
    } else {
      setError("Parol noto'g'ri kiritildi!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-teal-500/30 rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl shadow-black/80 text-slate-100 relative">
        {/* Accent top line */}
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-teal-400 to-transparent rounded-full" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-teal-500/15 border border-teal-400/30 text-teal-300 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/10">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-center text-white">Admin kirish</h3>
        <p className="text-xs text-center text-slate-400 mt-1.5 mb-5">
          Tizim boshqaruviga kirish uchun parolni kiriting
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                autoFocus
                placeholder="Parolni kiriting..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-teal-300 transition cursor-pointer"
                title={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-rose-400 mt-2 flex items-center font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-teal-950/40 border border-teal-400/30 cursor-pointer active:scale-[0.99]"
          >
            Kirish
          </button>
        </form>
      </div>
    </div>
  );
};
