import React from 'react';
import { cn } from '@/lib/utils';
import { QuestionStatus, Subject, QuestionType, Question } from '@/types/exam';

interface NTAQuestionPaletteProps {
  totalQuestions: number;
  currentQuestion: number;
  questionStatuses: Record<number, QuestionStatus>;
  questionSubjects: Record<number, Subject>;
  onQuestionClick: (questionNumber: number) => void;
  currentSubject: Subject;
  className?: string;
  testQuestions?: Question[];
}

const statusStyles: Record<QuestionStatus, string> = {
  unattempted: 'bg-secondary text-secondary-foreground hover:bg-accent',
  answered: 'bg-correct text-correct-foreground',
  'marked-review': 'bg-review text-review-foreground',
  'answered-marked': 'bg-gradient-to-br from-correct to-review text-correct-foreground',
  skipped: 'bg-incorrect text-incorrect-foreground',
};

export function NTAQuestionPalette({
  totalQuestions,
  currentQuestion,
  questionStatuses,
  questionSubjects,
  onQuestionClick,
  currentSubject,
  className,
  testQuestions,
}: NTAQuestionPaletteProps) {
  const [filter, setFilter] = React.useState<{
    subject: Subject | 'All';
    type: QuestionType | 'All';
    status: QuestionStatus | 'All';
    section: string | 'All';
  }>({
    subject: currentSubject,
    type: 'All',
    status: 'All',
    section: 'All',
  });

  // Update subject filter when currentSubject changes from parent (e.g. via tabs)
  React.useEffect(() => {
    setFilter(prev => ({ ...prev, subject: currentSubject }));
  }, [currentSubject]);

  const allQuestionNums = Array.from({ length: totalQuestions }, (_, i) => i + 1);
  
  const filteredQuestions = allQuestionNums.filter((num) => {
    const q = testQuestions ? testQuestions[num - 1] : null;
    const status = questionStatuses[num] || 'unattempted';
    const subject = questionSubjects[num];

    if (filter.subject !== 'All' && subject !== filter.subject) return false;
    if (filter.status !== 'All' && status !== filter.status) return false;
    if (filter.type !== 'All' && q && q.type !== filter.type) return false;
    if (filter.section !== 'All' && q && q.chapter !== filter.section) return false;
    
    return true;
  });

  const sections = React.useMemo(() => {
    if (!testQuestions) return [];
    return [...new Set(testQuestions.map(q => q.chapter))].filter(Boolean) as string[];
  }, [testQuestions]);

  // Stats (only for current filtered view or per subject? Usually NTA shows stats per subject)
  const statsQuestions = allQuestionNums.filter(num => questionSubjects[num] === currentSubject);
  const answeredCount = statsQuestions.filter(num => ['answered', 'answered-marked'].includes(questionStatuses[num])).length;
  const markedCount = statsQuestions.filter(num => ['marked-review', 'answered-marked'].includes(questionStatuses[num])).length;
  const notVisitedCount = statsQuestions.filter(num => questionStatuses[num] === 'unattempted').length;
  const notAnsweredCount = statsQuestions.filter(num => questionStatuses[num] === 'skipped').length;

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header & Filters */}
      <div className="p-3 border-b border-border bg-muted/50">
        <h3 className="text-sm font-semibold text-center mb-2">Question Palette</h3>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1">
            <select 
              value={filter.subject} 
              onChange={(e) => setFilter(prev => ({ ...prev, subject: e.target.value as any }))}
              className="text-[10px] p-1 border rounded bg-background h-7"
            >
              <option value="All">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Maths">Maths</option>
            </select>
            <select 
              value={filter.type} 
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value as any }))}
              className="text-[10px] p-1 border rounded bg-background h-7"
            >
              <option value="All">All Types</option>
              <option value="MCQ">MCQ</option>
              <option value="MSQ">MSQ</option>
              <option value="Numerical">Numerical</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <select 
              value={filter.section} 
              onChange={(e) => setFilter(prev => ({ ...prev, section: e.target.value }))}
              className="text-[10px] p-1 border rounded bg-background h-7"
            >
              <option value="All">All Sections</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={filter.status} 
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value as any }))}
              className="text-[10px] p-1 border rounded bg-background h-7"
            >
              <option value="All">All Status</option>
              <option value="unattempted">Not Visited</option>
              <option value="answered">Answered</option>
              <option value="marked-review">Marked for Review</option>
              <option value="answered-marked">Answered & Marked</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
        </div>
      </div>

      {/* Question Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredQuestions.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-10">No questions match filter</p>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {filteredQuestions.map((questionNum) => {
              const status = questionStatuses[questionNum] || 'unattempted';
              const isCurrent = questionNum === currentQuestion;
              const q = testQuestions ? testQuestions[questionNum - 1] : null;
              const hasImage = q && (q.croppedImageUrl || q.imageUrl);
              const imageUrl = q?.croppedImageUrl || q?.imageUrl;

              return (
                <button
                  key={questionNum}
                  onClick={() => onQuestionClick(questionNum)}
                  className={cn(
                    'h-12 w-12 rounded flex flex-col items-center justify-center text-xs font-medium transition-all relative overflow-hidden border border-border',
                    statusStyles[status],
                    isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-background z-10'
                  )}
                >
                  {hasImage ? (
                    <div className="w-full h-full relative group">
                      <img 
                        src={imageUrl} 
                        alt={String(questionNum)} 
                        className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                        <span className="text-white drop-shadow-md font-bold">{questionNum}</span>
                      </div>
                      <div className="absolute top-0 right-0 p-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm border border-white" />
                      </div>
                    </div>
                  ) : (
                    <span>{questionNum}</span>
                  )}
                </button>
              );
            })}
          </div>

        )}
      </div>

      {/* Legend & Stats */}
      <div className="border-t border-border p-3 bg-card space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-secondary flex items-center justify-center text-[10px]">{notVisitedCount}</div>
            <span className="text-muted-foreground">Not Visited</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-incorrect flex items-center justify-center text-[10px] text-incorrect-foreground">{notAnsweredCount}</div>
            <span className="text-muted-foreground">Not Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-correct flex items-center justify-center text-[10px] text-correct-foreground">{answeredCount}</div>
            <span className="text-muted-foreground">Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-review flex items-center justify-center text-[10px] text-review-foreground">{markedCount}</div>
            <span className="text-muted-foreground">Marked</span>
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground border-t border-border pt-2">
          {answeredCount} answered of {statsQuestions.length} {currentSubject} questions
        </div>
      </div>
    </div>
  );
}
