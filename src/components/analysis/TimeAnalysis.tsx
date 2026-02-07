import React from 'react';
import { QuestionResult, Subject } from '@/types/exam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface TimeAnalysisProps {
  questionResults: QuestionResult[];
  totalDuration: number; // in minutes
}

export function TimeAnalysis({ questionResults, totalDuration }: TimeAnalysisProps) {
  // Quality of time spent
  const timeOnCorrect = questionResults
    .filter(q => q.isCorrect)
    .reduce((sum, q) => sum + q.timeSpent, 0);
  const timeOnIncorrect = questionResults
    .filter(q => q.isAttempted && !q.isCorrect)
    .reduce((sum, q) => sum + q.timeSpent, 0);
  const timeOnUnattempted = questionResults
    .filter(q => !q.isAttempted)
    .reduce((sum, q) => sum + q.timeSpent, 0);
  const totalTime = timeOnCorrect + timeOnIncorrect + timeOnUnattempted;

  const correctPercent = totalTime > 0 ? ((timeOnCorrect / totalTime) * 100).toFixed(1) : '0';
  const incorrectPercent = totalTime > 0 ? ((timeOnIncorrect / totalTime) * 100).toFixed(1) : '0';
  const unattemptedPercent = totalTime > 0 ? ((timeOnUnattempted / totalTime) * 100).toFixed(1) : '0';

  // Time journey - break into 30-min chunks
  const chunkMinutes = 30;
  const numChunks = Math.ceil(totalDuration / chunkMinutes);
  
  // Sort questions by their approximate time position
  // We'll estimate position from cumulative time spent
  let cumulativeTime = 0;
  const questionsWithPosition = questionResults.map(q => {
    const start = cumulativeTime;
    cumulativeTime += q.timeSpent;
    return { ...q, positionMinute: (start + cumulativeTime) / 2 / 60 };
  });

  const timeJourneyData = Array.from({ length: numChunks }, (_, i) => {
    const rangeStart = i * chunkMinutes;
    const rangeEnd = (i + 1) * chunkMinutes;
    const questionsInRange = questionsWithPosition.filter(
      q => q.positionMinute >= rangeStart && q.positionMinute < rangeEnd
    );
    const correct = questionsInRange.filter(q => q.isCorrect).length;
    const incorrect = questionsInRange.filter(q => q.isAttempted && !q.isCorrect).length;
    
    return {
      period: `${rangeStart}-${rangeEnd}M`,
      'Correct Attempts': correct,
      'Incorrect Attempts': incorrect,
      Overall: questionsInRange.length,
    };
  });

  // Subject-wise time breakdown
  const subjectTimeData = (['Physics', 'Chemistry', 'Maths'] as Subject[]).map(subject => {
    const subjectQs = questionResults.filter(q => q.subject === subject);
    const correct = subjectQs.filter(q => q.isCorrect).reduce((s, q) => s + q.timeSpent, 0);
    const incorrect = subjectQs.filter(q => q.isAttempted && !q.isCorrect).reduce((s, q) => s + q.timeSpent, 0);
    const unattempted = subjectQs.filter(q => !q.isAttempted).reduce((s, q) => s + q.timeSpent, 0);
    const total = correct + incorrect + unattempted;
    return {
      name: subject,
      'Time on Correct': Math.round(correct / 60),
      'Time on Incorrect': Math.round(incorrect / 60),
      'Time on Unattempted': Math.round(unattempted / 60),
      total: Math.round(total / 60),
    };
  }).filter(s => s.total > 0);

  return (
    <div className="space-y-6">
      {/* Quality of Time Spent */}
      <Card>
        <CardHeader>
          <CardTitle>Quality of Time Spent</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overall" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overall">Overall</TabsTrigger>
              <TabsTrigger value="mathematics">Mathematics</TabsTrigger>
              <TabsTrigger value="physics">Physics</TabsTrigger>
              <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
            </TabsList>
            <TabsContent value="overall">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-correct" />
                    Time on Correct Qs: {Math.round(timeOnCorrect / 60)} mins
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-incorrect" />
                    Time on Incorrect Qs: {Math.round(timeOnIncorrect / 60)} mins
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                    Time on Unattempted Qs: {Math.round(timeOnUnattempted / 60)} mins
                  </div>
                </div>

                {/* Stacked bar */}
                <div className="w-full h-8 rounded-lg overflow-hidden flex">
                  <div
                    className="bg-correct flex items-center justify-center text-xs font-medium text-correct-foreground"
                    style={{ width: `${correctPercent}%` }}
                  >
                    {Number(correctPercent) > 10 && `${correctPercent}%`}
                  </div>
                  <div
                    className="bg-incorrect flex items-center justify-center text-xs font-medium text-incorrect-foreground"
                    style={{ width: `${incorrectPercent}%` }}
                  >
                    {Number(incorrectPercent) > 10 && `${incorrectPercent}%`}
                  </div>
                  <div
                    className="bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground"
                    style={{ width: `${unattemptedPercent}%` }}
                  >
                    {Number(unattemptedPercent) > 10 && `${unattemptedPercent}%`}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Overall Time: {Math.round(totalTime / 60)} mins
                </p>
              </div>
            </TabsContent>
            {(['mathematics', 'physics', 'chemistry'] as const).map(subjectKey => {
              const subject = subjectKey === 'mathematics' ? 'Maths' : subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1) as Subject;
              const subjectQs = questionResults.filter(q => q.subject === subject);
              const sc = subjectQs.filter(q => q.isCorrect).reduce((s, q) => s + q.timeSpent, 0);
              const si = subjectQs.filter(q => q.isAttempted && !q.isCorrect).reduce((s, q) => s + q.timeSpent, 0);
              const su = subjectQs.filter(q => !q.isAttempted).reduce((s, q) => s + q.timeSpent, 0);
              const st = sc + si + su;
              return (
                <TabsContent key={subjectKey} value={subjectKey}>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-correct" />
                        Time on Correct: {Math.round(sc / 60)} mins
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-incorrect" />
                        Time on Incorrect: {Math.round(si / 60)} mins
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                        Time on Unattempted: {Math.round(su / 60)} mins
                      </div>
                    </div>
                    <div className="w-full h-8 rounded-lg overflow-hidden flex">
                      {st > 0 && (
                        <>
                          <div className="bg-correct" style={{ width: `${(sc / st * 100)}%` }} />
                          <div className="bg-incorrect" style={{ width: `${(si / st * 100)}%` }} />
                          <div className="bg-muted" style={{ width: `${(su / st * 100)}%` }} />
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Total: {Math.round(st / 60)} mins</p>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Time Journey Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Time Period</th>
                  <th className="text-center py-3 px-4 font-medium text-correct">Correct Attempts</th>
                  <th className="text-center py-3 px-4 font-medium text-incorrect">Incorrect Attempts</th>
                  <th className="text-center py-3 px-4 font-medium">Overall</th>
                </tr>
              </thead>
              <tbody>
                {timeJourneyData.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 px-4 font-medium">{row.period}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-correct font-medium">{row['Correct Attempts']}</span>
                      <span className="text-muted-foreground text-xs"> Qs</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-incorrect font-medium">{row['Incorrect Attempts']}</span>
                      <span className="text-muted-foreground text-xs"> Qs</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-medium">{row.Overall}</span>
                      <span className="text-muted-foreground text-xs"> Qs</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Graphical View of Attempts Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Graphical View of Attempts Over {Math.ceil(totalDuration / 60)} Hour(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded-full bg-correct" />
              Correct
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded-full bg-incorrect" />
              Incorrect
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded bg-muted border border-border" />
              Overall
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeJourneyData}>
              <XAxis
                dataKey="period"
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
              <Line
                type="monotone"
                dataKey="Correct Attempts"
                stroke="hsl(var(--correct))"
                strokeWidth={2}
                dot
              />
              <Line
                type="monotone"
                dataKey="Incorrect Attempts"
                stroke="hsl(var(--incorrect))"
                strokeWidth={2}
                dot
              />
              <Line
                type="monotone"
                dataKey="Overall"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
