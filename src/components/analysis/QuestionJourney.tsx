import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check, X, ChevronRight, Flag, Bookmark } from 'lucide-react';

interface QuestionJourneyProps {
  questionResults: QuestionResult[];
  totalDuration: number; // in minutes
}

export function QuestionJourney({ questionResults, totalDuration }: QuestionJourneyProps) {
  // Group questions by 30-min time chunks
  const chunkMinutes = 30;
  const numChunks = Math.ceil(totalDuration / chunkMinutes);

  // Estimate time position of each question
  let cumulativeTime = 0;
  const questionsWithTime = questionResults.map(q => {
    const startMinute = cumulativeTime / 60;
    cumulativeTime += q.timeSpent;
    return { ...q, positionMinute: startMinute };
  });

  const chunks = Array.from({ length: numChunks }, (_, i) => {
    const rangeStart = i * chunkMinutes;
    const rangeEnd = (i + 1) * chunkMinutes;
    const questions = questionsWithTime.filter(
      q => q.positionMinute >= rangeStart && q.positionMinute < rangeEnd
    );
    return { label: `${rangeStart} - ${rangeEnd} min`, questions };
  }).filter(c => c.questions.length > 0);

  const getStatusIcon = (qr: QuestionResult) => {
    if (qr.isCorrect) return <Check className="h-3 w-3 text-correct" />;
    if (qr.isAttempted) return <X className="h-3 w-3 text-incorrect" />;
    return null;
  };

  const getStatusStyle = (qr: QuestionResult) => {
    if (qr.isCorrect) return 'border-correct/30 bg-correct/5';
    if (qr.isAttempted) return 'border-incorrect/30 bg-incorrect/5';
    return 'border-border bg-muted/30';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Question Journey</CardTitle>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-correct" />
            Answered Correct
          </div>
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-incorrect" />
            Answered Wrong
          </div>
          <div className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            Skipped
          </div>
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-review" />
            Marked for Review
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {chunks.map((chunk, chunkIndex) => (
            <div key={chunkIndex}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">⏱</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{chunk.label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {chunk.questions.map((q, i) => (
                  <React.Fragment key={q.questionId}>
                    <div
                      className={cn(
                        'relative flex h-10 w-10 items-center justify-center rounded border text-xs font-medium transition-all hover:ring-2 hover:ring-primary/30',
                        getStatusStyle(q)
                      )}
                      title={`Q${q.questionNumber} - ${q.subject} - ${q.isCorrect ? 'Correct' : q.isAttempted ? 'Incorrect' : 'Skipped'}`}
                    >
                      {q.questionNumber}
                      <div className="absolute -bottom-1 -right-1">
                        {getStatusIcon(q)}
                      </div>
                      {q.markedForRevision && (
                        <div className="absolute -top-1 -right-1">
                          <Flag className="h-2.5 w-2.5 text-review" />
                        </div>
                      )}
                    </div>
                    {i < chunk.questions.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
