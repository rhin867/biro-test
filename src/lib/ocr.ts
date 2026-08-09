import Tesseract from 'tesseract.js';

/**
 * Perform client-side OCR on a base64 image or data URL.
 */
export async function performClientOCR(imageDataUrl: string): Promise<string> {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imageDataUrl,
      'eng',
      { 
        logger: m => console.log(m),
        workerPath: 'https://unpkg.com/tesseract.js@v5.0.0/dist/worker.min.js',
        corePath: 'https://unpkg.com/tesseract.js-core@v5.0.0/tesseract-core.wasm.js',
      }
    );
    return text.trim();
  } catch (error) {
    console.error("Client OCR failed:", error);
    return "";
  }
}
