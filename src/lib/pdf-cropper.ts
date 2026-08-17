import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

export interface CroppedQuestion {
  pageNumber: number;
  imageDataUrl: string;
  questionIndex: number;
}

export interface PDFPageImage {
  pageNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
}

const activeObjectURLs = new Set<string>();

export function revokeObjectURLs() {
  activeObjectURLs.forEach(url => {
    try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
  });
  activeObjectURLs.clear();
}

/**
 * Render all PDF pages metadata for large files.
 */
export async function renderPDFPagesMetadata(
  pdfData: ArrayBuffer,
  scale: number = 2
): Promise<Array<{ pageNumber: number; width: number; height: number }>> {
  const pdf = await pdfjsLib.getDocument({ 
    data: pdfData.slice(0),
    disableAutoFetch: true,
    disableStream: true
  }).promise;
  const metadata = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    metadata.push({
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
    });
    page.cleanup();
  }
  
  await pdf.destroy();
  return metadata;
}

/**
 * Render a single PDF page to a base64 image string.
 */
export async function renderSinglePage(
  pdfData: ArrayBuffer,
  pageNumber: number,
  scale: number = 1.8
): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ 
    data: pdfData.slice(0),
    disableAutoFetch: true,
    disableStream: true
  }).promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false })!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  
  // Cleanup
  page.cleanup();
  await pdf.destroy();

  if (!blob) return canvas.toDataURL('image/jpeg', 0.85);
  
  const url = URL.createObjectURL(blob);
  activeObjectURLs.add(url);
  return url;
}

/**
 * Crop a specific region from a PDF page
 */
export async function cropPDFRegion(
  pdfData: ArrayBuffer,
  pageNumber: number,
  region: { x: number; y: number; width: number; height: number },
  scale: number = 2
): Promise<string> {
  const imageDataUrl = await renderSinglePage(pdfData, pageNumber, scale);
  
  const img = new Image();
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = imageDataUrl;
  });

  const croppedCanvas = document.createElement('canvas');
  const croppedContext = croppedCanvas.getContext('2d')!;
  croppedCanvas.width = region.width * scale;
  croppedCanvas.height = region.height * scale;

  croppedContext.drawImage(
    img,
    region.x * scale,
    region.y * scale,
    region.width * scale,
    region.height * scale,
    0,
    0,
    region.width * scale,
    region.height * scale
  );

  return croppedCanvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Auto-crop questions from PDF by detecting question boundaries
 */
export async function autoCropQuestions(
  pdfData: ArrayBuffer,
  questionsPerPage: number = 3,
  scale: number = 2
): Promise<CroppedQuestion[]> {
  const pdf = await pdfjsLib.getDocument({ data: pdfData.slice(0) }).promise;
  const croppedQuestions: CroppedQuestion[] = [];
  let questionIndex = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const imageDataUrl = await renderSinglePage(pdfData, pageNum, scale);
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    const sectionHeight = viewport.height / questionsPerPage;

    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = imageDataUrl;
    });

    for (let i = 0; i < questionsPerPage; i++) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = viewport.width;
      canvas.height = sectionHeight;

      ctx.drawImage(
        img,
        0,
        i * sectionHeight,
        viewport.width,
        sectionHeight,
        0,
        0,
        viewport.width,
        sectionHeight
      );

      croppedQuestions.push({
        pageNumber: pageNum,
        imageDataUrl: canvas.toDataURL('image/jpeg', 0.82),
        questionIndex: questionIndex++,
      });
    }
  }

  return croppedQuestions;
}

/**
 * Convert file to base64 for Gemini API
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}