import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AttemptAnalysisProps {
  questionResults: QuestionResult[];
}

type AttemptQuality = 'Perfect' | 'Overtime' | 'Wasted' | 'Confused' | 'Normal';

function classifyAttempt(q: QuestionResult, idealTime: number = 180): AttemptQuality {
  if (q.isCorrect) {
    return q.timeSpent <= idealTime ? 'Perfect' : 'Overtime';
  }
  if (q.isAttempted && !q.isCorrect) {
    return q.timeSpent < idealTime * 0.25 ? 'Wasted' : 'Overtime';
  }
  if (!q.isAttempted && q.timeSpent > idealTime * 0.5) {
    return 'Confused';
  }
  return 'Normal';
}

const qualityColors: Record<AttemptQuality, string> = {
  Perfect: 'hsl(142, 76%, 36%)',
  Overtime: 'hsl(30, 95%, 55%)',
  Wasted: 'hsl(0, 84%, 60%)',
  Confused: 'hsl(48, 96%, 53%)',
  Normal: 'hsl(var(--muted-foreground))',
};

const qualityDescriptions: Record<AttemptQuality, string> = {
  Perfect: 'Correct answer in ideal time',
  Overtime: 'Took longer than expected',
  Wasted: 'Wrong answer with very little time spent (guessing)',
  Confused: 'Spent time but didn\'t answer',
  Normal: 'Skipped quickly',
};

export function AttemptAnalysis({ questionResults }: AttemptAnalysisProps) {
  const getSubjectData = (subject: Subject | 'All') => {
    const qs = subject === 'All' ? questionResults : questionResults.filter(q => q.subject === subject);
    
    const counts: Record<AttemptQuality, number> = {
      Perfect: 0, Overtime: 0, Wasted: 0, Confused: 0, Normal: 0,
    };

    qs.forEach(q => {
      const quality = classifyAttempt(q);
      counts[quality]++;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([quality, count]) => ({
        name: quality,
        value: count,
        color: qualityColors[quality as AttemptQuality],
        description: qualityDescriptions[quality as AttemptQuality],
        percentage: qs.length > 0 ? ((count / qs.length) * 100).toFixed(1) : '0',
      }));
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{data.description}</p>
          <p className="text-sm font-medium mt-1">{data.value} questions ({data.percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  const renderDonut = (subject: Subject | 'All') => {
    const data = getSubjectData(subject);
    if (data.length === 0) {
      return <p className="text-center text-muted-foreground py-8">No data</p>;
    }

    return (
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex flex-wrap gap-3 justify-center">
          {data.map(item => (
            <div
              key={item.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border"
            >
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm">
                {item.name}: {item.value} ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attempt Quality Analysis</CardTitle>
        <CardDescription>
          Categorization of your attempt patterns: Perfect, Overtime, Wasted, or Confused
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Overall</TabsTrigger>
            <TabsTrigger value="physics">Physics</TabsTrigger>
            <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
            <TabsTrigger value="maths">Maths</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{renderDonut('All')}</TabsContent>
          <TabsContent value="physics">{renderDonut('Physics')}</TabsContent>
          <TabsContent value="chemistry">{renderDonut('Chemistry')}</TabsContent>
          <TabsContent value="maths">{renderDonut('Maths')}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
