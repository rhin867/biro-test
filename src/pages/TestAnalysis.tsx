import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/exam/StatCard';
import { MultiProgressBar } from '@/components/exam/ProgressBar';
import { SubjectTabs } from '@/components/exam/SubjectTabs';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getResultById, getTestById, addToMistakeBook } from '@/lib/storage';
import {
  calculateMistakeAnalysis,
  formatTime,
  getMistakeTypeLabel,
  getMistakeTypeColor,
  createMistakeBookEntry,
} from '@/lib/exam-utils';
import { Subject, TestResult, QuestionResult, MistakeType } from '@/types/exam';
import {
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  TrendingUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TestAnalysis() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'All'>('All');
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionResult | null>(null);

  const result = useMemo(() => attemptId ? getResultById(attemptId) : null, [attemptId]);
  const test = useMemo(() => result ? getTestById(result.testId) : null, [result]);
  const mistakeAnalysis = useMemo(() => result ? calculateMistakeAnalysis([result]) : null, [result]);

  if (!result || !test) {
    return (
      <MainLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Analysis not found</p>
        </div>
      </MainLayout>
    );
  }

  // Subject-wise data for charts
  const subjectData = [
    {
      name: 'Physics',
      correct: result.subjectWise.Physics.correct,
      incorrect: result.subjectWise.Physics.incorrect,
      skipped: result.subjectWise.Physics.skipped,
      accuracy: Math.round(result.subjectWise.Physics.accuracy),
      color: 'hsl(199, 89%, 48%)',
    },
    {
      name: 'Chemistry',
      correct: result.subjectWise.Chemistry.correct,
      incorrect: result.subjectWise.Chemistry.incorrect,
      skipped: result.subjectWise.Chemistry.skipped,
      accuracy: Math.round(result.subjectWise.Chemistry.accuracy),
      color: 'hsl(142, 76%, 36%)',
    },
    {
      name: 'Maths',
      correct: result.subjectWise.Maths.correct,
      incorrect: result.subjectWise.Maths.incorrect,
      skipped: result.subjectWise.Maths.skipped,
      accuracy: Math.round(result.subjectWise.Maths.accuracy),
      color: 'hsl(280, 65%, 60%)',
    },
  ].filter(s => result.subjectWise[s.name as Subject].total > 0);

  // Mistake type distribution
  const mistakeTypeData = mistakeAnalysis
    ? Object.entries(mistakeAnalysis.byType)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => ({
          name: getMistakeTypeLabel(type as MistakeType),
          value: count,
          color: getMistakeTypeColor(type as MistakeType),
        }))
    : [];

  // Chapter-wise data
  const chapterData = Object.entries(result.chapterWise).map(([key, data]) => ({
    key,
    ...data,
    accuracy: Math.round(data.accuracy),
  }));

  // Time analysis data
  const timeData = result.questionResults.map((qr, index) => ({
    question: `Q${index + 1}`,
    time: qr.timeSpent,
    isCorrect: qr.isCorrect,
    subject: qr.subject,
  }));

  // Filtered questions
  const filteredQuestions = selectedSubject === 'All'
    ? result.questionResults
    : result.questionResults.filter(q => q.subject === selectedSubject);

  const handleAddToMistakeBook = (questionResult: QuestionResult) => {
    const question = test.questions.find(q => q.id === questionResult.questionId);
    if (!question) return;

    const entry = createMistakeBookEntry(
      question,
      result.testId,
      result.testName,
      questionResult.selectedAnswer,
      questionResult.mistakeTypes,
      questionResult.notes
    );
    addToMistakeBook(entry);
    toast.success('Added to Mistake Book');
  };

  return (
    <MainLayout>
      <PageHeader
        title="Advanced Performance Analysis"
        description={`${result.testName} • ${new Date(result.completedAt).toLocaleDateString()}`}
      >
        <Link to={`/exam/${result.testId}`}>
          <Button variant="outline">Retake Test</Button>
        </Link>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="Score"
          value={`${result.score}/${result.maxScore}`}
          icon={Target}
          variant="primary"
        />
        <StatCard
          title="Accuracy"
          value={`${result.accuracy.toFixed(1)}%`}
          icon={TrendingUp}
          variant={result.accuracy >= 60 ? 'correct' : 'incorrect'}
        />
        <StatCard
          title="Correct"
          value={result.correct}
          icon={CheckCircle2}
          variant="correct"
          subtitle={`+${result.correct * test.positiveMarking}`}
        />
        <StatCard
          title="Incorrect"
          value={result.incorrect}
          icon={XCircle}
          variant="incorrect"
          subtitle={`-${result.incorrect * test.negativeMarking}`}
        />
        <StatCard
          title="Skipped"
          value={result.skipped}
          icon={MinusCircle}
          variant="skipped"
        />
        <StatCard
          title="Time Taken"
          value={formatTime(result.timeTaken)}
          icon={Clock}
        />
      </div>

      {/* Progress Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Overall Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiProgressBar
            segments={[
              { value: result.correct, variant: 'correct', label: 'Correct' },
              { value: result.incorrect, variant: 'incorrect', label: 'Incorrect' },
              { value: result.skipped, variant: 'skipped', label: 'Skipped' },
            ]}
            total={result.totalQuestions}
            size="lg"
          />
          <div className="flex justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-correct" />
              <span className="text-sm">Correct ({result.correct})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-incorrect" />
              <span className="text-sm">Incorrect ({result.incorrect})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-skipped" />
              <span className="text-sm">Skipped ({result.skipped})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Analysis */}
      <Tabs defaultValue="subject" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="subject">Subject Analysis</TabsTrigger>
          <TabsTrigger value="chapter">Chapter Analysis</TabsTrigger>
          <TabsTrigger value="mistakes">Mistake Analysis</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
        </TabsList>

        {/* Subject Analysis */}
        <TabsContent value="subject" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Accuracy Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Subject-wise Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={subjectData}>
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="accuracy" name="Accuracy %" radius={[4, 4, 0, 0]}>
                      {subjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subject Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Performance Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={subjectData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar
                      name="Accuracy"
                      dataKey="accuracy"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Subject Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subjectData.map((subject) => (
              <Card key={subject.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
                    {subject.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium">
                        {result.subjectWise[subject.name as Subject].score}/
                        {result.subjectWise[subject.name as Subject].maxScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-medium">{subject.accuracy}%</span>
                    </div>
                    <MultiProgressBar
                      segments={[
                        { value: subject.correct, variant: 'correct' },
                        { value: subject.incorrect, variant: 'incorrect' },
                        { value: subject.skipped, variant: 'skipped' },
                      ]}
                      total={result.subjectWise[subject.name as Subject].total}
                      size="sm"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="text-correct">{subject.correct} correct</span>
                      <span className="text-incorrect">{subject.incorrect} wrong</span>
                      <span>{subject.skipped} skipped</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Chapter Analysis */}
        <TabsContent value="chapter" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chapter-wise Performance</CardTitle>
              <CardDescription>
                Click on a chapter to see question details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {chapterData.map((chapter) => (
                  <div key={chapter.key} className="rounded-lg border border-border">
                    <button
                      onClick={() => setExpandedChapter(
                        expandedChapter === chapter.key ? null : chapter.key
                      )}
                      className="flex w-full items-center justify-between p-4 text-left hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`badge-${chapter.subject.toLowerCase()}`}>
                          {chapter.subject}
                        </Badge>
                        <span className="font-medium">{chapter.chapter}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{chapter.accuracy}% accuracy</p>
                          <p className="text-xs text-muted-foreground">
                            {chapter.correct}/{chapter.total} correct
                          </p>
                        </div>
                        {expandedChapter === chapter.key ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                    
                    {expandedChapter === chapter.key && (
                      <div className="border-t border-border p-4 bg-muted/50">
                        <div className="flex flex-wrap gap-2">
                          {chapter.questionIds.map((qId) => {
                            const qResult = result.questionResults.find(q => q.questionId === qId);
                            if (!qResult) return null;
                            return (
                              <button
                                key={qId}
                                onClick={() => setSelectedQuestion(qResult)}
                                className={cn(
                                  'question-btn',
                                  qResult.isCorrect
                                    ? 'question-btn-answered'
                                    : qResult.isAttempted
                                    ? 'question-btn-incorrect'
                                    : 'question-btn-skipped'
                                )}
                              >
                                {qResult.questionNumber}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mistake Analysis */}
        <TabsContent value="mistakes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mistake Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Mistake Distribution</CardTitle>
                <CardDescription>Breakdown by mistake type</CardDescription>
              </CardHeader>
              <CardContent>
                {mistakeTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={mistakeTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {mistakeTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                    <p>No mistake data recorded. Use feedback during exam.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Knowledge Profile */}
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Profile</CardTitle>
                <CardDescription>Analysis of your weak areas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mistakeAnalysis && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Carelessness Rate</span>
                        <span className={cn(
                          'font-medium',
                          mistakeAnalysis.carelessnessRate > 30 ? 'text-review' : 'text-correct'
                        )}>
                          {mistakeAnalysis.carelessnessRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-review transition-all"
                          style={{ width: `${Math.min(mistakeAnalysis.carelessnessRate, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Time Pressure Issues</span>
                        <span className={cn(
                          'font-medium',
                          mistakeAnalysis.timePressureRate > 30 ? 'text-review' : 'text-correct'
                        )}>
                          {mistakeAnalysis.timePressureRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-physics transition-all"
                          style={{ width: `${Math.min(mistakeAnalysis.timePressureRate, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {mistakeAnalysis.weakConcepts.length > 0 && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm font-medium mb-2">Weak Concepts</p>
                        <div className="flex flex-wrap gap-2">
                          {mistakeAnalysis.weakConcepts.slice(0, 5).map((concept) => (
                            <Badge key={concept} variant="outline" className="border-incorrect text-incorrect">
                              {concept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {mistakeAnalysis.weakFormulas.length > 0 && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm font-medium mb-2">Formula Revision Needed</p>
                        <div className="flex flex-wrap gap-2">
                          {mistakeAnalysis.weakFormulas.slice(0, 5).map((formula) => (
                            <Badge key={formula} variant="outline" className="border-review text-review">
                              {formula}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Time Analysis */}
        <TabsContent value="time" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Time per Question</CardTitle>
              <CardDescription>How long you spent on each question</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeData}>
                  <XAxis dataKey="question" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}s`, 'Time']}
                  />
                  <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                    {timeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isCorrect ? 'hsl(var(--correct))' : 'hsl(var(--incorrect))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Avg. Time per Question"
              value={`${Math.round(result.timeTaken / result.totalQuestions)}s`}
              icon={Clock}
            />
            <StatCard
              title="Fastest Correct"
              value={`${Math.min(...timeData.filter(t => t.isCorrect).map(t => t.time) || [0])}s`}
              icon={CheckCircle2}
              variant="correct"
            />
            <StatCard
              title="Slowest Attempt"
              value={`${Math.max(...timeData.map(t => t.time) || [0])}s`}
              icon={Clock}
              variant="skipped"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Question Review Panel */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-4 md:inset-10 bg-card rounded-xl border border-border shadow-xl overflow-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card">
              <h3 className="font-semibold">Question {selectedQuestion.questionNumber} Review</h3>
              <div className="flex items-center gap-2">
                {!selectedQuestion.isCorrect && selectedQuestion.isAttempted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleAddToMistakeBook(selectedQuestion);
                    }}
                    className="gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Add to Mistake Book
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedQuestion(null)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="p-6">
              {test.questions.find(q => q.id === selectedQuestion.questionId) && (
                <QuestionDisplay
                  question={test.questions.find(q => q.id === selectedQuestion.questionId)!}
                  questionNumber={selectedQuestion.questionNumber}
                  totalQuestions={result.totalQuestions}
                  selectedAnswer={selectedQuestion.selectedAnswer}
                  onAnswerSelect={() => {}}
                  showCorrectAnswer
                />
              )}
              <div className="mt-4 flex items-center gap-2">
                <Badge variant={selectedQuestion.isCorrect ? 'default' : 'destructive'}>
                  {selectedQuestion.isCorrect ? 'Correct' : selectedQuestion.isAttempted ? 'Incorrect' : 'Skipped'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Time spent: {selectedQuestion.timeSpent}s
                </span>
                {selectedQuestion.mistakeTypes.length > 0 && (
                  <div className="flex gap-1">
                    {selectedQuestion.mistakeTypes.map((mt) => (
                      <Badge key={mt} variant="outline" className="text-xs">
                        {getMistakeTypeLabel(mt)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {selectedQuestion.notes && (
                <div className="mt-4 p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium mb-1">Your Notes:</p>
                  <p className="text-sm text-muted-foreground">{selectedQuestion.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
