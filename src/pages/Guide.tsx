import React from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, FileText, BarChart, Crop, Clock, MessageSquare, 
  Settings, BookOpen, Target, ExternalLink, Zap
} from 'lucide-react';

const sections = [
  {
    icon: Upload, title: 'Create Test from PDF',
    steps: [
      'Go to Create Test → Upload your PDF (any JEE/NEET format)',
      'Configure test name, duration, and marking scheme',
      'Click "Extract Questions" — AI extracts all questions in 20-40 seconds',
      'No API key needed! Extraction is powered by built-in AI',
      'Review extracted questions with LaTeX math rendering, then click Create Test',
    ],
  },
  {
    icon: Crop, title: 'Manual PDF Cropping',
    steps: [
      'After uploading PDF, click "Open Manual Crop Tool"',
      'Navigate between pages using arrow buttons',
      'Click and drag on the page to select any region',
      'Click "Crop Selection" to save that cropped region',
      'Repeat for each question/diagram, then click "Use Crops"',
    ],
  },
  {
    icon: ExternalLink, title: 'External Test Analysis',
    steps: [
      'Go to External Analysis from the sidebar',
      'Start a timer or screen monitor while taking a test on another platform',
      'After the test, upload the question paper PDF/image',
      'Upload or type the answer key AND your chosen answers (text or image)',
      'Click "Generate Advanced Analysis" for detailed insights',
    ],
  },
  {
    icon: FileText, title: 'Taking a CBT Test',
    steps: [
      'Go to My Tests → Select a test → Start Exam',
      'Answer questions using the JEE-style question palette',
      'Mark questions for review, use Save & Next',
      'Timer counts down — auto-submits when time runs out',
      'Submit when done — enter answer key afterwards if needed',
    ],
  },
  {
    icon: BarChart, title: 'Analysis & Insights',
    steps: [
      'After submitting, view detailed analysis dashboard',
      'Subject-wise breakdown, difficulty analysis, time analysis',
      'Mistake pattern detection and weak concept identification',
      'Compare multiple attempts to track improvement',
    ],
  },
  {
    icon: Zap, title: 'Sharing Tests',
    steps: [
      'Go to My Tests → Click "Share Test" on any test',
      'Generate a unique share link/code',
      'Share the link — anyone can take the test via the link',
    ],
  },
  {
    icon: BookOpen, title: 'Mistake Book',
    steps: [
      'Wrong answers are automatically saved to Mistake Book',
      'Reattempt questions to master them',
      'Filter by subject, chapter, or mistake type',
    ],
  },
  {
    icon: Target, title: 'Goal Tracker',
    steps: [
      'Set target scores for each subject',
      'Track your progress over time with visual charts',
    ],
  },
  {
    icon: MessageSquare, title: 'Community & Live Chat',
    steps: [
      'Set your display name (locked for 24 hours)',
      'Post suggestions, report bugs, or chat with other students',
      'All messages visible to every user in real-time',
    ],
  },
  {
    icon: Settings, title: 'Settings & Profile',
    steps: [
      'Create a Profile ID + Password to save/restore data across devices',
      'Optionally add Gemini API key for backup AI processing',
      'Install the app as PWA for offline access',
    ],
  },
];

export default function Guide() {
  return (
    <MainLayout>
      <PageHeader title="App Guide" description="Learn how to use every feature of JEE CBT Analyzer" />
      <div className="space-y-4">
        {sections.map((section, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <section.icon className="h-5 w-5 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {section.steps.map((step, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs flex-shrink-0">
                      {j + 1}
                    </Badge>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </MainLayout>
  );
}
