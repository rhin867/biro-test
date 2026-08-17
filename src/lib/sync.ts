import { supabase } from '@/integrations/supabase/client';
import { getTests, saveTest } from './storage';
import { Test } from '@/types/exam';

export async function syncTestsFromCloud() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    const { data: cloudTests, error } = await supabase
      .from('tests')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    if (!cloudTests) return;

    const localTests = getTests();
    let updatedCount = 0;

    for (const ct of cloudTests) {
      const existsLocally = localTests.find(t => t.id === ct.id);
      
      // If doesn't exist locally, or cloud version is newer (based on updated_at)
      // Note: mapping Supabase columns back to Test object
      const mappedTest: Test = {
        id: ct.id,
        name: ct.name,
        duration: ct.duration_minutes,
        positiveMarking: ct.positive_marking,
        negativeMarking: ct.negative_marking,
        questions: (ct.questions as any) || [],
        createdAt: ct.created_at,
        totalMarks: ((ct.questions as any[])?.length || 0) * ct.positive_marking,
        subjects: Array.from(new Set(((ct.questions as any[]) || []).map(q => q.subject).filter(Boolean))),
        hasAnswerKey: ((ct.questions as any[]) || []).some(q => q.correctAnswer),
      };

      if (!existsLocally) {
        saveTest(mappedTest);
        updatedCount++;
      } else {
        // Simple heuristic: cloud version wins if local doesn't have it
        // In a real app we'd compare timestamps
      }
    }
    
    return updatedCount;
  } catch (err) {
    console.error('Failed to sync tests from cloud:', err);
    throw err;
  }
}
