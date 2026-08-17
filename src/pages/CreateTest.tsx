import React from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function CreateTest() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <PageHeader 
          title="Create New Test" 
          description="Transform your PDFs into interactive CBT-style practice tests."
        />
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>System Maintenance</AlertTitle>
          <AlertDescription>
            PDF uploading and processing features are currently being upgraded to ensure better stability, visibility, and performance. 
            Please check back soon for the new and improved PDF-to-CBT engine.
          </AlertDescription>
        </Alert>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>We are rebuilding the extraction engine for a smoother experience.</CardDescription>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center text-muted-foreground italic">
            PDF features temporarily disabled for reconstruction.
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
