import { Test } from '@/types/exam';

export function getTests(): Test[] {
  try {
    const tests = localStorage.getItem('jee_cbt_tests');
    return tests ? JSON.parse(tests) : [];
  } catch {
    return [];
  }
}

export function saveTest(test: Test): void {
  const tests = getTests();
  const existingIndex = tests.findIndex(t => t.id === test.id);
  if (existingIndex >= 0) {
    tests[existingIndex] = test;
  } else {
    tests.push(test);
  }
  localStorage.setItem('jee_cbt_tests', JSON.stringify(tests));
}

export async function saveTestPdfPageImages() {}
export async function saveTestQuestionImages() {}
export async function saveTestPdfFile() {}
export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
