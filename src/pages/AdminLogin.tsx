import React, { useState } from 'react';
import { loginAdmin, DEFAULT_ADMIN } from '../lib/auth';
import { Lock, Mail, ArrowLeft, KeyRound, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToCatalog: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToCatalog }) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const result = await loginAdmin(email, password);
      if (result.success) {
        showToast('Berhasil masuk ke Dashboard Admin!', 'success');
        onLoginSuccess();
      } else {
        setErrorMsg(result.error || 'Login gagal.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan pada sistem login.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail(DEFAULT_ADMIN.email);
    setPassword(DEFAULT_ADMIN.password);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        
        {/* Back Link */}
        <button
          onClick={onBackToCatalog}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Publik</span>
        </button>

        {/* Brand Lock Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-neutral-900 tracking-tight">
            Portal Admin Toko
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Pawang Suami Preloved • Khusus Pengelola
          </p>
        </div>

        {/* Card Box */}
        <div className="mt-6 bg-white py-8 px-6 sm:px-10 rounded-3xl border border-neutral-200/90 shadow-xs">
          
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Email Admin
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pawangsuami.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 focus:bg-white focus:outline-hidden focus:border-neutral-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 focus:bg-white focus:outline-hidden focus:border-neutral-900 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold transition-all shadow-xs active:scale-98 disabled:opacity-50"
            >
              {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
            </button>
          </form>

          {/* Quick Demo Access Box */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-neutral-900" />
                  Kredensial Pengujian
                </span>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-xs font-bold text-neutral-900 hover:underline"
                >
                  Gunakan Demo
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono">
                Email: {DEFAULT_ADMIN.email}<br />
                Sandi: {DEFAULT_ADMIN.password}
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
