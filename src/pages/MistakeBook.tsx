import React, { useState } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMistakeBook, removeFromMistakeBook, updateMistakeBookEntry } from '@/lib/storage';
import { getMistakeTypeLabel } from '@/lib/exam-utils';
import { Subject, MistakeType } from '@/types/exam';
import { BookOpen, Trash2, CheckCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function MistakeBook() {
  const [entries, setEntries] = useState(getMistakeBook());
  const [filterSubject, setFilterSubject] = useState<Subject | 'All'>('All');
  const [filterMistakeType, setFilterMistakeType] = useState<MistakeType | 'All'>('All');

  const filteredEntries = entries.filter((e) => {
    if (filterSubject !== 'All' && e.question.subject !== filterSubject) return false;
    if (filterMistakeType !== 'All' && !e.mistakeTypes.includes(filterMistakeType)) return false;
    return true;
  });

  const handleRemove = (id: string) => {
    removeFromMistakeBook(id);
    setEntries(getMistakeBook());
    toast.success('Removed from Mistake Book');
  };

  const handleMarkMastered = (id: string) => {
    updateMistakeBookEntry(id, { mastered: true });
    setEntries(getMistakeBook());
    toast.success('Marked as mastered!');
  };

  return (
    <MainLayout>
      <PageHeader title="Mistake Book" description={`${entries.length} questions for revision`}>
        <div className="flex gap-2">
          <Select value={filterSubject} onValueChange={(v) => setFilterSubject(v as Subject | 'All')}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Subjects</SelectItem>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="Chemistry">Chemistry</SelectItem>
              <SelectItem value="Maths">Maths</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {filteredEntries.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Mistakes Yet</h3>
            <p className="text-muted-foreground">Wrong questions will appear here for revision</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className={cn(entry.mastered && 'opacity-60 border-correct/50')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`badge-${entry.question.subject.toLowerCase()}`}>
                      {entry.question.subject}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{entry.question.chapter}</span>
                    {entry.mastered && <Badge className="bg-correct">Mastered</Badge>}
                  </div>
                  <div className="flex gap-1">
                    {!entry.mastered && (
                      <Button variant="ghost" size="icon" onClick={() => handleMarkMastered(entry.id)}>
                        <CheckCircle className="h-4 w-4 text-correct" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(entry.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm mb-3 line-clamp-2">{entry.question.question}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {entry.mistakeTypes.map((mt) => (
                      <Badge key={mt} variant="secondary" className="text-xs">{getMistakeTypeLabel(mt)}</Badge>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">From: {entry.testName}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
