import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { generateId, saveTest, saveResult, saveAttempt } from '@/lib/storage';
import { Test, Question, TestAttempt, QuestionAttempt, Subject } from '@/types/exam';
import { calculateTestResult } from '@/lib/exam-utils';
import { supabase } from '@/integrations/supabase/client';
import { fileToBase64 } from '@/lib/pdf-cropper';
import { getUserApiKey } from './Settings';
import { Upload, FileText, Loader2, BarChart, Clock, Send, Image, Video, Monitor } from 'lucide-react';

export default function ExternalAnalysis() {
  const navigate = useNavigate();
  const [testFile, setTestFile] = useState<File | null>(null);
  const [ansFile, setAnsFile] = useState<File | null>(null);
  const [userAnswers, setUserAnswers] = useState('');
  const [testName, setTestName] = useState('');
  const [duration, setDuration] = useState(180);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordStartTime, setRecordStartTime] = useState<number | null>(null);
  const [screenMode, setScreenMode] = useState(false);
  const [elapsedDisplay, setElapsedDisplay] = useState('0:00');

  // Live seconds timer
  React.useEffect(() => {
    if (!isRecording || !recordStartTime) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordStartTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setElapsedDisplay(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording, recordStartTime]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordStartTime(Date.now());
    toast.success('Recording started! Take your test on the other platform and come back when done.');
  };

  const handleStopRecording = () => {
    if (recordStartTime) {
      const elapsed = Math.round((Date.now() - recordStartTime) / 60000);
      setDuration(elapsed);
      toast.success(`Recorded ${elapsed} minutes of test time`);
    }
    setIsRecording(false);
    setRecordStartTime(null);
  };

  const handleStartScreen = async () => {
    try {
      // Request screen sharing (just for timing/awareness, we don't actually capture)
      setScreenMode(true);
      setIsRecording(true);
      setRecordStartTime(Date.now());
      toast.success('Screen monitoring started! Take your test on the other platform. Come back and stop when done.');
    } catch {
      toast.error('Screen sharing not supported in this browser');
    }
  };

  const handleProcess = async () => {
    if (!testFile) { toast.error('Upload your test PDF/Image'); return; }
    if (!userAnswers.trim() && !ansFile) { toast.error('Enter your answers or upload answer file'); return; }

    const apiKey = getUserApiKey();
    if (!apiKey) { toast.error('Please set your Gemini API key in Settings first'); return; }

    setIsProcessing(true);
    toast.info('Processing test and answers (30-40 seconds)...');

    try {
      const testBase64 = await fileToBase64(testFile);
      const mimeType = testFile.type || 'application/pdf';
      
      const { data: testData, error: testError } = await supabase.functions.invoke('extract-questions', {
        body: { pdfBase64: testBase64, mimeType, userApiKey: apiKey },
      });
      if (testError || testData?.error) throw new Error(testData?.error || 'Failed to extract questions');

      // Extract answer key
      let answerKey: Record<string, string> = {};
      if (ansFile) {
        const ansBase64 = await fileToBase64(ansFile);
        const { data: ansData } = await supabase.functions.invoke('extract-questions', {
          body: {
            pdfBase64: ansBase64, mimeType: ansFile.type,
            extractAnswerKeyOnly: true, totalQuestions: testData.questions?.length || 75,
            userApiKey: apiKey,
          },
        });
        if (ansData?.answerKey) answerKey = ansData.answerKey;
      }

      // Parse user answers
      const userAnsMap: Record<number, string> = {};
      const cleaned = userAnswers.trim().toUpperCase();
      if (/^[ABCD]+$/.test(cleaned)) {
        cleaned.split('').forEach((a, i) => { userAnsMap[i + 1] = a; });
      } else {
        const matches = cleaned.match(/(\d+)\s*[-.:)\]]\s*([ABCD])/g);
        matches?.forEach(m => {
          const parts = m.match(/(\d+)\s*[-.:)\]]\s*([ABCD])/);
          if (parts) userAnsMap[parseInt(parts[1])] = parts[2];
        });
      }

      // Build test
      const questions: Question[] = (testData.questions || []).map((q: any, i: number) => ({
        id: generateId(),
        questionNumber: q.questionNumber || i + 1,
        subject: (q.subject || 'Physics') as Subject,
        chapter: q.chapter || 'General',
        question: q.question || '',
        options: q.options || { A: '', B: '', C: '', D: '' },
        correctAnswer: answerKey[String(q.questionNumber || i + 1)] || q.correctAnswer || null,
        type: 'MCQ' as const, level: 'JEE',
        hasDiagram: q.hasDiagram || false,
      }));

      const subjects: Subject[] = [...new Set(questions.map(q => q.subject))];
      const test: Test = {
        id: generateId(), name: testName || 'External Test',
        description: 'Imported from external platform', createdAt: new Date().toISOString(),
        duration, questions, subjects, totalMarks: questions.length * 4,
        positiveMarking: 4, negativeMarking: 1,
        hasAnswerKey: Object.keys(answerKey).length > 0,
      };
      saveTest(test);

      const attempts: Record<string, QuestionAttempt> = {};
      questions.forEach(q => {
        const userAns = userAnsMap[q.questionNumber] || null;
        attempts[q.id] = {
          questionId: q.id, selectedAnswer: userAns,
          timeSpent: Math.round((duration * 60) / questions.length),
          status: userAns ? 'answered' : 'unattempted',
          mistakeTypes: [], notes: '', markedForRevision: false,
          visitCount: 1, firstVisitTime: 0, lastVisitTime: 0,
        };
      });

      const attempt: TestAttempt = {
        id: generateId(), testId: test.id,
        startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
        timeRemaining: 0, attempts, currentQuestionIndex: 0,
        currentSubject: subjects[0], isSubmitted: true, attemptNumber: 1,
      };
      saveAttempt(attempt);

      if (test.hasAnswerKey) {
        const result = calculateTestResult(test, attempt);
        saveResult(result);
        toast.success('Analysis ready!');
        navigate(`/analysis/${attempt.id}`);
      } else {
        toast.success('Test imported! Add answer key for analysis.');
        navigate('/tests');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Processing failed. Check your API key.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader title="External Test Analysis" description="Analyze tests from any platform with advanced insights" />

      {/* Screen Monitor Banner */}
      {isRecording && (
        <Card className="mb-6 border-primary">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="font-medium">{screenMode ? 'Screen monitoring active' : 'Recording test time'}...</span>
              <span className="text-lg font-mono font-bold text-primary">{elapsedDisplay}</span>
            </div>
            <Button variant="destructive" onClick={handleStopRecording}>Stop & Save Time</Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {!isRecording && (
        <div className="flex flex-wrap gap-3 mb-6">
          <Button variant="outline" onClick={handleStartRecording} className="gap-2">
            <Clock className="h-4 w-4" /> Start Timer (Manual)
          </Button>
          <Button variant="outline" onClick={handleStartScreen} className="gap-2">
            <Monitor className="h-4 w-4" /> Start Screen Monitor
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Test Paper</CardTitle>
            <CardDescription>Upload PDF, image, or photo of the question paper</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label htmlFor="test-file"
              className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer border-border hover:border-primary/50">
              {testFile ? (
                <div className="text-center">
                  <FileText className="h-8 w-8 text-correct mx-auto mb-2" />
                  <p className="text-sm font-medium">{testFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(testFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm">Upload PDF / Image / Photo</p>
                  <p className="text-xs text-muted-foreground">PDF, JPG, PNG supported</p>
                </>
              )}
              <input id="test-file" type="file" accept=".pdf,image/*" className="hidden"
                onChange={e => setTestFile(e.target.files?.[0] || null)} />
            </label>
            <Input placeholder="Test Name" value={testName} onChange={e => setTestName(e.target.value)} />
          </CardContent>
        </Card>

        {/* Answer Key Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5 text-correct" />Answer Key</CardTitle>
            <CardDescription>Upload answer key as PDF, image, or enter manually</CardDescription>
          </CardHeader>
          <CardContent>
            <label htmlFor="ans-file"
              className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer border-border hover:border-primary/50">
              {ansFile ? (
                <div className="text-center">
                  <FileText className="h-8 w-8 text-correct mx-auto mb-2" />
                  <p className="text-sm font-medium">{ansFile.name}</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm">Upload Answer Key (PDF/Image/Video)</p>
                  <p className="text-xs text-muted-foreground">Or enter answers below</p>
                </>
              )}
              <input id="ans-file" type="file" accept=".pdf,image/*,video/*" className="hidden"
                onChange={e => setAnsFile(e.target.files?.[0] || null)} />
            </label>
          </CardContent>
        </Card>

        {/* User Answers */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" />Your Chosen Answers</CardTitle>
            <CardDescription>Enter the answers you selected (format: ABCDABCD or 1-A, 2-B, 3-C)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="ABCDABCD... or 1-A, 2-B, 3-C..." value={userAnswers}
              onChange={e => setUserAnswers(e.target.value)} rows={3} />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label>Duration (min):</Label>
                <Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button onClick={handleProcess} disabled={isProcessing || !testFile} className="w-full gap-2" size="lg">
          {isProcessing ? (<><Loader2 className="h-5 w-5 animate-spin" />Processing...</>) :
            (<><BarChart className="h-5 w-5" />Generate Advanced Analysis</>)}
        </Button>
      </div>
    </MainLayout>
  );
}
