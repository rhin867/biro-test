import React from 'react';
import { TestResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTime } from '@/lib/exam-utils';

interface PerformanceComparisonProps {
  result: TestResult;
}

export function PerformanceComparison({ result }: PerformanceComparisonProps) {
  // Simulated average data (in a real app, this would come from backend)
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

  const rows = [
    { label: 'Score', you: result.score, average: averageData.score, topper: topperData.score },
    { label: 'Correct', you: result.correct, average: averageData.correct, topper: topperData.correct },
    { label: 'Incorrect', you: result.incorrect, average: averageData.incorrect, topper: topperData.incorrect },
    { label: 'Skipped', you: result.skipped, average: averageData.skipped, topper: topperData.skipped },
    { label: 'Accuracy', you: `${result.accuracy.toFixed(1)}%`, average: `${averageData.accuracy}%`, topper: `${topperData.accuracy}%` },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div />
          <div className="text-center">
            <div className="bg-primary/10 rounded-lg p-3">
              <span className="text-2xl">👑</span>
              <p className="text-sm font-medium mt-1">Topper</p>
              <p className="text-xs text-muted-foreground">(Live Test)</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-secondary/50 rounded-lg p-3">
              <span className="text-2xl">👥</span>
              <p className="text-sm font-medium mt-1">Average</p>
              <p className="text-xs text-muted-foreground">(Live Test)</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-correct/10 border border-correct/20 rounded-lg p-3">
              <span className="text-2xl">🎯</span>
              <p className="text-sm font-medium mt-1">You</p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-4 gap-4 py-2 border-b border-border last:border-0">
              <div className="font-medium">{row.label}</div>
              <div className="text-center text-primary font-semibold">{row.topper}</div>
              <div className="text-center text-muted-foreground">{row.average}</div>
              <div className="text-center text-correct font-semibold">{row.you}</div>
            </div>
          ))}
        </div>

        {/* Subject-wise Performance */}
        <div className="mt-6">
          <h4 className="font-medium mb-3">Sectional Performance</h4>
          <div className="space-y-3">
            {Object.entries(result.subjectWise).map(([subject, data]) => (
              data.total > 0 && (
                <div key={subject} className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{subject}</span>
                    <span className="text-primary font-semibold">{data.score}/{data.maxScore}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Accuracy</p>
                      <p className="font-medium text-correct">{data.accuracy.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Correct</p>
                      <p className="font-medium">{data.correct}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Incorrect</p>
                      <p className="font-medium">{data.incorrect}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Skipped</p>
                      <p className="font-medium">{data.skipped}</p>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
