import React, { useState, useEffect } from 'react';
import { QuestionResult, Question } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface GhostReplayProps {
  questionResults: QuestionResult[];
}

export function GhostReplay({ questionResults }: GhostReplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isPlaying && currentIdx < questionResults.length) {
      interval = setInterval(() => {
        setCurrentIdx(prev => {
          if (prev >= questionResults.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000); // 1s per question for "replay"
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIdx, questionResults.length]);

  useEffect(() => {
    setProgress(((currentIdx + 1) / questionResults.length) * 100);
  }, [currentIdx, questionResults.length]);

  const currentQ = questionResults[currentIdx];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ghost Replay</CardTitle>
        <CardDescription>
          Re-watch your attempt timeline to identify where you spent too much time or panicked.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button size="icon" variant="outline" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="outline" onClick={() => { setCurrentIdx(0); setIsPlaying(false); }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm font-medium">
            Question {currentQ.questionNumber} of {questionResults.length}
          </div>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/30 rounded-xl border border-border">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Subject</p>
              <p className="font-semibold">{currentQ.subject}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Time Spent</p>
              <p className="text-2xl font-bold font-mono">{Math.round(currentQ.timeSpent)}s</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Outcome</p>
              <p className={cn(
                "text-lg font-bold",
                currentQ.isCorrect ? "text-green-500" : currentQ.isAttempted ? "text-red-500" : "text-muted-foreground"
              )}>
                {currentQ.isCorrect ? "CORRECT" : currentQ.isAttempted ? "INCORRECT" : "SKIPPED"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Chapter</p>
              <p className="text-sm truncate">{currentQ.chapter}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
