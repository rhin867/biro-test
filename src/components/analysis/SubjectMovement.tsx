import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubjectMovementProps {
  questionResults: QuestionResult[];
}

const subjectColors: Record<Subject, string> = {
  Physics: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Chemistry: 'bg-green-500/20 text-green-400 border-green-500/30',
  Maths: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export function SubjectMovement({ questionResults }: SubjectMovementProps) {
  // Track subject switches
  const switches: { from: Subject; to: Subject; atQuestion: number; timeSpent: number }[] = [];
  let currentSubject = questionResults[0]?.subject;
  let timeInCurrentSubject = 0;

  questionResults.forEach((q, i) => {
    if (q.subject !== currentSubject) {
      switches.push({
        from: currentSubject,
        to: q.subject,
        atQuestion: q.questionNumber,
        timeSpent: timeInCurrentSubject,
      });
      currentSubject = q.subject;
      timeInCurrentSubject = q.timeSpent;
    } else {
      timeInCurrentSubject += q.timeSpent;
    }
  });

  // Subject order and time spent per subject session
  const sessions: { subject: Subject; questions: number; timeSpent: number; correct: number; total: number }[] = [];
  let sessionSubject = questionResults[0]?.subject;
  let sessionStart = 0;

  questionResults.forEach((q, i) => {
    if (q.subject !== sessionSubject || i === questionResults.length - 1) {
      const endIdx = q.subject !== sessionSubject ? i : i + 1;
      const sessionQs = questionResults.slice(sessionStart, endIdx);
      sessions.push({
        subject: sessionSubject,
        questions: sessionQs.length,
        timeSpent: sessionQs.reduce((s, sq) => s + sq.timeSpent, 0),
        correct: sessionQs.filter(sq => sq.isCorrect).length,
        total: sessionQs.length,
      });
      sessionSubject = q.subject;
      sessionStart = i;
    }
  });

  // Per-subject stats
  const subjectStats = (['Physics', 'Chemistry', 'Maths'] as Subject[]).map(subject => {
    const qs = questionResults.filter(q => q.subject === subject);
    const correct = qs.filter(q => q.isCorrect).length;
    const attempted = qs.filter(q => q.isAttempted).length;
    const time = qs.reduce((s, q) => s + q.timeSpent, 0);
    return {
      subject,
      total: qs.length,
      correct,
      attempted,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      time: Math.round(time / 60),
    };
  }).filter(s => s.total > 0);

  // Recommendation
  const bestSubject = subjectStats.reduce((best, s) =>
    s.accuracy > best.accuracy ? s : best, subjectStats[0]);
  const firstSubject = questionResults[0]?.subject;

  return (
    <div className="space-y-6">
      {/* Subject Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Movement Flow</CardTitle>
          <CardDescription>
            How you navigated between subjects during the exam
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {sessions.map((session, i) => (
              <React.Fragment key={i}>
                <div className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border',
                  subjectColors[session.subject]
                )}>
                  <span className="text-sm font-medium">{session.subject}</span>
                  <span className="text-xs opacity-70">
                    {session.questions}Q • {Math.round(session.timeSpent / 60)}m
                  </span>
                </div>
                {i < sessions.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="text-sm text-muted-foreground">
            Total subject switches: <span className="font-medium text-foreground">{switches.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Subject-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Subject</th>
                  <th className="text-center py-3 px-4 font-medium">Questions</th>
                  <th className="text-center py-3 px-4 font-medium">Attempted</th>
                  <th className="text-center py-3 px-4 font-medium text-correct">Correct</th>
                  <th className="text-center py-3 px-4 font-medium">Accuracy</th>
                  <th className="text-center py-3 px-4 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {subjectStats.map(s => (
                  <tr key={s.subject} className="border-b border-border/50">
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={cn('border', subjectColors[s.subject])}>
                        {s.subject}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">{s.total}</td>
                    <td className="py-3 px-4 text-center">{s.attempted}</td>
                    <td className="py-3 px-4 text-center text-correct font-medium">{s.correct}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn(
                        'font-medium',
                        s.accuracy >= 70 ? 'text-correct' : s.accuracy >= 40 ? 'text-review' : 'text-incorrect'
                      )}>
                        {s.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">{s.time} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendation */}
      {bestSubject && firstSubject !== bestSubject.subject && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">Strategy Recommendation</p>
                <p className="text-sm text-muted-foreground">
                  You started with {firstSubject}, but your highest accuracy is in {bestSubject.subject} ({bestSubject.accuracy}%).
                  Consider starting with {bestSubject.subject} next time to secure easier marks early and build confidence.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {switches.length > 6 && (
        <Card className="border-review/20 bg-review/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-review mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">⚠️ Too Many Switches</p>
                <p className="text-sm text-muted-foreground">
                  You switched subjects {switches.length} times. Frequent switching can indicate panic or lack of strategy.
                  Try to complete one subject section before moving to the next.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
