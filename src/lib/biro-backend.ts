/**
 * Biro Backend client.
 * Calls the self-hosted Python FastAPI service (PyMuPDF + Tesseract + Regex).
 * Falls back to the Lovable AI edge function if backend is unreachable.
 */
import { supabase } from "@/integrations/supabase/client";

function resolveBackendUrl(): string | undefined {
  // 1. Build-time env var (Vite)
  const envUrl = (import.meta.env.VITE_BIRO_BACKEND_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");
  // 2. Runtime override via localStorage (DevTools convenience)
  try {
    const stored = localStorage.getItem("biro_backend_url")?.trim();
    if (stored) return stored.replace(/\/$/, "");
  } catch {
    // ignore
  }
  return undefined;
}

const BACKEND_URL = resolveBackendUrl();

export const BIRO_BACKEND_CONFIGURED = !!BACKEND_URL;
export const BIRO_BACKEND_URL = BACKEND_URL;

export interface ExtractedQuestionRaw {
  questionNumber: number;
  subject: string;
  chapter: string;
  question: string;
  options: { A: string; B: string; C: string; D: string } | string[];
  correctAnswer: string | null;
  type: string;
  hasDiagram: boolean;
  pdfPageNumber: number | null;
  diagramImage?: string;
}

export interface ExtractResult {
  examTitle?: string;
  questions: ExtractedQuestionRaw[];
  totalExtracted: number;
  subjectCounts: Record<string, number>;
  source: "python-backend" | "lovable-ai";
}

async function callBackend(pdfBase64: string, mimeType: string): Promise<ExtractResult> {
  if (!BACKEND_URL) throw new Error("no-backend");
  const controller = new AbortController();
  // Render free tier can take ~30s on cold start; give 90s.
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(`${BACKEND_URL}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ pdfBase64, mimeType }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    const data = await res.json();
    return { ...data, source: "python-backend" as const };
  } finally {
    clearTimeout(timer);
  }
}

async function callLovableAI(
  pdfBase64: string,
  mimeType: string,
  userApiKey?: string,
): Promise<ExtractResult> {
  const { data, error } = await supabase.functions.invoke("extract-questions", {
    body: { pdfBase64, mimeType, ...(userApiKey ? { userApiKey } : {}) },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return { ...data, source: "lovable-ai" as const };
}

export async function extractQuestionsFromPdf(args: {
  pdfBase64: string;
  mimeType?: string;
  userApiKey?: string;
  onStage?: (msg: string) => void;
  /** If true, skip backend and go straight to AI (for "Lovable AI mode"). */
  forceAI?: boolean;
}): Promise<ExtractResult> {
  const mimeType = args.mimeType ?? "application/pdf";
  if (BACKEND_URL && !args.forceAI) {
    try {
      args.onStage?.("Extracting via Biro backend (0 AI credits, cold start may take ~30s)…");
      return await callBackend(args.pdfBase64, mimeType);
    } catch (e) {
      console.warn("Biro backend failed, falling back to AI:", e);
      args.onStage?.("Backend unavailable — falling back to AI extraction…");
    }
  } else if (!BACKEND_URL) {
    args.onStage?.("Using AI extraction (no self-hosted backend configured).");
  } else {
    args.onStage?.("Using AI extraction as requested…");
  }
  return callLovableAI(args.pdfBase64, mimeType, args.userApiKey);
}

export async function extractAnswerKeyFromPdf(args: {
  pdfBase64: string;
  mimeType?: string;
  userApiKey?: string;
  totalQuestions?: number;
}): Promise<Record<string, string>> {
  const mimeType = args.mimeType ?? "application/pdf";
  if (BACKEND_URL) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90_000);
      try {
        const res = await fetch(`${BACKEND_URL}/api/extract-answer-key`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64: args.pdfBase64, mimeType }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`backend ${res.status}`);
        const data = await res.json();
        return data.answerKey || {};
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      console.warn("Backend answer-key failed, falling back to AI:", e);
    }
  }
  const { data, error } = await supabase.functions.invoke("extract-questions", {
    body: {
      pdfBase64: args.pdfBase64,
      mimeType,
      extractAnswerKeyOnly: true,
      totalQuestions: args.totalQuestions,
      ...(args.userApiKey ? { userApiKey: args.userApiKey } : {}),
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.answerKey || {};
}

export async function cropRegionOnBackend(args: {
  pdfBase64: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
}): Promise<string | null> {
  if (!BACKEND_URL) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/crop-region`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.imageBase64 ?? null;
  } catch {
    return null;
  }
}
