import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { saveTest, generateId, saveTestPdfPageImages, saveTestQuestionImages, saveTestPdfFile } from '@/lib/storage';
import { Test, Question, Subject, QuestionType } from '@/types/exam';
import { supabase } from '@/integrations/supabase/client';
import { renderPDFPagesMetadata, renderSinglePage, fileToBase64, PDFPageImage } from '@/lib/pdf-cropper';
import { LatexRenderer } from '@/components/ui/latex-renderer';
import { PDFCropTool } from '@/components/exam/PDFCropTool';
import { Upload, FileText, Loader2, Sparkles, AlertCircle, CheckCircle, Image, ZoomIn, Crop, RefreshCw, Download, FileUp, Lock, Eye, EyeOff, Pencil, Trash2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchQuotaInfo, logTestCreation, QuotaInfo, verifyPassword, isTestCreationUnlocked, markTestCreationUnlocked, getCachedAppSettings } from '@/lib/app-settings';
import { getUserApiKey, setUserApiKey } from '@/pages/Settings';
import { extractQuestionsFromPdf, BIRO_BACKEND_CONFIGURED, warmupBackend } from '@/lib/biro-backend';

async function cropQuestionBandFromPage(imageDataUrl: string, indexOnPage: number, totalOnPage: number): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageDataUrl;
  });
  const safeTotal = Math.max(1, totalOnPage);
  const marginX = Math.round(img.width * 0.04);
  const bandHeight = Math.ceil(img.height / safeTotal);
  const sourceY = Math.max(0, indexOnPage * bandHeight - Math.round(bandHeight * 0.12));
  const sourceH = Math.min(img.height - sourceY, Math.round(bandHeight * 1.25));
  const canvas = document.createElement('canvas');
  canvas.width = img.width - marginX * 2;
  canvas.height = sourceH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageDataUrl;
  ctx.drawImage(img, marginX, sourceY, canvas.width, sourceH, 0, 0, canvas.width, sourceH);
  return canvas.toDataURL('image/jpeg', 0.82);
}

async function cropDiagramFromBbox(imageDataUrl: string, bbox: [number, number, number, number]): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageDataUrl;
  });
  const [ymin, xmin, ymax, xmax] = bbox;
  const sourceX = (xmin / 1000) * img.width;
  const sourceY = (ymin / 1000) * img.height;
  const sourceW = ((xmax - xmin) / 1000) * img.width;
  const sourceH = ((ymax - ymin) / 1000) * img.height;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, sourceW);
  canvas.height = Math.max(1, sourceH);
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageDataUrl;
  ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}


