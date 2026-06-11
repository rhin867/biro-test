import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
  };
  // Handle timer tick
  const handleTimerTick = (remaining: number) => {
    if (attempt) {
      const updated = { ...attempt, timeRemaining: remaining };
  const handleTimerTick = useCallback((remaining: number) => {
    if (attemptRef.current) {
      const updated = { ...attemptRef.current, timeRemaining: remaining };
      setAttempt(updated);
      attemptRef.current = updated;
    }
  };
  }, []);
  // Submit test
  const handleSubmitTest = () => {
  );
}
