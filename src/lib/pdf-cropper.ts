/**
 * PDF processing library (Placeholder)
 * Reconstructing for better stability.
 */

export interface PDFPageImage {
  pageNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
}

export async function renderPDFPagesMetadata() {
  return [];
}

export async function renderSinglePage() {
  return '';
}

export function revokeObjectURLs() {}

export async function fileToBase64() {
  return '';
}
