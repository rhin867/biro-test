import React from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Rocket, FileText, BarChart, Settings, ExternalLink, Zap } from 'lucide-react';

export default function Index() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-neon">
              <Rocket className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground uppercase italic">
            Aspirant<span className="text-primary not-italic font-black">AI</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Advanced Performance Analysis & CBT Preparation Suite for JEE/NEET/CUET.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link to="/create">
              <Button size="lg" className="h-14 px-8 glow-primary text-base font-bold uppercase tracking-widest gap-2">
                <FileText className="h-5 w-5" /> Start Analyzing
              </Button>
            </Link>
            <Link to="/guide">
              <Button variant="outline" size="lg" className="h-14 px-8 border-primary/20 text-base font-bold uppercase tracking-widest gap-2">
                User Guide
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-card/50 border-primary/10 hover:border-primary/30 transition-all group">
            <CardHeader>
              <Zap className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-lg">Smart Extraction</h10:
              <CardDescription>Convert any PDF question paper into a digital CBT test in seconds.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 border-primary/10 hover:border-primary/30 transition-all group">
            <CardHeader>
              <BarChart className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-lg">Deep Analysis</CardTitle>
              <CardDescription>Fatigue heatmaps, behavioral metrics, and subject-wise accuracy reports.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 border-primary/10 hover:border-primary/30 transition-all group">
            <CardHeader>
              <Settings className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-lg">Mistake Book</CardTitle>
              <CardDescription>Automatically track and categorize errors to prioritize your practice.</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-primary/5 border-primary/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Rocket className="w-64 h-64 rotate-45" />
          </div>
          <CardContent className="p-8 space-y-6 relative z-10 text-center">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Ready to boost your score?</h2>
            <p className="text-muted-foreground font-medium max-w-xl mx-auto">
              Join thousands of aspirants using data-driven insights to refine their exam strategy.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/auth">
                <Button className="glow-primary px-8 uppercase font-bold tracking-widest">Sign Up Free</Button>
              </Link>
              <a href="https://t.me/biroskills" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" className="text-primary hover:bg-primary/5 uppercase font-bold tracking-widest gap-2">
                  <ExternalLink className="h-4 w-4" /> Telegram
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
