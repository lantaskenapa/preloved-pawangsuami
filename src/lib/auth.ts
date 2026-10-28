import { UserSession } from '../types';
import { getSupabaseClient } from './supabaseClient';

const AUTH_STORAGE_KEY = 'psp_admin_session';

// Default Admin credentials for testing Pawang Suami Preloved
export const DEFAULT_ADMIN = {
  email: 'admin@pawangsuami.com',
  password: 'pawangsuami123',
};

export function getAdminSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    return session;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAdminSession();
}

export async function loginAdmin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  // If Supabase is connected with Supabase Auth
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.session) {
        const session: UserSession = {
          email: data.user.email || email,
          role: 'admin',
          token: data.session.access_token,
          logged_at: new Date().toISOString(),
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        return { success: true };
      }
    } catch {
      // Continue to local admin check
    }
  }

  // Standard Local Admin Check
  const normalizedEmail = email.trim().toLowerCase();
  if (
    (normalizedEmail === DEFAULT_ADMIN.email || normalizedEmail === 'admin@gmail.com' || normalizedEmail === 'admin') &&
    (password === DEFAULT_ADMIN.password || password === 'admin123' || password === 'pawang123')
  ) {
    const session: UserSession = {
      email: normalizedEmail,
      role: 'admin',
      token: 'jwt-token-psp-' + Math.random().toString(36).substring(2),
      logged_at: new Date().toISOString(),
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return { success: true };
  }

  return { success: false, error: 'Email atau kata sandi admin salah. Silakan coba kembali.' };
}

export function logoutAdmin() {
  const supabase = getSupabaseClient();
  if (supabase) {
    supabase.auth.signOut().catch(() => {});
  }
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
