import React, { useState, useEffect, useRef } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { generateId } from '@/lib/storage';
import { 
  MessageSquare, ThumbsUp, ThumbsDown, Lightbulb, AlertTriangle, Send, 
  Trash2, Edit2, X, Check, Star, Gift, Share2, MessageCircle, Trophy
} from 'lucide-react';

// ─── Types ───
interface Post {
  id: string;
  type: 'suggestion' | 'obstacle' | 'general';
  content: string;
  author: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  editedAt?: string;
}

interface ChatMessage {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

interface Reward {
  id: string;
  type: string;
  points: number;
  earnedAt: string;
  description: string;
}

// ─── Storage ───
const POSTS_KEY = 'community_posts';
const CHAT_KEY = 'community_chat';
const REWARDS_KEY = 'user_rewards';
const RATINGS_KEY = 'app_ratings';

function getStored<T>(key: string, def: T): T {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; }
}
function setStored<T>(key: string, val: T) { localStorage.setItem(key, JSON.stringify(val)); }

// ─── Reward System ───
function getRewards(): Reward[] { return getStored<Reward[]>(REWARDS_KEY, []); }
function getTotalPoints(): number { return getRewards().reduce((s, r) => s + r.points, 0); }

function addReward(type: string, points: number, desc: string) {
  const rewards = getRewards();
  rewards.push({ id: generateId(), type, points, earnedAt: new Date().toISOString(), description: desc });
  setStored(REWARDS_KEY, rewards);
}

