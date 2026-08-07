
import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { LatexRenderer } from '@/components/ui/latex-renderer';
import { toast } from 'sonner';
import { MessageSquare, Send, User, Clock, Star, History as HistoryIcon, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DailyHotQuestion() {
  const [question, setQuestion] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [myResponse, setMyResponse] = useState('');
  const [myComment, setMyComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const fetchQuestion = async () => {
    const { data } = await supabase
      .from('hot_questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setQuestion(data[0]);
      fetchResponses(data[0].id);
      checkIfAlreadyAnswered(data[0].id);
    }
  };

  const checkIfAlreadyAnswered = async (qId: string) => {
    const userKey = localStorage.getItem('user_key');
    if (!userKey) return;

    const { data } = await supabase
      .from('hot_question_responses')
      .select('*')
      .eq('question_id', qId)
      .eq('user_key', userKey)
      .limit(1);

    if (data && data.length > 0) {
      setHasAnswered(true);
      if (question?.correct_option) {
        setIsCorrect(data[0].selected_option === question.correct_option);
      }
    }
  };

  const fetchResponses = async (qId: string) => {
    const { data } = await supabase
      .from('hot_question_responses')
      .select('*')
      .eq('question_id', qId)
      .order('created_at', { ascending: false });
    if (data) setResponses(data);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('hot_questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data);
  };

  useEffect(() => {
    fetchQuestion();
    fetchHistory();
  }, []);

  const handleSubmit = async () => {
    if (!question || !myResponse.trim()) return toast.error('Enter an answer/option');
    setIsSubmitting(true);
    const { error } = await supabase.from('hot_question_responses').insert({
      question_id: question.id,
      user_key: localStorage.getItem('user_key') || 'anonymous',
      user_display_name: localStorage.getItem('community_author') || 'Anonymous',
      selected_option: myResponse.trim(),
      comment: myComment.trim()
    });
    setIsSubmitting(false);
    if (error) toast.error('Failed to submit');
    else {
      toast.success('Response submitted!');
      setMyResponse('');
      setMyComment('');
      setHasAnswered(true);
      if (question?.correct_option) {
        setIsCorrect(myResponse.trim() === question.correct_option);
      }
      fetchResponses(question.id);
    }
  };

  if (!question) return <div className="p-8 text-center"><p className="animate-pulse">Loading challenge...</p></div>;

  return (
    <MainLayout>
      <PageHeader title="Daily Hot Question" description="Challenge yourself every day & discuss with others.">
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-2">
          {showHistory ? <ArrowLeft className="h-4 w-4" /> : <HistoryIcon className="h-4 w-4" />}
          {showHistory ? 'Back to Today' : 'Question History'}
        </Button>
      </PageHeader>

      {showHistory ? (
        <div className="space-y-4">
          {history.map(h => (
            <Card key={h.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setQuestion(h); setShowHistory(false); fetchResponses(h.id); }}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="outline" className="text-[10px]">{new Date(h.created_at).toLocaleDateString()}</Badge>
                </div>
                <div className="text-sm line-clamp-2"><LatexRenderer content={h.content} /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-primary/50 bg-primary/5 shadow-neon">
              <CardHeader className="py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  Today's Challenge
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {new Date(question.created_at).toLocaleDateString()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="space-y-4">
                  {question.image_url && (
                    <div className="rounded-xl overflow-hidden border border-border/50 shadow-md bg-white p-2">
                      <img src={question.image_url} alt="Question Diagram" className="w-full h-auto object-contain max-h-[400px]" />
                    </div>
                  )}
                  <div className="text-base font-medium bg-card p-6 rounded-xl border border-border/50 shadow-inner relative">
                    <LatexRenderer content={question.content} />
                    {hasAnswered && question.correct_option && (
                      <div className={`mt-4 p-3 rounded-lg border ${isCorrect ? 'bg-correct/10 border-correct text-correct' : 'bg-incorrect/10 border-incorrect text-incorrect'}`}>
                        <div className="flex items-center gap-2 font-bold mb-1">
                          {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          {isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
                        </div>
                        <p className="text-sm">
                          The correct option is: <span className="font-bold underline">{question.correct_option}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Discussions ({responses.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                {responses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Be the first to respond!</p>
                ) : (
                  responses.map(resp => (
                    <div key={resp.id} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-primary" />
                          <span className="text-xs font-bold text-primary">{resp.user_display_name}</span>
                          <Badge variant="secondary" className="text-[10px] h-4">Ans: {resp.selected_option}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2 w-2" /> {new Date(resp.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{resp.comment || 'No comment provided.'}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Your Response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {question.type === 'mcq' || question.type === 'msq' || question.type === 'poll' ? (
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Select Option</label>
                    <div className="grid grid-cols-2 gap-2">
                      {question.options && question.options.map((opt: string, i: number) => (
                        <Button
                          key={i}
                          variant={myResponse === String.fromCharCode(65 + i) ? "default" : "outline"}
                          className="justify-start h-auto py-2 px-3 text-sm"
                          onClick={() => setMyResponse(String.fromCharCode(65 + i))}
                        >
                          <span className="w-6 h-6 rounded-full border border-border flex items-center justify-center mr-2 text-[10px] font-bold">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="truncate">{opt}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Your Answer</label>
                    <Input 
                      value={myResponse} 
                      onChange={e => setMyResponse(e.target.value)} 
                      placeholder={question.type === 'integer' ? "e.g. 42" : "Type your answer..."} 
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Explanation / Thought</label>
                  <Textarea 
                    value={myComment} 
                    onChange={e => setMyComment(e.target.value)} 
                    placeholder="Why this answer?"
                    rows={4}
                  />
                </div>
                <Button className="w-full gap-2" onClick={handleSubmit} disabled={isSubmitting}>
                  <Send className="h-4 w-4" /> {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
