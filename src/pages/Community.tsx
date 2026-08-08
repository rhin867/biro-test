import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { generateId } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { supabaseKeyed, getUserKey } from '@/lib/supabase-keyed';

import { LatexRenderer } from '@/components/ui/latex-renderer';
import telegramQR from '@/assets/telegram-qr.png';
import {
  MessageSquare, ThumbsUp, ThumbsDown, Lightbulb, AlertTriangle, Send,
  Edit2, X, Check, Star, Share2, MessageCircle, Trophy, ExternalLink, Reply, Trash2
} from 'lucide-react';



const AUTHOR_KEY = 'community_author';
const AUTHOR_LOCK_KEY = 'community_author_locked_at';
const REWARDS_KEY = 'user_rewards';

interface ChatMessage {
  id: string; author: string; content: string; created_at: string; msg_type: string; post_type: string;
  upvotes: number; downvotes: number;
  author_key?: string;
  liked_by?: string[];
  disliked_by?: string[];
  parent_id?: string;
}



function getLockedAuthor() {
  const name = localStorage.getItem(AUTHOR_KEY) || '';
  const lockedAt = localStorage.getItem(AUTHOR_LOCK_KEY);
  if (!name || !lockedAt) return { name, locked: false };
  return { name, locked: Date.now() - parseInt(lockedAt) < 86400000 };
}

function addReward(points: number, desc: string) {
  try {
    const rewards = JSON.parse(localStorage.getItem(REWARDS_KEY) || '[]');
    rewards.push({ id: generateId(), type: 'action', points, earnedAt: new Date().toISOString(), description: desc });
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
  } catch {}
}

