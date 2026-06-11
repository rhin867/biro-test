import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Question } from '@/types/exam';
  const getOptionClass = (option: string) => {
    if (!showCorrectAnswer) {
      if (question.type === 'MSQ') {
        const selected = selectedAnswer ? selectedAnswer.split(',') : [];
        return selected.includes(option) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50';
      }
      return selectedAnswer === option ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50';
    }
    
    if (question.type === 'MSQ') {
      const correct = question.correctAnswer ? question.correctAnswer.split(',') : [];
      const selected = selectedAnswer ? selectedAnswer.split(',') : [];
      if (correct.includes(option)) return 'border-correct bg-correct/10';
      if (selected.includes(option) && !correct.includes(option)) return 'border-incorrect bg-incorrect/10';
      return 'border-border opacity-60';
    }
    if (option === question.correctAnswer) return 'border-correct bg-correct/10';
    if (selectedAnswer === option && option !== question.correctAnswer) return 'border-incorrect bg-incorrect/10';
    return 'border-border opacity-60';
  };
  const handleMsqToggle = (option: string) => {
    if (showCorrectAnswer) return;
    const current = selectedAnswer ? selectedAnswer.split(',') : [];
    let updated;
    if (current.includes(option)) {
      updated = current.filter(o => o !== option);
    } else {
      updated = [...current, option].sort();
    }
    onAnswerSelect(updated.join(','));
  };
  const questionPageImage = question.pdfPageNumber 
    ? pdfPageImages.find(p => p.pageNumber === question.pdfPageNumber)
    : null;
        <div className="text-lg leading-relaxed whitespace-pre-wrap">
          <LatexRenderer content={question.question} />
        </div>
        {/* Show diagram directly below question */}
        {question.croppedImageUrl && (
          <img src={question.croppedImageUrl} alt="Question diagram" className="mt-4 max-h-64 rounded-lg object-contain border border-border" />
        )}
        {question.imageUrl && !question.croppedImageUrl && (
          <img src={question.imageUrl} alt="Question diagram" className="mt-4 max-h-64 rounded-lg object-contain" />
        )}
        {!question.croppedImageUrl && !question.imageUrl && question.hasDiagram && questionPageImage && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2">📷 Diagram from PDF Page {question.pdfPageNumber}:</p>
            <img src={questionPageImage.imageDataUrl} alt={`Page ${question.pdfPageNumber}`} className="max-h-48 rounded object-contain" />
        {/* Show diagram directly below question prominently */}
        {question.croppedImageUrl ? (
          <img src={question.croppedImageUrl} alt="Question diagram" className="mt-6 max-w-full rounded-lg object-contain border border-border mx-auto max-h-[400px]" />
        ) : question.imageUrl ? (
          <img src={question.imageUrl} alt="Question diagram" className="mt-6 max-w-full rounded-lg object-contain mx-auto max-h-[400px]" />
        ) : question.hasDiagram && questionPageImage ? (
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-3 font-medium">📷 Reference Diagram (Extracted from PDF Page {question.pdfPageNumber}):</p>
            <img src={questionPageImage.imageDataUrl} alt={`Page ${question.pdfPageNumber}`} className="max-w-full rounded object-contain mx-auto border border-border/50 max-h-[600px] shadow-sm" />
          </div>
        )}
        ) : null}
      </div>
      {/* Numerical Input or MCQ Options */}
            </div>
          )}
        </div>
      ) : question.type === 'MSQ' ? (
        <div className="space-y-3">
          {(['A', 'B', 'C', 'D'] as const).map((option) => {
            const isSelected = selectedAnswer?.split(',').includes(option);
            const isCorrect = question.correctAnswer?.split(',').includes(option);
            return (
              <Label key={option} htmlFor={`option-${option}`}
                onClick={() => handleMsqToggle(option)}
                className={cn('flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all duration-200', getOptionClass(option))}>
                <div className={cn("mt-1 w-4 h-4 rounded-sm border", isSelected ? "bg-primary border-primary" : "border-primary")}>
                  {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full text-primary-foreground"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-primary mr-2">({option})</span>
                  <LatexRenderer content={question.options[option]} className="whitespace-pre-wrap" />
                </div>
                {showCorrectAnswer && isCorrect && (
                  <Badge className="bg-correct text-correct-foreground">Correct</Badge>
                )}
                {showCorrectAnswer && isSelected && !isCorrect && (
                  <Badge className="bg-incorrect text-incorrect-foreground">Your Answer</Badge>
                )}
              </Label>
            );
          })}
        </div>
      ) : (
        <RadioGroup value={selectedAnswer || ''} onValueChange={onAnswerSelect} className="space-y-3" disabled={showCorrectAnswer}>
          {(['A', 'B', 'C', 'D'] as const).map((option) => (
  );
}
