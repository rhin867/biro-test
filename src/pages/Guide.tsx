import React from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, FileText, BarChart, Crop, Clock, MessageSquare, Trophy, 
  Settings, BookOpen, Target, ExternalLink, Shield, HelpCircle
} from 'lucide-react';

const sections = [
  {
    icon: Upload, title: 'Create Test from PDF',
    steps: [
      'Go to Settings and enter your Gemini API key (one time only)',
      'Go to Create Test → Upload your PDF (any format, any numbering)',
      'Configure test name, duration, and marking scheme',
      'Click "Extract Questions" — AI extracts all questions in 30-40 seconds',
      'Review extracted questions, then click Create Test',
    ],
  },
  {
    icon: Crop, title: 'Manual PDF Cropping',
    steps: [
      'After uploading PDF, click the "Crop Tool" button',
      'Navigate between pages using arrow buttons',
      'Click and drag to select a question region',
      'Click "Crop Selection" to save that crop',
      'Repeat for each question, then click "Use Crops"',
    ],
  },
  {
    icon: ExternalLink, title: 'External Test Analysis',
    steps: [
      'Go to External Analysis from the sidebar',
      'Start a timer or screen monitor while taking a test on another platform',
      'After the test, upload the question paper PDF/image',
      'Upload or type the answer key and your chosen answers',
      'Click "Generate Advanced Analysis" for detailed insights',
    ],
  },
  {
    icon: FileText, title: 'Taking a CBT Test',
    steps: [
      'Go to My Tests → Select a test → Start Exam',
      'Answer questions using the question palette',
      'Mark questions for review if unsure',
      'Submit when done — you can enter answer key afterwards',
    ],
  },
  {
    icon: BarChart, title: 'Analysis & Insights',
    steps: [
      'After submitting, view detailed analysis',
      'See subject-wise breakdown, difficulty analysis, time analysis',
      'Check mistake patterns and missed concepts',
      'Compare attempts to track improvement',
    ],
  },
  {
    icon: BookOpen, title: 'Mistake Book',
    steps: [
      'Wrong answers are automatically saved to your Mistake Book',
      'Reattempt questions to master them',
      'Filter by subject, chapter, or mistake type',
    ],
  },
  {
    icon: Target, title: 'Goal Tracker',
    steps: [
      'Set target scores for each subject',
      'Track your progress over time',
      'Upload images to document your study journey',
    ],
  },
  {
    icon: MessageSquare, title: 'Community & Live Chat',
    steps: [
      'Set your display name (locked for 24 hours)',
      'Post suggestions, report bugs, or chat',
      'Earn XP rewards for participation',
      'Share your progress on WhatsApp, Telegram, or Reddit',
    ],
  },
  {
    icon: Settings, title: 'Settings & Profile',
    steps: [
      'Enter your Gemini API key (required for PDF extraction)',
      'Create a Profile ID + Password to save your data',
      'Use the same ID on any device to restore your data',
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
