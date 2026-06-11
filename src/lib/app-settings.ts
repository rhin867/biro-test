import { supabase } from '@/integrations/supabase/client';
const CACHE_KEY = 'app_public_settings_cache_v2';
  testName: string;
  aiCalls?: number;
}) {
  const { data, error } = await supabase.functions.invoke('log-test-creation', {
    body: {
      user_key: getCurrentUserKey(),
      display_name: getCurrentDisplayName(),
      test_id: opts.testId,
      test_name: opts.testName,
      ai_calls: opts.aiCalls ?? 1,
    },
  });
  if (error || data?.error) {
    throw new Error(data?.error || error?.message || 'Could not record test usage');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('log-test-creation', {
        body: {
          user_key: getCurrentUserKey(),
          display_name: getCurrentDisplayName(),
          test_id: opts.testId,
          test_name: opts.testName,
          ai_calls: opts.aiCalls ?? 1,
        },
      });
      if (!error && !data?.error) return;
      if (attempt === 2) throw new Error(data?.error || error?.message || 'Could not record test usage');
    } catch (e: any) {
      if (attempt === 2) throw e;
    }
    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
  }
}
