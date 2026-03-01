import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getResults } from '@/lib/storage';
import {
  Target, Trophy, TrendingUp, Flame, GraduationCap, Save, MapPin,
  BookOpen, Clock, Zap, Star,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  Legend, Cell,
} from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const GOAL_KEY = 'jee_cbt_goal';

interface GoalData {
  targetExam: string;
  targetCollege: string;
  targetBranch: string;
  targetScore: number;
  targetPercentile: number;
  dailyHours: number;
  monthsRemaining: number;
}

const COLLEGE_DATA: Record<string, { minScore: number; percentile: number; image: string }> = {
  'IIT Bombay - CS': { minScore: 280, percentile: 99.99, image: '🏛️' },
  'IIT Delhi - CS': { minScore: 275, percentile: 99.98, image: '🏛️' },
  'IIT Madras - CS': { minScore: 270, percentile: 99.97, image: '🏛️' },
  'IIT Kanpur - CS': { minScore: 265, percentile: 99.95, image: '🏛️' },
  'IIT Kharagpur - CS': { minScore: 260, percentile: 99.93, image: '🏛️' },
  'IIT Roorkee - CS': { minScore: 250, percentile: 99.90, image: '🏛️' },
  'NIT Trichy - CS': { minScore: 220, percentile: 99.50, image: '🎓' },
  'NIT Warangal - CS': { minScore: 210, percentile: 99.30, image: '🎓' },
  'NIT Surathkal - CS': { minScore: 200, percentile: 99.00, image: '🎓' },
  'BITS Pilani - CS': { minScore: 240, percentile: 99.80, image: '🎓' },
  'IIIT Hyderabad - CS': { minScore: 250, percentile: 99.85, image: '🎓' },
  'DTU Delhi': { minScore: 190, percentile: 98.50, image: '🎓' },
  'NSUT Delhi': { minScore: 185, percentile: 98.00, image: '🎓' },
  'AIIMS Delhi (NEET)': { minScore: 680, percentile: 99.99, image: '🏥' },
  'JIPMER (NEET)': { minScore: 650, percentile: 99.90, image: '🏥' },
  'MAMC Delhi (NEET)': { minScore: 660, percentile: 99.95, image: '🏥' },
  'Custom Target': { minScore: 200, percentile: 99.00, image: '🎯' },
};