export default function Community() {
  const authorInfo = getLockedAuthor();
  const [author, setAuthor] = useState(authorInfo.name);
  const [authorLocked, setAuthorLocked] = useState(authorInfo.locked);
  const [posts, setPosts] = useState<ChatMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<string>('general');
  const [chatMsg, setChatMsg] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [hotQuestion, setHotQuestion] = useState<string | null>(null);


  useEffect(() => {
    supabase.functions.invoke('get-public-settings').then(({ data }) => {
      if (data?.daily_hot_question) setHotQuestion(data.daily_hot_question);
    });
  }, []);

  // Load messages from DB
  useEffect(() => {
    const loadMessages = async () => {
      const { data: allMsgs } = await supabase
        .from('community_messages' as any)
        .select('*')
        .order('created_at', { ascending: true })
        .limit(500);
      
      if (allMsgs) {
        const msgs = allMsgs as unknown as ChatMessage[];
        setPosts(msgs.filter(m => m.msg_type === 'post'));
        setChatMessages(msgs.filter(m => m.msg_type === 'chat'));
      }
    };
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel('community-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload: any) => {
          const msg = payload.new as ChatMessage;
          if (msg.msg_type === 'chat') {
            setChatMessages(prev => [...prev, msg]);
          } else {
            setPosts(prev => [msg, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const lockAuthor = () => {
    if (!author.trim()) return;
    localStorage.setItem(AUTHOR_KEY, author.trim());
    localStorage.setItem(AUTHOR_LOCK_KEY, String(Date.now()));
    setAuthorLocked(true);
  };

  const handleSendChat = async () => {
    if (!chatMsg.trim() || !author.trim()) { toast.error('Enter name and message'); return; }
    if (!authorLocked) lockAuthor();

    const { error } = await supabaseKeyed.from('community_messages' as any).insert({
      author: author.trim(),
      author_key: getUserKey(),
      content: chatMsg.trim(),
      msg_type: 'chat',
      post_type: 'general',
      parent_id: replyTo?.id || null
    } as any);
    if (error) { toast.error('Could not send message'); return; }
    setChatMsg('');
    setReplyTo(null);
    addReward(2, 'Sent a chat message');
  };

  const applyVoteResult = (msgId: string, isChat: boolean, result: any) => {
    const patch = {
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      liked_by: result.liked_by,
      disliked_by: result.disliked_by,
    };
    const setter = isChat ? setChatMessages : setPosts;
    setter(prev => prev.map(m => m.id === msgId ? { ...m, ...patch } : m));
  };

  const handleVote = async (msgId: string, voteType: 'up' | 'down') => {
    const msg = [...chatMessages, ...posts].find(m => m.id === msgId);
    if (!msg) return;

    const { data, error } = await supabase.functions.invoke('community-vote', {
      body: { table: 'community_messages', id: msgId, userKey: getUserKey(), direction: voteType },
    });

    if (error || !data) { toast.error('Vote failed'); return; }
    applyVoteResult(msgId, msg.msg_type === 'chat', data);
  };

  const handleEditMessage = async (msg: ChatMessage, isChat: boolean) => {
    const newContent = prompt(isChat ? 'Edit message:' : 'Edit post:', msg.content);
    if (!newContent || newContent === msg.content) return;
    const { error } = await supabaseKeyed.from('community_messages' as any)
      .update({ content: newContent.trim() } as any).eq('id', msg.id);
    if (error) { toast.error('You can only edit your own messages'); return; }
    toast.success('Updated');
    const setter = isChat ? setChatMessages : setPosts;
    setter(prev => prev.map(m => m.id === msg.id ? { ...m, content: newContent.trim() } : m));
  };

  const handleDeleteMessage = async (msg: ChatMessage, isChat: boolean) => {
    if (!confirm('Delete this permanently?')) return;
    const { error } = await supabaseKeyed.from('community_messages' as any).delete().eq('id', msg.id);
    if (error) { toast.error('You can only delete your own messages'); return; }
    toast.success('Deleted');
    const setter = isChat ? setChatMessages : setPosts;
    setter(prev => prev.filter(m => m.id !== msg.id && m.parent_id !== msg.id));
  };



  const handleSubmitPost = async () => {
    if (!newPost.trim() || !author.trim()) { toast.error('Enter name and message'); return; }
    if (!authorLocked) lockAuthor();
    
    await supabaseKeyed.from('community_messages' as any).insert({
      author: author.trim(), author_key: getUserKey(), content: newPost.trim(), msg_type: 'post', post_type: postType,
    } as any);

    setNewPost('');
    addReward(10, 'Posted in community');
    toast.success('Posted! +10 XP');
  };

  const handleSubmitRating = async () => {
    if (rating === 0) { toast.error('Select a rating'); return; }
    await supabaseKeyed.from('community_messages' as any).insert({
      author: author.trim() || 'Anonymous',
      author_key: getUserKey(),
      content: `⭐ ${rating}/5 - ${feedback || 'No comment'}`,
      msg_type: 'post', post_type: 'rating',
    } as any);

    addReward(15, 'Rated the app');
    toast.success('Thanks for feedback! +15 XP');
    setRating(0); setFeedback('');
  };

  const getTypeIcon = (type: string) => {
    if (type === 'suggestion') return <Lightbulb className="h-4 w-4 text-yellow-400" />;
    if (type === 'obstacle') return <AlertTriangle className="h-4 w-4 text-red-400" />;
    return <MessageSquare className="h-4 w-4 text-primary" />;
  };

  const totalPoints = (() => {
    try { return JSON.parse(localStorage.getItem(REWARDS_KEY) || '[]').reduce((s: number, r: any) => s + r.points, 0); }
    catch { return 0; }
  })();

  return (
    <MainLayout>
      <PageHeader title="Community" description="Live chat, suggestions & connect with other aspirants">
        <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 gap-1">
          <Trophy className="h-3 w-3" /> {totalPoints} XP
        </Badge>
      </PageHeader>

      {/* Author + Links */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input placeholder="Your display name" value={author} onChange={e => !authorLocked && setAuthor(e.target.value)}
          className="max-w-xs" disabled={authorLocked} />
        {authorLocked && <span className="text-xs text-muted-foreground">🔒 Locked 24h</span>}
        <a href="https://t.me/biroskills" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1">
            <ExternalLink className="h-3 w-3" /> Telegram
          </Button>
        </a>
        <a href="https://biro-log.vercel.app" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1">
            <ExternalLink className="h-3 w-3" /> Biro-Log
          </Button>
        </a>
      </div>

      {hotQuestion && (
        <Card className="mb-6 border-primary/50 bg-primary/5 shadow-neon">
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              Daily Hot Question
            </CardTitle>
            <div className="flex gap-2">
              <Link to="/hot-question">
                <Button variant="ghost" size="sm" className="text-[10px] h-6">Full Panel & History</Button>
              </Link>
              <Badge variant="secondary" className="text-[10px]">Challenge of the Day</Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-sm bg-card p-4 rounded-lg border border-border/50">
              <LatexRenderer content={hotQuestion} />
            </div>
            <div className="flex gap-2 mt-4">
              <Input 
                placeholder="Choose option (A/B/C/D)..." 
                className="text-xs h-8"
                id="hot-q-option"
              />
              <Button size="sm" className="h-8 text-xs px-4" onClick={() => {
                const opt = (document.getElementById('hot-q-option') as HTMLInputElement)?.value;
                if (!opt) return toast.error('Choose an option');
                toast.success('Vote submitted! Visit Hot Question panel for comments.');
              }}>Vote</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="chat">Live Chat</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="rate">Rate</TabsTrigger>
          <TabsTrigger value="connect">Connect</TabsTrigger>
        </TabsList>

        {/* Live Chat */}
        <TabsContent value="chat">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" />Live Chat</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[400px] overflow-y-auto border border-border rounded-lg p-3 mb-3 space-y-4 bg-secondary/20">
                {chatMessages.length === 0 && <p className="text-center text-muted-foreground py-8">No messages yet. Start chatting!</p>}
                {chatMessages.filter(m => !m.parent_id).map(msg => (
                  <div key={msg.id} className="space-y-2">
                    <div className="p-2 rounded-lg bg-card border border-border/50 group relative">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-primary">{msg.author}</span>
                          <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {msg.author_key === getUserKey() && (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditMessage(msg, true)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={() => handleDeleteMessage(msg, true)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}

                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleVote(msg.id, 'up')}>
                            <ThumbsUp className={`h-3 w-3 ${(msg.liked_by || []).includes(getUserKey()) ? 'fill-primary text-primary' : ''}`} />
                          </Button>
                          <span className="text-[10px] font-bold">{(msg.upvotes || 0) - (msg.downvotes || 0)}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleVote(msg.id, 'down')}>
                            <ThumbsDown className={`h-3 w-3 ${(msg.disliked_by || []).includes(getUserKey()) ? 'fill-destructive text-destructive' : ''}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setReplyTo(msg); setChatMsg(`@${msg.author} `); }}>
                            <Reply className="h-3 w-3" />
                          </Button>
                        </div>

                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    
                    {/* Nested Replies */}
                    <div className="ml-6 space-y-2 border-l-2 border-primary/20 pl-4">
                      {chatMessages.filter(r => r.parent_id === msg.id).map(reply => (
                        <div key={reply.id} className="p-2 rounded-lg bg-card/60 border border-border/30 group relative">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[10px] text-primary">{reply.author}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(reply.created_at).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity scale-90">
                              {reply.author_key === getUserKey() && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEditMessage(reply, true)}>
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" onClick={() => handleDeleteMessage(reply, true)}>
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </>
                              )}

                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleVote(reply.id, 'up')}>
                                <ThumbsUp className={`h-2.5 w-2.5 ${(reply.liked_by || []).includes(getUserKey()) ? 'fill-primary text-primary' : ''}`} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleVote(reply.id, 'down')}>
                                <ThumbsDown className={`h-2.5 w-2.5 ${(reply.disliked_by || []).includes(getUserKey()) ? 'fill-destructive text-destructive' : ''}`} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setReplyTo(msg); setChatMsg(`@${reply.author} `); }}>
                                <Reply className="h-2.5 w-2.5" />
                              </Button>
                            </div>

                          </div>
                          <p className="text-xs">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex flex-col gap-2">
                {replyTo && (
                  <div className="flex items-center justify-between px-2 py-1 bg-primary/10 rounded-md text-[10px]">
                    <span>Replying to <strong>{replyTo.author}</strong></span>
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setReplyTo(null)}><X className="h-3 w-3" /></Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input placeholder="Type a message..." value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()} className="flex-1" />
                  <Button onClick={handleSendChat} size="icon"><Send className="h-4 w-4" /></Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts */}
        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <select value={postType} onChange={e => setPostType(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-background text-sm">
                <option value="general">General</option>
                <option value="suggestion">Feature Suggestion</option>
                <option value="obstacle">Bug/Obstacle</option>
              </select>
              <div className="flex gap-2">
                <Textarea placeholder="Share your thoughts..." value={newPost} onChange={e => setNewPost(e.target.value)} rows={2} className="flex-1" />
                <Button onClick={handleSubmitPost} size="icon" className="self-end"><Send className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
          {posts.length === 0 ? <p className="text-center text-muted-foreground py-8">No posts yet</p> :
            posts.map(post => (
              <Card key={post.id}>
                <CardContent className="pt-4 group relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeIcon(post.post_type)}
                      <span className="font-medium text-sm">{post.author}</span>
                      <Badge variant="outline" className="text-xs">{post.post_type}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {post.author_key === getUserKey() && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditMessage(post, false)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDeleteMessage(post, false)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}

                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleVote(post.id, 'up')}>
                        <ThumbsUp className={`h-3.5 w-3.5 ${(post.liked_by || []).includes(getUserKey()) ? 'fill-primary text-primary' : ''}`} />
                      </Button>
                      <span className="text-xs font-bold">{(post.upvotes || 0) - (post.downvotes || 0)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleVote(post.id, 'down')}>
                        <ThumbsDown className={`h-3.5 w-3.5 ${(post.disliked_by || []).includes(getUserKey()) ? 'fill-destructive text-destructive' : ''}`} />
                      </Button>
                    </div>

                  </div>
                  <p className="text-sm">{post.content}</p>
                </CardContent>

              </Card>
            ))}
        </TabsContent>

        {/* Rate */}
        <TabsContent value="rate">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-400" />Rate This App</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)} className="p-1 hover:scale-110 transition-transform">
                    <Star className={`h-7 w-7 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                  </button>
                ))}
                <span className="text-sm text-muted-foreground">{rating}/5</span>
              </div>
              <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What can be improved?" rows={3} />
              <Button onClick={handleSubmitRating}>Submit Rating</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connect */}
        <TabsContent value="connect">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">📱 Telegram Community</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <img src={telegramQR} alt="Telegram QR" className="w-40 h-40 mx-auto rounded-lg border border-border" />
                <a href="https://t.me/biroskills" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2"><ExternalLink className="h-4 w-4" /> Join t.me/biroskills</Button>
                </a>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">📊 Biro-Log Study Tracker</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Track your daily study hours, get mentorship tips, and stay accountable with our companion app.</p>
                <a href="https://biro-log.vercel.app" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2"><ExternalLink className="h-4 w-4" /> Open Biro-Log</Button>
                </a>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">🤖 Biro-Brain AI</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Ask doubts, get explanations, create study plans with our AI assistant.</p>
                <a href="/biro-brain">
                  <Button variant="outline" className="w-full gap-2"><ExternalLink className="h-4 w-4" /> Open Biro-Brain</Button>
                </a>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">🏆 Share & Earn XP</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full gap-2 justify-start"
                  onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`Join JEE CBT Analyzer: ${window.location.origin}`)}`); addReward(5, 'Shared on WhatsApp'); }}>
                  Share on WhatsApp
                </Button>
                <Button variant="outline" className="w-full gap-2 justify-start"
                  onClick={() => { window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}`); addReward(5, 'Shared on Telegram'); }}>
                  Share on Telegram
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
