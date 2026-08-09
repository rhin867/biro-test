
import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { LatexRenderer } from '@/components/ui/latex-renderer';
import { toast } from 'sonner';
import { MessageSquare, Send, User, Clock, Star, History as HistoryIcon, ArrowLeft, CheckCircle, XCircle, Target, Plus, ThumbsUp, ThumbsDown, Bell, BellOff, Reply, ZoomIn, RefreshCw, Lock, Image as ImageIcon, Edit2, Trash2 } from 'lucide-react';
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
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);



  const [isGateOpen, setIsGateOpen] = useState(false);
  const [gatePassword, setGatePassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const unlocked = localStorage.getItem('biro_gate_unlocked') === 'true';
    if (unlocked) setIsUnlocked(true);
  }, []);

  const handleGateUnlock = () => {
    if (gatePassword.toUpperCase() === 'I LOVE YOU BIRO') {
      localStorage.setItem('biro_gate_unlocked', 'true');
      setIsUnlocked(true);
      setIsGateOpen(false);
      toast.success('Access Granted');
    } else {
      toast.error('Incorrect Secret Key');
    }
  };

  // The answer key (correct_option) is never sent to the browser with the question.
  const HOT_Q_COLUMNS = 'id, content, created_at, options, image_url, question_type, type';

  const fetchQuestion = async () => {
    const { data, error } = await supabase
      .from('hot_questions')
      .select(HOT_Q_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching hot question:', error);
      return;
    }

    if (data && data.length > 0) {
      const q = data[0];
      setQuestion(q);
      setImageError(false);
      setRevealedAnswer(null);
      setIsCorrect(null);
      fetchResponses(q.id);
      checkIfAlreadyAnswered(q.id, q);
    } else {
      setQuestion(null);
    }
  };

  // Grades the user's answer server-side; the answer key is only returned
  // after a response has been submitted.
  const revealResult = async (qId: string) => {
    const userKey = localStorage.getItem('user_key') || 'anonymous';
    try {
      const { data } = await supabase.functions.invoke('hot-question-answer', {
        body: { action: 'check', questionId: qId, userKey },
      });
      const res = data as any;
      if (res?.answered) {
        setHasAnswered(true);
        setRevealedAnswer(res.correctOption ?? null);
        setIsCorrect(typeof res.isCorrect === 'boolean' ? res.isCorrect : null);
        localStorage.setItem(`solved_q_${qId}`, 'true');
        if (res.selectedOption) localStorage.setItem(`ans_q_${qId}`, res.selectedOption);
      }
    } catch (e) {
      console.error('Failed to verify answer', e);
    }
  };

  const checkIfAlreadyAnswered = async (qId: string, _currentQuestion: any) => {
    const userKey = localStorage.getItem('user_key') || 'anonymous';
    if (localStorage.getItem(`solved_q_${qId}`)) {
      setHasAnswered(true);
      await revealResult(qId);
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
      if (data[0].selected_option) localStorage.setItem(`ans_q_${qId}`, data[0].selected_option);
      await revealResult(qId);
    }
  };


  const fetchResponses = async (qId: string) => {
    const { data } = await supabase
      .from('hot_question_responses')
      .select('*')
      .eq('question_id', qId)
      .order('created_at', { ascending: true });
    if (data) setResponses(data);
  };

  const fetchNotifications = async () => {
    const userKey = localStorage.getItem('user_key') || 'anonymous';
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_key', userKey)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications' as any).update({ is_read: true }).eq('id', id);
    fetchNotifications();
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('hot_questions')
      .select(HOT_Q_COLUMNS)

      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data);
  };

  useEffect(() => {
    fetchQuestion();
    fetchHistory();
    fetchNotifications();

    const channel = supabase
      .channel('hot-questions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hot_questions' },
        (payload) => {
          fetchQuestion();
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleVote = async (respId: string, authorKey: string, voteType: 'up' | 'down') => {
    const userKey = localStorage.getItem('user_key') || 'anonymous';
    const resp = responses.find(r => r.id === respId);
    if (!resp) return;
    
    const likedBy = resp.liked_by || [];
    const dislikedBy = resp.disliked_by || [];
    
    let newLikes = resp.likes || 0;
    let newDownvotes = resp.downvotes || 0;
    let newLikedBy = [...likedBy];
    let newDislikedBy = [...dislikedBy];

    if (voteType === 'up') {
      if (newLikedBy.includes(userKey)) {
        // Remove upvote
        newLikedBy = newLikedBy.filter(k => k !== userKey);
        newLikes--;
      } else {
        // Add upvote, remove downvote if exists
        newLikedBy.push(userKey);
        newLikes++;
        if (newDislikedBy.includes(userKey)) {
          newDislikedBy = newDislikedBy.filter(k => k !== userKey);
          newDownvotes--;
        }
      }
    } else {
      if (newDislikedBy.includes(userKey)) {
        // Remove downvote
        newDislikedBy = newDislikedBy.filter(k => k !== userKey);
        newDownvotes--;
      } else {
        // Add downvote, remove upvote if exists
        newDislikedBy.push(userKey);
        newDownvotes++;
        if (newLikedBy.includes(userKey)) {
          newLikedBy = newLikedBy.filter(k => k !== userKey);
          newLikes--;
        }
      }
    }

    const { error } = await supabase.from('hot_question_responses' as any)
      .update({ 
        likes: newLikes,
        downvotes: newDownvotes,
        liked_by: newLikedBy,
        disliked_by: newDislikedBy
      })
      .eq('id', respId);

    if (!error) {
      fetchResponses(question.id);
      if (voteType === 'up' && !likedBy.includes(userKey) && userKey !== authorKey) {
        await supabase.from('notifications').insert({
          user_key: authorKey,
          title: 'New Upvote!',
          message: `${localStorage.getItem('community_author') || 'Someone'} upvoted your comment.`,
          link: '/daily-hot-question',
          is_read: false
        });
      }
    }
  };

  const handleSubmit = async (imageUrl?: string) => {
    if (!question && !replyTo) return;
    
    const userKey = localStorage.getItem('user_key') || 'anonymous';
    const bannedKeys = JSON.parse(localStorage.getItem('admin_banned_users') || '[]');
    if (bannedKeys.includes(userKey)) return toast.error('You are restricted from posting');
    
    // For top-level response (not a reply), we need an answer selected
    if (!replyTo && !hasAnswered && !myResponse.trim()) {
      toast.error('Please select or type an answer first');
      document.getElementById('solve-area')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Must have a comment for a reply, or an explanation for an answer if desired
    if (!myComment.trim() && !imageUrl) {
      toast.error('Enter a comment or attach an image');
      return;
    }

    setIsSubmitting(true);
    const author = localStorage.getItem('community_author') || 'Anonymous';
    
    const responseData: any = {
      question_id: question.id,
      user_key: userKey,
      user_display_name: author,
      selected_option: myResponse.trim() || (replyTo?.selected_option || ''),
      comment: myComment.trim(),
      parent_id: replyTo?.id || null,
      likes: 0,
      downvotes: 0,
      liked_by: [],
      disliked_by: [],
      image_url: imageUrl || null
    };

    const { data, error } = await supabase.from('hot_question_responses').insert(responseData).select();

    setIsSubmitting(false);
    if (error) toast.error('Failed to submit');
    else {
      toast.success(replyTo ? 'Reply posted!' : 'Response submitted!');
      if (!replyTo) {
        localStorage.setItem(`solved_q_${question.id}`, 'true');
        localStorage.setItem(`ans_q_${question.id}`, myResponse.trim());
        setHasAnswered(true);
        
        // Update XP and Streak tracking in DB
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const currentStreak = parseInt(localStorage.getItem('user_streak') || '0');
          const lastSolved = localStorage.getItem('last_solved_date');
          const today = new Date().toDateString();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          let newStreak = currentStreak;
          if (lastSolved !== today) {
            if (lastSolved === yesterday.toDateString()) {
              newStreak = currentStreak + 1;
            } else {
              newStreak = 1;
            }
          }

          const { data: profile, error: profileError } = await supabase.from('profiles').select('total_xp').eq('id', user.id).maybeSingle();
          const newXP = (profile?.total_xp || 0) + 10; // 10 XP per daily question

          const { error: updateError } = await supabase.from('profiles').update({
            user_streak: newStreak,
            total_xp: newXP,
            last_engagement_at: new Date().toISOString()
          }).eq('id', user.id);
          
          if (updateError) console.error("Streak/XP update failed:", updateError);

          localStorage.setItem('user_streak', String(newStreak));
          localStorage.setItem('last_solved_date', today);
        }

        const currentSolved = parseInt(localStorage.getItem('solved_daily_count') || '0');
        localStorage.setItem('solved_daily_count', String(currentSolved + 1));

      }
      
      if (replyTo && replyTo.user_key !== userKey) {
        await supabase.from('notifications').insert({
          user_key: replyTo.user_key,
          title: 'New Reply!',
          message: `${author} replied to your comment on the Daily Challenge.`,
          link: '/daily-hot-question',
          is_read: false
        });
      }


      setMyResponse('');
      setMyComment('');
      setReplyTo(null);
      if (!replyTo) {
        await revealResult(question.id);
      }

      fetchResponses(question.id);
    }
  };

  if (!question) return (
    <MainLayout>
      <div className="p-8 text-center space-y-4">
        <div className="animate-bounce inline-block p-4 rounded-full bg-primary/10">
          <Star className="h-10 w-10 text-primary" />
        </div>
        <p className="text-xl font-bold">No challenge active today.</p>
        <p className="text-muted-foreground">Check back later for a new Hot Question!</p>
        <Button variant="outline" onClick={fetchQuestion} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>
    </MainLayout>
  );

  if (!isUnlocked) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-6 text-center px-4">
          <div className="p-4 rounded-full bg-primary/10 animate-bounce">
            <Lock className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Biro's Private Sanctum</h2>
            <p className="text-muted-foreground text-sm max-w-md font-medium">
              This section is reserved for the true fans. Enter the secret code to proceed.
            </p>
          </div>
          <div className="flex gap-2 w-full max-w-sm">
            <Input 
              type="password" 
              placeholder="Enter Secret Key..." 
              value={gatePassword}
              onChange={(e) => setGatePassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGateUnlock()}
              className="font-bold tracking-widest text-center"
            />
            <Button onClick={handleGateUnlock} className="font-bold">UNLOCK</Button>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-black opacity-30 tracking-widest">
            Hint: A specific phrase for Biro
          </p>
        </div>
      </MainLayout>
    );
  }

  return (

    <MainLayout>
      <PageHeader title="Daily Hot Question" description="Challenge yourself every day & discuss with others.">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            setShowNotifications(!showNotifications);
            if (!showNotifications) fetchNotifications();
          }} className="relative">
            {notifications.length > 0 ? <Bell className="h-4 w-4 text-primary animate-bounce" /> : <BellOff className="h-4 w-4" />}
            {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1 rounded-full">{notifications.length}</span>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-2">
            {showHistory ? <ArrowLeft className="h-4 w-4" /> : <HistoryIcon className="h-4 w-4" />}
            {showHistory ? 'Back to Today' : 'Question History'}
          </Button>
        </div>
      </PageHeader>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No new notifications</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="p-3 rounded-lg border bg-muted/30 relative group">
                  <p className="text-sm font-bold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => markNotificationRead(n.id)}
                  >
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

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
                    <div className="rounded-xl overflow-hidden border-2 border-primary/20 shadow-neon bg-white p-3 mb-6 flex flex-col items-center group relative min-h-[300px] justify-center transition-all hover:border-primary/40">
                      <img 
                        src={question.image_url.includes('?') ? question.image_url : `${question.image_url}?t=${Date.now()}`} 
                        alt="Question Diagram" 
                        className="max-w-full h-auto object-contain max-h-[1200px] block rounded-lg" 
                        style={{ width: '100%', borderRadius: '8px' }}
                        onError={(e) => {
                          console.error("Hot question image failed to load:", question.image_url);
                          setImageError(true);
                        }}
                      />
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8 text-[11px] gap-1.5 shadow-lg border border-primary/20 bg-white/90 backdrop-blur-sm text-primary hover:bg-primary hover:text-white"
                          onClick={() => window.open(question.image_url, '_blank')}
                        >
                          <ZoomIn className="h-4 w-4" />
                          Full Resolution
                        </Button>
                      </div>
                    </div>
                  )}


                  <div className="text-base font-medium bg-card p-6 rounded-xl border border-border/50 shadow-inner relative space-y-6">
                    <LatexRenderer content={question.content} />
                    
                    <div className="border-t pt-6 mt-4" id="solve-area">
                      {replyTo && (
                        <div className="mb-4 p-2 bg-primary/10 rounded-lg flex items-center justify-between">
                          <p className="text-xs text-primary font-bold">Replying to {replyTo.user_display_name}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {(!hasAnswered || replyTo) ? (
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
                               <div className="flex items-center gap-2">
                                <Input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  id="response-image-upload" 
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      toast.info('Uploading image...');
                                      const fileExt = file.name.split('.').pop();
                                      const fileName = `resp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                                      const { data, error } = await supabase.storage
                                        .from('biro-test-images')
                                        .upload(fileName, file, {
                                          upsert: true
                                        });
                                      if (error) {
                                        console.error('Upload error:', error);
                                        toast.error('Upload failed: ' + error.message);
                                      } else {
                                        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                                        const publicUrl = `${supabaseUrl}/storage/v1/object/public/biro-test-images/${fileName}`;
                                        const freshUrl = `${publicUrl}?t=${Date.now()}`;
                                        toast.success('Image uploaded! Submitting...');
                                        handleSubmit(freshUrl);
                                      }
                                    }
                                  }}
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 gap-2 text-[10px]" 
                                  onClick={() => document.getElementById('response-image-upload')?.click()}
                                >
                                  <ImageIcon className="h-3.5 w-3.5" /> Attach Image
                                </Button>
                              </div>
                            </div>
                            <Button 
                              className="w-full h-12 text-lg gap-2 glow-primary" 
                              onClick={() => handleSubmit()} 
                              disabled={isSubmitting || (!replyTo && !hasAnswered && !myResponse.trim()) || (!myComment.trim() && !isSubmitting)}
                            >
                              <Send className="h-5 w-5" /> 
                              {isSubmitting ? 'Submitting...' : replyTo ? 'Post Reply' : 'Submit Final Answer'}
                            </Button>
                          </div>
                        </>
                      ) : !replyTo ? (
                        <div className="py-4 text-center bg-secondary/10 rounded-xl border border-dashed border-primary/30">
                          <p className="text-sm font-bold text-primary mb-1">Challenge Completed!</p>
                          <p className="text-[11px] text-muted-foreground">You can now discuss or reply to others below.</p>
                          <div className="flex justify-center gap-2 mt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] gap-1"
                                onClick={() => {
                                  const myResp = responses.find(r => r.user_key === (localStorage.getItem('user_key') || 'anonymous') && !r.parent_id);
                                  if (myResp) {
                                    const newComment = prompt('Edit your response:', myResp.comment);
                                    if (newComment !== null && newComment !== myResp.comment) {
                                      supabase.from('hot_question_responses').update({ comment: newComment.trim() }).eq('id', myResp.id).then(({ error }) => {
                                        if (!error) {
                                          toast.success('Response updated');
                                          setResponses(prev => prev.map(r => r.id === myResp.id ? { ...r, comment: newComment.trim() } : r));
                                        } else {
                                          toast.error('Failed to update: ' + error.message);
                                        }
                                      });
                                    }
                                  }
                                }}
                            >
                              <Edit2 className="h-3 w-3" /> Edit My Answer
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
                              onClick={() => {
                                const myResp = responses.find(r => r.user_key === (localStorage.getItem('user_key') || 'anonymous') && !r.parent_id);
                                if (myResp && confirm('Delete your response? This will also remove any replies to it.')) {
                                  supabase.from('hot_question_responses').delete().eq('id', myResp.id).then(({ error }) => {
                                    if (!error) {
                                      toast.success('Response deleted');
                                      setResponses(prev => prev.filter(r => r.id !== myResp.id && r.parent_id !== myResp.id));
                                      setHasAnswered(false);
                                    }
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </div>
                        </div>

                      ) : null}
                      
                      {hasAnswered && !replyTo && (
                        <div className="mt-4 pt-4 border-t border-dashed">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">Add to the Discussion</label>
                          <div className="mt-2 space-y-3">
                            <Textarea 
                              value={myComment} 
                              onChange={e => setMyComment(e.target.value)} 
                              placeholder="Share your explanation or doubt..."
                              rows={2}
                              className="text-sm"
                            />
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-2 text-[10px]" 
                                onClick={() => document.getElementById('response-image-upload')?.click()}
                              >
                                <ImageIcon className="h-3.5 w-3.5" /> Attach Image
                              </Button>
                              <Button 
                                className="h-8 text-xs gap-2 ml-auto" 
                                onClick={() => handleSubmit()} 
                                disabled={isSubmitting || !myComment.trim()}
                              >
                                <Send className="h-3 w-3" /> Post Comment
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {hasAnswered && revealedAnswer && (
                      <div className={`mt-6 p-4 rounded-xl border-2 animate-in fade-in slide-in-from-bottom-2 ${isCorrect ? 'bg-correct/10 border-correct text-correct' : 'bg-incorrect/10 border-incorrect text-incorrect'}`}>
                        <div className="flex items-center gap-2 font-black text-lg mb-2">
                          {isCorrect ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                          {isCorrect ? 'CORRECT!' : 'INCORRECT'}
                        </div>
                        <p className="text-sm font-medium">
                          The correct answer is: <span className="text-lg font-black underline decoration-2">{revealedAnswer}</span>
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
              <CardContent className="space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar p-6">
                {responses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Be the first to respond!</p>
                ) : (
                  responses.filter(r => !r.parent_id).map(resp => (
                    <div key={resp.id} className="space-y-4 border-b pb-6 last:border-0">
                      <div className="p-4 rounded-xl bg-card border border-border/60 shadow-md relative group hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shadow-inner">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-primary leading-tight">{resp.user_display_name}</span>
                                {resp.user_key === (localStorage.getItem('user_key') || 'anonymous') && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-muted-foreground hover:text-primary"
                                      onClick={() => {
                                        const newComment = prompt('Edit your comment:', resp.comment);
                                        if (newComment !== null && newComment !== resp.comment) {
                                          supabase.from('hot_question_responses').update({ comment: newComment.trim() }).eq('id', resp.id).then(({ error }) => {
                                            if (!error) {
                                              toast.success('Comment updated');
                                              setResponses(prev => prev.map(r => r.id === resp.id ? { ...r, comment: newComment.trim() } : r));
                                            } else {
                                              toast.error('Failed to update');
                                            }
                                          });
                                        }
                                      }}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                      onClick={() => {
                                        if (confirm('Delete your comment? This will also remove any replies.')) {
                                          supabase.from('hot_question_responses').delete().eq('id', resp.id).then(({ error }) => {
                                            if (!error) {
                                              toast.success('Comment deleted');
                                              setResponses(prev => prev.filter(r => r.id !== resp.id && r.parent_id !== resp.id));
                                            } else {
                                              toast.error('Failed to delete');
                                            }
                                          });
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" /> {new Date(resp.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <Badge variant="outline" className="text-[10px] font-bold border-primary/20 bg-primary/5">Ans: {resp.selected_option}</Badge>
                              {resp.image_url && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10">
                                      <ImageIcon className="h-3.5 w-3.5" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>{resp.user_display_name}'s Shared Image</DialogTitle>
                                    </DialogHeader>
                                    <img 
                                      src={resp.image_url} 
                                      alt="User attachment" 
                                      className="w-full h-auto rounded-lg border shadow-lg"
                                      crossOrigin="anonymous"
                                    />
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-sm px-1 mb-4 leading-relaxed whitespace-pre-wrap"><LatexRenderer content={resp.comment || 'No explanation provided.'} /></div>
                        
                        <div className="flex items-center gap-3 border-t border-border/30 pt-3">
                          <div className="flex items-center bg-muted/30 rounded-full px-1 py-0.5 border border-border/40">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={`h-7 w-7 p-0 rounded-full transition-all ${
                                (resp.liked_by || []).includes(localStorage.getItem('user_key') || 'anonymous') 
                                  ? 'text-primary' 
                                  : 'text-muted-foreground hover:text-primary'
                              }`}
                              onClick={() => handleVote(resp.id, resp.user_key, 'up')}
                            >
                              <ThumbsUp className={`h-3.5 w-3.5 ${
                                (resp.liked_by || []).includes(localStorage.getItem('user_key') || 'anonymous') ? 'fill-primary' : ''
                              }`} />
                            </Button>
                            
                            <span className="text-[11px] font-black px-1 min-w-[20px] text-center">
                              {(resp.likes || 0) - (resp.downvotes || 0)}
                            </span>
                            
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={`h-7 w-7 p-0 rounded-full transition-all ${
                                (resp.disliked_by || []).includes(localStorage.getItem('user_key') || 'anonymous') 
                                  ? 'text-incorrect' 
                                  : 'text-muted-foreground hover:text-incorrect'
                              }`}
                              onClick={() => handleVote(resp.id, resp.user_key, 'down')}
                            >
                              <ThumbsDown className={`h-3.5 w-3.5 ${
                                (resp.disliked_by || []).includes(localStorage.getItem('user_key') || 'anonymous') ? 'fill-incorrect' : ''
                              }`} />
                            </Button>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[11px] gap-2 rounded-full px-4 text-muted-foreground hover:bg-muted"
                            onClick={() => {
                              setReplyTo(resp);
                              setMyComment(`@${resp.user_display_name} `);
                              document.getElementById('solve-area')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                          >
                            <Reply className="h-3.5 w-3.5" />
                            <span className="font-bold">Reply</span>
                          </Button>
                        </div>
                      </div>
                      
                      <div className="ml-10 space-y-4 border-l-2 border-primary/20 pl-6 mt-4">
                        {responses.filter(r => r.parent_id === resp.id).map(reply => (
                          <div key={reply.id} className="p-3.5 rounded-xl bg-muted/30 border border-border/40 relative group/reply hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-black text-muted-foreground">{reply.user_display_name}</span>
                                <span className="text-[10px] text-muted-foreground">• {new Date(reply.created_at).toLocaleTimeString()}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-[10px] gap-1 px-2"
                                  onClick={() => {
                                    setReplyTo(resp);
                                    setMyComment(`@${reply.user_display_name} `);
                                    document.getElementById('solve-area')?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                >
                                  <Reply className="h-3 w-3" />
                                  Reply
                                </Button>
                                {reply.user_key === (localStorage.getItem('user_key') || 'anonymous') && (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                                      onClick={() => {
                                        const newComment = prompt('Edit your reply:', reply.comment);
                                        if (newComment !== null && newComment !== reply.comment) {
                                          supabase.from('hot_question_responses').update({ comment: newComment.trim() }).eq('id', reply.id).then(({ error }) => {
                                            if (!error) {
                                              toast.success('Reply updated');
                                              setResponses(prev => prev.map(r => r.id === reply.id ? { ...r, comment: newComment.trim() } : r));
                                            } else {
                                              toast.error('Failed to update: ' + error.message);
                                            }
                                          });
                                        }
                                      }}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                      onClick={() => {
                                        if (confirm('Delete this reply?')) {
                                          supabase.from('hot_question_responses').delete().eq('id', reply.id).then(({ error }) => {
                                            if (!error) {
                                              toast.success('Reply deleted');
                                              setResponses(prev => prev.filter(r => r.id !== reply.id));
                                            }
                                          });
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">

                              <p className="text-sm px-1 mb-3 leading-relaxed whitespace-pre-wrap">{reply.comment}</p>

                              {reply.image_url && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10">
                                      <ImageIcon className="h-3 w-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>{reply.user_display_name}'s Shared Image</DialogTitle>
                                    </DialogHeader>
                                    <img 
                                      src={reply.image_url} 
                                      alt="User attachment" 
                                      className="w-full h-auto rounded-lg border shadow-lg"
                                      crossOrigin="anonymous"
                                    />
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                            <div className="flex items-center bg-muted/50 rounded-full px-1 py-0.5 border border-border/20 scale-90 origin-left">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`h-6 w-6 p-0 rounded-full transition-all ${
                                  (reply.liked_by || []).includes(localStorage.getItem('user_key') || 'anonymous') 
                                    ? 'text-primary' 
                                    : 'text-muted-foreground hover:text-primary'
                                }`}
                                onClick={() => handleVote(reply.id, reply.user_key, 'up')}
                              >
                                <ThumbsUp className={`h-3 w-3 ${
                                  (reply.liked_by || []).includes(localStorage.getItem('user_key') || 'anonymous') ? 'fill-primary' : ''
                                }`} />
                              </Button>
                              
                              <span className="text-[10px] font-black px-1 min-w-[16px] text-center">
                                {(reply.likes || 0) - (reply.downvotes || 0)}
                              </span>
                              
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`h-6 w-6 p-0 rounded-full transition-all ${
                                  (reply.disliked_by || []).includes(localStorage.getItem('user_key') || 'anonymous') 
                                    ? 'text-incorrect' 
                                    : 'text-muted-foreground hover:text-incorrect'
                                }`}
                                onClick={() => handleVote(reply.id, reply.user_key, 'down')}
                              >
                                <ThumbsDown className={`h-3 w-3 ${
                                  (reply.disliked_by || []).includes(localStorage.getItem('user_key') || 'anonymous') ? 'fill-incorrect' : ''
                                }`} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
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
