import React from 'react';
import { cn } from '@/lib/utils';
import { Question } from '@/types/exam';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getSubjectColor } from '@/lib/exam-utils';

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  onAnswerSelect: (answer: string) => void;
  showCorrectAnswer?: boolean;
  className?: string;
}

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  showCorrectAnswer = false,
  className,
}: QuestionDisplayProps) {
  const subjectColor = getSubjectColor(question.subject);

  const getOptionClass = (option: string) => {
    if (!showCorrectAnswer) {
      return selectedAnswer === option ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50';
    }
    
    if (option === question.correctAnswer) {
      return 'border-correct bg-correct/10';
    }
    if (selectedAnswer === option && option !== question.correctAnswer) {
      return 'border-incorrect bg-incorrect/10';
    }
    return 'border-border opacity-60';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Question Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            {questionNumber}
          </span>
          <div>
            <p className="text-sm text-muted-foreground">
              Question {questionNumber} of {totalQuestions}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`badge-${subjectColor}`}>
                {question.subject}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {question.chapter}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {question.type}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Question Text */}
      <div className="rounded-lg bg-card border border-border p-6">
        <p className="text-lg leading-relaxed whitespace-pre-wrap">
          {question.question}
        </p>
        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt="Question diagram"
            className="mt-4 max-h-64 rounded-lg object-contain"
          />
        )}
      </div>

      {/* Options */}
      <RadioGroup
        value={selectedAnswer || ''}
        onValueChange={onAnswerSelect}
        className="space-y-3"
        disabled={showCorrectAnswer}
      >
        {(['A', 'B', 'C', 'D'] as const).map((option) => (
          <Label
            key={option}
            htmlFor={`option-${option}`}
            className={cn(
              'flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all duration-200',
              getOptionClass(option)
            )}
          >
            <RadioGroupItem
              value={option}
              id={`option-${option}`}
              className="mt-0.5"
            />
            <div className="flex-1">
              <span className="font-semibold text-primary mr-2">({option})</span>
              <span className="whitespace-pre-wrap">{question.options[option]}</span>
            </div>
            {showCorrectAnswer && option === question.correctAnswer && (
              <Badge className="bg-correct text-correct-foreground">
                Correct
              </Badge>
            )}
            {showCorrectAnswer && selectedAnswer === option && option !== question.correctAnswer && (
              <Badge className="bg-incorrect text-incorrect-foreground">
                Your Answer
              </Badge>
            )}
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
