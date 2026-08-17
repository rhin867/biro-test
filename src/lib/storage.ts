import { get, set, del, keys, clear } from 'idb-keyval';
import { Test, TestAttempt, TestResult, MistakeBookEntry, WeeklyPlan, AnswerKey, ExamStore } from '@/types/exam';

const STORAGE_KEYS = {
  TESTS: 'jee_cbt_tests',
  ATTEMPTS: 'jee_cbt_attempts',
  RESULTS: 'jee_cbt_results',
  MISTAKE_BOOK: 'jee_cbt_mistake_book',
  WEEKLY_PLANS: 'jee_cbt_weekly_plans',
  CURRENT_ATTEMPT: 'jee_cbt_current_attempt',
  SHARE_CODES: 'jee_cbt_share_codes',
  PDF_PREFIX: 'pdf_file_',
  PAGES_PREFIX: 'pdf_pages_',
  QUES_IMAGES_PREFIX: 'ques_images_',
} as const;

// Helper for localStorage
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      window.dispatchEvent(new CustomEvent('biro:storage-full'));
    }
    throw e;
  }
}

// Tests
export function getTests(): Test[] {
  return getLocalItem<Test[]>(STORAGE_KEYS.TESTS, []);
}

export function saveTest(test: Test): void {
  const tests = getTests();
  const idx = tests.findIndex(t => t.id === test.id);
  if (idx >= 0) tests[idx] = test;
  else tests.push(test);
  setLocalItem(STORAGE_KEYS.TESTS, tests);
}

export function getTestById(id: string): Test | undefined {
  return getTests().find(t => t.id === id);
}

export async function deleteTest(id: string): Promise<void> {
  const tests = getTests().filter(t => t.id !== id);
  setLocalItem(STORAGE_KEYS.TESTS, tests);
  
  // Clean up large binary data
  const allKeys = await keys();
  const prefixes = [
    `${STORAGE_KEYS.PDF_PREFIX}${id}`,
    `${STORAGE_KEYS.PAGES_PREFIX}${id}`,
    `${STORAGE_KEYS.QUES_IMAGES_PREFIX}${id}`
  ];
  
  for (const key of allKeys) {
    if (typeof key === 'string' && prefixes.some(p => key.startsWith(p))) {
      await del(key);
    }
  }
}

// Attempts
export function getAttempts(): TestAttempt[] {
  return getLocalItem<TestAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
}

export function saveAttempt(attempt: TestAttempt): void {
  const attempts = getAttempts();
  const idx = attempts.findIndex(a => a.id === attempt.id);
  if (idx >= 0) attempts[idx] = attempt;
  else attempts.push(attempt);
  setLocalItem(STORAGE_KEYS.ATTEMPTS, attempts);
}

export function getCurrentAttempt(): TestAttempt | null {
  return getLocalItem<TestAttempt | null>(STORAGE_KEYS.CURRENT_ATTEMPT, null);
}

export function setCurrentAttempt(attempt: TestAttempt | null): void {
  setLocalItem(STORAGE_KEYS.CURRENT_ATTEMPT, attempt);
}

export function clearCurrentAttempt(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_ATTEMPT);
}

// Results
export function getResults(): TestResult[] {
  return getLocalItem<TestResult[]>(STORAGE_KEYS.RESULTS, []);
}

export function saveResult(result: TestResult): void {
  const results = getResults();
  results.push(result);
  setLocalItem(STORAGE_KEYS.RESULTS, results);
}

export function getResultById(id: string): TestResult | undefined {
  return getResults().find(r => r.attemptId === id);
}

export function getResultsByTestId(testId: string): TestResult[] {
  return getResults().filter(r => r.testId === testId);
}

// Mistake Book
export function getMistakeBook(): MistakeBookEntry[] {
  return getLocalItem<MistakeBookEntry[]>(STORAGE_KEYS.MISTAKE_BOOK, []);
}

export function addToMistakeBook(entry: MistakeBookEntry): void {
  const book = getMistakeBook();
  book.push(entry);
  setLocalItem(STORAGE_KEYS.MISTAKE_BOOK, book);
}

export function removeFromMistakeBook(id: string): void {
  const book = getMistakeBook().filter(e => e.id !== id);
  setLocalItem(STORAGE_KEYS.MISTAKE_BOOK, book);
}

export function updateMistakeBookEntry(id: string, updates: Partial<MistakeBookEntry>): void {
  const book = getMistakeBook();
  const idx = book.findIndex(e => e.id === id);
  if (idx >= 0) {
    book[idx] = { ...book[idx], ...updates };
    setLocalItem(STORAGE_KEYS.MISTAKE_BOOK, book);
  }
}

// Weekly Plans
export function getCurrentWeeklyPlan(): WeeklyPlan | null {
  const plans = getLocalItem<WeeklyPlan[]>(STORAGE_KEYS.WEEKLY_PLANS, []);
  return plans.length > 0 ? plans[plans.length - 1] : null;
}

export function saveWeeklyPlan(plan: WeeklyPlan): void {
  const plans = getLocalItem<WeeklyPlan[]>(STORAGE_KEYS.WEEKLY_PLANS, []);
  plans.push(plan);
  setLocalItem(STORAGE_KEYS.WEEKLY_PLANS, plans);
}

