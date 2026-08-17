import React, { useState, useCallback, useRef } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileUp, Loader2, Plus, Trash2, LayoutGrid, List, 
  Settings2, AlertCircle, CheckCircle2, Info, X
} from 'lucide-react';
import { toast } from 'sonner';
import { renderPDFPagesMetadata, renderSinglePage } from '@/lib/pdf-cropper';
import { saveTest, saveTestPdfFile, generateId } from '@/lib/storage';
import { LazyPDFPage } from '@/components/exam/LazyPDFPage';
import { PDFCropTool } from '@/components/exam/PDFCropTool';
import { Test, Question } from '@/types/exam';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

export default function CreateTest() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metadata, setMetadata] = useState<any[]>([]);
  const [pageImages, setPageImages] = useState<{ pageNumber: number; imageDataUrl: string; width: number; height: number }[]>([]);
  const [showCropTool, setShowCropTool] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [testConfig, setTestConfig] = useState({
    name: '',
    duration: 180,
    totalMarks: 300,
    subjects: ['Physics', 'Chemistry', 'Mathematics']
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('File too large (max 50MB)');
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setProgress(10);
    
    try {
      const meta = await renderPDFPagesMetadata(selectedFile);
      setMetadata(meta);
      setProgress(50);
      
      // Load first 15 pages for "immediate" preview feel
      const firstPages = [];
      const loadCount = Math.min(15, meta.length); 
      
      // Load in small concurrent batches for speed without crashing
      const batchSize = 3;
      for (let i = 0; i < loadCount; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && (i + j) < loadCount; j++) {
          const pageNum = i + j + 1;
          batch.push(
            renderSinglePage(selectedFile, pageNum, 1.2, 'image/jpeg', 0.6)
              .then(url => ({
                pageNumber: pageNum,
                imageDataUrl: url,
                width: meta[pageNum - 1].width,
                height: meta[pageNum - 1].height
              }))
          );
        }
        const results = await Promise.all(batch);
        firstPages.push(...results);
        setProgress(50 + ((i + batchSize) / loadCount) * 50);
        
        // Update state as we go for perceived speed
        setPageImages([...firstPages]);
      }
      setProgress(100);
      toast.success(`Loaded ${meta.length} pages`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to process PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCrops = (crops: Record<string, string>) => {
    const newQuestions: Question[] = Object.entries(crops).map(([id, dataUrl], idx) => ({
      id,
      questionNumber: extractedQuestions.length + idx + 1,
      subject: 'General',
      chapter: 'General',
      question: `Question ${extractedQuestions.length + idx + 1}`,
      options: { A: 'A', B: 'B', C: 'C', D: 'D' },
      correctAnswer: null,
      type: 'MCQ',
      level: 'Medium',
      hasDiagram: true,
      croppedImageUrl: dataUrl
    }));

    setExtractedQuestions(prev => [...prev, ...newQuestions]);
    setShowCropTool(false);
  };

  const handleCreateTest = async () => {
    if (!testConfig.name.trim()) {
      toast.error('Please enter a test name');
      return;
    }

    if (extractedQuestions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    setLoading(true);
    try {
      const testId = generateId();
      
      // Save images to binary store and replace with local identifiers for JSON test data
      const questionImages: Record<string, string> = {};
      const processedQuestions = extractedQuestions.map(q => {
        if (q.croppedImageUrl) {
          questionImages[q.id] = q.croppedImageUrl;
          // Keep base64 in the object for now if it's small, 
          // or we can remove it to keep localStorage light.
          // For now, let's keep it but ensure saveTestQuestionImages handles it.
        }
        return q;
      });

      const newTest: Test = {
        id: testId,
        name: testConfig.name,
        createdAt: new Date().toISOString(),
        duration: testConfig.duration,
        totalMarks: testConfig.totalMarks,
        questions: processedQuestions,
        subjects: testConfig.subjects,
        positiveMarking: 4,
        negativeMarking: -1,
        hasAnswerKey: false
      };

      if (file) {
        await saveTestPdfFile(testId, file);
      }
      
      const { saveTestQuestionImages } = await import('@/lib/storage');
      await saveTestQuestionImages(testId, questionImages);
      saveTest(newTest);
      toast.success('Test created successfully!');
      navigate('/tests');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save test');
    } finally {
      setLoading(false);
    }
  };

  if (showCropTool && file) {
    return (
      <PDFCropTool 
        pdfFile={file}
        pageImages={pageImages}
        onSaveCrops={handleSaveCrops}
        onCancel={() => setShowCropTool(false)}
      />
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        <PageHeader 
          title="Create New Test" 
          description="Convert your PDF into a CBT exam format."
        />

        {!file ? (
          <Card className="border-dashed border-2 py-20">
            <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <FileUp className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Upload Exam PDF</h3>
                <p className="text-muted-foreground max-w-sm">
                  We'll extract questions and diagrams directly from your PDF file.
                </p>
              </div>
              <Label 
                htmlFor="pdf-upload" 
                className="cursor-pointer bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="h-5 w-5" /> Select PDF
              </Label>
              <Input 
                id="pdf-upload" 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Question Preview */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Extracted Questions</CardTitle>
                    <CardDescription>{extractedQuestions.length} questions ready</CardDescription>
                  </div>
                  <Button onClick={() => setShowCropTool(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Questions
                  </Button>
                </CardHeader>
                <CardContent>
                  {extractedQuestions.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground border rounded-lg border-dashed">
                      <LayoutGrid className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Use the crop tool to select questions from the PDF.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {extractedQuestions.map((q, idx) => (
                        <div key={q.id} className="relative border rounded-lg overflow-hidden group">
                          <img src={q.croppedImageUrl} alt={`Q${idx+1}`} className="w-full h-32 object-contain bg-muted" />
                          <div className="p-2 flex items-center justify-between bg-background border-t">
                            <span className="font-medium text-sm">Question {idx + 1}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => setExtractedQuestions(prev => prev.filter(item => item.id !== q.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PDF Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>PDF Preview</CardTitle>
                  <CardDescription>{metadata.length} pages total</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {metadata.slice(0, 12).map((p) => (
                      <LazyPDFPage 
                        key={p.pageNumber}
                        pdfFile={file}
                        pageNumber={p.pageNumber}
                        className="w-full"
                      />
                    ))}
                  </div>
                  {metadata.length > 12 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      And {metadata.length - 12} more pages...
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Test Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Test Name</Label>
                    <Input 
                      placeholder="e.g. JEE Main Mock 1" 
                      value={testConfig.name}
                      onChange={e => setTestConfig(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (Min)</Label>
                      <Input 
                        type="number" 
                        value={testConfig.duration}
                        onChange={e => setTestConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Marks</Label>
                      <Input 
                        type="number" 
                        value={testConfig.totalMarks}
                        onChange={e => setTestConfig(prev => ({ ...prev, totalMarks: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Subjects</Label>
                    <div className="flex flex-wrap gap-2">
                      {testConfig.subjects.map(s => (
                        <div key={s} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded flex items-center gap-1">
                          {s}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setTestConfig(prev => ({ ...prev, subjects: prev.subjects.filter(item => item !== s) }))} />
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 text-[10px]"
                        onClick={() => {
                          const s = prompt('Enter subject name:');
                          if (s) setTestConfig(prev => ({ ...prev, subjects: [...prev.subjects, s] }));
                        }}
                      >
                        + Add
                      </Button>
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-6" 
                    onClick={handleCreateTest}
                    disabled={loading || extractedQuestions.length === 0}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Finish & Create Test
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {loading && !showCropTool && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center">
            <Card className="w-full max-w-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <h3 className="font-bold">Processing PDF...</h3>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  This might take a moment depending on the PDF size.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

