
import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { LatexRenderer } from '@/components/ui/latex-renderer';
import { toast } from 'sonner';

export default function DailyHotQuestion() {
  const [question, setQuestion] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    supabase.from('hot_questions').select('*').order('created_at', { ascending: false }).limit(1).then(({ data }) => {
      if (data && data.length > 0) setQuestion(data[0]);
    });
  }, []);

  const handleSubmit = async () => {
    if (!question) return;
    const { error } = await supabase.from('hot_question_responses').insert({
      question_id: question.id,
      user_key: localStorage.getItem('user_key') || 'anonymous',
      user_display_name: localStorage.getItem('community_author') || 'Anonymous',
      selected_option: response,
      comment: comment
    });
    if (error) toast.error('Failed to submit');
    else toast.success('Submitted!');
  };

  if (!question) return <div className="p-4 text-center">No hot question today.</div>;

  return (
    <MainLayout>
      <PageHeader title="Daily Hot Question" description="Compete with other aspirants!" />
      <Card>
        <CardContent className="pt-6">
          <div className="text-lg font-medium mb-4">
            <LatexRenderer content={question.content} />
          </div>
          <div className="space-y-4">
            <Input value={response} onChange={e => setResponse(e.target.value)} placeholder="Your answer (option)..." />
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Your thought/comment..." />
            <Button onClick={handleSubmit}>Submit Response</Button>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