function getDefaultGoal(): GoalData {
  try {
    const saved = localStorage.getItem(GOAL_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    targetExam: 'JEE Mains',
    targetCollege: 'IIT Bombay - CS',
    targetBranch: 'Computer Science',
    targetScore: 280,
    targetPercentile: 99.99,
    dailyHours: 8,
    monthsRemaining: 6,
  };
}

export default function GoalTracker() {
  const [goal, setGoal] = useState<GoalData>(getDefaultGoal());
  const results = getResults();

  const latestScore = results.length > 0
    ? Math.round((results[results.length - 1].score / results[results.length - 1].maxScore) * goal.targetScore)
    : 0;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.score / r.maxScore), 0) / results.length * goal.targetScore)
    : 0;

  const collegeInfo = COLLEGE_DATA[goal.targetCollege] || COLLEGE_DATA['Custom Target'];
  const targetScore = goal.targetCollege === 'Custom Target' ? goal.targetScore : collegeInfo.minScore;
  const scoreGap = Math.max(0, targetScore - avgScore);
  const progressPercent = targetScore > 0 ? Math.min(100, Math.round((avgScore / targetScore) * 100)) : 0;

  // Effort calculation
  const totalStudyHours = goal.dailyHours * goal.monthsRemaining * 30;
  const hoursNeededPerMark = scoreGap > 0 ? Math.round(totalStudyHours / scoreGap) : 0;

  // Trend data
  const trendData = results.slice(-10).map((r, i) => ({
    name: `Test ${i + 1}`,
    score: Math.round((r.score / r.maxScore) * targetScore),
    target: targetScore,
    accuracy: Math.round(r.accuracy),
  }));

  // Subject gap analysis
  const subjectGaps = results.length > 0 ? (() => {
    const latest = results[results.length - 1];
    return (['Physics', 'Chemistry', 'Maths'] as const).map(s => {
      const data = latest.subjectWise[s];
      const subjectMax = Math.round(targetScore / 3);
      const subjectScore = data.total > 0 ? Math.round((data.score / data.maxScore) * subjectMax) : 0;
      return {
        name: s === 'Maths' ? 'Mathematics' : s,
        current: subjectScore,
        target: subjectMax,
        gap: Math.max(0, subjectMax - subjectScore),
        accuracy: data.accuracy,
      };
    });
  })() : [];

  const saveGoal = () => {
    localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
    toast.success('Goal saved!');
  };

  return (
    <MainLayout>
      <PageHeader
        title="Goal Tracker"
        description="Set your target college and track your progress"
      >
        <Button className="gap-2 glow-primary" onClick={saveGoal}>
          <Save className="h-4 w-4" />
          Save Goal
        </Button>
      </PageHeader>

      {/* Goal Setup */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Target Exam</label>
          <Select value={goal.targetExam} onValueChange={v => setGoal({ ...goal, targetExam: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="JEE Mains">JEE Mains</SelectItem>
              <SelectItem value="JEE Advanced">JEE Advanced</SelectItem>
              <SelectItem value="NEET">NEET</SelectItem>
              <SelectItem value="CUET">CUET</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Target College</label>
          <Select value={goal.targetCollege} onValueChange={v => {
            const info = COLLEGE_DATA[v];
            setGoal({ ...goal, targetCollege: v, targetScore: info?.minScore || 200, targetPercentile: info?.percentile || 99 });
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(COLLEGE_DATA).map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Daily Study Hours</label>
          <Input type="number" value={goal.dailyHours} min={1} max={16}
            onChange={e => setGoal({ ...goal, dailyHours: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Months Remaining</label>
          <Input type="number" value={goal.monthsRemaining} min={1} max={24}
            onChange={e => setGoal({ ...goal, monthsRemaining: Number(e.target.value) })} />
        </div>
      </div>

      {/* Goal Distance Hero */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="text-6xl">{collegeInfo.image}</div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold">{goal.targetCollege}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Required: {targetScore} marks • {collegeInfo.percentile}%ile
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Your Avg: <span className="font-bold text-primary">{avgScore}</span></span>
                    <span>Target: <span className="font-bold text-review">{targetScore}</span></span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                </div>
              </div>
            </div>
            <div className="text-center p-4 rounded-xl bg-card border border-border">
              <p className="text-3xl font-bold text-primary">{scoreGap}</p>
              <p className="text-xs text-muted-foreground">Marks Gap</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{progressPercent}%</p>
            <p className="text-xs text-muted-foreground">Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-correct mb-2" />
            <p className="text-2xl font-bold">{latestScore}</p>
            <p className="text-xs text-muted-foreground">Latest Score (scaled)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-6 w-6 mx-auto text-review mb-2" />
            <p className="text-2xl font-bold">{totalStudyHours}h</p>
            <p className="text-xs text-muted-foreground">Total Study Hours Left</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Flame className="h-6 w-6 mx-auto text-incorrect mb-2" />
            <p className="text-2xl font-bold">{hoursNeededPerMark || '∞'}</p>
            <p className="text-xs text-muted-foreground">Hours/Mark Needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart & Subject Gap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Score Trend vs Target</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} domain={[0, targetScore]} />
                  <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }} />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Your Score" />
                  <Line type="monotone" dataKey="target" stroke="hsl(var(--review))" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Target" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                <p>Complete tests to see your trend</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subject Gap Analysis</CardTitle>
            <CardDescription>Marks gap per subject to reach your target</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectGaps.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={subjectGaps}>
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }} />
                  <Legend />
                  <Bar dataKey="current" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Current" />
                  <Bar dataKey="gap" fill="hsl(var(--incorrect))" radius={[4, 4, 0, 0]} name="Gap" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                <p>Complete tests to see subject gaps</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Effort Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-review" />
            Effort Required to Reach Your Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Metric</th>
                  <th className="text-center py-3 px-4 font-medium">Current</th>
                  <th className="text-center py-3 px-4 font-medium">Target</th>
                  <th className="text-center py-3 px-4 font-medium">Gap</th>
                  <th className="text-center py-3 px-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/30">
                  <td className="py-3 px-4">Overall Score</td>
                  <td className="py-3 px-4 text-center font-bold text-primary">{avgScore}</td>
                  <td className="py-3 px-4 text-center font-bold text-review">{targetScore}</td>
                  <td className="py-3 px-4 text-center font-bold text-incorrect">{scoreGap}</td>
                  <td className="py-3 px-4 text-center text-xs text-muted-foreground">
                    {scoreGap > 50 ? 'Focus on weak topics aggressively' : scoreGap > 20 ? 'Consistent practice needed' : 'Almost there! Maintain accuracy'}
                  </td>
                </tr>
                {subjectGaps.map(s => (
                  <tr key={s.name} className="border-b border-border/30">
                    <td className="py-3 px-4">{s.name}</td>
                    <td className="py-3 px-4 text-center">{s.current}</td>
                    <td className="py-3 px-4 text-center">{s.target}</td>
                    <td className={cn('py-3 px-4 text-center font-medium', s.gap > 20 ? 'text-incorrect' : 'text-correct')}>
                      {s.gap}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className={cn('text-xs',
                        s.gap > 20 ? 'border-incorrect/30 text-incorrect' : 'border-correct/30 text-correct'
                      )}>
                        {s.gap > 20 ? 'High Priority' : s.gap > 10 ? 'Medium' : 'On Track'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {scoreGap > 0 && (
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm">
                <Star className="h-4 w-4 inline mr-1 text-review" />
                <strong>Daily Target:</strong> You need to improve by approximately{' '}
                <span className="font-bold text-primary">
                  {(scoreGap / (goal.monthsRemaining * 30)).toFixed(1)} marks/day
                </span>{' '}
                with {goal.dailyHours} hours of daily study over {goal.monthsRemaining} months to reach{' '}
                <span className="font-bold">{goal.targetCollege}</span>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
