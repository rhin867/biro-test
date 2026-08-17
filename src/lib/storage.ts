import { Test, TestAttempt, TestResult, MistakeBookEntry, WeeklyPlan, AnswerKey } from '@/types/exam';

const STORAGE_KEYS = {
  TESTS: 'jee_cbt_tests',
  ATTEMPTS: 'jee_cbt_attempts',
  RESULTS: 'jee_cbt_results',
  MISTAKE_BOOK: 'jee_cbt_mistake_book',
  WEEKLY_PLANS: 'jee_cbt_weekly_plans',
  CURRENT_ATTEMPT: 'jee_cbt_current_attempt',
  SHARE_CODES: 'jee_cbt_share_codes',
} as const;

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Tests
export function getTests(): Test[] {
  return getItem<Test[]>(STORAGE_KEYS.TESTS, []);
}

export function saveTest(test: Test): void {
  const tests = getTests();
  const idx = tests.findIndex(t => t.id === test.id);
  if (idx >= 0) tests[idx] = test;
  else tests.push(test);
  setItem(STORAGE_KEYS.TESTS, tests);
}

export function getTestById(id: string): Test | undefined {
  return getTests().find(t => t.id === id);
}

export function deleteTest(id: string): void {
  const tests = getTests().filter(t => t.id !== id);
  setItem(STORAGE_KEYS.TESTS, tests);
}

// Attempts
export function getAttempts(): TestAttempt[] {
  return getItem<TestAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
}

export function saveAttempt(attempt: TestAttempt): void {
  const attempts = getAttempts();
  const idx = attempts.findIndex(a => a.id === attempt.id);
  if (idx >= 0) attempts[idx] = attempt;
  else attempts.push(attempt);
  setItem(STORAGE_KEYS.ATTEMPTS, attempts);
}

export function getCurrentAttempt(): TestAttempt | null {
  return getItem<TestAttempt | null>(STORAGE_KEYS.CURRENT_ATTEMPT, null);
}

export function setCurrentAttempt(attempt: TestAttempt | null): void {
  setItem(STORAGE_KEYS.CURRENT_ATTEMPT, attempt);
}

export function clearCurrentAttempt(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_ATTEMPT);
}

// Results
export function getResults(): TestResult[] {
  return getItem<TestResult[]>(STORAGE_KEYS.RESULTS, []);
}

export function saveResult(result: TestResult): void {
  const results = getResults();
  results.push(result);
  setItem(STORAGE_KEYS.RESULTS, results);
}

export function getResultById(id: string): TestResult | undefined {
  return getResults().find(r => r.attemptId === id);
}

export function getResultsByTestId(testId: string): TestResult[] {
  return getResults().filter(r => r.testId === testId);
}

// Mistake Book
export function getMistakeBook(): MistakeBookEntry[] {
  return getItem<MistakeBookEntry[]>(STORAGE_KEYS.MISTAKE_BOOK, []);
}

export function addToMistakeBook(entry: MistakeBookEntry): void {
  const book = getMistakeBook();
  book.push(entry);
  setItem(STORAGE_KEYS.MISTAKE_BOOK, book);
}

export function removeFromMistakeBook(id: string): void {
  const book = getMistakeBook().filter(e => e.id !== id);
  setItem(STORAGE_KEYS.MISTAKE_BOOK, book);
}

export function updateMistakeBookEntry(entry: MistakeBookEntry): void {
  const book = getMistakeBook();
  const idx = book.findIndex(e => e.id === entry.id);
  if (idx >= 0) book[idx] = entry;
  setItem(STORAGE_KEYS.MISTAKE_BOOK, book);
}

// Weekly Plans
export function getCurrentWeeklyPlan(): WeeklyPlan | null {
  const plans = getItem<WeeklyPlan[]>(STORAGE_KEYS.WEEKLY_PLANS, []);
  return plans.length > 0 ? plans[plans.length - 1] : null;
}

export function saveWeeklyPlan(plan: WeeklyPlan): void {
  const plans = getItem<WeeklyPlan[]>(STORAGE_KEYS.WEEKLY_PLANS, []);
  plans.push(plan);
  setItem(STORAGE_KEYS.WEEKLY_PLANS, plans);
}

// Share codes
export function getTestByShareCode(code: string): string | undefined {
  const codes = getItem<Record<string, string>>(STORAGE_KEYS.SHARE_CODES, {});
  return codes[code];
}

export function generateShareCode(testId: string): string {
  const code = `TEST-${testId.slice(0, 8).toUpperCase()}`;
  const codes = getItem<Record<string, string>>(STORAGE_KEYS.SHARE_CODES, {});
  codes[code] = testId;
  setItem(STORAGE_KEYS.SHARE_CODES, codes);
  return code;
}

// PDF Stubs
export async function saveTestPdfPageImages() {}
export async function loadTestPdfPageImages() { return []; }
export async function saveTestQuestionImages() {}
export async function loadTestQuestionImages() { return {}; }
export async function saveTestPdfFile() {}
export async function loadTestPdfFile() { return null; }

export function updateTestAnswerKey(testId: string, answerKey: AnswerKey): void {
  const tests = getTests();
  const idx = tests.findIndex(t => t.id === testId);
  if (idx >= 0) {
    tests[idx].answerKey = answerKey;
    setItem(STORAGE_KEYS.TESTS, tests);
  }
}

export function exportStore() {
  return JSON.stringify(localStorage);
}

export function importStore(data: string) {
  try {
    const parsed = JSON.parse(data);
    Object.keys(parsed).forEach(k => localStorage.setItem(k, parsed[k]));
  } catch (e) {}
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
