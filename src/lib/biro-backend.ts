/**
 * Biro Backend client.
 * Calls the self-hosted Python FastAPI service (PyMuPDF + PaddleOCR + Regex)
 * configured via VITE_BIRO_BACKEND_URL. Falls back to the Lovable AI edge
 * function `extract-questions` only when the backend is unreachable, so PDF
 * conversion keeps working even if backend is down OR AI credits exhausted.
 */
import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL = (import.meta.env.VITE_BIRO_BACKEND_URL as string | undefined)?.replace(/\/$/, "");

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
  diagramImage?: string; // base64 data URL
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
  const res = await fetch(`${BACKEND_URL}/api/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfBase64, mimeType }),
  });
  if (!res.ok) throw new Error(`backend ${res.status}`);
  const data = await res.json();
  return { ...data, source: "python-backend" as const };
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

/**
 * Extract questions, trying the Python backend first.
 * On any backend failure (offline, 5xx, cold-start timeout) → falls back to
 * the Lovable AI edge function so the user is never blocked.
 */
export async function extractQuestionsFromPdf(args: {
  pdfBase64: string;
  mimeType?: string;
  userApiKey?: string;
  onStage?: (msg: string) => void;
}): Promise<ExtractResult> {
  const mimeType = args.mimeType ?? "application/pdf";
  if (BACKEND_URL) {
    try {
      args.onStage?.("Extracting via Biro backend (PyMuPDF + OCR, 0 AI credits)…");
      return await callBackend(args.pdfBase64, mimeType);
    } catch (e) {
      console.warn("Biro backend failed, falling back to Lovable AI:", e);
      args.onStage?.("Backend unavailable — falling back to AI extraction…");
    }
  } else {
    args.onStage?.("VITE_BIRO_BACKEND_URL not set — using AI extraction…");
  }
  return callLovableAI(args.pdfBase64, mimeType, args.userApiKey);
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

export const BIRO_BACKEND_CONFIGURED = !!BACKEND_URL;
