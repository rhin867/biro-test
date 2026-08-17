import * as pdfjsLib from 'pdfjs-dist';

// Use local worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PDFPageMetadata {
  pageNumber: number;
  width: number;
  height: number;
}

export interface PDFPageImage {
  pageNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
}

export async function renderPDFPagesMetadata(pdfFile: File | ArrayBuffer): Promise<PDFPageMetadata[]> {
  const data = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDoc = await loadingTask.promise;
  const metadata: PDFPageMetadata[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    metadata.push({
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
    });
    page.cleanup();
  }

  await loadingTask.destroy();
  return metadata;
}

export async function renderSinglePage(
  pdfFile: File | ArrayBuffer,
  pageNumber: number,
  scale = 1.5,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.8
): Promise<string> {
  const data = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNumber);
  
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) throw new Error('Could not create canvas context');
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
    intent: 'print'
  }).promise;
  
  const imageDataUrl = canvas.toDataURL(format, quality);
  
  // Aggressive cleanup
  canvas.width = 0;
  canvas.height = 0;
  page.cleanup();
  await pdfDoc.destroy();
  
  return imageDataUrl;
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export function revokeObjectURLs(urls: string[]) {
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
}
