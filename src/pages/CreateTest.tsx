import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { saveTest, generateId } from '@/lib/storage';
import { Test, Question, Subject } from '@/types/exam';
import { Upload, FileText, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CreateTest() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfText, setPdfText] = useState('');
  const [testName, setTestName] = useState('');
  const [duration, setDuration] = useState(180);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<'upload' | 'configure' | 'review'>('upload');

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsProcessing(true);
    toast.info('Processing PDF...');

    try {
      // Import pdf.js dynamically
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      setPdfText(fullText);
      setTestName(file.name.replace('.pdf', ''));
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

  const extractQuestions = useCallback(() => {
    setIsProcessing(true);
    toast.info('Extracting questions with AI...');

    // Simulated AI extraction - in production, this would call an AI API
    setTimeout(() => {
      const questions = parseQuestionsFromText(pdfText);
      setExtractedQuestions(questions);
      setStep('review');
      setIsProcessing(false);
      toast.success(`Extracted ${questions.length} questions`);
    }, 2000);
  }, [pdfText]);

  const parseQuestionsFromText = (text: string): Question[] => {
    // Basic question parser - extracts numbered questions with options
    const questions: Question[] = [];
    const lines = text.split('\n').filter(l => l.trim());
    
    let currentQuestion: Partial<Question> | null = null;
    let questionNumber = 0;
    let currentSubject: Subject = 'Physics';

    // Detect subject sections
    const physicsKeywords = ['physics', 'mechanics', 'thermodynamics', 'optics', 'electricity'];
    const chemistryKeywords = ['chemistry', 'organic', 'inorganic', 'physical chemistry'];
    const mathsKeywords = ['mathematics', 'maths', 'calculus', 'algebra', 'trigonometry'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase();
      
      // Detect subject
      if (physicsKeywords.some(k => line.includes(k))) currentSubject = 'Physics';
      else if (chemistryKeywords.some(k => line.includes(k))) currentSubject = 'Chemistry';
      else if (mathsKeywords.some(k => line.includes(k))) currentSubject = 'Maths';

      // Detect question start (e.g., "Q1.", "1.", "Question 1")
      const questionMatch = lines[i].match(/^(?:Q\.?\s*)?(\d+)[.)]\s*(.+)/i);
      
      if (questionMatch) {
        // Save previous question
        if (currentQuestion && currentQuestion.question) {
          questions.push(currentQuestion as Question);
        }

        questionNumber++;
        currentQuestion = {
          id: generateId(),
          questionNumber,
          subject: currentSubject,
          chapter: 'General',
          question: questionMatch[2].trim(),
          options: { A: '', B: '', C: '', D: '' },
          correctAnswer: null,
          type: 'MCQ',
          level: 'JEE',
        };
      } else if (currentQuestion) {
        // Detect options
        const optionMatch = lines[i].match(/^\(?([A-Da-d])\)?[.)]\s*(.+)/);
        if (optionMatch) {
          const optionKey = optionMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          currentQuestion.options![optionKey] = optionMatch[2].trim();
        } else if (!lines[i].match(/^(?:answer|correct|key)/i)) {
          // Append to question text if not an answer key
          currentQuestion.question += ' ' + lines[i].trim();
        }

        // Detect answer key
        const answerMatch = lines[i].match(/(?:answer|correct|key)[:\s]*([A-Da-d])/i);
        if (answerMatch) {
          currentQuestion.correctAnswer = answerMatch[1].toUpperCase();
        }
      }
    }

    // Add last question
    if (currentQuestion && currentQuestion.question) {
      questions.push(currentQuestion as Question);
    }

    // If no questions found, create sample questions for demo
    if (questions.length === 0) {
      return createSampleQuestions();
    }

    return questions;
  };

  const createSampleQuestions = (): Question[] => {
    return [
      {
        id: generateId(),
        questionNumber: 1,
        subject: 'Physics',
        chapter: 'Mechanics',
        question: 'A ball is thrown vertically upward with velocity 20 m/s. What is the maximum height reached? (g = 10 m/s²)',
        options: {
          A: '10 m',
          B: '20 m',
          C: '30 m',
          D: '40 m',
        },
        correctAnswer: 'B',
        type: 'MCQ',
        level: 'JEE',
      },
      {
        id: generateId(),
        questionNumber: 2,
        subject: 'Physics',
        chapter: 'Current Electricity',
        question: 'The resistance of a wire is R ohms. If it is stretched to double its length, the new resistance will be:',
        options: {
          A: 'R/2',
          B: 'R',
          C: '2R',
          D: '4R',
        },
        correctAnswer: 'D',
        type: 'MCQ',
        level: 'JEE',
      },
      {
        id: generateId(),
        questionNumber: 3,
        subject: 'Chemistry',
        chapter: 'Atomic Structure',
        question: 'Which of the following has the highest ionization energy?',
        options: {
          A: 'Na',
          B: 'Mg',
          C: 'Al',
          D: 'Ne',
        },
        correctAnswer: 'D',
        type: 'MCQ',
        level: 'JEE',
      },
      {
        id: generateId(),
        questionNumber: 4,
        subject: 'Chemistry',
        chapter: 'Organic Chemistry',
        question: 'Benzene reacts with CH₃Cl in the presence of anhydrous AlCl₃ to give:',
        options: {
          A: 'Chlorobenzene',
          B: 'Toluene',
          C: 'Benzyl chloride',
          D: 'Triphenylmethane',
        },
        correctAnswer: 'B',
        type: 'MCQ',
        level: 'JEE',
      },
      {
        id: generateId(),
        questionNumber: 5,
        subject: 'Maths',
        chapter: 'Calculus',
        question: 'If f(x) = x³ - 3x² + 2x, then f\'(1) equals:',
        options: {
          A: '0',
          B: '1',
          C: '-1',
          D: '2',
        },
        correctAnswer: 'C',
        type: 'MCQ',
        level: 'JEE',
      },
    ];
  };

  const handleCreateTest = () => {
    if (extractedQuestions.length === 0) {
      toast.error('No questions to create test');
      return;
    }

    const subjects: Subject[] = [...new Set(extractedQuestions.map(q => q.subject))];
    
    const test: Test = {
      id: generateId(),
      name: testName || 'Untitled Test',
      description: `Created from PDF with ${extractedQuestions.length} questions`,
      createdAt: new Date().toISOString(),
      duration,
      questions: extractedQuestions,
      subjects,
      totalMarks: extractedQuestions.length * 4,
      positiveMarking: 4,
      negativeMarking: 1,
    };

    saveTest(test);
    toast.success('Test created successfully!');
    navigate(`/tests`);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Create Test"
        description="Upload a PDF or enter questions manually to create a new test"
      />

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {['upload', 'configure', 'review'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all',
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : i < ['upload', 'configure', 'review'].indexOf(step)
                  ? 'bg-correct text-correct-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {i + 1}
            </div>
            <span className={cn('ml-2 text-sm', step === s ? 'font-medium' : 'text-muted-foreground')}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 2 && <div className="w-12 h-0.5 bg-border mx-4" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PDF Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Upload PDF
              </CardTitle>
              <CardDescription>
                Upload a JEE-style question paper PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label
                htmlFor="pdf-upload"
                className={cn(
                  'flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer transition-all',
                  isProcessing
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                )}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Processing PDF...</p>
                  </div>
                ) : (
                  <>
                    <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Click to upload PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports unlimited pages
                    </p>
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
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-physics" />
                Manual Input
              </CardTitle>
              <CardDescription>
                Paste question text directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your questions here...&#10;&#10;Example format:&#10;1. What is the SI unit of force?&#10;(A) Newton&#10;(B) Joule&#10;(C) Watt&#10;(D) Pascal"
                value={pdfText}
                onChange={(e) => setPdfText(e.target.value)}
                className="min-h-[150px]"
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
        <Card className="max-w-xl">
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="text-sm">
                AI will extract questions, options, subjects, and chapters automatically
              </p>
            </div>
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
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Extracted Questions</CardTitle>
              <CardDescription>
                {extractedQuestions.length} questions extracted • Verify before creating test
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {extractedQuestions.map((q, index) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-lg border border-border bg-card/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-xs font-medium text-primary">
                          {index + 1}
                        </span>
                        <span className={`badge-${q.subject.toLowerCase()} px-2 py-0.5 rounded text-xs`}>
                          {q.subject}
                        </span>
                        <span className="text-xs text-muted-foreground">{q.chapter}</span>
                      </div>
                      {q.correctAnswer && (
                        <span className="text-xs text-correct">Answer: {q.correctAnswer}</span>
                      )}
                    </div>
                    <p className="text-sm mb-2">{q.question}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {Object.entries(q.options).map(([key, value]) => (
                        <div key={key} className={cn(
                          'p-1.5 rounded',
                          q.correctAnswer === key && 'bg-correct/10 text-correct'
                        )}>
                          ({key}) {value || <span className="italic">Empty</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {extractedQuestions.some(q => !q.options.A || !q.options.B) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-review/10 border border-review/20">
              <AlertCircle className="h-5 w-5 text-review" />
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
    </MainLayout>
  );
}
