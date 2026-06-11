import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { saveTest, generateId, saveTestPdfPageImages } from '@/lib/storage';
import { Test, Question, Subject } from '@/types/exam';
import { supabase } from '@/integrations/supabase/client';
import { renderPDFPagesToImages, fileToBase64, PDFPageImage } from '@/lib/pdf-cropper';
import { LatexRenderer } from '@/components/ui/latex-renderer';
import { PDFCropTool } from '@/components/exam/PDFCropTool';
import { Upload, FileText, Loader2, Sparkles, AlertCircle, CheckCircle, Image, ZoomIn, Crop, RefreshCw, Share2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TestCreationGate } from '@/components/exam/TestCreationGate';
import { fetchQuotaInfo, logTestCreation, QuotaInfo } from '@/lib/app-settings';
function CreateTestInner() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
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
  const [showPageViewer, setShowPageViewer] = useState(false);
  const [showCropTool, setShowCropTool] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [extractionTime, setExtractionTime] = useState(0);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  React.useEffect(() => { fetchQuotaInfo().then(setQuota); }, []);
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    setIsProcessing(true);
    toast.info('Processing PDF...');
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
      const uint8Array = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data: bufferForText }).promise;
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
      setTestName(file.name.replace('.pdf', ''));
      toast.info('Rendering pages for preview & cropping...');
      const pageImages = await renderPDFPagesToImages(bufferForImages, 1.5);
      const pageImages = await renderPDFPagesToImages(arrayBuffer, 1.5);
      setPdfPageImages(pageImages);
      toast.success(`PDF processed: ${pdf.numPages} pages`);
        };
      });
      // Deduct quota immediately after successful extraction
      try {
        await logTestCreation({ testId: 'extracted-draft', testName: data.examTitle || 'PDF Extraction', aiCalls: 1 });
      } catch (e) {
        console.error('Failed to log quota usage', e);
      }
      setExtractedQuestions(questions);
      setExtractionStats({
        totalExtracted: data.totalExtracted || questions.length,
        subjectCounts: data.subjectCounts || {},
        examTitle: data.examTitle,
      });
      if (data.examTitle && data.examTitle !== 'Extracted Test') {
        setTestName(data.examTitle);
      }
      setStep('review');
      toast.success(`Extracted ${questions.length} questions in ${elapsed}s`);
    } catch (error: any) {
      console.error('Extraction error:', error);
      setExtractionFailed(true);
      toast.error(error.message || 'Extraction failed. Click Retry or use Crop Tool.');
    } finally {
      setIsProcessing(false);
    }
  }, [pdfText, pdfFile]);
  const handleCreateTest = async () => {
    if (extractedQuestions.length === 0) {
      toast.error('No questions to create test');
      return;
    }
    // Server-side quota check
    try {
      const quota = await fetchQuotaInfo();
      if (quota.exceeded) {
        toast.error(
          `Quota reached: ${quota.dailyUsed}/${quota.dailyLimit} today, ${quota.monthlyUsed}/${quota.monthlyLimit} this month. Try again later.`
        );
        return;
      }
      const subjects: Subject[] = [...new Set(extractedQuestions.map((q) => q.subject))];
      const hasAnswerKey = extractedQuestions.some(q => q.correctAnswer);
      const testId = generateId();
      const test: Test = {
        id: testId,
        name: testName || 'Untitled Test',
        description: `Created from PDF with ${extractedQuestions.length} questions`,
        createdAt: new Date().toISOString(),
        duration,
        questions: extractedQuestions,
        subjects,
        totalMarks: extractedQuestions.length * positiveMarking,
        positiveMarking,
        negativeMarking,
        hasAnswerKey,
        // Do NOT embed PDF page images in the test — they blow past the 5 MB localStorage limit
        // and silently break saveTest, making the test never appear in My Tests.
        pdfPageImages: undefined,
      };
      try {
        saveTest(test);
        await saveTestPdfPageImages(test.id, pdfPageImages);
      } catch (e) {
        console.error('saveTest failed', e);
        toast.error('Could not save test locally (storage full). Try clearing old tests.');
        return;
      }
      await logTestCreation({ testId: test.id, testName: test.name, aiCalls: 1 });
      }
      toast.success(
        `Test saved! Remaining today: ${Math.max(0, quota.dailyRemaining - 1)}/${quota.dailyLimit}`
      );
      // Quota already logged during extraction
      toast.success('Test saved successfully!');
      navigate(`/tests`);
    } catch (e: any) {
      console.error(e);
                      </div>
                      {q.correctAnswer && <span className="text-xs text-muted-foreground italic">✓ Answer: {q.correctAnswer}</span>}
                    </div>
                    <div className="text-sm mb-2 line-clamp-3">
                      <LatexRenderer content={q.question} />
                    </div>
                      <div className="text-sm mb-2 line-clamp-3">
                        <LatexRenderer content={q.question} />
                      </div>
                      <div className="mt-2 mb-2">
                        {q.croppedImageUrl ? (
                          <img src={q.croppedImageUrl} className="max-h-32 object-contain rounded border border-border" />
                        ) : q.hasDiagram && q.pdfPageNumber && pdfPageImages.find(p => p.pageNumber === q.pdfPageNumber) ? (
                          <div className="p-2 rounded bg-muted/50 border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Uncropped diagram from Page {q.pdfPageNumber}:</p>
                            <img src={pdfPageImages.find(p => p.pageNumber === q.pdfPageNumber)!.imageDataUrl} className="max-h-24 object-contain rounded opacity-80" />
                          </div>
                        ) : null}
                      </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {Object.entries(q.options).map(([key, value]) => (
                        <div key={key} className="p-1.5 rounded">
      />
    </MainLayout>
  );
}
export default function CreateTest() {
  return (
    <TestCreationGate>
      <CreateTestInner />
    </TestCreationGate>
  );
}
