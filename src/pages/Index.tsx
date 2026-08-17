import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to dashboard as the primary entry point, matching the "previous" feel
    navigate('/dashboard');
  }, [navigate]);

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading AspirantAI...</p>
      </div>
    </MainLayout>
  );
}
