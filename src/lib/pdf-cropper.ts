import * as pdfjsLib from 'pdfjs-dist';

// Use local worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

const MAX_CONCURRENT_PAGES = 3; 
const RENDER_TIMEOUT = 15000; 

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

// Memory-efficient metadata extraction
export async function renderPDFPagesMetadata(pdfFile: File | ArrayBuffer): Promise<PDFPageMetadata[]> {
  let loadingTask = null;
  try {
    const data = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
    loadingTask = pdfjsLib.getDocument({ 
      data,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      disableFontFace: true
    });
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

    return metadata;
  } finally {
    if (loadingTask) {
      await loadingTask.destroy();
    }
  }
}

class Semaphore {
  private tasks: (() => void)[] = [];
  constructor(private count: number) {}
  async acquire() {
    if (this.count > 0) {
      this.count--;
      return;
    }
    await new Promise<void>(resolve => this.tasks.push(resolve));
  }
  release() {
    this.count++;
    if (this.tasks.length > 0) {
      this.count--;
      this.tasks.shift()!();
    }
  }
}

const renderSemaphore = new Semaphore(MAX_CONCURRENT_PAGES);

// High-speed single page rendering with aggressive cleanup
export async function renderSinglePage(
  pdfFile: File | ArrayBuffer,
  pageNumber: number,
  scale = 1.5,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.7 
): Promise<string> {
  await renderSemaphore.acquire();
  
  let loadingTask = null;
  let canvas: HTMLCanvasElement | null = null;
  
  try {
    const data = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
    loadingTask = pdfjsLib.getDocument({ 
      data,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      stopAtErrors: false
    });
    
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(pageNumber);
    
    const viewport = page.getViewport({ scale });
    canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { 
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
    
    if (!context) throw new Error('Could not create canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderPromise = page.render({
      canvasContext: context,
      viewport: viewport,
      intent: 'print'
    }).promise;

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Render timeout')), RENDER_TIMEOUT)
    );

    await Promise.race([renderPromise, timeoutPromise]);
    
    const imageDataUrl = canvas.toDataURL(format, quality);
    
    // Immediate cleanup
    page.cleanup();
    
    return imageDataUrl;
  } catch (err) {
    console.error(`Page ${pageNumber} render failed:`, err);
    throw err;
  } finally {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
    if (loadingTask) {
      await loadingTask.destroy();
    }
    renderSemaphore.release();
  }
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