export default function Community() {
  const [posts, setPosts] = useState<Post[]>(getStored(POSTS_KEY, []));
  const [chat, setChat] = useState<ChatMessage[]>(getStored(CHAT_KEY, []));
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'suggestion' | 'obstacle' | 'general'>('general');
  const [author, setAuthor] = useState(localStorage.getItem('community_author') || '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState('posts');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setStored(POSTS_KEY, posts); }, [posts]);
  useEffect(() => { setStored(CHAT_KEY, chat); }, [chat]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const totalPoints = getTotalPoints();

  const handleSubmitPost = () => {
    if (!newPost.trim() || !author.trim()) { toast.error('Enter your name and message'); return; }
    localStorage.setItem('community_author', author.trim());
    const post: Post = {
      id: generateId(), type: postType, content: newPost.trim(), author: author.trim(),
      createdAt: new Date().toISOString(), upvotes: 0, downvotes: 0, userVote: null,
    };
    setPosts(prev => [post, ...prev]);
    setNewPost('');
    addReward('post', 10, 'Posted in community');
    toast.success('Posted! +10 XP');
  };

  const handleVote = (id: string, direction: 'up' | 'down') => {
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const wasUp = p.userVote === 'up';
      const wasDown = p.userVote === 'down';
      if (direction === 'up') {
        return { ...p, upvotes: wasUp ? p.upvotes - 1 : p.upvotes + 1, downvotes: wasDown ? p.downvotes - 1 : p.downvotes, userVote: wasUp ? null : 'up' };
      } else {
        return { ...p, downvotes: wasDown ? p.downvotes - 1 : p.downvotes + 1, upvotes: wasUp ? p.upvotes - 1 : p.upvotes, userVote: wasDown ? null : 'down' };
      }
    }));
  };

  const handleDelete = (id: string) => { setPosts(prev => prev.filter(p => p.id !== id)); toast.success('Deleted'); };
  const handleEdit = (id: string) => { const p = posts.find(p => p.id === id); if (p) { setEditingId(id); setEditContent(p.content); } };
  const handleSaveEdit = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, content: editContent, editedAt: new Date().toISOString() } : p));
    setEditingId(null); toast.success('Updated');
  };

  const handleSendChat = () => {
    if (!chatMsg.trim() || !author.trim()) { toast.error('Enter your name and message'); return; }
    localStorage.setItem('community_author', author.trim());
    setChat(prev => [...prev, { id: generateId(), author: author.trim(), content: chatMsg.trim(), timestamp: new Date().toISOString() }]);
    setChatMsg('');
    addReward('chat', 2, 'Sent a chat message');
  };

  const handleSubmitRating = () => {
    if (rating === 0) { toast.error('Select a rating'); return; }
    const ratings = getStored<any[]>(RATINGS_KEY, []);
    ratings.push({ rating, feedback, date: new Date().toISOString(), author });
    setStored(RATINGS_KEY, ratings);
    addReward('rating', 15, 'Rated the app');
    toast.success('Thanks for your feedback! +15 XP');
    setRating(0); setFeedback('');
  };

  const shareReward = (platform: string) => {
    const text = `🏆 I earned ${totalPoints} XP on AspirantAI CBT Analyzer! Join me: ${window.location.origin}`;
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`,
      reddit: `https://reddit.com/submit?title=${encodeURIComponent('My AspirantAI Progress')}&text=${encodeURIComponent(text)}`,
    };
    window.open(urls[platform], '_blank');
    addReward('share', 5, `Shared on ${platform}`);
    toast.success(`Shared! +5 XP`);
  };

  const getTypeIcon = (type: string) => {
    if (type === 'suggestion') return <Lightbulb className="h-4 w-4 text-yellow-400" />;
    if (type === 'obstacle') return <AlertTriangle className="h-4 w-4 text-red-400" />;
    return <MessageSquare className="h-4 w-4 text-primary" />;
  };

  const filteredPosts = (type: string) => type === 'all' ? posts : posts.filter(p => p.type === type);

  return (
    <MainLayout>
      <PageHeader title="Community" description="Chat, suggest features, rate the app & earn rewards">
        <div className="flex items-center gap-2">
          <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 gap-1">
            <Trophy className="h-3 w-3" /> {totalPoints} XP
          </Badge>
        </div>
      </PageHeader>

      {/* Author Input */}
      <div className="mb-4">
        <Input placeholder="Your display name" value={author} onChange={e => setAuthor(e.target.value)} className="max-w-xs" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="chat">Live Chat</TabsTrigger>
          <TabsTrigger value="rate">Rate & Review</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>

        {/* ─── Posts Tab ─── */}
        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex gap-2">
                <select value={postType} onChange={e => setPostType(e.target.value as any)}
                  className="px-3 py-2 rounded-md border border-border bg-background text-sm">
                  <option value="general">General</option>
                  <option value="suggestion">Feature Suggestion</option>
                  <option value="obstacle">Bug/Obstacle</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Textarea placeholder="Share your thoughts..." value={newPost} onChange={e => setNewPost(e.target.value)} rows={2} className="flex-1" />
                <Button onClick={handleSubmitPost} size="icon" className="self-end"><Send className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="all">
            <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="suggestion">Suggestions</TabsTrigger><TabsTrigger value="obstacle">Issues</TabsTrigger></TabsList>
            {['all', 'suggestion', 'obstacle', 'general'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-3">
                {filteredPosts(tab).length === 0 ? <p className="text-center text-muted-foreground py-8">No posts yet</p> :
                  filteredPosts(tab).map(post => (
                    <Card key={post.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {getTypeIcon(post.type)}
                            <span className="font-medium text-sm">{post.author}</span>
                            <Badge variant="outline" className="text-xs">{post.type}</Badge>
                            <span className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</span>
                            {post.editedAt && <span className="text-xs text-muted-foreground">(edited)</span>}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(post.id)}><Edit2 className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(post.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        {editingId === post.id ? (
                          <div className="flex gap-2 mt-2">
                            <Input value={editContent} onChange={e => setEditContent(e.target.value)} className="flex-1" />
                            <Button size="icon" onClick={() => handleSaveEdit(post.id)}><Check className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                          </div>
                        ) : <p className="text-sm mb-3">{post.content}</p>}
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="sm" className={`gap-1 ${post.userVote === 'up' ? 'text-correct' : ''}`} onClick={() => handleVote(post.id, 'up')}>
                            <ThumbsUp className="h-3 w-3" /> {post.upvotes}
                          </Button>
                          <Button variant="ghost" size="sm" className={`gap-1 ${post.userVote === 'down' ? 'text-incorrect' : ''}`} onClick={() => handleVote(post.id, 'down')}>
                            <ThumbsDown className="h-3 w-3" /> {post.downvotes}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* ─── Live Chat Tab ─── */}
        <TabsContent value="chat">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" />Live Chat</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[400px] overflow-y-auto border border-border rounded-lg p-3 mb-3 space-y-2 bg-secondary/20">
                {chat.length === 0 && <p className="text-center text-muted-foreground py-8">No messages yet. Start chatting!</p>}
                {chat.map(msg => (
                  <div key={msg.id} className="p-2 rounded-lg bg-card border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs text-primary">{msg.author}</span>
                      <span className="text-xs text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <Input placeholder="Type a message..." value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()} className="flex-1" />
                <Button onClick={handleSendChat} size="icon"><Send className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Rate Tab ─── */}
        <TabsContent value="rate">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-400" />Rate This App</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setRating(s)} className="p-1 hover:scale-110 transition-transform">
                      <Star className={`h-7 w-7 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{rating}/5</span>
              </div>
              <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What do you like? What can be improved?" rows={3} />
              <Button onClick={handleSubmitRating}>Submit Rating</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Rewards Tab ─── */}
        <TabsContent value="rewards">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-400" />Your Rewards</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <p className="text-4xl font-bold text-yellow-400">{totalPoints}</p>
                  <p className="text-sm text-muted-foreground">Total XP Earned</p>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {getRewards().slice(-20).reverse().map(r => (
                    <div key={r.id} className="flex justify-between items-center p-2 rounded border border-border text-sm">
                      <span>{r.description}</span>
                      <Badge className="bg-yellow-400/20 text-yellow-400">+{r.points} XP</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5 text-primary" />Share & Earn</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Share your progress with friends and earn 5 XP per share!</p>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" onClick={() => shareReward('whatsapp')} className="gap-2 justify-start">
                    <Gift className="h-4 w-4 text-green-500" /> Share on WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => shareReward('telegram')} className="gap-2 justify-start">
                    <Gift className="h-4 w-4 text-blue-400" /> Share on Telegram
                  </Button>
                  <Button variant="outline" onClick={() => shareReward('reddit')} className="gap-2 justify-start">
                    <Gift className="h-4 w-4 text-orange-500" /> Share on Reddit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
