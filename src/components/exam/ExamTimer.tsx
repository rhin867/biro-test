import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/exam-utils';
import { Clock, Hourglass } from 'lucide-react';

interface ExamTimerProps {
  initialTime: number; // in seconds
  onTimeUp: () => void;
  onTick?: (remaining: number) => void;
  isPaused?: boolean;
  className?: string;
}

export function ExamTimer({
  initialTime,
  onTimeUp,
  onTick,
  isPaused = false,
  className,
}: ExamTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [showRemaining, setShowRemaining] = useState(true);

  const getTimerClass = useCallback(() => {
    const percentage = (timeRemaining / initialTime) * 100;
    if (percentage <= 10) return 'timer-critical';
    if (percentage <= 25) return 'timer-warning';
    return 'timer-normal';
  }, [timeRemaining, initialTime]);

  useEffect(() => {
    if (isPaused || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (onTick) onTick(newTime);
        if (newTime <= 0) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, onTimeUp, onTick, timeRemaining]);

  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  const elapsed = initialTime - timeRemaining;

  return (
    <div 
      className={cn('flex items-center gap-2 cursor-pointer select-none transition-all hover:scale-105', className)}
      onClick={() => setShowRemaining(!showRemaining)}
      title={showRemaining ? "Click to see elapsed time" : "Click to see remaining time"}
    >
      {showRemaining ? (
        <Clock className={cn('h-5 w-5', getTimerClass())} />
      ) : (
        <Hourglass className={cn('h-5 w-5 text-primary')} />
      )}
      <div className="flex flex-col items-start leading-none">
        <span className={cn('font-mono text-xl font-bold', showRemaining ? getTimerClass() : 'text-primary')}>
          {formatTime(showRemaining ? timeRemaining : elapsed)}
        </span>
        <span className="text-[8px] uppercase font-black tracking-tighter opacity-50">
          {showRemaining ? 'Remaining' : 'Elapsed'}
        </span>
      </div>
    </div>
  );
}

interface QuestionTimerProps {
  questionId: string;
  isActive: boolean;
  onTimeUpdate: (questionId: string, seconds: number) => void;
  className?: string;
}

export function QuestionTimer({
  questionId,
  isActive,
  onTimeUpdate,
  className,
}: QuestionTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setElapsed((prev) => {
        const newTime = prev + 1;
        onTimeUpdate(questionId, newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, questionId, onTimeUpdate]);

  useEffect(() => {
    setElapsed(0);
  }, [questionId]);

  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      Time on question: <span className="font-mono font-medium">{formatTime(elapsed)}</span>
    </div>
  );
}
