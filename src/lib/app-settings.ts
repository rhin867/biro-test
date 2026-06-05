import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'app_public_settings_cache_v2';

export interface PublicSettings {
  test_creation_password_expires_at: string | null;
  quota_daily_tests: number;
  quota_monthly_tests: number;
}

const DEFAULTS: PublicSettings = {
  test_creation_password_expires_at: null,
  quota_daily_tests: 5,
  quota_monthly_tests: 50,
};

export async function fetchAppSettings(): Promise<PublicSettings> {
  try {
    const { data, error } = await supabase.functions.invoke('get-public-settings', { body: {} });
    if (error || !data) throw error;
    const merged = { ...DEFAULTS, ...data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return { ...DEFAULTS, ...JSON.parse(cached) };
    } catch {}
    return DEFAULTS;
  }
}

export function getCachedAppSettings(): PublicSettings {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return { ...DEFAULTS, ...JSON.parse(cached) };
  } catch {}
  return DEFAULTS;
}

// Verify a password server-side. Returns { ok, expiresAt? } — password never compared client-side.
export async function verifyPassword(
  kind: 'test_creation' | 'admin_1' | 'admin_2',
  password: string,
): Promise<{ ok: boolean; error?: string; expiresAt?: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-password', {
      body: { kind, password },
    });
    if (error) return { ok: false, error: error.message };
    if (!data?.ok) return { ok: false, error: data?.error || 'Unauthorized' };
    return { ok: true, expiresAt: data.expiresAt ?? null };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// updateAppSetting now requires the live owner password (admin_2). Frontend never stores it.
export async function updateAppSetting(
  key: string,
  value: any,
  ownerPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('update-app-settings', {
      body: { key, value, ownerPassword },
    });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error };
    await fetchAppSettings();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// Local unlock cache: only stores expiry, NEVER the password.
const UNLOCK_KEY = 'test_creation_unlock_v2';

export function isTestCreationUnlocked(settings: PublicSettings): boolean {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (!raw) return false;
    const { unlockedUntil } = JSON.parse(raw);
    if (!unlockedUntil) return false;
    if (new Date(unlockedUntil) < new Date()) return false;
    // Also respect server-side expiry if set
    if (settings.test_creation_password_expires_at &&
        new Date(settings.test_creation_password_expires_at) < new Date()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function markTestCreationUnlocked(expiresAt: string | null) {
  // Cache unlock for up to 24h, or until server-side expiry, whichever is sooner.
  const max = Date.now() + 24 * 60 * 60 * 1000;
  const serverExp = expiresAt ? new Date(expiresAt).getTime() : Infinity;
  const unlockedUntil = new Date(Math.min(max, serverExp)).toISOString();
  localStorage.setItem(UNLOCK_KEY, JSON.stringify({ unlockedUntil }));
}

export function getCurrentDisplayName(): string {
  return (
    localStorage.getItem('community_author') ||
    localStorage.getItem('user_display_name') ||
    'Guest'
  );
}

export function getCurrentUserKey(): string {
  let key = localStorage.getItem('user_key');
  if (!key) {
    key = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('user_key', key);
  }
  return key;
}

// --- Quota tracking ---

export interface QuotaInfo {
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  exceeded: boolean;
}

export async function fetchQuotaInfo(settings?: PublicSettings): Promise<QuotaInfo> {
  const s = settings ?? (await fetchAppSettings());
  const userKey = getCurrentUserKey();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let dailyUsed = 0, monthlyUsed = 0;
  try {
    const { count: dCount } = await (supabase as any)
      .from('test_creation_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_key', userKey)
      .gte('created_at', startOfDay);
    const { count: mCount } = await (supabase as any)
      .from('test_creation_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_key', userKey)
      .gte('created_at', startOfMonth);
    dailyUsed = dCount || 0;
    monthlyUsed = mCount || 0;
  } catch {}

  return {
    dailyUsed,
    dailyLimit: s.quota_daily_tests,
    monthlyUsed,
    monthlyLimit: s.quota_monthly_tests,
    dailyRemaining: Math.max(0, s.quota_daily_tests - dailyUsed),
    monthlyRemaining: Math.max(0, s.quota_monthly_tests - monthlyUsed),
    exceeded:
      dailyUsed >= s.quota_daily_tests || monthlyUsed >= s.quota_monthly_tests,
  };
}

export async function logTestCreation(opts: {
  testId: string;
  testName: string;
  aiCalls?: number;
}) {
  try {
    await (supabase as any).from('test_creation_usage').insert({
      user_key: getCurrentUserKey(),
      display_name: getCurrentDisplayName(),
      test_id: opts.testId,
      test_name: opts.testName,
      ai_calls: opts.aiCalls ?? 1,
    });
  } catch (e) {
    console.warn('logTestCreation failed', e);
  }
}
