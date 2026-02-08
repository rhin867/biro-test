import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface DifficultyAnalysisProps {
  questionResults: QuestionResult[];
  questions: { id: string; level: string }[];
}

type DifficultyLevel = 'Easy' | 'Moderate' | 'Tough';

function getDifficultyFromLevel(level: string): DifficultyLevel {
  const l = level?.toLowerCase() || 'moderate';
  if (l === 'easy' || l === 'simple') return 'Easy';
  if (l === 'tough' || l === 'difficult' || l === 'hard') return 'Tough';
  return 'Moderate';
}

interface DifficultyData {
  difficulty: DifficultyLevel;
  correct: number;
  incorrect: number;
  unattempted: number;
  total: number;
}

function getDifficultyBreakdown(
  questionResults: QuestionResult[],
  questions: { id: string; level: string }[],
  subject?: Subject
): DifficultyData[] {
  const filtered = subject
    ? questionResults.filter(q => q.subject === subject)
    : questionResults;

  const levels: DifficultyLevel[] = ['Easy', 'Moderate', 'Tough'];
  return levels.map(difficulty => {
    const qs = filtered.filter(qr => {
      const q = questions.find(tq => tq.id === qr.questionId);
      return getDifficultyFromLevel(q?.level || '') === difficulty;
    });
    return {
      difficulty,
      correct: qs.filter(q => q.isCorrect).length,
      incorrect: qs.filter(q => q.isAttempted && !q.isCorrect).length,
      unattempted: qs.filter(q => !q.isAttempted).length,
      total: qs.length,
    };
  }).filter(d => d.total > 0);
}

export function DifficultyAnalysis({ questionResults, questions }: DifficultyAnalysisProps) {
  const renderSection = (subject?: Subject) => {
    const data = getDifficultyBreakdown(questionResults, questions, subject);
    const title = subject ? `${subject} Difficulty Analysis` : 'Overall Difficulty Analysis';

    return (
      <div className="space-y-6">
        {/* Table View */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Difficulty</th>
                    <th className="text-center py-3 px-4 font-medium text-correct">Attempted Correct</th>
                    <th className="text-center py-3 px-4 font-medium text-incorrect">Attempted Wrong</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Not Attempted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(row => (
                    <tr key={row.difficulty} className="border-b border-border/50">
                      <td className="py-3 px-4 font-medium">{row.difficulty}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-correct font-semibold">{row.correct}</span>
                        <span className="text-muted-foreground text-xs">/{row.total} Qs</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-incorrect font-semibold">{row.incorrect}</span>
                        <span className="text-muted-foreground text-xs">/{row.total} Qs</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold">{row.unattempted}</span>
                        <span className="text-muted-foreground text-xs">/{row.total} Qs</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Graph View */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Graphical Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-correct" />
                Correct
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-incorrect" />
                Incorrect
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-muted" />
                Unattempted
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} barCategoryGap="20%">
                <XAxis
                  dataKey="difficulty"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="correct" name="Correct" fill="hsl(var(--correct))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="incorrect" name="Incorrect" fill="hsl(var(--incorrect))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unattempted" name="Unattempted" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Difficulty Analysis</CardTitle>
          <CardDescription>
            Performance breakdown by question difficulty — Easy, Moderate, and Tough
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overall" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overall">Overall</TabsTrigger>
              <TabsTrigger value="physics">Physics</TabsTrigger>
              <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
              <TabsTrigger value="maths">Mathematics</TabsTrigger>
            </TabsList>
            <TabsContent value="overall">{renderSection()}</TabsContent>
            <TabsContent value="physics">{renderSection('Physics')}</TabsContent>
            <TabsContent value="chemistry">{renderSection('Chemistry')}</TabsContent>
            <TabsContent value="maths">{renderSection('Maths')}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
