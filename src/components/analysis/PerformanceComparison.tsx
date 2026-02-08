import React from 'react';
import { TestResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PerformanceComparisonProps {
  result: TestResult;
}

const subjectLabels: Record<Subject, string> = {
  Physics: 'Physics',
  Chemistry: 'Chemistry',
  Maths: 'Mathematics',
};

function formatTimeHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function PerformanceComparison({ result }: PerformanceComparisonProps) {
  // Simulated comparison data
  const averageData = {
    score: Math.round(result.maxScore * 0.45),
    correct: Math.round(result.totalQuestions * 0.4),
    incorrect: Math.round(result.totalQuestions * 0.15),
    skipped: Math.round(result.totalQuestions * 0.45),
    accuracy: 65,
  };
  const topperData = {
    score: Math.round(result.maxScore * 0.95),
    correct: Math.round(result.totalQuestions * 0.92),
    incorrect: Math.round(result.totalQuestions * 0.03),
    skipped: Math.round(result.totalQuestions * 0.05),
    accuracy: 98,
  };

  return (
    <div className="space-y-6">
      {/* Test Breakdown Table - like reference image */}
      <Card>
        <CardHeader>
          <CardTitle>Test Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Subject</th>
                  <th className="text-center py-3 px-4 font-medium">Total Score</th>
                  <th className="text-center py-3 px-4 font-medium">Attempted Correct</th>
                  <th className="text-center py-3 px-4 font-medium">Attempted Wrong</th>
                  <th className="text-center py-3 px-4 font-medium">Not Attempted</th>
                  <th className="text-center py-3 px-4 font-medium">Not Visited Qs</th>
                </tr>
              </thead>
              <tbody>
                {/* Overall Row */}
                <tr className="border-b border-border/50 font-semibold bg-muted/20">
                  <td className="py-3 px-4 flex items-center gap-2">
                    <span className="text-primary">✓</span> Overall
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-primary font-bold text-lg">{result.score}</span>
                    <span className="text-muted-foreground text-xs">/{result.maxScore}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-correct font-bold">{result.correct}</span>
                    <span className="text-muted-foreground text-xs"> / {result.totalQuestions}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-incorrect font-bold">{result.incorrect}</span>
                    <span className="text-muted-foreground text-xs"> / {result.totalQuestions}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-review font-bold">{result.skipped}</span>
                    <span className="text-muted-foreground text-xs"> / {result.totalQuestions}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-bold">0</span>
                    <span className="text-muted-foreground text-xs"> / {result.totalQuestions}</span>
                  </td>
                </tr>

                {/* Subject Rows */}
                {(['Maths', 'Physics', 'Chemistry'] as Subject[]).map(subject => {
                  const data = result.subjectWise[subject];
                  if (data.total === 0) return null;
                  return (
                    <tr key={subject} className="border-b border-border/30">
                      <td className="py-3 px-4">
                        <span className={cn(
                          'font-medium',
                          subject === 'Maths' ? 'text-[hsl(280,65%,60%)]' :
                          subject === 'Physics' ? 'text-[hsl(199,89%,48%)]' :
                          'text-[hsl(142,76%,36%)]'
                        )}>
                          {subjectLabels[subject]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold">{data.score}</span>
                        <span className="text-muted-foreground text-xs"> / {data.maxScore}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-correct font-bold">{data.correct}</span>
                        <span className="text-muted-foreground text-xs"> / {data.total}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-incorrect font-bold">{data.incorrect}</span>
                        <span className="text-muted-foreground text-xs"> / {data.total}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-review font-bold">{data.skipped}</span>
                        <span className="text-muted-foreground text-xs"> / {data.total}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold">0</span>
                        <span className="text-muted-foreground text-xs"> / {data.total}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Progress bars per subject */}
          <div className="mt-4 space-y-3">
            {(['Maths', 'Physics', 'Chemistry'] as Subject[]).map(subject => {
              const data = result.subjectWise[subject];
              if (data.total === 0) return null;
              return (
                <div key={subject} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-24">{subjectLabels[subject]}</span>
                  <div className="flex-1 h-2.5 rounded-full overflow-hidden flex bg-muted">
                    <div className="bg-correct h-full" style={{ width: `${(data.correct / data.total) * 100}%` }} />
                    <div className="bg-incorrect h-full" style={{ width: `${(data.incorrect / data.total) * 100}%` }} />
                    <div className="bg-review h-full" style={{ width: `${(data.skipped / data.total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div />
            <div className="text-center">
              <div className="bg-primary/10 rounded-lg p-2">
                <span className="text-xl">👑</span>
                <p className="text-xs font-medium mt-1">Topper</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-secondary/50 rounded-lg p-2">
                <span className="text-xl">👥</span>
                <p className="text-xs font-medium mt-1">Average</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-correct/10 border border-correct/20 rounded-lg p-2">
                <span className="text-xl">🎯</span>
                <p className="text-xs font-medium mt-1">You</p>
              </div>
            </div>
          </div>

          {[
            { label: 'Score', topper: topperData.score, avg: averageData.score, you: result.score },
            { label: 'Correct', topper: topperData.correct, avg: averageData.correct, you: result.correct },
            { label: 'Incorrect', topper: topperData.incorrect, avg: averageData.incorrect, you: result.incorrect },
            { label: 'Accuracy', topper: `${topperData.accuracy}%`, avg: `${averageData.accuracy}%`, you: `${result.accuracy.toFixed(1)}%` },
            { label: 'Time', topper: '-', avg: '-', you: formatTimeHMS(result.timeTaken) },
          ].map(row => (
            <div key={row.label} className="grid grid-cols-4 gap-4 py-2 border-b border-border last:border-0">
              <div className="font-medium text-sm">{row.label}</div>
              <div className="text-center text-primary font-semibold text-sm">{row.topper}</div>
              <div className="text-center text-muted-foreground text-sm">{row.avg}</div>
              <div className="text-center text-correct font-semibold text-sm">{row.you}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
