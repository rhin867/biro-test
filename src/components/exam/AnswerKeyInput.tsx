import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Test, AnswerKey } from '@/types/exam';
import { CheckCircle, Upload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AnswerKeyInputProps {
  test: Test;
  onAnswerKeySubmit: (answerKey: AnswerKey) => void;
  existingKey?: AnswerKey;
}

export function AnswerKeyInput({ test, onAnswerKeySubmit, existingKey }: AnswerKeyInputProps) {
  const [answerKey, setAnswerKey] = useState<AnswerKey>(existingKey || {});
  const [bulkInput, setBulkInput] = useState('');

  const handleSingleAnswerChange = (questionId: string, answer: string) => {
    const validAnswer = answer.toUpperCase();
    if (validAnswer && !['A', 'B', 'C', 'D'].includes(validAnswer)) {
      return;
    }
    setAnswerKey((prev) => ({
      ...prev,
      [questionId]: validAnswer,
    }));
  };

  const handleBulkParse = () => {
    // Parse bulk input format: "1-A, 2-B, 3-C" or "1.A 2.B 3.C" or "ABCD..." sequence
    const cleaned = bulkInput.trim().toUpperCase();
    
    // Check if it's a sequence like "ABCDABCD..."
    if (/^[ABCD]+$/.test(cleaned)) {
      const newKey: AnswerKey = {};
      cleaned.split('').forEach((answer, index) => {
        if (test.questions[index]) {
          newKey[test.questions[index].id] = answer;
        }
      });
      setAnswerKey(newKey);
      toast.success(`Parsed ${Object.keys(newKey).length} answers from sequence`);
      return;
    }

    // Parse formats like "1-A, 2-B" or "1.A 2.B" or "1:A 2:B"
    const matches = cleaned.match(/(\d+)\s*[-.:]\s*([ABCD])/g);
    if (matches) {
      const newKey: AnswerKey = {};
      matches.forEach((match) => {
        const parts = match.match(/(\d+)\s*[-.:]\s*([ABCD])/);
        if (parts) {
          const qNum = parseInt(parts[1]);
          const answer = parts[2];
          const question = test.questions.find((q) => q.questionNumber === qNum);
          if (question) {
            newKey[question.id] = answer;
          }
        }
      });
      setAnswerKey(newKey);
      toast.success(`Parsed ${Object.keys(newKey).length} answers`);
      return;
    }

    toast.error('Could not parse answer key. Try formats like "1-A, 2-B" or "ABCDABCD..."');
  };

  const handleSubmit = () => {
    const filledCount = Object.values(answerKey).filter((v) => v).length;
    if (filledCount === 0) {
      toast.error('Please enter at least one answer');
      return;
    }
    onAnswerKeySubmit(answerKey);
    toast.success(`Answer key saved with ${filledCount} answers`);
  };

  const filledCount = Object.values(answerKey).filter((v) => v).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Answer Key
        </CardTitle>
        <CardDescription>
          Enter the correct answers to enable analysis. You can add them now or after taking the test.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bulk Input */}
        <div className="space-y-2">
          <Label>Bulk Input</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., 1-A, 2-B, 3-C or ABCDABCD..."
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleBulkParse} variant="secondary">
              Parse
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supported formats: "1-A, 2-B, 3-C" | "1.A 2.B" | "ABCDABCD..."
          </p>
        </div>

        {/* Individual Answers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Individual Answers</Label>
            <Badge variant="outline">
              {filledCount}/{test.questions.length} filled
            </Badge>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[300px] overflow-y-auto p-2">
            {test.questions.map((q) => (
              <div key={q.id} className="relative">
                <Input
                  className="h-10 w-10 text-center uppercase font-medium p-0"
                  maxLength={1}
                  value={answerKey[q.id] || ''}
                  onChange={(e) => handleSingleAnswerChange(q.id, e.target.value)}
                  placeholder={String(q.questionNumber)}
                />
                <span className="absolute -top-2 -left-1 text-[10px] text-muted-foreground bg-background px-1">
                  {q.questionNumber}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Analysis will be available after submitting answer key</span>
          </div>
          <Button onClick={handleSubmit} className="gap-2">
            <Upload className="h-4 w-4" />
            Save Answer Key
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
