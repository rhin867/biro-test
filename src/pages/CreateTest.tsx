import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { saveTest, generateId } from '@/lib/storage';
import { Test, Question, Subject } from '@/types/exam';
import { supabase } from '@/integrations/supabase/client';
import { renderPDFPagesToImages, fileToBase64, PDFPageImage } from '@/lib/pdf-cropper';
import { LatexRenderer } from '@/components/ui/latex-renderer';
import { Upload, FileText, Loader2, Sparkles, AlertCircle, CheckCircle, Image, ZoomIn, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserApiKey } from './Settings';

export default function CreateTest() {
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
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [useImageMode, setUseImageMode] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [showPageViewer, setShowPageViewer] = useState(false);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [questionsPerPage, setQuestionsPerPage] = useState(3);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsProcessing(true);
    toast.info('Processing PDF - extracting text and images...');
    setPdfFile(file);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      // Use unpkg CDN for better reliability
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      // Clone the buffer since pdfjs transfers ownership
      const bufferForText = arrayBuffer.slice(0);
      const bufferForImages = arrayBuffer.slice(0);
      setPdfArrayBuffer(arrayBuffer.slice(0));
      
      const pdf = await pdfjsLib.getDocument({ data: bufferForText }).promise;

      // Extract text
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `[Page ${i}]\n${pageText}\n\n`;
      }

      setPdfText(fullText);
      setTestName(file.name.replace('.pdf', ''));
      
      // Render PDF pages to images for diagram viewing
      toast.info('Rendering PDF pages for diagram support...');
      const pageImages = await renderPDFPagesToImages(bufferForImages, 1.5);
      setPdfPageImages(pageImages);
      
      toast.success(`PDF processed: ${pdf.numPages} pages extracted`);
      setStep('configure');
    } catch (error) {
      console.error('PDF processing error:', error);
      toast.error('Failed to process PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleManualTextInput = () => {
    if (!pdfText.trim()) {
      toast.error('Please enter some text');
      return;
    }
    setStep('configure');
  };

  const extractQuestions = useCallback(async () => {
    const userApiKey = getUserApiKey();
    if (!userApiKey) {
      toast.error('Please set your Gemini API key in Settings first!');
      return;
    }

    setIsProcessing(true);
    toast.info('Extracting questions with AI (this may take 30-40 seconds)...');

    try {
      // Always prefer image/vision mode for better extraction quality
      let requestBody: any;
      
      if (pdfFile) {
        toast.info('Sending PDF in vision mode for best extraction...');
        const base64Data = await fileToBase64(pdfFile);
        requestBody = {
          pdfBase64: base64Data,
          mimeType: 'application/pdf',
          userApiKey,
        };
      } else {
        requestBody = { pdfText, userApiKey };
      }

      // Auto-retry up to 2 times on client side
      let data: any = null;
      let lastErr: any = null;
      
      for (let clientRetry = 0; clientRetry < 2; clientRetry++) {
        if (clientRetry > 0) {
          toast.info(`Retrying extraction (attempt ${clientRetry + 1})...`);
          await new Promise(r => setTimeout(r, 3000));
        }
        
        const result = await supabase.functions.invoke('extract-questions', {
          body: requestBody,
        });

        if (result.error) {
          lastErr = result.error;
          console.error(`Client retry ${clientRetry} error:`, result.error);
          continue;
        }

        if (result.data?.error) {
          if (result.data.retryable) {
            lastErr = new Error(result.data.error);
            continue;
          }
          throw new Error(result.data.error);
        }
        
        data = result.data;
        break;
      }
      
      if (!data) {
        throw lastErr || new Error('Extraction failed after retries. Please try again.');
      }

      const questions: Question[] = (data.questions || []).map((q: any, index: number) => ({
        id: generateId(),
        questionNumber: q.questionNumber || index + 1,
        subject: q.subject || 'Physics',
        chapter: q.chapter || 'General',
        question: q.question || '',
        options: {
          A: q.options?.A || '',
          B: q.options?.B || '',
          C: q.options?.C || '',
          D: q.options?.D || '',
        },
        correctAnswer: q.correctAnswer || null,
        type: q.type || 'MCQ',
        level: 'JEE',
        hasDiagram: q.hasDiagram || false,
        pdfPageNumber: q.pdfPageNumber || null,
      }));

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
      toast.success(`Extracted ${questions.length} questions from PDF`);
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('AI extraction failed. Try enabling "Image Mode" for complex PDFs.');
    } finally {
      setIsProcessing(false);
    }
  }, [pdfText, useImageMode, pdfFile]);

  const handleCreateTest = () => {
    if (extractedQuestions.length === 0) {
      toast.error('No questions to create test');
      return;
    }

    const subjects: Subject[] = [...new Set(extractedQuestions.map((q) => q.subject))];

    // Check if any questions have answer keys
    const hasAnswerKey = extractedQuestions.some(q => q.correctAnswer);

    const test: Test = {
      id: generateId(),
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
      pdfPageImages: pdfPageImages, // Store PDF pages for diagram viewing
    };

    saveTest(test);
    toast.success('Test created successfully!');
    navigate(`/tests`);
  };

  const diagramQuestionCount = extractedQuestions.filter(q => q.hasDiagram).length;

  return (
    <MainLayout>
      <PageHeader
        title="Create Test"
        description="Upload a PDF or enter questions manually to create a new test"
      />

      {/* Progress Steps */}
      <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-8 overflow-x-auto pb-2">
        {['upload', 'configure', 'review'].map((s, i) => (
          <div key={s} className="flex items-center flex-shrink-0">
            <div
              className={cn(
                'flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full text-xs md:text-sm font-medium transition-all',
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : i < ['upload', 'configure', 'review'].indexOf(step)
                  ? 'bg-correct text-correct-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                'ml-1.5 md:ml-2 text-xs md:text-sm',
                step === s ? 'font-medium' : 'text-muted-foreground'
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 2 && <div className="w-6 md:w-12 h-0.5 bg-border mx-2 md:mx-4" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* PDF Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Upload className="h-5 w-5 text-primary" />
                Upload PDF
              </CardTitle>
              <CardDescription>Upload a JEE-style question paper PDF</CardDescription>
            </CardHeader>
            <CardContent>
              <label
                htmlFor="pdf-upload"
                className={cn(
                  'flex flex-col items-center justify-center h-40 md:h-48 border-2 border-dashed rounded-lg cursor-pointer transition-all',
                  isProcessing
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                )}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 md:h-10 w-8 md:w-10 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Processing PDF...</p>
                  </div>
                ) : (
                  <>
                    <FileText className="h-8 md:h-10 w-8 md:w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Click to upload PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports unlimited pages</p>
                  </>
                )}
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>
            </CardContent>
          </Card>

          {/* Manual Input */}
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
                placeholder="Paste your questions here...&#10;&#10;Example format:&#10;1. What is the SI unit of force?&#10;(A) Newton&#10;(B) Joule&#10;(C) Watt&#10;(D) Pascal"
                value={pdfText}
                onChange={(e) => setPdfText(e.target.value)}
                className="min-h-[120px] md:min-h-[150px]"
              />
              <Button
                onClick={handleManualTextInput}
                variant="outline"
                className="w-full"
                disabled={!pdfText.trim()}
              >
                Use This Text
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'configure' && (
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Configure Test</CardTitle>
            <CardDescription>Set test parameters before extraction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testName">Test Name</Label>
              <Input
                id="testName"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g., JEE Main 2024 Paper 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={1}
                max={300}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="positiveMarking">Correct (+)</Label>
                <Input
                  id="positiveMarking"
                  type="number"
                  value={positiveMarking}
                  onChange={(e) => setPositiveMarking(Number(e.target.value))}
                  min={1}
                  max={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="negativeMarking">Wrong (-)</Label>
                <Input
                  id="negativeMarking"
                  type="number"
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(Number(e.target.value))}
                  min={0}
                  max={10}
                />
              </div>
            </div>
            
            {/* Image Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="space-y-0.5">
                <Label htmlFor="imageMode" className="text-sm font-medium">Image Mode (Vision)</Label>
                <p className="text-xs text-muted-foreground">Better for PDFs with diagrams/circuits</p>
              </div>
              <Switch
                id="imageMode"
                checked={useImageMode}
                onCheckedChange={setUseImageMode}
              />
            </div>
            
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm">
                AI will extract questions with LaTeX math, detect diagrams, and identify subjects
              </p>
            </div>
            
            {/* PDF Page Preview */}
            {pdfPageImages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">PDF Preview ({pdfPageImages.length} pages)</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowPageViewer(true)}
                  >
                    <ZoomIn className="h-4 w-4 mr-1" />
                    View Pages
                  </Button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {pdfPageImages.slice(0, 4).map((page) => (
                    <img
                      key={page.pageNumber}
                      src={page.imageDataUrl}
                      alt={`Page ${page.pageNumber}`}
                      className="h-20 w-auto rounded border border-border cursor-pointer hover:ring-2 hover:ring-primary"
                      onClick={() => {
                        setSelectedPage(page.pageNumber);
                        setShowPageViewer(true);
                      }}
                    />
                  ))}
                  {pdfPageImages.length > 4 && (
                    <div 
                      className="h-20 w-16 flex items-center justify-center rounded border border-border bg-muted cursor-pointer hover:bg-accent"
                      onClick={() => setShowPageViewer(true)}
                    >
                      <span className="text-xs text-muted-foreground">+{pdfPageImages.length - 4}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={extractQuestions} disabled={isProcessing} className="flex-1">
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Extract Questions
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'review' && (
        <div className="space-y-4 md:space-y-6">
          {/* Extraction Stats */}
          {extractionStats && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-correct/10 border border-correct/20">
                <CheckCircle className="h-4 w-4 text-correct" />
                <span className="text-sm font-medium">{extractionStats.totalExtracted} Questions Extracted</span>
              </div>
              {diagramQuestionCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-review/10 border border-review/20">
                  <Image className="h-4 w-4 text-review" />
                  <span className="text-sm font-medium">{diagramQuestionCount} with Diagrams</span>
                </div>
              )}
              {Object.entries(extractionStats.subjectCounts).map(([subject, count]) => (
                <div
                  key={subject}
                  className={cn('px-3 py-2 rounded-lg text-sm', `badge-${subject.toLowerCase()}`)}
                >
                  {subject}: {count as number}
                </div>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Review Extracted Questions</CardTitle>
              <CardDescription>
                {extractedQuestions.length} questions extracted • Verify before creating test
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4 max-h-[350px] md:max-h-[400px] overflow-y-auto pr-2">
                {extractedQuestions.map((q, index) => (
                  <div key={q.id} className="p-3 md:p-4 rounded-lg border border-border bg-card/50">
                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-xs font-medium text-primary">
                          {index + 1}
                        </span>
                        <span className={`badge-${q.subject.toLowerCase()} px-2 py-0.5 rounded text-xs`}>
                          {q.subject}
                        </span>
                        <span className="text-xs text-muted-foreground">{q.chapter}</span>
                        {q.hasDiagram && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-review/10 text-review border border-review/20">
                            <Image className="h-3 w-3" />
                            Diagram
                          </span>
                        )}
                      </div>
                       {q.correctAnswer && (
                        <span className="text-xs text-muted-foreground italic">✓ Has Answer Key</span>
                      )}
                    </div>
                    <div className="text-sm mb-2 line-clamp-3">
                      <LatexRenderer content={q.question} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {Object.entries(q.options).map(([key, value]) => (
                        <div
                          key={key}
                          className="p-1.5 rounded"
                        >
                          ({key}) {value ? <LatexRenderer content={value} /> : <span className="italic">Empty</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Answer Key Detected Banner */}
          {extractedQuestions.some(q => q.correctAnswer) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-correct/10 border border-correct/20">
              <CheckCircle className="h-5 w-5 text-correct flex-shrink-0" />
              <p className="text-sm text-correct">
                ✅ Answer key detected from PDF! You won't need to enter answers after the test.
              </p>
            </div>
          )}

          {!extractedQuestions.some(q => q.correctAnswer) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-review/10 border border-review/20">
              <AlertCircle className="h-5 w-5 text-review flex-shrink-0" />
              <p className="text-sm text-review">
                No answer key detected. You can upload an answer key PDF/image after submitting the test.
              </p>
            </div>
          )}

          {extractedQuestions.some((q) => !q.options.A || !q.options.B) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-review/10 border border-review/20">
              <AlertCircle className="h-5 w-5 text-review flex-shrink-0" />
              <p className="text-sm text-review">
                Some questions have missing options. You may want to edit them after creation.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('configure')}>
              Back
            </Button>
            <Button onClick={handleCreateTest} className="flex-1 glow-primary">
              Create Test ({extractedQuestions.length} Questions)
            </Button>
          </div>
        </div>
      )}

      {/* PDF Page Viewer Dialog */}
      <Dialog open={showPageViewer} onOpenChange={setShowPageViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>PDF Pages</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            <div className="space-y-4">
              {pdfPageImages.map((page) => (
                <div key={page.pageNumber} className="space-y-2">
                  <p className="text-sm font-medium">Page {page.pageNumber}</p>
                  <img
                    src={page.imageDataUrl}
                    alt={`Page ${page.pageNumber}`}
                    className="w-full rounded-lg border border-border"
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
