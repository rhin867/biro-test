import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/exam/StatCard';
import { MultiProgressBar } from '@/components/exam/ProgressBar';
import { supabase } from '@/integrations/supabase/client';
import { LatexRenderer } from '@/components/ui/latex-renderer';
import { Star, MessageSquare, Clock, Plus, Target, TrendingUp, ChevronRight, FileText, BarChart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTests, getResults } from '@/lib/storage';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

function DailyHotQuestionPreview() {
  const [question, setQuestion] = useState<any>(null);
  const [isAlarmSet, setIsAlarmSet] = useState(false);
  const [alarmTime, setAlarmTime] = useState("");

  useEffect(() => {
    supabase.from('hot_questions').select('*').order('created_at', { ascending: false }).limit(1).then(({ data }) => {
      if (data && data.length > 0) {
        // Only show if question is less than 24 hours old
        const createdDate = new Date(data[0].created_at);
        const now = new Date();
        const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
        
        if (diffHours < 24) {
          setQuestion(data[0]);
          // Notify user if not already seen (optional basic logic)
          if (!localStorage.getItem(`notified_q_${data[0].id}`)) {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("New Challenge Available!", {
                body: "A new Daily Hot Question has been posted. Solve it now!",
              });
              localStorage.setItem(`notified_q_${data[0].id}`, "true");
            }
          }
        }
      }
    });

    const savedAlarm = localStorage.getItem('user_alarm_time');
    if (savedAlarm) setAlarmTime(savedAlarm);
  }, []);

  const handleSetAlarm = () => {
    if (!alarmTime) return;
    localStorage.setItem('user_alarm_time', alarmTime);
    setIsAlarmSet(true);
    toast.success(`Reminder set for ${alarmTime} daily`);
    
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    if (!alarmTime) return;
    const interval = setInterval(() => {
      const now = new Date();
      const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (current === alarmTime) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Daily Challenge Reminder", {
            body: "It's time for your scheduled Daily Hot Question practice!",
          });
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [alarmTime]);

  if (!question) {
    return (
      <Card className="border-dashed border-primary/20 bg-background flex items-center justify-center p-6 min-h-[160px]">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
            <Star className="h-4 w-4 opacity-50" />
            <p className="text-sm font-bold uppercase tracking-tighter">Question of the Day</p>
          </div>
          <p className="text-xs text-muted-foreground font-medium">Today hasn't had any question yet. Chill guys!</p>
          <p className="text-[10px] text-muted-foreground/60 italic">Check back later or solve previous challenges below.</p>
          <div className="pt-2">
            <Link to="/hot-question">
              <Button variant="ghost" size="sm" className="h-7 text-[10px] hover:text-primary underline-offset-4 hover:underline">
                View History →
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-primary/50 bg-primary/5 shadow-neon overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      <CardHeader className="py-3 flex flex-row items-center justify-between relative z-10">
        <div className="flex flex-col">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 animate-pulse" />
            <span className="font-bold tracking-tight uppercase">Question of the Day</span>
          </CardTitle>
          <div className="flex items-center gap-2 ml-6">
            <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-primary/30 text-primary uppercase font-bold">
              {question.question_type || 'MCQ'}
            </Badge>
            <p className="text-[10px] text-muted-foreground font-medium">{new Date(question.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 bg-card/50 p-1 rounded border border-border/50">
            <Clock className="h-3 w-3 text-primary" />
            <input 
              type="time" 
              className="bg-transparent text-[10px] border-none focus:ring-0 w-16 p-0 h-4" 
              value={alarmTime}
              onChange={(e) => setAlarmTime(e.target.value)}
            />
            <Button size="icon" variant="ghost" className="h-4 w-4" onClick={handleSetAlarm} title="Set daily alarm">
              <Plus className="h-2 w-2" />
            </Button>
          </div>
          <Link to="/hot-question">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 group-hover:bg-primary/20">
              Solve <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pb-4 relative z-10">
        <div className="bg-card/50 backdrop-blur-sm p-4 rounded-lg border border-border/50 group-hover:border-primary/30 transition-colors">
          <div className="space-y-3">
            {question.image_url && (
              <div className="h-24 w-full bg-white rounded border border-border/50 flex items-center justify-center overflow-hidden">
                <img src={question.image_url} alt="Question preview" className="h-full object-contain" />
              </div>
            )}
            <div className="text-sm line-clamp-2 overflow-hidden font-medium">
              <LatexRenderer content={question.content} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1">
              {question.options && question.options.slice(0, 4).map((_, i) => (
                <div key={i} className="w-5 h-5 rounded-full border border-border/50 flex items-center justify-center text-[9px] font-bold text-muted-foreground bg-background/50">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <Link to="/hot-question" className="text-[10px] text-primary hover:underline font-bold tracking-tight">SOLVE & DISCUSS →</Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const tests = getTests();
  const results = getResults();

  // Calculate overall stats
  const totalTests = tests.length;
  const totalAttempts = results.length;
  const avgAccuracy =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.accuracy, 0) / results.length
      : 0;
  const avgScore =
    results.length > 0
      ? results.reduce((sum, r) => sum + (r.score / r.maxScore) * 100, 0) / results.length
      : 0;

  // Recent results for chart
  const recentResults = results.slice(-5).map((r) => ({
    name: r.testName.substring(0, 15),
    score: Math.round((r.score / r.maxScore) * 100),
    accuracy: Math.round(r.accuracy),
  }));

  // Subject distribution from latest result
  const latestResult = results[results.length - 1];
  const subjectData = latestResult
    ? [
        {
          name: 'Physics',
          value: latestResult.subjectWise.Physics.correct,
          color: 'hsl(199, 89%, 48%)',
        },
        {
          name: 'Chemistry',
          value: latestResult.subjectWise.Chemistry.correct,
          color: 'hsl(142, 76%, 36%)',
        },
        {
          name: 'Maths',
          value: latestResult.subjectWise.Maths.correct,
          color: 'hsl(280, 65%, 60%)',
        },
      ]
    : [];

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard"
        description="Track your JEE preparation progress"
      >
        <Link to="/create">
          <Button className="gap-2 glow-primary">
            <Plus className="h-4 w-4" />
            Create New Test
          </Button>
        </Link>
      </PageHeader>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <DailyHotQuestionPreview />
        <Card className="border-primary/20 bg-primary/5 flex items-center justify-center p-6 min-h-[160px] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
          <div className="text-center space-y-2 relative z-10">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BarChart className="h-4 w-4 text-primary animate-pulse" />
              <p className="text-sm font-bold text-primary tracking-widest uppercase">Performance Analysis</p>
            </div>
            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
              Your behavioral metrics, heatmaps, and difficulty trends will unlock here.
            </p>
            <div className="pt-2">
              <Link to="/history">
                <Button variant="outline" size="sm" className="h-8 text-[10px] gap-2 hover:bg-primary/10 border-primary/30">
                  <Clock className="h-3 w-3" /> PREVIOUS REPORTS
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Tests"
          value={totalTests}
          icon={FileText}
          subtitle="Tests created"
          variant="primary"
        />
        <StatCard
          title="Tests Attempted"
          value={totalAttempts}
          icon={Target}
          subtitle="Completed attempts"
        />
        <StatCard
          title="Avg. Accuracy"
          value={`${avgAccuracy.toFixed(1)}%`}
          icon={TrendingUp}
          variant={avgAccuracy >= 60 ? 'correct' : 'incorrect'}
          subtitle={avgAccuracy >= 60 ? 'Good performance' : 'Needs improvement'}
        />
        <StatCard
          title="Avg. Score"
          value={`${avgScore.toFixed(1)}%`}
          icon={BarChart}
          subtitle="Overall score"
        />
      </div>

      {/* Quick Actions & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Get started with your practice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/create" className="block">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Upload PDF</p>
                    <p className="text-xs text-muted-foreground">Create test from PDF</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            </Link>
            <Link to="/tests" className="block">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-physics/10 p-2">
                    <FileText className="h-5 w-5 text-physics" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">My Tests</p>
                    <p className="text-xs text-muted-foreground">View all tests</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            </Link>
            <Link to="/mistakes" className="block">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-review/10 p-2">
                    <TrendingUp className="h-5 w-5 text-review" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Mistake Book</p>
                    <p className="text-xs text-muted-foreground">Review mistakes</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Performance Trend</CardTitle>
            <CardDescription>Score and accuracy over recent tests</CardDescription>
          </CardHeader>
          <CardContent>
            {recentResults.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RechartsBarChart data={recentResults}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Score %" />
                  <Bar dataKey="accuracy" fill="hsl(var(--correct))" radius={[4, 4, 0, 0]} name="Accuracy %" />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                <p>No test data yet. Create and attempt a test to see performance trends.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Distribution & Recent Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subject Distribution</CardTitle>
            <CardDescription>Correct answers by subject (latest test)</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectData.length > 0 && subjectData.some(d => d.value > 0) ? (
              <div className="flex items-center justify-center gap-8">
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie
                      data={subjectData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {subjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {subjectData.map((subject) => (
                    <div key={subject.name} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="text-sm">{subject.name}</span>
                      <span className="text-sm font-medium">{subject.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[150px] items-center justify-center text-muted-foreground">
                <p>Complete a test to see subject distribution</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest test attempts</CardDescription>
            </div>
            <Link to="/history">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="space-y-4">
                {results.slice(-3).reverse().map((result) => (
                  <div
                    key={result.attemptId}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{result.testName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(result.completedAt).toLocaleDateString()}
                      </p>
                      <MultiProgressBar
                        segments={[
                          { value: result.correct, variant: 'correct' },
                          { value: result.incorrect, variant: 'incorrect' },
                          { value: result.skipped, variant: 'skipped' },
                        ]}
                        total={result.totalQuestions}
                        size="sm"
                        className="mt-2"
                      />
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-primary">
                        {result.score}/{result.maxScore}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.accuracy.toFixed(1)}% accuracy
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[150px] items-center justify-center text-muted-foreground">
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
