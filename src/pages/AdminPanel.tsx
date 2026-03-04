import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Lock, Trash2, Users, Activity, Clock, Star, BarChart, Ban } from 'lucide-react';

const ADMIN_PASS_1 = '4918';
const ADMIN_PASS_2 = '555911';
const VISIT_LOG_KEY = 'admin_visit_log';
const BANNED_KEY = 'admin_banned_users';

function getVisitLog(): any[] {
  try { return JSON.parse(localStorage.getItem(VISIT_LOG_KEY) || '[]'); } catch { return []; }
}

function logVisit() {
  const log = getVisitLog();
  log.push({ timestamp: new Date().toISOString(), page: window.location.pathname });
  localStorage.setItem(VISIT_LOG_KEY, JSON.stringify(log.slice(-500)));
}

// Track visits
if (typeof window !== 'undefined') {
  const existingCount = parseInt(localStorage.getItem('total_visit_count') || '0');
  localStorage.setItem('total_visit_count', String(existingCount + 1));
  localStorage.setItem('last_visit', new Date().toISOString());
  logVisit();
}

export default function AdminPanel() {
  const [step, setStep] = useState<'pass1' | 'pass2' | 'authenticated'>('pass1');
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [bannedUsers, setBannedUsers] = useState<string[]>(
    JSON.parse(localStorage.getItem(BANNED_KEY) || '[]')
  );
  const [banInput, setBanInput] = useState('');

  const handlePass1 = () => {
    if (pass1 === ADMIN_PASS_1) { setStep('pass2'); toast.success('Step 1 verified'); }
    else toast.error('Incorrect password');
  };

  const handlePass2 = () => {
    if (pass2 === ADMIN_PASS_2) { setStep('authenticated'); toast.success('Welcome, Admin!'); }
    else toast.error('Incorrect password');
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
            <Input type="password" value={step === 'pass1' ? pass1 : pass2}
              onChange={e => step === 'pass1' ? setPass1(e.target.value) : setPass2(e.target.value)}
              placeholder="Enter password"
              onKeyDown={e => e.key === 'Enter' && (step === 'pass1' ? handlePass1() : handlePass2())} />
            <Button onClick={step === 'pass1' ? handlePass1 : handlePass2} className="w-full">Verify</Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const communityPosts = JSON.parse(localStorage.getItem('community_posts') || '[]');
  const appRatings = JSON.parse(localStorage.getItem('app_ratings') || '[]');
  const avgRating = appRatings.length > 0
    ? (appRatings.reduce((s: number, r: any) => s + r.rating, 0) / appRatings.length).toFixed(1) : 'N/A';
  const visitLog = getVisitLog();
  const totalVisits = parseInt(localStorage.getItem('total_visit_count') || '0');
  const lastVisit = localStorage.getItem('last_visit') || 'Never';

  const handleDeletePost = (postId: string) => {
    const updated = communityPosts.filter((p: any) => p.id !== postId);
    localStorage.setItem('community_posts', JSON.stringify(updated));
    toast.success('Post deleted');
    window.location.reload();
  };

  const handleBanUser = () => {
    if (!banInput.trim()) return;
    const updated = [...bannedUsers, banInput.trim()];
    setBannedUsers(updated);
    localStorage.setItem(BANNED_KEY, JSON.stringify(updated));
    setBanInput('');
    toast.success(`Banned: ${banInput.trim()}`);
  };

  const handleUnban = (user: string) => {
    const updated = bannedUsers.filter(u => u !== user);
    setBannedUsers(updated);
    localStorage.setItem(BANNED_KEY, JSON.stringify(updated));
    toast.success(`Unbanned: ${user}`);
  };

  // Visit analytics
  const todayVisits = visitLog.filter((v: any) => new Date(v.timestamp).toDateString() === new Date().toDateString()).length;
  const uniquePages = [...new Set(visitLog.map((v: any) => v.page))];

  return (
    <MainLayout>
      <PageHeader title="Admin Panel" description="Manage posts, users, analytics & app data" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-primary">{communityPosts.length}</p>
          <p className="text-xs text-muted-foreground">Posts</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-yellow-400">{avgRating}</p>
          <p className="text-xs text-muted-foreground">Avg Rating</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-correct">{totalVisits}</p>
          <p className="text-xs text-muted-foreground">Total Visits</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-primary">{todayVisits}</p>
          <p className="text-xs text-muted-foreground">Today's Activity</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-incorrect">{bannedUsers.length}</p>
          <p className="text-xs text-muted-foreground">Banned Users</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="posts">
        <TabsList className="mb-4">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Community Posts</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {communityPosts.length === 0 ? <p className="text-center text-muted-foreground py-8">No posts</p> :
                  communityPosts.map((post: any) => (
                    <div key={post.id} className="flex items-start justify-between p-3 rounded-lg border border-border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm">{post.author}</span>
                          <Badge variant="outline" className="text-xs">{post.type}</Badge>
                          <span className="text-xs text-muted-foreground">👍{post.upvotes} 👎{post.downvotes}</span>
                          <span className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm">{post.content}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeletePost(post.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings">
          <Card>
            <CardHeader><CardTitle>User Ratings & Feedback</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {appRatings.length === 0 ? <p className="text-center text-muted-foreground py-4">No ratings</p> :
                  appRatings.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded border border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        {r.author && <span className="text-xs font-medium">{r.author}</span>}
                        {r.feedback && <span className="text-sm text-muted-foreground">"{r.feedback}"</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Activity Log</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm text-muted-foreground">Last Visit</p>
                  <p className="font-medium text-sm">{new Date(lastVisit).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm text-muted-foreground">Pages Visited</p>
                  <p className="font-medium text-sm">{uniquePages.length} unique pages</p>
                </div>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {visitLog.slice(-50).reverse().map((v: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs p-1.5 rounded bg-card border border-border/50">
                    <span className="text-muted-foreground">{new Date(v.timestamp).toLocaleString()}</span>
                    <span>{v.page}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-incorrect" />Ban Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Username to ban" value={banInput} onChange={e => setBanInput(e.target.value)} />
                <Button variant="destructive" onClick={handleBanUser}>Ban</Button>
              </div>
              <div className="space-y-2">
                {bannedUsers.length === 0 ? <p className="text-sm text-muted-foreground">No banned users</p> :
                  bannedUsers.map(u => (
                    <div key={u} className="flex justify-between items-center p-2 rounded border border-border">
                      <span className="text-sm">{u}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleUnban(u)}>Unban</Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
