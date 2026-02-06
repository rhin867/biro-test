import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTestByShareCode, saveTest, getTests, generateId } from '@/lib/storage';
import { Test } from '@/types/exam';
import { Clock, FileText, Target, Play, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function JoinTest() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alreadyExists, setAlreadyExists] = useState(false);

  useEffect(() => {
    if (shareCode) {
      const foundTest = getTestByShareCode(shareCode);
      if (foundTest) {
        setTest(foundTest);
        
        // Check if user already has this test
        const existingTests = getTests();
        const exists = existingTests.some(t => t.id === foundTest.id);
        setAlreadyExists(exists);
      }
      setIsLoading(false);
    }
  }, [shareCode]);

  const handleAddTest = () => {
    if (!test) return;
    
    // Clone the test with a new ID for the user
    const clonedTest: Test = {
      ...test,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    
    saveTest(clonedTest);
    toast.success('Test added to your library!');
    navigate(`/exam/${clonedTest.id}`);
  };

  const handleStartDirectly = () => {
    if (!test) return;
    navigate(`/exam/${test.id}`);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Loading test...</p>
        </div>
      </MainLayout>
    );
  }

  if (!test) {
    return (
      <MainLayout>
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Test Not Found</h2>
          <p className="text-muted-foreground">
            The share code "{shareCode}" is invalid or has expired.
          </p>
          <Button onClick={() => navigate('/tests')}>
            Go to My Tests
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Join Test"
        description="You've been invited to take this test"
      />

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{test.name}</CardTitle>
            <CardDescription>{test.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Info */}
            <div className="flex flex-wrap gap-2">
              {test.subjects.map((subject) => (
                <Badge key={subject} variant="outline" className={`badge-${subject.toLowerCase()}`}>
                  {subject}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-muted p-4">
                <FileText className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-2xl font-bold mt-2">{test.questions.length}</p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <Clock className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-2xl font-bold mt-2">{test.duration}</p>
                <p className="text-sm text-muted-foreground">Minutes</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <Target className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-2xl font-bold mt-2">{test.totalMarks}</p>
                <p className="text-sm text-muted-foreground">Marks</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm">
                <strong>Marking Scheme:</strong> +{test.positiveMarking} for correct, -{test.negativeMarking} for wrong
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {alreadyExists ? (
                <Button onClick={handleStartDirectly} className="flex-1 gap-2">
                  <Play className="h-4 w-4" />
                  Start Test
                </Button>
              ) : (
                <>
                  <Button onClick={handleAddTest} className="flex-1 gap-2">
                    <Copy className="h-4 w-4" />
                    Add to My Tests & Start
                  </Button>
                  <Button variant="outline" onClick={handleStartDirectly}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Directly
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
