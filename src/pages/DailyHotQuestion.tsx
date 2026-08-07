
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
import { MessageSquare, Send, User, Clock, Star, History as HistoryIcon, ArrowLeft, CheckCircle, XCircle, Target, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DailyHotQuestion() {
  const [question, setQuestion] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
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
      checkIfAlreadyAnswered(data[0].id, data[0]);
    }
  };

  const checkIfAlreadyAnswered = async (qId: string, currentQuestion: any) => {
    // We use a combination of localStorage and database check for better reliability
    const userKey = localStorage.getItem('user_key') || 'anonymous';
    const hasAlreadyAttempted = localStorage.getItem(`solved_q_${qId}`);
    
    if (hasAlreadyAttempted) {
      setHasAnswered(true);
      const savedAns = localStorage.getItem(`ans_q_${qId}`);
      if (savedAns && currentQuestion?.correct_option) {
        setIsCorrect(savedAns.trim().toLowerCase() === currentQuestion.correct_option.trim().toLowerCase());
      }
      return;
    }

    const { data } = await supabase
      .from('hot_question_responses')
      .select('*')
      .eq('question_id', qId)
      .eq('user_key', userKey)
      .limit(1);

    if (data && data.length > 0) {
      setHasAnswered(true);
      localStorage.setItem(`solved_q_${qId}`, 'true');
      localStorage.setItem(`ans_q_${qId}`, data[0].selected_option);
      if (currentQuestion?.correct_option) {
        setIsCorrect(data[0].selected_option.trim().toLowerCase() === currentQuestion.correct_option.trim().toLowerCase());
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
      localStorage.setItem(`solved_q_${question.id}`, 'true');
      localStorage.setItem(`ans_q_${question.id}`, myResponse.trim());
      setMyResponse('');
      setMyComment('');
      setHasAnswered(true);
      if (question?.correct_option) {
        setIsCorrect(myResponse.trim().toLowerCase() === question.correct_option.trim().toLowerCase());
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
                    <div className="rounded-xl overflow-hidden border border-border/50 shadow-neon bg-white p-4 mb-4 flex flex-col justify-center items-center min-h-[150px]">
                      <img 
                        src={question.image_url} 
                        alt="Question Diagram" 
                        className="max-w-full h-auto object-contain max-h-[600px] block rounded-lg" 
                        onLoad={(e) => {
                          e.currentTarget.style.display = 'block';
                        }}
                        onError={(e) => {
                          console.error("Image load error for URL:", question.image_url);
                        }}
                      />
                      <div className="mt-2 w-full flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[10px] text-muted-foreground hover:text-primary"
                          onClick={() => window.open(question.image_url, '_blank')}
                        >
                          Open Original Image
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="text-base font-medium bg-card p-6 rounded-xl border border-border/50 shadow-inner relative space-y-6">
                    <LatexRenderer content={question.content} />
                    
                    {/* Interaction UI for solving */}
                    <div className="border-t pt-6 mt-4">
                      {!hasAnswered ? (
                        <>
                          {question.type === 'mcq' || question.type === 'msq' || question.type === 'poll' ? (
                            <div className="space-y-4">
                              <label className="text-xs uppercase font-bold text-primary flex items-center gap-2">
                                <Target className="h-4 w-4" /> Select Your Answer
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {question.options && question.options.map((opt: string, i: number) => (
                                  <Button
                                    key={i}
                                    variant={myResponse === String.fromCharCode(65 + i) ? "default" : "outline"}
                                    className={`justify-start h-auto py-3 px-4 text-sm transition-all border-2 ${
                                      myResponse === String.fromCharCode(65 + i) ? "border-primary bg-primary/10 text-foreground" : "hover:border-primary/50"
                                    }`}
                                    onClick={() => setMyResponse(String.fromCharCode(65 + i))}
                                  >
                                    <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-3 text-xs font-bold ${
                                      myResponse === String.fromCharCode(65 + i) ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30"
                                    }`}>
                                      {String.fromCharCode(65 + i)}
                                    </span>
                                    <span className="truncate">{opt}</span>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-xs uppercase font-bold text-primary flex items-center gap-2">
                                <Plus className="h-4 w-4" /> Type Your Answer
                              </label>
                              <Input 
                                value={myResponse} 
                                onChange={e => setMyResponse(e.target.value)} 
                                placeholder={question.type === 'integer' ? "e.g. 42" : "Type your answer..."} 
                                className="text-lg py-6 border-2 focus:border-primary"
                              />
                            </div>
                          )}

                          <div className="mt-6 space-y-4">
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-muted-foreground">Explanation / Thought (Optional)</label>
                              <Textarea 
                                value={myComment} 
                                onChange={e => setMyComment(e.target.value)} 
                                placeholder="Why this answer?"
                                rows={3}
                              />
                            </div>
                            <Button className="w-full h-12 text-lg gap-2 glow-primary" onClick={handleSubmit} disabled={isSubmitting || !myResponse.trim()}>
                              <Send className="h-5 w-5" /> {isSubmitting ? 'Submitting...' : 'Submit Final Answer'}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="py-4 text-center bg-secondary/20 rounded-xl border border-dashed">
                          <p className="text-sm font-medium text-muted-foreground">You have already submitted your response for this challenge.</p>
                        </div>
                      )}
                    </div>

                    {hasAnswered && question.correct_option && (
                      <div className={`mt-6 p-4 rounded-xl border-2 animate-in fade-in slide-in-from-bottom-2 ${isCorrect ? 'bg-correct/10 border-correct text-correct' : 'bg-incorrect/10 border-incorrect text-incorrect'}`}>
                        <div className="flex items-center gap-2 font-black text-lg mb-2">
                          {isCorrect ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                          {isCorrect ? 'CORRECT!' : 'INCORRECT'}
                        </div>
                        <p className="text-sm font-medium">
                          The correct answer is: <span className="text-lg font-black underline decoration-2">{question.correct_option}</span>
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
            <Card className="sticky top-20 border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-background border text-center">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Solved</p>
                    <p className="text-lg font-black">{hasAnswered ? 1 : 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background border text-center">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Status</p>
                    <p className="text-lg font-black">{hasAnswered ? (isCorrect ? 'Correct' : 'Incorrect') : 'Pending'}</p>
                  </div>
                </div>
                {!hasAnswered && (
                  <p className="text-[11px] text-muted-foreground text-center italic">
                    Answer today's challenge to see your name in the discussion!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
