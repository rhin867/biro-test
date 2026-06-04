import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'app_settings_cache_v1';

export interface AppSettings {
  test_creation_password: string;
  test_creation_password_expires_at: string | null;
  admin_password_1: string;
  admin_password_2: string;
}

const DEFAULTS: AppSettings = {
  test_creation_password: '1@n2@e',
  test_creation_password_expires_at: null,
  admin_password_1: '4918',
  admin_password_2: '555911',
};

export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const { data, error } = await (supabase as any)
      .from('app_settings')
      .select('key,value');
    if (error || !data) throw error;
    const settings: any = { ...DEFAULTS };
    for (const row of data) {
      settings[row.key] = row.value;
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    return settings;
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return { ...DEFAULTS, ...JSON.parse(cached) };
    } catch {}
    return DEFAULTS;
  }
}

export function getCachedAppSettings(): AppSettings {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return { ...DEFAULTS, ...JSON.parse(cached) };
  } catch {}
  return DEFAULTS;
}

export async function updateAppSetting(
  key: keyof AppSettings,
  value: any,
  ownerPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('update-app-settings', {
      body: { key, value, ownerPassword },
    });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error };
    // refresh cache
    await fetchAppSettings();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export function isTestCreationUnlocked(settings: AppSettings): boolean {
  try {
    const raw = localStorage.getItem('test_creation_unlock');
    if (!raw) return false;
    const unlock = JSON.parse(raw);
    if (unlock.password !== settings.test_creation_password) return false;
    const expiresAt = settings.test_creation_password_expires_at;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      // password is expired - require re-enter
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function markTestCreationUnlocked(password: string) {
  localStorage.setItem(
    'test_creation_unlock',
    JSON.stringify({ password, unlockedAt: new Date().toISOString() }),
  );
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
