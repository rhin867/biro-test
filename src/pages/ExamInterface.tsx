import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { QuestionPalette } from '@/components/exam/QuestionPalette';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { ExamTimer } from '@/components/exam/ExamTimer';
import { SubjectTabs } from '@/components/exam/SubjectTabs';
import { MistakeFeedback } from '@/components/exam/MistakeFeedback';
import { NTAModeToggle } from '@/components/exam/NTAModeToggle';
import { useNTAMode } from '@/contexts/NTAModeContext';
import {
  getTestById,
  getCurrentAttempt,
  setCurrentAttempt,
  saveAttempt,
  saveResult,
  clearCurrentAttempt,
  generateId,
} from '@/lib/storage';
import { calculateTestResult } from '@/lib/exam-utils';
import { Test, TestAttempt, QuestionAttempt, QuestionStatus, Subject, MistakeType } from '@/types/exam';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Save,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function ExamInterface() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<Test | null>(null);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSubject, setCurrentSubject] = useState<Subject>('Physics');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const { isNTAMode } = useNTAMode();

  // Initialize test and attempt
  useEffect(() => {
    if (!testId) {
      navigate('/tests');
      return;
    }

    const loadedTest = getTestById(testId);
    if (!loadedTest) {
      toast.error('Test not found');
      navigate('/tests');
      return;
    }

    setTest(loadedTest);

    // Check for existing attempt
    const existingAttempt = getCurrentAttempt();
    if (existingAttempt && existingAttempt.testId === testId && !existingAttempt.isSubmitted) {
      setAttempt(existingAttempt);
      setCurrentQuestionIndex(existingAttempt.currentQuestionIndex);
      setCurrentSubject(existingAttempt.currentSubject);
    } else {
      // Create new attempt
      const newAttempt: TestAttempt = {
        id: generateId(),
        testId,
        startedAt: new Date().toISOString(),
        timeRemaining: loadedTest.duration * 60,
        attempts: {},
        currentQuestionIndex: 0,
        currentSubject: loadedTest.subjects[0] || 'Physics',
        isSubmitted: false,
      };
      setAttempt(newAttempt);
      setCurrentAttempt(newAttempt);
    }
  }, [testId, navigate]);

  // Auto-save attempt periodically
  useEffect(() => {
    if (!attempt) return;
    
    const interval = setInterval(() => {
      setCurrentAttempt(attempt);
    }, 5000);

    return () => clearInterval(interval);
  }, [attempt]);

  // Current question
  const currentQuestion = test?.questions[currentQuestionIndex];
  const currentAttemptData = currentQuestion ? attempt?.attempts[currentQuestion.id] : null;

  // Get question status for palette
  const getQuestionStatuses = useCallback((): Record<number, QuestionStatus> => {
    if (!test || !attempt) return {};

    const statuses: Record<number, QuestionStatus> = {};
    test.questions.forEach((q, index) => {
      const attemptData = attempt.attempts[q.id];
      if (!attemptData) {
        statuses[index + 1] = 'unattempted';
      } else if (attemptData.selectedAnswer && attemptData.status === 'marked-review') {
        statuses[index + 1] = 'answered-marked';
      } else if (attemptData.status === 'marked-review') {
        statuses[index + 1] = 'marked-review';
      } else if (attemptData.selectedAnswer) {
        statuses[index + 1] = 'answered';
      } else {
        statuses[index + 1] = 'skipped';
      }
    });
    return statuses;
  }, [test, attempt]);

  // Subject counts
  const getSubjectCounts = useCallback((): Record<Subject, { total: number; answered: number }> => {
    if (!test || !attempt) return {
      Physics: { total: 0, answered: 0 },
      Chemistry: { total: 0, answered: 0 },
      Maths: { total: 0, answered: 0 },
    };

    const counts: Record<Subject, { total: number; answered: number }> = {
      Physics: { total: 0, answered: 0 },
      Chemistry: { total: 0, answered: 0 },
      Maths: { total: 0, answered: 0 },
    };

    test.questions.forEach((q) => {
      counts[q.subject].total++;
      const attemptData = attempt.attempts[q.id];
      if (attemptData?.selectedAnswer) {
        counts[q.subject].answered++;
      }
    });

    return counts;
  }, [test, attempt]);

  // Update attempt data for current question
  const updateAttemptData = useCallback((updates: Partial<QuestionAttempt>) => {
    if (!currentQuestion || !attempt) return;

    const existingData = attempt.attempts[currentQuestion.id] || {
      questionId: currentQuestion.id,
      selectedAnswer: null,
      timeSpent: 0,
      status: 'unattempted' as QuestionStatus,
      mistakeTypes: [],
      notes: '',
      markedForRevision: false,
      visitCount: 0,
      firstVisitTime: Date.now(),
      lastVisitTime: Date.now(),
    };

    const updatedAttempt: TestAttempt = {
      ...attempt,
      attempts: {
        ...attempt.attempts,
        [currentQuestion.id]: {
          ...existingData,
          ...updates,
          lastVisitTime: Date.now(),
        },
      },
      currentQuestionIndex,
      currentSubject,
    };

    setAttempt(updatedAttempt);
    setCurrentAttempt(updatedAttempt);
  }, [currentQuestion, attempt, currentQuestionIndex, currentSubject]);

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    updateAttemptData({
      selectedAnswer: answer,
      status: currentAttemptData?.status === 'marked-review' ? 'answered-marked' : 'answered',
    });
  };

  // Handle mark for review
  const handleMarkForReview = () => {
    const currentStatus = currentAttemptData?.status;
    const hasAnswer = currentAttemptData?.selectedAnswer;
    
    let newStatus: QuestionStatus;
    if (currentStatus === 'marked-review' || currentStatus === 'answered-marked') {
      newStatus = hasAnswer ? 'answered' : 'skipped';
    } else {
      newStatus = hasAnswer ? 'answered-marked' : 'marked-review';
    }

    updateAttemptData({ status: newStatus });
    toast.info(
      newStatus === 'marked-review' || newStatus === 'answered-marked'
        ? 'Marked for review'
        : 'Unmarked from review'
    );
  };

  // Handle clear response
  const handleClearResponse = () => {
    updateAttemptData({
      selectedAnswer: null,
      status: currentAttemptData?.status === 'answered-marked' ? 'marked-review' : 'unattempted',
    });
  };

  // Navigate to question
  const goToQuestion = (questionNumber: number) => {
    const newIndex = questionNumber - 1;
    if (newIndex >= 0 && newIndex < (test?.questions.length || 0)) {
      setCurrentQuestionIndex(newIndex);
      const question = test?.questions[newIndex];
      if (question) {
        setCurrentSubject(question.subject);
      }
    }
  };

  // Navigate by subject
  const handleSubjectChange = (subject: Subject) => {
    if (!test) return;
    setCurrentSubject(subject);
    const firstQuestionOfSubject = test.questions.findIndex(q => q.subject === subject);
    if (firstQuestionOfSubject >= 0) {
      setCurrentQuestionIndex(firstQuestionOfSubject);
    }
  };

  // Next/Previous navigation
  const goToNext = () => {
    if (currentQuestionIndex < (test?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const nextQuestion = test?.questions[currentQuestionIndex + 1];
      if (nextQuestion) setCurrentSubject(nextQuestion.subject);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const prevQuestion = test?.questions[currentQuestionIndex - 1];
      if (prevQuestion) setCurrentSubject(prevQuestion.subject);
    }
  };

  // Handle time up
  const handleTimeUp = () => {
    toast.warning('Time is up! Submitting test...');
    handleSubmitTest();
  };

  // Handle timer tick
  const handleTimerTick = (remaining: number) => {
    if (attempt) {
      setAttempt({ ...attempt, timeRemaining: remaining });
    }
  };

  // Submit test
  const handleSubmitTest = () => {
    if (!test || !attempt) return;

    const result = calculateTestResult(test, attempt);
    
    const finalAttempt: TestAttempt = {
      ...attempt,
      completedAt: new Date().toISOString(),
      isSubmitted: true,
    };

    saveAttempt(finalAttempt);
    saveResult(result);
    clearCurrentAttempt();

    toast.success('Test submitted successfully!');
    navigate(`/analysis/${result.attemptId}`);
  };

  // Handle feedback updates
  const handleMistakeTypesChange = (types: MistakeType[]) => {
    updateAttemptData({ mistakeTypes: types });
  };

  const handleNotesChange = (notes: string) => {
    updateAttemptData({ notes });
  };

  const handleRevisionToggle = () => {
    updateAttemptData({ markedForRevision: !currentAttemptData?.markedForRevision });
  };

  if (!test || !attempt || !currentQuestion) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading test...</p>
      </div>
    );
  }

  const questionStatuses = getQuestionStatuses();
  const subjectCounts = getSubjectCounts();
  const answeredCount = Object.values(attempt.attempts).filter(a => a.selectedAnswer).length;
  const markedCount = Object.values(attempt.attempts).filter(
    a => a.status === 'marked-review' || a.status === 'answered-marked'
  ).length;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className={cn(
        "flex h-16 items-center justify-between border-b border-border bg-card px-4",
        isNTAMode && "bg-background"
      )}>
        <div className="flex items-center gap-4">
          <h1 className={cn(
            "font-bold text-lg truncate max-w-[200px]",
            isNTAMode && "text-foreground"
          )}>{test.name}</h1>
          <SubjectTabs
            subjects={test.subjects}
            activeSubject={currentSubject}
            onSubjectChange={handleSubjectChange}
            subjectCounts={subjectCounts}
          />
        </div>
        <div className="flex items-center gap-4">
          <NTAModeToggle showLabel={false} />
          <ExamTimer
            initialTime={attempt.timeRemaining}
            onTimeUp={handleTimeUp}
            onTick={handleTimerTick}
          />
          <Button
            variant="destructive"
            onClick={() => setShowSubmitDialog(true)}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Submit Test
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <QuestionDisplay
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={test.questions.length}
            selectedAnswer={currentAttemptData?.selectedAnswer || null}
            onAnswerSelect={handleAnswerSelect}
          />

          {/* Feedback Section (Collapsible) */}
          {showFeedback && (
            <div className="mt-6 animate-fade-in">
              <MistakeFeedback
                selectedTypes={currentAttemptData?.mistakeTypes || []}
                onTypesChange={handleMistakeTypesChange}
                notes={currentAttemptData?.notes || ''}
                onNotesChange={handleNotesChange}
                markedForRevision={currentAttemptData?.markedForRevision || false}
                onRevisionToggle={handleRevisionToggle}
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleMarkForReview}
                className={cn(
                  'gap-2',
                  (currentAttemptData?.status === 'marked-review' ||
                    currentAttemptData?.status === 'answered-marked') &&
                    'bg-review/20 border-review text-review hover:bg-review/30'
                )}
              >
                <Flag className="h-4 w-4" />
                {currentAttemptData?.status === 'marked-review' ||
                currentAttemptData?.status === 'answered-marked'
                  ? 'Unmark'
                  : 'Mark for Review'}
              </Button>
              <Button
                variant="outline"
                onClick={handleClearResponse}
                disabled={!currentAttemptData?.selectedAnswer}
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowFeedback(!showFeedback)}
              >
                {showFeedback ? 'Hide' : 'Show'} Feedback
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={goToNext}
                disabled={currentQuestionIndex === test.questions.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <aside className="hidden lg:block w-72 border-l border-border bg-card p-4 overflow-y-auto">
          <QuestionPalette
            totalQuestions={test.questions.length}
            currentQuestion={currentQuestionIndex + 1}
            questionStatuses={questionStatuses}
            onQuestionClick={goToQuestion}
          />

          <div className="mt-6 space-y-2 border-t border-border pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Answered</span>
              <span className="font-medium text-correct">{answeredCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Marked for Review</span>
              <span className="font-medium text-review">{markedCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Not Visited</span>
              <span className="font-medium">{test.questions.length - Object.keys(attempt.attempts).length}</span>
            </div>
          </div>
        </aside>

        {/* Mobile Question Palette */}
        <Sheet>
          <SheetTrigger asChild className="lg:hidden fixed bottom-4 right-4 z-50">
            <Button size="lg" className="rounded-full h-14 w-14 shadow-lg">
              {currentQuestionIndex + 1}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Question Navigator</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <QuestionPalette
                totalQuestions={test.questions.length}
                currentQuestion={currentQuestionIndex + 1}
                questionStatuses={questionStatuses}
                onQuestionClick={(num) => {
                  goToQuestion(num);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-review" />
              Submit Test?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to submit your test?</p>
              <div className="rounded-lg bg-muted p-3 mt-4 space-y-1 text-sm">
                <p>Answered: <span className="font-medium text-correct">{answeredCount}</span> / {test.questions.length}</p>
                <p>Marked for Review: <span className="font-medium text-review">{markedCount}</span></p>
                <p>Unanswered: <span className="font-medium">{test.questions.length - answeredCount}</span></p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Test</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitTest}>
              Submit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