// Share codes
export function getTestByShareCode(code: string): string | undefined {
  const codes = getLocalItem<Record<string, string>>(STORAGE_KEYS.SHARE_CODES, {});
  return codes[code];
}

export function generateShareCode(testId: string): string {
  const code = `TEST-${testId.slice(0, 8).toUpperCase()}`;
  const codes = getLocalItem<Record<string, string>>(STORAGE_KEYS.SHARE_CODES, {});
  codes[code] = testId;
  setLocalItem(STORAGE_KEYS.SHARE_CODES, codes);
  return code;
}

// PDF Binary Storage (IndexedDB)
export async function saveTestPdfFile(testId: string, file: File | ArrayBuffer): Promise<void> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  
  // Clear any existing chunks first
  const allKeys = await keys();
  const chunkPrefix = `${STORAGE_KEYS.PDF_PREFIX}${testId}_chunk_`;
  for (const key of allKeys) {
    if (typeof key === 'string' && key.startsWith(chunkPrefix)) {
      await del(key);
    }
  }

  // Split into 1MB chunks to avoid IndexedDB size limits on some browsers
  const CHUNK_SIZE = 1024 * 1024;
  const chunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);
  
  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, buffer.byteLength);
    const chunk = buffer.slice(start, end);
    await set(`${chunkPrefix}${i}`, chunk);
  }
  
  await set(`${STORAGE_KEYS.PDF_PREFIX}${testId}_metadata`, { 
    chunks, 
    totalSize: buffer.byteLength,
    timestamp: Date.now()
  });
}

export async function loadTestPdfFile(testId: string): Promise<ArrayBuffer | null> {
  // Try loading from chunks first (new format)
  const meta = await get(`${STORAGE_KEYS.PDF_PREFIX}${testId}_metadata`);
  if (meta && meta.chunks) {
    const buffer = new Uint8Array(meta.totalSize);
    for (let i = 0; i < meta.chunks; i++) {
      const chunk = await get(`${STORAGE_KEYS.PDF_PREFIX}${testId}_chunk_${i}`);
      if (chunk) {
        buffer.set(new Uint8Array(chunk), i * (1024 * 1024));
      }
    }
    return buffer.buffer;
  }
  
  // Fallback to old single-blob format
  return await get(`${STORAGE_KEYS.PDF_PREFIX}${testId}`) || null;
}

export async function saveTestPdfPageImages(testId: string, images: any[]): Promise<void> {
  const CHUNK_SIZE = 5; // Save in chunks of 5 pages to keep IndexedDB operations manageable
  const chunks = Math.ceil(images.length / CHUNK_SIZE);
  
  for (let i = 0; i < chunks; i++) {
    const chunk = images.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await set(`${STORAGE_KEYS.PAGES_PREFIX}${testId}_chunk_${i}`, chunk);
  }
  
  await set(`${STORAGE_KEYS.PAGES_PREFIX}${testId}_metadata`, { chunks, total: images.length });
}

export async function loadTestPdfPageImages(testId: string): Promise<any[]> {
  const meta = await get(`${STORAGE_KEYS.PAGES_PREFIX}${testId}_metadata`);
  if (meta && meta.chunks) {
    const allImages = [];
    for (let i = 0; i < meta.chunks; i++) {
      const chunk = await get(`${STORAGE_KEYS.PAGES_PREFIX}${testId}_chunk_${i}`);
      if (chunk) allImages.push(...chunk);
    }
    return allImages;
  }
  return await get(`${STORAGE_KEYS.PAGES_PREFIX}${testId}`) || [];
}

export async function saveTestQuestionImages(testId: string, images: Record<string, string>): Promise<void> {
  await set(`${STORAGE_KEYS.QUES_IMAGES_PREFIX}${testId}`, images);
}

export async function loadTestQuestionImages(testId: string): Promise<Record<string, string>> {
  return await get(`${STORAGE_KEYS.QUES_IMAGES_PREFIX}${testId}`) || {};
}

// Utility
export function updateTestAnswerKey(testId: string, answerKey: AnswerKey): void {
  const tests = getTests();
  const idx = tests.findIndex(t => t.id === testId);
  if (idx >= 0) {
    tests[idx].answerKey = answerKey;
    setLocalItem(STORAGE_KEYS.TESTS, tests);
  }
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function exportStore(): string {
  const data: ExamStore = {
    tests: getTests(),
    attempts: getAttempts(),
    results: getResults(),
    mistakeBook: getMistakeBook(),
    weeklyPlans: getLocalItem<WeeklyPlan[]>(STORAGE_KEYS.WEEKLY_PLANS, []),
    currentAttempt: getCurrentAttempt(),
  };
  return JSON.stringify(data);
}

export async function importStore(data: ExamStore | string) {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    if (parsed.tests) setLocalItem(STORAGE_KEYS.TESTS, parsed.tests);
    if (parsed.attempts) setLocalItem(STORAGE_KEYS.ATTEMPTS, parsed.attempts);
    if (parsed.results) setLocalItem(STORAGE_KEYS.RESULTS, parsed.results);
    if (parsed.mistakeBook) setLocalItem(STORAGE_KEYS.MISTAKE_BOOK, parsed.mistakeBook);
    if (parsed.weeklyPlans) setLocalItem(STORAGE_KEYS.WEEKLY_PLANS, parsed.weeklyPlans);
  } catch (e) {
    console.error('Import failed', e);
  }
}
