import React from 'react';
import { TestResult, QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, AlertTriangle, Lightbulb, Target } from 'lucide-react';

interface ScorePotentialProps {
  result: TestResult;
  positiveMarking: number;
  negativeMarking: number;
}

export function ScorePotential({ result, positiveMarking, negativeMarking }: ScorePotentialProps) {
  // Calculate potential score
  const marksLostToNegative = result.incorrect * negativeMarking;
  const potentialWithoutNegative = result.score + marksLostToNegative;
  
  // Wasted attempts: questions answered in < 30s that were wrong (guessing)
  const wastedQuestions = result.questionResults.filter(
    q => q.isAttempted && !q.isCorrect && q.timeSpent < 30
  );
  const marksLostToWasted = wastedQuestions.length * (positiveMarking + negativeMarking);

  // Confused: spent time but didn't attempt
  const confusedQuestions = result.questionResults.filter(
    q => !q.isAttempted && q.timeSpent > 60
  );
  const timeWastedOnConfused = confusedQuestions.reduce((s, q) => s + q.timeSpent, 0);

  // Calculate max achievable
  const maxAchievable = potentialWithoutNegative + (wastedQuestions.length * positiveMarking);

  // Behavior classification
  let behaviorTag = 'Balanced Solver';
  if (wastedQuestions.length > 5) behaviorTag = 'The Gambler';
  else if (confusedQuestions.length > 5) behaviorTag = 'The Overthinker';
  else if (result.accuracy > 85) behaviorTag = 'The Precision Player';
  else if (result.attempted / result.totalQuestions > 0.9) behaviorTag = 'The Completionist';

  return (
    <div className="space-y-6">
      {/* Score Potential Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Score Potential Analysis
          </CardTitle>
          <CardDescription>
            How you could improve your score with better strategy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-2xl font-bold text-primary">{result.score}</p>
              <p className="text-xs text-muted-foreground">Actual Score</p>
            </div>
            <div className="p-4 rounded-lg bg-correct/10 text-center">
              <p className="text-2xl font-bold text-correct">{potentialWithoutNegative}</p>
              <p className="text-xs text-muted-foreground">Without Negatives</p>
            </div>
            <div className="p-4 rounded-lg bg-review/10 text-center">
              <p className="text-2xl font-bold text-review">{marksLostToNegative}</p>
              <p className="text-xs text-muted-foreground">Lost to Negatives</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 text-center">
              <p className="text-2xl font-bold">{maxAchievable}</p>
              <p className="text-xs text-muted-foreground">Max Achievable</p>
            </div>
          </div>

          {/* Behavior Tag */}
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Attempt Style</p>
              <p className="font-semibold text-lg">{behaviorTag}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {wastedQuestions.length > 0 && (
        <Card className="border-incorrect/20 bg-incorrect/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-incorrect mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">
                  ⚠️ Gambler Alert: {wastedQuestions.length} Wasted Attempts
                </p>
                <p className="text-sm text-muted-foreground">
                  You lost <span className="font-medium text-incorrect">{wastedQuestions.length * negativeMarking} marks</span> by
                  guessing blindly in under 30 seconds on questions {wastedQuestions.map(q => `Q${q.questionNumber}`).join(', ')}.
                  If you had skipped these, your score would be {result.score + wastedQuestions.length * negativeMarking}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {confusedQuestions.length > 0 && (
        <Card className="border-review/20 bg-review/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-review mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">
                  ⏳ Time Leak: {Math.round(timeWastedOnConfused / 60)} minutes wasted
                </p>
                <p className="text-sm text-muted-foreground">
                  You spent {Math.round(timeWastedOnConfused / 60)} minutes staring at {confusedQuestions.length} questions 
                  you didn't answer ({confusedQuestions.map(q => `Q${q.questionNumber}`).slice(0, 5).join(', ')}).
                  Learn to skip faster — those minutes could have been used on easier questions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result.accuracy >= 80 && result.attempted / result.totalQuestions < 0.7 && (
        <Card className="border-correct/20 bg-correct/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-correct mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">
                  💡 High Accuracy but Low Attempts
                </p>
                <p className="text-sm text-muted-foreground">
                  Your accuracy is {result.accuracy.toFixed(0)}% but you only attempted {result.attempted}/{result.totalQuestions} questions.
                  With your high accuracy, attempting just 5 more questions could add up to {5 * positiveMarking} marks.
                  Work on speed to attempt more questions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
