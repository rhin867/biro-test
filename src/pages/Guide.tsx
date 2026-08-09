import React, { useEffect, useState } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import telegramQR from '@/assets/telegram-qr.png';
import { fetchQuotaInfo, QuotaInfo } from '@/lib/app-settings';
import {
  Upload, FileText, BarChart, Crop, Clock, MessageSquare,
  Settings, BookOpen, Target, ExternalLink, Zap, Bot, Gamepad2, Coins, ShieldCheck,
  GitBranch, Database, Layout, Server, Cpu,
} from 'lucide-react';

const sections = [
  {
    icon: Upload, title: 'Create Test from PDF',
    steps: [
      'Go to Create Test → Upload any JEE/NEET PDF (scanned or text)',
      'AI extracts all questions in 20-40 seconds — no API key or credits needed',
      'Questions without options automatically become numerical input type',
      'Review extracted questions, then click Create Test to save',
    ],
  },
  {
    icon: Crop, title: 'Manual PDF Cropping',
    steps: [
      'After uploading, click "Open Manual Crop Tool"',
      'Click & drag on any page to select a region (works on mobile too)',
      'Click "Crop" to save — repeat for diagrams, questions, etc.',
      'Use cropped images as question diagrams in your test',
    ],
  },
  {
    icon: ExternalLink, title: 'External Test Analysis',
    steps: [
      'Start timer/screen monitor while taking test on another platform',
      'Upload question paper (PDF/image) and answer key',
      'Upload your chosen answers as image/PDF or type manually',
      'Get detailed analysis with subject-wise breakdown',
    ],
  },
  {
    icon: FileText, title: 'Taking a CBT Test',
    steps: [
      'Go to My Tests → Start Test for JEE-style exam interface',
      'MCQ: select option. Numerical: type your answer',
      'Mark for review, Save & Next, question palette navigation',
      'Auto-submits when timer ends. Add answer key after if needed',
    ],
  },
  {
    icon: Zap, title: 'Sharing Tests',
    steps: [
      'Click "Share" on any test to generate a link',
      'Share link works for ANYONE on ANY device',
      'Recipients can add test to library and take it with full analysis',
    ],
  },
  {
    icon: BarChart, title: 'Analysis & Insights',
    steps: [
      'Subject-wise accuracy, difficulty analysis, time analysis',
      'Mistake patterns, weak concepts, score potential',
      'Compare multiple attempts, download full analysis report',
      'Use Biro-Brain AI for personalized explanations',
    ],
  },
  {
    icon: Bot, title: 'Biro-Brain AI Assistant',
    steps: [
      'Open from sidebar → Ask any JEE/NEET doubt',
      'Get step-by-step solutions with LaTeX math',
      'Ask for study plans, concept explanations, exam tips',
      'Analyze your test performance and get improvement suggestions',
    ],
  },
  {
    icon: BookOpen, title: 'Mistake Book',
    steps: [
      'Wrong answers automatically saved to Mistake Book',
      'Reattempt questions to master them',
      'Filter by subject, chapter, or mistake type',
    ],
  },
  {
    icon: Target, title: 'Goal Tracker',
    steps: [
      'Select target college and upload its image',
      'Track progress with visual gap analysis',
      'Get daily mark improvement targets',
    ],
  },
  {
    icon: MessageSquare, title: 'Community & Live Chat',
    steps: [
      'Set display name (locked 24h after first message)',
      'Live chat visible to all users in real-time',
      'Post suggestions, bugs, or rate the app',
    ],
  },
  {
    icon: Settings, title: 'Settings & Data',
    steps: [
      'Create Profile ID + Password to save/restore data',
      'All tests, attempts, and analysis persist locally',
      'Export/Import data as JSON for backup',
      'Install as PWA for offline access',
    ],
  },
];

export default function Guide() {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  
  useEffect(() => {
    fetchQuotaInfo().then(setQuota);
    
    // Support deep linking to sections via URL hash
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, []);

  return (
    <MainLayout>
      <PageHeader title="App Guide" description="Learn how to use every feature of Biro Test CBT Analyzer" />
      
      {/* Table of Contents */}
      <Card className="mb-6 bg-secondary/30">
        <CardContent className="pt-6">
          <p className="text-sm font-bold mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Quick Links
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {sections.map((section, i) => (
              <button 
                key={i} 
                onClick={() => {
                  const id = section.title.toLowerCase().replace(/\s+/g, '-');
                  const el = document.getElementById(id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="text-xs text-primary hover:underline flex items-center gap-1.5 p-2 rounded hover:bg-primary/10 transition-colors text-left w-full"
              >
                <section.icon className="h-3.5 w-3.5" />
                {section.title}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {/* Credits & Limits */}
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-5 w-5 text-primary" /> Credits, Limits & Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              The app is <span className="font-semibold text-foreground">free to use</span> — you don't pay for AI extractions.
              To keep the shared AI service healthy, each user has a daily and monthly limit on how many tests they can create.
            </p>
            {quota && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-xs text-muted-foreground">Today</p>
                  <p className="text-lg font-bold">{quota.dailyUsed} / {quota.dailyLimit}</p>
                  <p className="text-xs text-muted-foreground">{quota.dailyRemaining} remaining</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-xs text-muted-foreground">This month</p>
                  <p className="text-lg font-bold">{quota.monthlyUsed} / {quota.monthlyLimit}</p>
                  <p className="text-xs text-muted-foreground">{quota.monthlyRemaining} remaining</p>
                </div>
              </div>
            )}
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>1 AI call = 1 PDF extraction (creating one test).</li>
              <li>Biro-Brain doubt solving and study plan generation do <span className="font-semibold text-foreground">not</span> count toward this quota.</li>
              <li>Quotas reset automatically at midnight (daily) and at the start of each month.</li>
              <li>When you're close to your limit, the Create Test page warns you so you can plan ahead.</li>
              <li>Owners can change these limits in Admin Panel → Quotas.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Security note */}
        <Card className="border-correct/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-correct" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>All passwords (test-creation password and owner panel passwords) are stored and verified <span className="font-semibold text-foreground">on the server</span>.</p>
            <p>The browser only sends what you type; it never receives or stores the real password.</p>
            <p>Owner password changes also require the live owner password to be re-verified server-side.</p>
          </CardContent>
        </Card>

        {sections.map((section, i) => (
          <Card key={i} id={section.title.toLowerCase().replace(/\s+/g, '-')} className="scroll-mt-20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <section.icon className="h-5 w-5 text-primary" /> {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {section.steps.map((step, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="mt-0.5 h-5 w-5 flex items-center justify-center p-0 text-xs flex-shrink-0">{j + 1}</Badge>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 pt-3 border-t border-border/30">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Explore more topics:</p>
                <div className="flex flex-wrap gap-2">
                  {sections.filter(s => s.title !== section.title).map((s, idx) => (
                    <Button 
                      key={idx}
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] gap-1 px-2 text-primary hover:bg-primary/5"
                      onClick={() => {
                        const id = s.title.toLowerCase().replace(/\s+/g, '-');
                        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <s.icon className="h-3 w-3" />
                      {s.title}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Connect Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="h-5 w-5 text-primary" /> Connect With Us
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              <img src={telegramQR} alt="Telegram QR" className="w-28 h-28 rounded-lg border border-border" />
              <div className="space-y-2">
                <a href="https://t.me/biroskills" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2"><ExternalLink className="h-4 w-4" /> Join Telegram: t.me/biroskills</Button>
                </a>
                <br />
                <a href="https://biro-log.vercel.app" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2"><ExternalLink className="h-4 w-4" /> Study Tracker: biro-log.vercel.app</Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
