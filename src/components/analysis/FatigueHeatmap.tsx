import React from 'react';
import { QuestionResult } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FatigueHeatmapProps {
  questionResults: QuestionResult[];
}

export function FatigueHeatmap({ questionResults }: FatigueHeatmapProps) {
  // Group into blocks of 5 questions to show fatigue trends
  const blockSize = 5;
  const blocks = [];
  for (let i = 0; i < questionResults.length; i += blockSize) {
    blocks.push(questionResults.slice(i, i + blockSize));
  }

  const getHeatColor = (avgTime: number, accuracy: number) => {
    // If accuracy is low and time is high -> Fatigue / Overthinking
    if (accuracy < 50 && avgTime > 180) return 'bg-red-500';
    // If accuracy is low and time is low -> Rushing / Fatigue
    if (accuracy < 50 && avgTime < 60) return 'bg-orange-500';
    // If accuracy is high -> In flow
    if (accuracy >= 80) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fatigue Heatmap</CardTitle>
        <CardDescription>
          Visualize how your focus and accuracy dropped over time. Red/Orange areas indicate fatigue or rushing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 justify-center">
          <TooltipProvider>
            {questionResults.map((qr, i) => {
              const accuracy = qr.isCorrect ? 100 : 0;
              const color = qr.isCorrect ? 'bg-green-500' : qr.isAttempted ? 'bg-red-500' : 'bg-muted';
              
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div 
                      className={cn(
                        "w-10 h-10 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-sm transition-transform hover:scale-110 cursor-help",
                        color
                      )}
                    >
                      {qr.questionNumber}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p className="font-bold">Question {qr.questionNumber}</p>
                      <p>Time: {Math.round(qr.timeSpent)}s</p>
                      <p>Status: {qr.isCorrect ? 'Correct' : qr.isAttempted ? 'Incorrect' : 'Skipped'}</p>
                      <p>Subject: {qr.subject}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
        
        <div className="mt-8 flex justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded" /> Correct (Focus)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded" /> Incorrect (Fatigue/Error)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-muted rounded" /> Skipped</div>
        </div>
      </CardContent>
    </Card>
  );
}
