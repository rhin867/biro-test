import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { generateId } from '@/lib/storage';
import { MessageSquare, ThumbsUp, ThumbsDown, Lightbulb, AlertTriangle, Send, Trash2, Edit2, X, Check } from 'lucide-react';

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

const STORAGE_KEY = 'community_posts';

function getPosts(): Post[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function savePosts(posts: Post[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

export default function Community() {
  const [posts, setPosts] = useState<Post[]>(getPosts());
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'suggestion' | 'obstacle' | 'general'>('general');
  const [author, setAuthor] = useState(localStorage.getItem('community_author') || '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => { savePosts(posts); }, [posts]);

  const handleSubmit = () => {
    if (!newPost.trim()) { toast.error('Write something first'); return; }
    if (!author.trim()) { toast.error('Enter your name'); return; }
    localStorage.setItem('community_author', author.trim());
    
    const post: Post = {
      id: generateId(),
      type: postType,
      content: newPost.trim(),
      author: author.trim(),
      createdAt: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      userVote: null,
    };
    setPosts(prev => [post, ...prev]);
    setNewPost('');
    toast.success('Posted!');
  };

  const handleVote = (id: string, direction: 'up' | 'down') => {
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const wasUp = p.userVote === 'up';
      const wasDown = p.userVote === 'down';
      if (direction === 'up') {
        return {
          ...p,
          upvotes: wasUp ? p.upvotes - 1 : p.upvotes + 1,
          downvotes: wasDown ? p.downvotes - 1 : p.downvotes,
          userVote: wasUp ? null : 'up',
        };
      } else {
        return {
          ...p,
          downvotes: wasDown ? p.downvotes - 1 : p.downvotes + 1,
          upvotes: wasUp ? p.upvotes - 1 : p.upvotes,
          userVote: wasDown ? null : 'down',
        };
      }
    }));
  };

  const handleDelete = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    toast.success('Deleted');
  };

  const handleEdit = (id: string) => {
    const post = posts.find(p => p.id === id);
    if (post) { setEditingId(id); setEditContent(post.content); }
  };

  const handleSaveEdit = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, content: editContent, editedAt: new Date().toISOString() } : p));
    setEditingId(null);
    setEditContent('');
    toast.success('Updated');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return <Lightbulb className="h-4 w-4 text-yellow-400" />;
      case 'obstacle': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default: return <MessageSquare className="h-4 w-4 text-primary" />;
    }
  };

  const filteredPosts = (type: string) => type === 'all' ? posts : posts.filter(p => p.type === type);

  return (
    <MainLayout>
      <PageHeader title="Community" description="Share suggestions, report issues, and discuss" />

      {/* New Post */}
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Your name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-40"
            />
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as any)}
              className="px-3 py-2 rounded-md border border-border bg-background text-sm"
            >
              <option value="general">General</option>
              <option value="suggestion">Feature Suggestion</option>
              <option value="obstacle">Bug/Obstacle</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Share your thoughts..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button onClick={handleSubmit} size="icon" className="self-end">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="suggestion">Suggestions</TabsTrigger>
          <TabsTrigger value="obstacle">Issues</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>
        {['all', 'suggestion', 'obstacle', 'general'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-3">
            {filteredPosts(tab).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No posts yet</p>
            ) : (
              filteredPosts(tab).map(post => (
                <Card key={post.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(post.type)}
                        <span className="font-medium text-sm">{post.author}</span>
                        <Badge variant="outline" className="text-xs">{post.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        {post.editedAt && <span className="text-xs text-muted-foreground">(edited)</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(post.id)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(post.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {editingId === post.id ? (
                      <div className="flex gap-2 mt-2">
                        <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="flex-1" />
                        <Button size="icon" onClick={() => handleSaveEdit(post.id)}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <p className="text-sm mb-3">{post.content}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-1 ${post.userVote === 'up' ? 'text-correct' : ''}`}
                        onClick={() => handleVote(post.id, 'up')}
                      >
                        <ThumbsUp className="h-3 w-3" /> {post.upvotes}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-1 ${post.userVote === 'down' ? 'text-incorrect' : ''}`}
                        onClick={() => handleVote(post.id, 'down')}
                      >
                        <ThumbsDown className="h-3 w-3" /> {post.downvotes}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </MainLayout>
  );
}