function CreateTestInner() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseStatus, setParseStatus] = useState<string>('');
  const [pdfText, setPdfText] = useState('');
  const [testName, setTestName] = useState('');
  const [duration, setDuration] = useState(180);
  const [positiveMarking, setPositiveMarking] = useState(4);
  const [negativeMarking, setNegativeMarking] = useState(1);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<'upload' | 'configure' | 'review'>('upload');
  const [extractionStats, setExtractionStats] = useState<{
    totalExtracted: number;
    subjectCounts: Record<string, number>;
    examTitle?: string;
  } | null>(null);
  const [pdfPageImages, setPdfPageImages] = useState<PDFPageImage[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [showPageViewer, setShowPageViewer] = useState(false);
  const [showCropTool, setShowCropTool] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [extractionTime, setExtractionTime] = useState(0);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [extractionMode, setExtractionMode] = useState<'manual' | 'auto' | 'ai'>('ai');
  const [backendWarm, setBackendWarm] = useState<'idle' | 'warming' | 'ready' | 'down'>('idle');
  // Password is ONLY required for the AI (Lovable) mode. Manual / Auto-Crop / Import are free.
  const [aiUnlocked, setAiUnlocked] = useState(() => isTestCreationUnlocked(getCachedAppSettings()));
  const [aiPassword, setAiPassword] = useState('');
  const [aiVerifying, setAiVerifying] = useState(false);
  // User's own Gemini API key — powers Auto-Crop AI (never the owner's credits).
  const [ownKey, setOwnKey] = useState(() => getUserApiKey() || '');
  const [ownKeySaved, setOwnKeySaved] = useState(() => !!getUserApiKey());
  const [showOwnKey, setShowOwnKey] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  React.useEffect(() => { fetchQuotaInfo().then(setQuota); }, []);
  // Warm the Render dyno as soon as the user opens the page — kills the "unavailable" first-call error.
  React.useEffect(() => {
    if (!BIRO_BACKEND_CONFIGURED) return;
    setBackendWarm('warming');
    warmupBackend().then(ok => setBackendWarm(ok ? 'ready' : 'down'));
  }, []);
  const unlockAI = async () => {
    if (!aiPassword.trim()) return toast.error('Enter the password');
    setAiVerifying(true);
    const r = await verifyPassword('test_creation', aiPassword.trim());
    setAiVerifying(false);
    if (r.ok) {
      try { markTestCreationUnlocked(r.expiresAt ?? null); } catch { /* never block unlock on cache */ }
      setAiUnlocked(true);
      setAiPassword('');
      toast.success('AI mode unlocked!');
    } else {
      toast.error(r.error || 'Incorrect password');
    }
  };
  // ---- pdf2cbt-style test file export/import (0 AI, unlimited) ----
  const exportTestFile = useCallback(() => {
    if (extractedQuestions.length === 0) return toast.error('Nothing to export yet');
    const payload = {
      format: 'biro-test-v1',
      exportedAt: new Date().toISOString(),
      name: testName || 'Untitled Test',
      duration,
      positiveMarking,
      negativeMarking,
      questions: extractedQuestions,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(testName || 'biro-test').replace(/[^\w\- ]+/g, '').trim() || 'biro-test'}.biro.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Test file downloaded — share it, anyone can import it with 0 AI.');
  }, [extractedQuestions, testName, duration, positiveMarking, negativeMarking]);
  const handleImportTestFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== 'biro-test-v1' || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Not a valid Biro test file (.biro.json)');
      }
      const questions: Question[] = data.questions.map((q: any) => ({ ...q, id: q.id || generateId() }));
      const questionImages = Object.fromEntries(
        questions.filter((q) => q.croppedImageUrl?.startsWith('data:')).map((q) => [q.id, q.croppedImageUrl as string])
      );
      const storable = questions.map((q) => q.croppedImageUrl?.startsWith('data:') ? { ...q, croppedImageUrl: undefined } : q);
      const subjects = [...new Set(storable.map((q) => q.subject))] as Subject[];
      const pos = Number(data.positiveMarking) || 4;
      const test: Test = {
        id: generateId(),
        name: String(data.name || file.name.replace(/\.biro\.json$|\.json$/i, '')).slice(0, 200),
        description: `Imported test file (${questions.length} questions) — 0 AI used`,
        createdAt: new Date().toISOString(),
        duration: Number(data.duration) || 180,
        questions: storable,
        subjects,
        totalMarks: questions.length * pos,
        positiveMarking: pos,
        negativeMarking: Number(data.negativeMarking ?? 1),
        hasAnswerKey: questions.some((q) => q.correctAnswer),
      };
      saveTest(test);
      await saveTestQuestionImages(test.id, questionImages);
      toast.success(`Imported "${test.name}" — 0 AI credits, no password, unlimited.`);
      navigate(`/exam/${test.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Invalid test file');
    } finally {
      event.target.value = '';
    }
  }, [navigate]);
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    setIsProcessing(true);
    toast.info('Processing PDF...');
    setParseStatus('Initializing worker...');
    setParseProgress(0);
    setPdfFile(file);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      const arrayBuffer = await file.arrayBuffer();
      const bufferForText = arrayBuffer.slice(0);
      const bufferForImages = arrayBuffer.slice(0);
      setPdfBuffer(bufferForImages);
      
      const pdf = await pdfjsLib.getDocument({ data: bufferForText }).promise;
      let fullText = '';
      setParseStatus('Reading document text...');
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `[Page ${i}]\n${pageText}\n\n`;
        setParseProgress(Math.round((i / pdf.numPages) * 30));
      }
      setPdfText(fullText);
      setTestName(file.name.replace('.pdf', ''));
      
      setParseStatus('Rendering PDF pages metadata...');
      const metadata = await renderPDFPagesMetadata(bufferForImages, 2.5);
      
      // Memory Optimization: Don't render all pages as base64 immediately for large PDFs.
      // Instead, store metadata and render on-demand or in chunks.
      const metaPages: PDFPageImage[] = metadata.map((m) => ({
        ...m,
        imageDataUrl: '', // Will be rendered on-demand in the crop tool
      }));

      // Render the first few pages (up to 10) for immediate feedback in the preview
      const pagesToRender = Math.min(metaPages.length, 10);
      for (let i = 0; i < pagesToRender; i++) {
        metaPages[i].imageDataUrl = await renderSinglePage(bufferForImages, i + 1, 2.5);
        setParseProgress(30 + Math.round((i / pagesToRender) * 20));
      }


      setParseProgress(100);
      setParseStatus('PDF Ready!');
      setPdfPageImages(metaPages);
      toast.success(`PDF processed: ${pdf.numPages} pages`);
      setStep('configure');
    } catch (error) {
      console.error('PDF processing error:', error);
      toast.error('Failed to process PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);
  const extractQuestions = useCallback(async () => {
    setIsProcessing(true);
    setExtractionFailed(false);
    const startTime = Date.now();

    const finishExtraction = async (data: any, started: number) => {
      const elapsed = Math.round((Date.now() - started) / 1000);
      setExtractionTime(elapsed);
      const raw = data?.questions || [];
      const questions: Question[] = raw.map((q: any, index: number) => {
        const options = Array.isArray(q.options)
          ? { A: q.options[0] || '', B: q.options[1] || '', C: q.options[2] || '', D: q.options[3] || '' }
          : { A: q.options?.A || '', B: q.options?.B || '', C: q.options?.C || '', D: q.options?.D || '' };
        const hasOptions = Object.values(options).some(v => String(v).trim());
        const type = !hasOptions ? 'Numerical' : (q.type === 'MSQ' ? 'MSQ' : 'MCQ');
        const inferredPage = pdfPageImages.length
          ? Math.min(pdfPageImages.length, Math.max(1, Math.ceil(((index + 1) / Math.max(1, raw.length)) * pdfPageImages.length)))
          : null;
        const pdfPageNumber = Number(q.pdfPageNumber || q.pageNumber || inferredPage) || null;
        const hasDiagram = Boolean(q.hasDiagram || q.imageUrl || q.diagramImage
          || /diagram|figure|graph|circuit|shown|given below|following/i.test(q.question || ''));
        const croppedImageUrl = typeof q.diagramImage === 'string' && q.diagramImage.startsWith('data:')
          ? q.diagramImage
          : undefined;
        return {
          id: generateId(),
          questionNumber: Number(q.questionNumber || index + 1),
          subject: ['Physics', 'Chemistry', 'Maths'].includes(q.subject) ? q.subject : 'Physics',
          chapter: q.chapter || 'General',
          question: q.question || '',
          options,
          correctAnswer: q.correctAnswer || null,
          type,
          level: 'JEE',
          imageUrl: q.imageUrl || undefined,
          croppedImageUrl,
          hasDiagram,
          pdfPageNumber,
        } as Question;
      });

      const questionsWithImages = await Promise.all(questions.map(async (q, idx) => {
        const rawQ = raw[idx];
        // 1. Precise Auto-Vision Crop (if bbox provided by AI)
        if (rawQ?.diagramBbox && q.pdfPageNumber) {
          const page = pdfPageImages.find((p) => p.pageNumber === q.pdfPageNumber);
          if (page) {
            try {
              const cropped = await cropDiagramFromBbox(page.imageDataUrl, rawQ.diagramBbox);
              return { ...q, croppedImageUrl: cropped };
            } catch (e) {
              console.warn("Vision crop failed, falling back to band crop:", e);
            }
          }
        }
        
        // 2. Fallback: Band-based Crop (original logic)
        if (!q.hasDiagram || q.croppedImageUrl || q.imageUrl || !q.pdfPageNumber) return q;
        const page = pdfPageImages.find((p) => p.pageNumber === q.pdfPageNumber);
        if (!page) return q;
        const samePage = questions.filter((c) => c.pdfPageNumber === q.pdfPageNumber);
        const indexOnPage = Math.max(0, samePage.findIndex((c) => c.id === q.id));
        return { ...q, croppedImageUrl: await cropQuestionBandFromPage(page.imageDataUrl, indexOnPage, samePage.length) };
      }));

      // Sanity-cap AI subject counts: dedupe by (subject, questionNumber) so the model can't
      // hallucinate 50 Physics questions when only 25 exist in the PDF.
      const seen = new Set<string>();
      const dedupedQuestions = questionsWithImages.filter((q) => {
        const key = `${q.subject}#${q.questionNumber}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const realSubjectCounts: Record<string, number> = {};
      for (const q of dedupedQuestions) realSubjectCounts[q.subject] = (realSubjectCounts[q.subject] || 0) + 1;

      setExtractedQuestions(dedupedQuestions);
      setExtractionStats({
        totalExtracted: dedupedQuestions.length,
        subjectCounts: realSubjectCounts,
        examTitle: data.examTitle,
      });
      // Only auto-fill the name if the user hasn't typed one — never overwrite user input.
      if (!testName.trim() && data.examTitle && data.examTitle !== 'Extracted Test') setTestName(data.examTitle);
      setStep('review');
      toast.success(`Extracted ${questionsWithImages.length} questions in ${elapsed}s${data.source ? ` (${data.source})` : ''}`);
    };

    try {
      // Quota check FIRST — never burn quota on a call we won't make.
      const latestQuota = await fetchQuotaInfo();
      setQuota(latestQuota);
      if (latestQuota.exceeded) {
        toast.error(`Quota reached: ${latestQuota.dailyUsed}/${latestQuota.dailyLimit} today, ${latestQuota.monthlyUsed}/${latestQuota.monthlyLimit} this month.`);
        return;
      }
      if (!pdfFile && !pdfText.trim()) {
        toast.error('Upload a PDF or paste text first.');
        return;
      }
      const userApiKey = getUserApiKey();
      if (pdfFile) {
        toast.info('Extracting via AI (High Accuracy Scanned PDF OCR Mode)…');
        const pdfBase64 = await fileToBase64(pdfFile);
        // ... rest of logic stays same
        if (extractionMode === 'auto' && BIRO_BACKEND_CONFIGURED && backendWarm !== 'ready') {
          toast.info('Waking extraction backend (first call after idle can take ~30s)…');
          const ok = await warmupBackend();
          setBackendWarm(ok ? 'ready' : 'down');
          if (!ok) toast.info('Backend still cold — will fall back to AI if needed.');
        }
        const data = await extractQuestionsFromPdf({
          pdfBase64,
          mimeType: 'application/pdf',
          userApiKey,
          forceAI: extractionMode === 'ai',
          userKeyOnly: extractionMode === 'auto',
          onStage: (msg) => toast.info(msg),
        });
        await finishExtraction(data, startTime);
      } else {
        const result = await supabase.functions.invoke('extract-questions', {
          body: { pdfText, ...(userApiKey ? { userApiKey } : {}) },
        });
        if (result.error) throw result.error;
        if (result.data?.error) throw new Error(result.data.error);
        await finishExtraction(result.data, startTime);
      }
    } catch (error: any) {
      console.error('Extraction error:', error);
      setExtractionFailed(true);
      toast.error(error?.message || 'Extraction failed. Use the Crop Tool to add diagrams manually.');
    } finally {
      setIsProcessing(false);
    }
  }, [pdfText, pdfFile, pdfPageImages, extractionMode, backendWarm]);
  const creatingRef = useRef(false);
  const [isCreating, setIsCreating] = useState(false);
  const handleCreateTest = async () => {
    // Race guard — double-tap on slow devices was creating multiple tests and burning quota.
    if (creatingRef.current) {
      toast.info('Already creating your test — please wait…');
      return;
    }
    if (extractedQuestions.length === 0) {
      toast.error('No questions to create test');
      return;
    }

    // Capture values needed after prompt to avoid closure issues or stale refs
    const currentQuestions = [...extractedQuestions];
    const currentName = (testName || 'Untitled Test').trim();

    // Final confirmation gate
    const appSettings = getCachedAppSettings();
    const phrase = (appSettings.confirmation_phrase || 'I LOVE YOU BIRO').trim();
    const entered = window.prompt(`Type "${phrase}" to save and share this test:`);
    if (!entered || entered.trim().toUpperCase() !== phrase.toUpperCase()) {
      toast.error('Confirmation phrase did not match. Test not saved.');
      return;
    }
    creatingRef.current = true;
    setIsCreating(true);
    try {
      const quota = await fetchQuotaInfo();
      if (quota.exceeded) {
        toast.error(
          `Quota reached: ${quota.dailyUsed}/${quota.dailyLimit} today, ${quota.monthlyUsed}/${quota.monthlyLimit} this month. Try again later.`
        );
        return;
      }
      const subjects: Subject[] = [...new Set(currentQuestions.map((q) => q.subject))];
      const hasAnswerKey = currentQuestions.some(q => q.correctAnswer);
      const testId = generateId();
      const questionImages = Object.fromEntries(
        currentQuestions
          .filter((q) => q.croppedImageUrl?.startsWith('data:'))
          .map((q) => [q.id, q.croppedImageUrl as string])
      );
      const storableQuestions = currentQuestions.map((q) => q.croppedImageUrl?.startsWith('data:')
        ? { ...q, croppedImageUrl: undefined }
        : q
      );
      const test: Test = {
        id: testId,
        name: currentName,
        description: `Created from PDF with ${currentQuestions.length} questions`,
        createdAt: new Date().toISOString(),
        duration,
        questions: storableQuestions,
        subjects,
        totalMarks: currentQuestions.length * positiveMarking,
        positiveMarking,
        negativeMarking,
        hasAnswerKey,
        pdfPageImages: undefined,
      };
      try {
        saveTest(test);
        await saveTestQuestionImages(test.id, questionImages);
        if (pdfPageImages.length > 0) {
          await saveTestPdfPageImages(test.id, pdfPageImages);
        }
        if (pdfFile) {
          try { await saveTestPdfFile(test.id, await pdfFile.arrayBuffer()); } catch (e) { console.warn('save pdf blob failed', e); }
        }
      } catch (e) {
        console.error('saveTest failed', e);
        toast.error('Could not save test locally (storage full). Try clearing old tests.');
        return;
      }
      await logTestCreation({ testId: test.id, testName: test.name, aiCalls: extractionMode === 'ai' ? 1 : 0 });
      toast.success(
        `Test saved! Remaining today: ${Math.max(0, quota.dailyRemaining - 1)}/${quota.dailyLimit}`
      );
      navigate(`/exam/${test.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to save test: ' + (e.message || 'unknown'));
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
  };
  const diagramQuestionCount = extractedQuestions.filter(q => q.hasDiagram).length;
  return (
    <MainLayout>
      <PageHeader
        title="Create Test"
        description="Upload a PDF to create a CBT test — no API key needed"
      />
      {/* Progress Steps */}
      <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-8 overflow-x-auto pb-2">
        {['upload', 'configure', 'review'].map((s, i) => (
          <div key={s} className="flex items-center flex-shrink-0">
            <div className={cn(
              'flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full text-xs md:text-sm font-medium transition-all',
              step === s ? 'bg-primary text-primary-foreground' :
              i < ['upload', 'configure', 'review'].indexOf(step) ? 'bg-correct text-correct-foreground' :
              'bg-muted text-muted-foreground'
            )}>
              {i + 1}
            </div>
            <span className={cn('ml-1.5 md:ml-2 text-xs md:text-sm', step === s ? 'font-medium' : 'text-muted-foreground')}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 2 && <div className="w-6 md:w-12 h-0.5 bg-border mx-2 md:mx-4" />}
          </div>
        ))}
      </div>
      {/* Upload Step */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Upload className="h-5 w-5 text-primary" />
                Upload PDF
              </CardTitle>
              <CardDescription>Upload a JEE-style question paper PDF</CardDescription>
            </CardHeader>
            <CardContent>
              <label htmlFor="pdf-upload" className={cn(
                'flex flex-col items-center justify-center h-40 md:h-48 border-2 border-dashed rounded-lg cursor-pointer transition-all',
                isProcessing ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent'
              )}>
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 md:h-10 w-8 md:w-10 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">{parseStatus} {parseProgress}%</p>
                    <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full bg-primary transition-all duration-300" 
                        style={{ width: `${parseProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <FileText className="h-8 md:h-10 w-8 md:w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Click to upload PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">Any JEE/NEET question paper</p>
                  </>
                )}
                <input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" disabled={isProcessing} />
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <FileText className="h-5 w-5 text-physics" />
                Manual Input
              </CardTitle>
              <CardDescription>Paste question text directly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your questions here..."
                value={pdfText}
                onChange={(e) => setPdfText(e.target.value)}
                className="min-h-[120px] md:min-h-[150px]"
              />
              <Button onClick={() => { if (pdfText.trim()) setStep('configure'); else toast.error('Enter text first'); }}
                variant="outline" className="w-full" disabled={!pdfText.trim()}>
                Use This Text
              </Button>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2 border-correct/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <FileUp className="h-5 w-5 text-correct" />
                Import Test File (.biro.json)
              </CardTitle>
              <CardDescription>
                Got a test file exported from Biro (like pdf2cbt)? Import it — 0 AI, no password, unlimited creations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label htmlFor="test-file-import" className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-correct/40 rounded-lg cursor-pointer hover:bg-correct/5 transition-all">
                <FileUp className="h-6 w-6 text-correct mb-1" />
                <p className="text-sm font-medium">Click to import a test file</p>
                <p className="text-xs text-muted-foreground">Instantly creates the test locally</p>
                <input id="test-file-import" type="file" accept=".json,application/json" onChange={handleImportTestFile} className="hidden" />
              </label>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Configure Step */}
      {step === 'configure' && (
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Configure Test</CardTitle>
            <CardDescription>Set test parameters before AI extraction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testName">Test Name</Label>
              <Input id="testName" value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g., JEE Main 2024 Paper 1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input id="duration" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={1} max={300} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Correct (+)</Label>
                <Input type="number" value={positiveMarking} onChange={(e) => setPositiveMarking(Number(e.target.value))} min={1} max={10} />
              </div>
              <div className="space-y-2">
                <Label>Wrong (-)</Label>
                <Input type="number" value={negativeMarking} onChange={(e) => setNegativeMarking(Number(e.target.value))} min={0} max={10} />
              </div>
            </div>
            {/* 3-Mode Extraction Selector */}
            <div className="space-y-2">
              <Label className="text-sm">Extraction Mode</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {([
                  { id: 'manual', title: 'Manual', desc: 'Crop yourself. 0 AI calls.', icon: Crop, disabled: false },
                  { id: 'auto', title: 'Auto-Crop', desc: 'Backend + your own Gemini key · 0 owner credits', icon: Sparkles, disabled: false },
                  { id: 'ai', title: "Owner's AI", desc: 'Best accuracy · uses credits', icon: Sparkles, disabled: false },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={m.disabled}
                    onClick={() => setExtractionMode(m.id as any)}
                    className={cn(
                      'text-left p-2.5 rounded-lg border-2 transition-all',
                      extractionMode === m.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                      m.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <m.icon className="h-4 w-4" />
                      <span className="text-sm font-semibold">{m.title}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                  </button>
                ))}
              </div>
              {BIRO_BACKEND_CONFIGURED && (
                <p className="text-[10px] text-muted-foreground">
                  Backend status: {backendWarm === 'ready' ? '🟢 Ready' : backendWarm === 'warming' ? '🟡 Warming up…' : backendWarm === 'down' ? '🔴 Cold (will retry)' : '⚪ Idle'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm">
                {extractionMode === 'manual' && 'You will crop each question manually — tag subject / section / type per crop. No password, 0 AI credits.'}
                {extractionMode === 'auto' && 'Auto-Crop runs on our Python backend (regex + OCR). If the backend is down, it uses YOUR own Gemini API key — never the owner\'s credits.'}
                {extractionMode === 'ai' && 'AI extracts questions with LaTeX math, subjects and diagrams (uses credits — password required).'}
              </p>
            </div>
            {/* Auto-Crop: user's own Gemini API key */}
            {extractionMode === 'auto' && (
              <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="h-4 w-4 text-primary" /> Your Gemini API key (used only by you)
                </div>
                <p className="text-xs text-muted-foreground">
                  Stored only in this browser and sent straight to the extraction call — never saved on our servers.{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Get a free key
                  </a>
                </p>
                <div className="flex gap-2">
                  <Input
                    type={showOwnKey ? 'text' : 'password'}
                    placeholder="AIzaSy…"
                    value={ownKey}
                    onChange={(e) => { setOwnKey(e.target.value); setOwnKeySaved(false); }}
                  />
                  <Button variant="ghost" size="icon" type="button" onClick={() => setShowOwnKey(v => !v)}>
                    {showOwnKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!ownKey.trim()) { toast.error('Enter your Gemini API key'); return; }
                      setUserApiKey(ownKey.trim());
                      setOwnKeySaved(true);
                      toast.success('API key saved in this browser');
                    }}
                  >
                    Save
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {ownKeySaved ? '🟢 Key active — Auto-Crop can fall back to your own AI.' : '⚪ No key saved — Auto-Crop will use the backend only.'}
                </p>
              </div>
            )}
            {/* AI mode password unlock — only shown for AI mode */}
            {extractionMode === 'ai' && !aiUnlocked && (
              <div className="space-y-2 p-3 rounded-lg border border-review/30 bg-review/10">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="h-4 w-4 text-review" /> AI mode is password-protected
                </div>
                <p className="text-xs text-muted-foreground">Manual and Auto-Crop don't need a password. Ask the owner for the AI password.</p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="AI creation password"
                    value={aiPassword}
                    onChange={(e) => setAiPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && unlockAI()}
                  />
                  <Button onClick={unlockAI} disabled={aiVerifying} variant="secondary">
                    {aiVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
                  </Button>
                </div>
              </div>
            )}
            {/* PDF Page Preview */}
            {pdfPageImages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">PDF Preview ({pdfPageImages.length} pages)</Label>
                  <Button variant="ghost" size="sm" onClick={() => setShowPageViewer(true)}>
                    <ZoomIn className="h-4 w-4 mr-1" /> View Pages
                  </Button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {pdfPageImages.slice(0, 4).map((page) => (
                    <img key={page.pageNumber} src={page.imageDataUrl} alt={`Page ${page.pageNumber}`}
                      className="h-20 w-auto rounded border border-border cursor-pointer hover:ring-2 hover:ring-primary"
                      onClick={() => setShowPageViewer(true)} />
                  ))}
                  {pdfPageImages.length > 4 && (
                    <div className="h-20 w-16 flex items-center justify-center rounded border border-border bg-muted cursor-pointer hover:bg-accent"
                      onClick={() => setShowPageViewer(true)}>
                      <span className="text-xs text-muted-foreground">+{pdfPageImages.length - 4}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Retry on failure */}
            {extractionFailed && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive flex-1">Extraction failed. Try again or use manual crop.</p>
                <Button variant="outline" size="sm" onClick={extractQuestions} disabled={isProcessing} className="gap-1">
                  <RefreshCw className="h-3 w-3" /> Retry
                </Button>
              </div>
            )}
            {pdfPageImages.length > 0 && (
              <div className="space-y-4 p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-black uppercase tracking-tighter">
                    <Crop className="h-6 w-6" />
                    <span className="text-base">Advanced Manual Selection Mode</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tight text-primary border-primary/20 bg-primary/10">0 Credits</Badge>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Best for <span className="text-foreground font-bold">scanned PDFs</span>. Select question areas and option areas (A, B, C, D) manually for perfect accuracy.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">1</div>
                    <p className="text-xs text-muted-foreground">Select the <b>Question</b> area first by dragging.</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">2</div>
                    <p className="text-xs text-muted-foreground">Hold <b>SHIFT</b> + Drag to select <b>Option areas</b>.</p>
                  </div>
                </div>

                <Button variant="default" onClick={() => {
                  if (pdfPageImages.length === 0) {
                    toast.error("PDF pages not yet rendered. Please wait.");
                    return;
                  }
                  setShowCropTool(true);
                }} className="gap-2 w-full h-14 text-lg font-black uppercase tracking-widest shadow-xl hover:shadow-primary/30 transition-all group">
                  <Crop className="h-6 w-6 group-hover:rotate-12 transition-transform" /> 
                  Open Manual Selection Tool
                </Button>
                
                <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground font-black uppercase tracking-widest pt-1">
                  <span>UNLIMITED USE</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span>NO PASSWORD</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span>100% ACCURATE</span>
                </div>
              </div>

            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button
                onClick={() => {
                  if (extractionMode === 'manual') return setShowCropTool(true);
                  if (extractionMode === 'ai' && !aiUnlocked) return toast.error('Enter the AI password above, or switch to Manual / Auto-Crop (no password).');
                  if (extractionMode === 'auto' && !ownKeySaved && !ownKey.trim()) {
                    toast.error('Add your own Gemini API key for Auto-Crop mode, or use Manual.');
                    return;
                  }
                  extractQuestions();
                }}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting...</>
                ) : extractionMode === 'manual' ? (
                  <><Crop className="mr-2 h-4 w-4" />Open Crop Tool</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />Extract Questions</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Review Step */}
      {step === 'review' && (
        <div className="space-y-4 md:space-y-6">
          {quota && (
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
              quota.exceeded
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : quota.dailyRemaining <= 1
                  ? 'bg-review/10 border-review/30'
                  : 'bg-primary/10 border-primary/20'
            )}>
              <AlertCircle className="h-4 w-4" />
              <span>
                Test creation quota — Today: {quota.dailyUsed}/{quota.dailyLimit} ·
                This month: {quota.monthlyUsed}/{quota.monthlyLimit}
                {quota.exceeded && ' · LIMIT REACHED'}
              </span>
            </div>
          )}
          {extractionStats && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-correct/10 border border-correct/20">
                <CheckCircle className="h-4 w-4 text-correct" />
                <span className="text-sm font-medium">{extractionStats.totalExtracted} Questions in {extractionTime}s</span>
              </div>
              {diagramQuestionCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-review/10 border border-review/20">
                  <Image className="h-4 w-4 text-review" />
                  <span className="text-sm font-medium">{diagramQuestionCount} with Diagrams</span>
                </div>
              )}
              {Object.entries(extractionStats.subjectCounts).map(([subject, count]) => (
                <div key={subject} className={cn('px-3 py-2 rounded-lg text-sm', `badge-${subject.toLowerCase()}`)}>
                  {subject}: {count as number}
                </div>
              ))}
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Review Extracted Questions</CardTitle>
              <CardDescription>{extractedQuestions.length} questions • Verify before creating test</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4 max-h-[350px] md:max-h-[400px] overflow-y-auto pr-2">
                {extractedQuestions.map((q, index) => (
                  <div key={q.id} className="p-3 md:p-4 rounded-lg border border-border bg-card/50 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-xs font-medium text-primary">{index + 1}</span>
                        <span className={`badge-${q.subject.toLowerCase()} px-2 py-0.5 rounded text-xs`}>{q.subject}</span>
                        <span className="text-xs text-muted-foreground">{q.chapter}</span>
                        {q.hasDiagram && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-review/10 text-review border border-review/20">
                            <Image className="h-3 w-3" /> Diagram
                          </span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-[10px] ml-auto hover:bg-primary/10 hover:text-primary"
                          onClick={() => setEditingQuestion(q)}
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                          onClick={() => setExtractedQuestions(prev => prev.filter(item => item.id !== q.id))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {q.correctAnswer && <span className="text-xs text-muted-foreground italic">✓ Answer: {q.correctAnswer}</span>}
                    </div>
                    <div className="text-sm mb-2 line-clamp-2">
                      <LatexRenderer content={q.question} />
                    </div>
                    {q.croppedImageUrl && (
                      <div className="mt-2 mb-2 relative group">
                        <img src={q.croppedImageUrl} className="max-h-24 object-contain rounded border border-border" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                           <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={() => setEditingQuestion(q)}>Change Image</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Edit Question Dialog */}
              {editingQuestion && (
                <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Question {extractedQuestions.findIndex(q => q.id === editingQuestion.id) + 1}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Input 
                            value={editingQuestion.subject} 
                            onChange={e => setEditingQuestion({...editingQuestion, subject: e.target.value as Subject})} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select 
                            value={editingQuestion.type} 
                            onValueChange={v => setEditingQuestion({...editingQuestion, type: v as QuestionType})}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MCQ">MCQ</SelectItem>
                              <SelectItem value="MSQ">MSQ</SelectItem>
                              <SelectItem value="Numerical">Numerical</SelectItem>
                              <SelectItem value="Integer">Integer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Question Text (LaTeX supported)</Label>
                        <Textarea 
                          value={editingQuestion.question} 
                          onChange={e => setEditingQuestion({...editingQuestion, question: e.target.value})}
                          rows={4}
                        />
                      </div>
                      {(editingQuestion.type === 'MCQ' || editingQuestion.type === 'MSQ') && (
                        <div className="grid grid-cols-2 gap-3">
                          {(['A', 'B', 'C', 'D'] as const).map(opt => (
                            <div key={opt} className="space-y-1">
                              <Label>Option {opt}</Label>
                              <Input 
                                value={editingQuestion.options[opt]} 
                                onChange={e => setEditingQuestion({
                                  ...editingQuestion, 
                                  options: {...editingQuestion.options, [opt]: e.target.value}
                                })} 
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Correct Answer</Label>
                          <Input 
                            value={editingQuestion.correctAnswer || ''} 
                            onChange={e => setEditingQuestion({...editingQuestion, correctAnswer: e.target.value})}
                            placeholder="A, B, C, D or a number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Chapter</Label>
                          <Input 
                            value={editingQuestion.chapter} 
                            onChange={e => setEditingQuestion({...editingQuestion, chapter: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Diagram / Image</Label>
                        {editingQuestion.croppedImageUrl ? (
                          <div className="relative group space-y-2">
                            <img src={editingQuestion.croppedImageUrl} className="max-h-48 object-contain rounded border-2 border-primary/20" />
                            <div className="flex gap-2">
                              <Button size="sm" variant="destructive" onClick={() => setEditingQuestion({...editingQuestion, croppedImageUrl: undefined, hasDiagram: false})}>
                                <Trash2 className="h-4 w-4 mr-1" /> Remove
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = async (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      setEditingQuestion({
                                        ...editingQuestion,
                                        croppedImageUrl: ev.target?.result as string,
                                        hasDiagram: true
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}>
                                <ImageIcon className="h-4 w-4 mr-1" /> Replace Image
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="w-full border-dashed py-8 gap-2"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = async (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    setEditingQuestion({
                                      ...editingQuestion,
                                      croppedImageUrl: ev.target?.result as string,
                                      hasDiagram: true
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                              input.click();
                            }}
                          >
                            <ImageIcon className="h-4 w-4" /> Add Diagram/Image
                          </Button>
                        )}
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={() => setEditingQuestion(null)}>Cancel</Button>
                        <Button onClick={() => {
                          setExtractedQuestions(prev => prev.map(q => q.id === editingQuestion.id ? editingQuestion : q));
                          setEditingQuestion(null);
                          toast.success('Question updated');
                        }}>Save Changes</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
          {extractedQuestions.some(q => q.correctAnswer) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-correct/10 border border-correct/20">
              <CheckCircle className="h-5 w-5 text-correct flex-shrink-0" />
              <p className="text-sm text-correct">✅ Answer key detected from PDF!</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setStep('configure')} disabled={isCreating}>Back</Button>
            <Button variant="outline" onClick={exportTestFile} disabled={isCreating} className="gap-2">
              <Download className="h-4 w-4" /> Download Test File (.json)
            </Button>
            <Button onClick={handleCreateTest} disabled={isCreating} className="flex-1 glow-primary">
              {isCreating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
              ) : (
                <>Create Test ({extractedQuestions.length} Questions)</>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            The downloaded file works like pdf2cbt — anyone can import it on the Create Test page to recreate this test instantly with 0 AI.
          </p>
        </div>
      )}
      {/* PDF Page Viewer Dialog */}
      <Dialog open={showPageViewer} onOpenChange={setShowPageViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>PDF Pages</DialogTitle></DialogHeader>
          <ScrollArea className="h-[70vh]">
            <div className="space-y-4">
              {pdfPageImages.map((page) => (
                <div key={page.pageNumber} className="space-y-2">
                  <p className="text-sm font-medium">Page {page.pageNumber}</p>
                  <img src={page.imageDataUrl} alt={`Page ${page.pageNumber}`} className="w-full rounded-lg border border-border" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {/* Manual Crop Tool */}
      <PDFCropTool
        open={showCropTool}
        onOpenChange={setShowCropTool}
        pages={pdfPageImages}
        pdfBuffer={pdfBuffer || undefined}
        onCroppedQuestions={(crops) => {
          const toSubject = (s: string): Subject => {
            const canon = ['Physics', 'Chemistry', 'Maths'] as const;
            const found = canon.find(c => c.toLowerCase() === (s || '').toLowerCase().trim());
            return (found || 'Physics') as Subject;
          };
          if (extractedQuestions.length === 0) {
            const subjectCounts: Record<string, number> = {};
            const manualQuestions: Question[] = crops.map((crop, i) => {
              subjectCounts[crop.subject] = (subjectCounts[crop.subject] || 0) + 1;
              const isNumericalType = crop.qType === 'Numerical' || crop.qType === 'Integer';
              return {
                id: generateId(),
                questionNumber: i + 1,
                subject: toSubject(crop.subject),
                chapter: crop.section || crop.subject || 'General',
                question: crop.questionText || `Question ${i + 1} (see image)`,
                options: { A: '', B: '', C: '', D: '' },
                correctAnswer: crop.correctAnswer?.trim() || null,
                type: crop.qType === 'MSQ' ? 'MSQ' : isNumericalType ? 'Numerical' : 'MCQ',
                level: 'JEE',
                croppedImageUrl: crop.dataUrl,
                hasDiagram: true,
                pdfPageNumber: crop.pageNumber,
              } as Question;
            });
            setExtractedQuestions(manualQuestions);
            setExtractionStats({ totalExtracted: manualQuestions.length, subjectCounts });
            setStep('review');
            toast.success(`${crops.length} questions created from manual crops.`);
            return;
          }
          const targets = extractedQuestions
            .map((q, index) => ({ q, index }))
            .filter(({ q }) => q.hasDiagram || q.pdfPageNumber)
            .sort((a, b) => (a.q.pdfPageNumber || 999) - (b.q.pdfPageNumber || 999) || a.q.questionNumber - b.q.questionNumber);
          setExtractedQuestions(prev => prev.map((q) => {
            const targetIndex = targets.findIndex(t => t.q.id === q.id);
            const crop = targetIndex >= 0 ? crops[targetIndex] : undefined;
            return crop ? { ...q, croppedImageUrl: crop.dataUrl, hasDiagram: true, pdfPageNumber: crop.pageNumber, subject: toSubject(crop.subject) } : q;
          }));
          toast.success(`${crops.length} regions cropped and attached to questions.`);
        }}
      />
    </MainLayout>
  );
}
export default function CreateTest() {
  // No global password gate anymore — Manual crop, Auto-Crop and test-file import are
  // free to use. Only the AI (Lovable) extraction mode asks for the password inline.
  return <CreateTestInner />;
}
