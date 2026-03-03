import React, { useState } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Lock, Trash2, Eye } from 'lucide-react';

const ADMIN_PASS_1 = '4918';
const ADMIN_PASS_2 = '555911';

export default function AdminPanel() {
  const [step, setStep] = useState<'pass1' | 'pass2' | 'authenticated'>('pass1');
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');

  const handlePass1 = () => {
    if (pass1 === ADMIN_PASS_1) {
      setStep('pass2');
      toast.success('Step 1 verified');
    } else {
      toast.error('Incorrect password');
    }
  };

  const handlePass2 = () => {
    if (pass2 === ADMIN_PASS_2) {
      setStep('authenticated');
      toast.success('Welcome, Admin!');
    } else {
      toast.error('Incorrect password');
    }
  };

  // Get community posts for admin review
  const communityPosts = JSON.parse(localStorage.getItem('community_posts') || '[]');
  const appRatings = JSON.parse(localStorage.getItem('app_ratings') || '[]');
  const avgRating = appRatings.length > 0
    ? (appRatings.reduce((s: number, r: any) => s + r.rating, 0) / appRatings.length).toFixed(1)
    : 'N/A';

  const handleDeletePost = (postId: string) => {
    const updated = communityPosts.filter((p: any) => p.id !== postId);
    localStorage.setItem('community_posts', JSON.stringify(updated));
    toast.success('Post deleted');
    window.location.reload();
  };

  if (step !== 'authenticated') {
    return (
      <MainLayout>
        <PageHeader title="Admin Panel" description="Owner access only" />
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {step === 'pass1' ? 'Step 1: Enter First Password' : 'Step 2: Enter Second Password'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={step === 'pass1' ? pass1 : pass2}
                onChange={(e) => step === 'pass1' ? setPass1(e.target.value) : setPass2(e.target.value)}
                placeholder="Enter password"
                onKeyDown={(e) => e.key === 'Enter' && (step === 'pass1' ? handlePass1() : handlePass2())}
              />
            </div>
            <Button onClick={step === 'pass1' ? handlePass1 : handlePass2} className="w-full">
              Verify
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader title="Admin Panel" description="Manage posts, ratings, and app data" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{communityPosts.length}</p>
            <p className="text-sm text-muted-foreground">Community Posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-yellow-400">{avgRating}</p>
            <p className="text-sm text-muted-foreground">Avg Rating ({appRatings.length} reviews)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-correct">{communityPosts.filter((p: any) => p.type === 'suggestion').length}</p>
            <p className="text-sm text-muted-foreground">Feature Suggestions</p>
          </CardContent>
        </Card>
      </div>

      {/* Community Posts Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Manage Community Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {communityPosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No posts yet</p>
            ) : (
              communityPosts.map((post: any) => (
                <div key={post.id} className="flex items-start justify-between p-3 rounded-lg border border-border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{post.author}</span>
                      <Badge variant="outline" className="text-xs">{post.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        👍{post.upvotes} 👎{post.downvotes}
                      </span>
                    </div>
                    <p className="text-sm">{post.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeletePost(post.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ratings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>User Ratings & Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {appRatings.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No ratings yet</p>
            ) : (
              appRatings.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    {r.feedback && <span className="text-sm text-muted-foreground">"{r.feedback}"</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
