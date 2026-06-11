import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
  const [bulkInput, setBulkInput] = useState('');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const handleSingleAnswerChange = (questionId: string, answer: string) => {
    const validAnswer = answer.toUpperCase();
    if (validAnswer && !['A', 'B', 'C', 'D'].includes(validAnswer)) {
      return;
    }
  const handleSingleAnswerChange = (questionNum: string, answer: string) => {
    const validAnswer = answer.toUpperCase().replace(/[^A-D]/g, '');
    setAnswerKey((prev) => ({
      ...prev,
      [questionId]: validAnswer,
      [questionNum]: validAnswer,
    }));
  };
  const handleBulkParse = () => {
    const cleaned = bulkInput.trim().toUpperCase();
    
    if (/^[ABCD]+$/.test(cleaned)) {
      const newKey: AnswerKey = {};
      cleaned.split('').forEach((answer, index) => {
        if (test.questions[index]) {
          newKey[test.questions[index].id] = answer;
          newKey[String(test.questions[index].questionNumber)] = answer;
        }
      });
      setAnswerKey(newKey);
          const answer = parts[2];
          const question = test.questions.find((q) => q.questionNumber === qNum);
          if (question) {
            newKey[question.id] = answer;
            newKey[String(question.questionNumber)] = answer;
          }
        }
      });
          const qNum = parseInt(qNumStr);
          const question = test.questions.find(q => q.questionNumber === qNum);
          if (question && typeof answer === 'string') {
            newKey[question.id] = answer.toUpperCase();
            newKey[String(question.questionNumber)] = answer.toUpperCase();
          }
        });
        
                <Input
                  className="h-10 w-10 text-center uppercase font-medium p-0"
                  maxLength={1}
                  value={answerKey[q.id] || ''}
                  onChange={(e) => handleSingleAnswerChange(q.id, e.target.value)}
                  value={answerKey[String(q.questionNumber)] || answerKey[q.id] || ''}
                  onChange={(e) => handleSingleAnswerChange(String(q.questionNumber), e.target.value)}
                  placeholder={String(q.questionNumber)}
                />
                <span className="absolute -top-2 -left-1 text-[10px] text-muted-foreground bg-background px-1">
  );
}
