import React from 'react';
import { Test, AnswerKey } from '@/types/exam';

interface AnswerKeyInputProps {
  test: Test;
  existingKey?: AnswerKey;
  onAnswerKeySubmit: (answerKey: AnswerKey) => void;
}

export function AnswerKeyInput({ test, existingKey, onAnswerKeySubmit }: AnswerKeyInputProps) {
  return null;
}
