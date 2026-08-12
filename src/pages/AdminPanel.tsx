import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Lock, Trash2, Activity, Ban, KeyRound, Loader2, FolderOpen, Share2, Mail, CheckCircle, XCircle, Star, History as HistoryIcon, ZoomIn, User, Image as ImageIcon, Target, Plus, GitBranch, Database, Layout, Server, Cpu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FolderAccessManager } from '@/components/exam/FolderAccessManager';
import {
  fetchAppSettings,
  updateAppSetting,
  verifyPassword,
  PublicSettings,
} from '@/lib/app-settings';

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

if (typeof window !== 'undefined') {
  const existingCount = parseInt(localStorage.getItem('total_visit_count') || '0');
  localStorage.setItem('total_visit_count', String(existingCount + 1));
  localStorage.setItem('last_visit', new Date().toISOString());
  logVisit();
}

function ModerationDashboard({ ownerPassword }: { ownerPassword: string }) {
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchResponses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hot_question_responses')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setResponses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this response?')) return;
    const { error } = await supabase.from('hot_question_responses').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Deleted');
      fetchResponses();
    }
  };

  const handleBanUser = async (userKey: string) => {
    if (!confirm('Ban this user key from interacting?')) return;
    // We add to our local banned list and also mark in profile if exists
    const banned = JSON.parse(localStorage.getItem(BANNED_KEY) || '[]');
    if (!banned.includes(userKey)) {
      banned.push(userKey);
      localStorage.setItem(BANNED_KEY, JSON.stringify(banned));
    }
    toast.success('User key added to ban list');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Response Moderation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : responses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No responses found</p>
          ) : (
            responses.map((r) => (
              <div key={r.id} className="p-4 rounded-xl border border-border bg-card group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-black">{r.user_display_name}</span>
                    <Badge variant="outline" className="text-[10px]">{new Date(r.created_at).toLocaleDateString()}</Badge>
                    {r.parent_id && <Badge className="text-[9px] bg-muted text-muted-foreground">Reply</Badge>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500" onClick={() => handleBanUser(r.user_key)}>
                      <Ban className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm mb-2">{r.comment || <span className="italic text-muted-foreground">No comment</span>}</p>
                <div className="flex gap-4 text-[10px] text-muted-foreground">
                  <span>Selected: <span className="font-bold">{r.selected_option}</span></span>
                  <span>Likes: {r.likes || 0}</span>
                  <span className="truncate max-w-[150px]">Key: {r.user_key}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}


export default function AdminPanel() {
  const [step, setStep] = useState<'pass1' | 'pass2' | 'authenticated'>('pass1');
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [verifying, setVerifying] = useState(false);
  // Owner password (admin_password_2) cached IN MEMORY ONLY for the session, used to authorize setting writes.
  const [ownerPassword, setOwnerPassword] = useState<string>('');

  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [bannedUsers, setBannedUsers] = useState<string[]>(
    JSON.parse(localStorage.getItem(BANNED_KEY) || '[]')
  );
  const [banInput, setBanInput] = useState('');

  const [newTestPw, setNewTestPw] = useState('');
  const [expDays, setExpDays] = useState(0);
  const [expHours, setExpHours] = useState(0);
  const [expMinutes, setExpMinutes] = useState(0);
  const [newAdminPw1, setNewAdminPw1] = useState('');
  const [newAdminPw2, setNewAdminPw2] = useState('');
  const [dailyQuota, setDailyQuota] = useState(5);
  const [monthlyQuota, setMonthlyQuota] = useState(50);
  const [newConfirmationPhrase, setNewConfirmationPhrase] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [newHotQuestion, setNewHotQuestion] = useState('');
  const [hotQuestionType, setHotQuestionType] = useState<'mcq' | 'msq' | 'integer' | 'poll'>('mcq');
  const [hotQuestionOptions, setHotQuestionOptions] = useState<string[]>(['', '', '', '']);
  const [hotQuestionCorrect, setHotQuestionCorrect] = useState('');
  const [hotQuestionImageUrl, setHotQuestionImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('moderation');
  const [systemMap, setSystemMap] = useState<string>('');
  const [savingHot, setSavingHot] = useState(false);
  const [savingPhrase, setSavingPhrase] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchAppSettings().then((s) => {
      setSettings(s);
      setDailyQuota(s.quota_daily_tests);
      setMonthlyQuota(s.quota_monthly_tests);
      setNewHotQuestion(s.daily_hot_question || '');
      setNewConfirmationPhrase(s.confirmation_phrase || 'I LOVE YOU BIRO');
    });
  }, []);

  const handlePass1 = async () => {
    if (!pass1.trim()) return toast.error('Enter password');
    setVerifying(true);
    const r = await verifyPassword('admin_1', pass1.trim());
    setVerifying(false);
    if (r.ok) { setStep('pass2'); toast.success('Step 1 verified'); }
    else toast.error(r.error || 'Incorrect password');
  };

  const handlePass2 = async () => {
    if (!pass2.trim()) return toast.error('Enter password');
    setVerifying(true);
    const r = await verifyPassword('admin_2', pass2.trim());
    setVerifying(false);
    if (r.ok) {
      setOwnerPassword(pass2.trim()); // keep in memory only for authorized writes
      setStep('authenticated');
      setPass2('');
      toast.success('Welcome, Admin!');
    } else {
      toast.error(r.error || 'Incorrect password');
    }
  };

  const handleSaveTestPassword = async () => {
    if (!ownerPassword) return toast.error('Session expired, re-login');
    if (!newTestPw.trim()) return toast.error('Enter a password');
    setSavingPw(true);
    const totalMs = ((expDays * 24 + expHours) * 60 + expMinutes) * 60 * 1000;
    const expiresAt = totalMs > 0 ? new Date(Date.now() + totalMs).toISOString() : null;
    const r1 = await updateAppSetting('test_creation_password', newTestPw.trim(), ownerPassword);
    const r2 = await updateAppSetting('test_creation_password_expires_at', expiresAt, ownerPassword);
    setSavingPw(false);
    if (r1.ok && r2.ok) {
      toast.success('Test creation password updated');
      setSettings(await fetchAppSettings());
      setNewTestPw('');
    } else {
      toast.error(r1.error || r2.error || 'Failed to update');
    }
  };

  const handleSaveAdminPasswords = async () => {
    if (!ownerPassword) return toast.error('Session expired, re-login');
    if (!newAdminPw1.trim() && !newAdminPw2.trim()) return toast.error('Enter at least one new password');
    setSavingPw(true);
    const tasks: Promise<any>[] = [];
    if (newAdminPw1.trim()) tasks.push(updateAppSetting('admin_password_1', newAdminPw1.trim(), ownerPassword));
    let newOwner = ownerPassword;
    if (newAdminPw2.trim()) {
      tasks.push(updateAppSetting('admin_password_2', newAdminPw2.trim(), ownerPassword));
      newOwner = newAdminPw2.trim();
    }
    const results = await Promise.all(tasks);
    setSavingPw(false);
    if (results.every(r => r.ok)) {
      toast.success('Owner passwords updated');
      setOwnerPassword(newOwner);
      setNewAdminPw1(''); setNewAdminPw2('');
    } else {
      toast.error(results.find(r => !r.ok)?.error || 'Failed to update');
    }
  };

  const handleSaveQuotas = async () => {
    if (!ownerPassword) return toast.error('Session expired, re-login');
    setSavingPw(true);
    const r1 = await updateAppSetting('quota_daily_tests', dailyQuota, ownerPassword);
    const r2 = await updateAppSetting('quota_monthly_tests', monthlyQuota, ownerPassword);
    setSavingPw(false);
    if (r1.ok && r2.ok) {
      toast.success('Quotas updated');
      setSettings(await fetchAppSettings());
    } else {
      toast.error(r1.error || r2.error || 'Failed to update');
    }
  };

  const HOT_Q_COLUMNS = 'id, content, created_at, options, image_url, question_type, type';

  const fetchHotQuestionsHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.from('hot_questions').select(HOT_Q_COLUMNS).order('created_at', { ascending: false });
    if (data) setHistory(data);
    setLoadingHistory(false);
  };


  useEffect(() => {
    if (step === 'authenticated') {
      fetchHotQuestionsHistory();
    }
  }, [step]);

  const handleSaveHotQuestion = async () => {
    if (!ownerPassword) return toast.error('Session expired, re-login');
    if (!newHotQuestion.trim() && !hotQuestionImageUrl) return toast.error('Enter question content or upload image');

    setSavingHot(true);
    
    // Check if hot_questions table has a column for image_url
    // If not, we should probably handle it or ensure schema is updated.
    
    const questionData = {
      content: newHotQuestion.trim(),
      image_url: hotQuestionImageUrl,
      options: ['mcq', 'msq', 'poll'].includes(hotQuestionType)
        ? hotQuestionOptions.filter(o => o !== null && o !== undefined && o !== '') 
        : null,
      correct_option: hotQuestionCorrect.trim() || null,
      type: hotQuestionType 
    };

    let result;
    if (editingQuestionId) {
      result = await supabase.from('hot_questions').update({
        ...questionData,
        question_type: hotQuestionType // Sync with the column being read
      }).eq('id', editingQuestionId);
    } else {
      result = await supabase.from('hot_questions').insert({
        ...questionData,
        question_type: hotQuestionType // Sync with the column being read
      });
    }

    setSavingHot(false);
    if (!result.error) {
      toast.success(editingQuestionId ? 'Question updated' : 'Daily Hot Question posted');
      setSettings(await fetchAppSettings());
      setNewHotQuestion('');
      setHotQuestionImageUrl(null);
      setHotQuestionOptions(['', '', '', '']);
      setHotQuestionCorrect('');
      setEditingQuestionId(null);
      fetchHotQuestionsHistory();
    } else {
      console.error('Save hot question error:', result.error);
      toast.error(result.error.message || 'Failed to update');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large (max 2MB)");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `hot-questions/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('biro-test-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('biro-test-images')
        .getPublicUrl(filePath);

      setHotQuestionImageUrl(publicUrl);
      toast.success("Image uploaded!");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Failed to upload image: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditQuestion = async (q: any) => {
    setEditingQuestionId(q.id);
    setNewHotQuestion(q.content || '');
    setHotQuestionType(q.type || 'mcq');
    setHotQuestionOptions(q.options || ['', '', '', '']);
    setHotQuestionImageUrl(q.image_url || null);
    // The answer key is not readable from the client; fetch it server-side with the owner password.
    setHotQuestionCorrect('');
    try {
      const { data } = await supabase.functions.invoke('hot-question-answer', {
        body: { action: 'admin_get', password: ownerPassword, id: q.id },
      });
      const answer = (data as any)?.answers?.[0]?.correct_option;
      if (answer) setHotQuestionCorrect(answer);
    } catch {
      // Leave blank; owner can re-enter the answer.
    }
    // Scroll to the management section
    document.getElementById('daily-hot-question')?.scrollIntoView({ behavior: 'smooth' });
  };


  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    const { error } = await supabase.from('hot_questions').delete().eq('id', id);
    if (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete question');
    } else {
      toast.success('Question deleted');
      // If we deleted the "active" (latest) question, the real-time sub will trigger fetchQuestion
      // but we should also clear local state if we were editing it
      if (editingQuestionId === id) {
        setEditingQuestionId(null);
        setNewHotQuestion('');
      }
      fetchHotQuestionsHistory();
    }
  };

  const handleSaveConfirmationPhrase = async () => {
    if (!ownerPassword) return toast.error('Session expired, re-login');
    setSavingPhrase(true);
    const r = await updateAppSetting('confirmation_phrase', newConfirmationPhrase.trim(), ownerPassword);
    setSavingPhrase(false);
    if (r.ok) {
      toast.success('Confirmation phrase updated');
      setSettings(await fetchAppSettings());
    } else {
      toast.error(r.error || 'Failed to update');
    }
  };

  if (step !== 'authenticated') {
    return (
      <MainLayout>
        <PageHeader title="Admin Panel" description="Owner access only — passwords verified server-side" />
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
            <Button onClick={step === 'pass1' ? handlePass1 : handlePass2} disabled={verifying} className="w-full">
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
            </Button>
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

  const renderMappingTab = () => (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          System Architecture & Data Flow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Layout className="h-4 w-4 text-primary" />
              <h4 className="font-bold text-sm">PDF-to-CBT Engine</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Uses PDF.js for rendering and Gemini-1.5-Flash for vision-based extraction. 
              Scanned PDFs are processed by cropping page segments and sending them to AI.
            </p>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-green-500" />
              <h4 className="font-bold text-sm">Storage Layer</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              - **IndexedDB**: Persistent large PDF storage in 1MB chunks.<br/>
              - **Supabase Storage**: `biro-test-images` bucket stores question and DHQ images.
            </p>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-4 w-4 text-purple-500" />
              <h4 className="font-bold text-sm">Manual Crop Logic</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Renders PDF buffer onto a high-res hidden canvas (2.5x). Crops are transformed from screen coordinates to natural image coordinates.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl border-2 border-dashed border-primary/20 bg-muted/30">
          <h4 className="font-black text-xl mb-4 text-center">Data Mapping Diagram</h4>
          <pre className="text-[10px] md:text-xs font-mono p-4 bg-black/90 text-green-400 rounded-lg overflow-x-auto">
{`
[USER PDF] -> (IndexedDB Chunks) -> [BROWSER MEMORY]
                                      |
       +------------------------------+------------------------------+
       |                              |                              |
[AUTO EXTRACTION]             [MANUAL CROP TOOL]             [SYSTEM CONFIG]
       |                              |                              |
(Gemini Vision API)           (PDF.js Renderer)              (Supabase RLS)
       |                              |                              |
[JSON TEST SCHEMA] <----------- [CROP COORDINATES] ----------> [STORAGE BUCKET]
       |                              |                              |
[MY TESTS HISTORY] <---------- [CREATED TEST] --------------> [PUBLIC CATALOG]
`}
          </pre>
        </div>

        <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
          <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Security & Persistence
          </h4>
          <ul className="text-xs space-y-2 list-disc pl-4 text-muted-foreground">
            <li>Owner credentials (2-tier) are verified via Edge Functions.</li>
            <li>Row-Level Security (RLS) protects `hot_questions` and `tests` tables.</li>
            <li>PDFs are never stored on the backend to save bandwidth and ensure privacy.</li>
            <li>User Gemini keys are stored in LocalStorage, never touching our servers.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
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

  const todayVisits = visitLog.filter((v: any) => new Date(v.timestamp).toDateString() === new Date().toDateString()).length;
  const uniquePages = [...new Set(visitLog.map((v: any) => v.page))];

  const hot_question_image_preview = hotQuestionImageUrl && (
    <div className="mt-4 relative group w-full flex justify-center">
      <div className="relative rounded-2xl overflow-hidden border-2 border-primary/20 shadow-neon bg-white p-3 flex justify-center items-center min-h-[200px] w-full max-w-2xl transition-all hover:border-primary/40">
        <img 
          src={`${hotQuestionImageUrl}${hotQuestionImageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`} 
          alt="Admin Preview" 
          key={hotQuestionImageUrl}
          className="max-h-[500px] w-full object-contain block rounded-lg" 
          crossOrigin="anonymous"
          onError={(e) => {
            console.error("Admin preview image failed to load");
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Image+Load+Error';
          }}
        />
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-8 shadow-lg border border-primary/10 bg-white/90 backdrop-blur-sm text-primary"
            onClick={() => window.open(hotQuestionImageUrl, '_blank')}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            className="h-8 shadow-lg"
            onClick={() => setHotQuestionImageUrl(null)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <PageHeader title="Admin Panel" description="Manage posts, users, analytics & app data" />

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

      <Tabs defaultValue="passwords">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="passwords">Passwords</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="shares">Shares</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="architecture">Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="passwords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" />Test Creation Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Stored securely on the server. Current value is never sent to the browser. Set a new password below.
              </p>
              <p className="text-xs text-muted-foreground">
                Expires: {settings?.test_creation_password_expires_at
                  ? new Date(settings.test_creation_password_expires_at).toLocaleString()
                  : 'Never'}
              </p>
              <div>
                <Label>New password</Label>
                <Input type="password" value={newTestPw} onChange={e => setNewTestPw(e.target.value)} placeholder="New test creation password" />
              </div>
              <div>
                <Label className="text-xs">Valid for (all 0 = never expires)</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div>
                    <Input type="number" min={0} value={expDays} onChange={e => setExpDays(Number(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground mt-1">Days</p>
                  </div>
                  <div>
                    <Input type="number" min={0} value={expHours} onChange={e => setExpHours(Number(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground mt-1">Hours</p>
                  </div>
                  <div>
                    <Input type="number" min={0} value={expMinutes} onChange={e => setExpMinutes(Number(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground mt-1">Minutes</p>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveTestPassword} disabled={savingPw} className="w-full">
                {savingPw ? 'Saving...' : 'Save Test Password & Expiry'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />Owner Panel Passwords</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Stored on the server. Enter new values below to rotate. Leave blank to keep current.
              </p>
              <div>
                <Label>New 1st password</Label>
                <Input type="password" value={newAdminPw1} onChange={e => setNewAdminPw1(e.target.value)} placeholder="Leave empty to keep current" />
              </div>
              <div>
                <Label>New 2nd password</Label>
                <Input type="password" value={newAdminPw2} onChange={e => setNewAdminPw2(e.target.value)} placeholder="Leave empty to keep current" />
              </div>
              <Button onClick={handleSaveAdminPasswords} disabled={savingPw} className="w-full">
                {savingPw ? 'Saving...' : 'Update Owner Passwords'}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Test Save Confirmation Phrase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                The text users must type correctly before saving a newly created test.
              </p>
              <Input 
                value={newConfirmationPhrase} 
                onChange={e => setNewConfirmationPhrase(e.target.value)} 
                placeholder="Confirmation phrase"
              />
              <Button onClick={handleSaveConfirmationPhrase} disabled={savingPhrase} className="w-full">
                {savingPhrase ? 'Saving...' : 'Update Confirmation Phrase'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Test-Creation Quotas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Controls how many tests each user can create per day / per month. Users see remaining count in the Create Test page.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Daily limit</Label>
                  <Input type="number" min={1} value={dailyQuota} onChange={e => setDailyQuota(Number(e.target.value) || 1)} />
                </div>
                <div>
                  <Label>Monthly limit</Label>
                  <Input type="number" min={1} value={monthlyQuota} onChange={e => setMonthlyQuota(Number(e.target.value) || 1)} />
                </div>
              </div>
              <Button onClick={handleSaveQuotas} disabled={savingPw} className="w-full">
                {savingPw ? 'Saving...' : 'Save Quotas'}
              </Button>
            </CardContent>
          </Card>
          <Card id="daily-hot-question">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                Daily Hot Question Management {editingQuestionId && <Badge className="ml-2">Editing Mode</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingQuestionId && (
                <div className="flex items-center justify-between bg-primary/10 p-2 rounded border border-primary/20 text-xs">
                  <span>You are editing an existing question. Saving will update it.</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                    setEditingQuestionId(null);
                    setNewHotQuestion('');
                    setHotQuestionImageUrl(null);
                    setHotQuestionOptions(['', '', '', '']);
                    setHotQuestionCorrect('');
                  }}>Cancel Edit</Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Post a new challenge. It will appear on the Dashboard for 24 hours and stay in history forever.
              </p>
              
              <div className="space-y-2">
                <Label>Question Type</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'mcq', label: 'MCQ', icon: Target },
                    { id: 'msq', label: 'MSQ', icon: Target },
                    { id: 'integer', label: 'Integer', icon: Plus },
                    { id: 'poll', label: 'Poll', icon: Activity }
                  ].map((t) => (
                    <Button 
                      key={t.id}
                      size="sm"
                      variant={hotQuestionType === t.id ? 'default' : 'outline'}
                      onClick={() => setHotQuestionType(t.id as any)}
                      className="uppercase text-[10px] gap-1"
                    >
                      <t.icon className="h-3 w-3" />
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question Content (LaTeX supported)</Label>
                <Textarea 
                  value={newHotQuestion} 
                  onChange={e => setNewHotQuestion(e.target.value)} 
                  placeholder="e.g. Find the value of $\int_0^\pi \sin(x) dx$"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Question Image URL (Optional)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={hotQuestionImageUrl || ''} 
                    onChange={e => setHotQuestionImageUrl(e.target.value || null)} 
                    placeholder="https://example.com/question.png"
                  />
                  <Button variant="outline" type="button" className="flex-1 gap-2" disabled={isUploading} onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("Image too large (max 2MB)");
                          return;
                        }
                        
                        setIsUploading(true);
                        toast.info('Uploading image...');
                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `hot-q-${Date.now()}.${fileExt}`;
                          const filePath = `hot-questions/${fileName}`;
                          
                          const { data, error } = await supabase.storage
                            .from('biro-test-images')
                            .upload(filePath, file, {
                              cacheControl: '0', 
                              upsert: true
                            });
                          
                          if (error) throw error;
                          
                          const { data: { publicUrl } } = supabase.storage
                            .from('biro-test-images')
                            .getPublicUrl(filePath);
                          
                          setHotQuestionImageUrl(`${publicUrl}?t=${Date.now()}`);
                          toast.success('Image uploaded!');
                        } catch (err: any) {
                          console.error('Upload error details:', err);
                          toast.error('Upload failed: ' + err.message);
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    };
                    input.click();
                  }}>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    {hotQuestionImageUrl ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
                {hot_question_image_preview}
              </div>

              {(hotQuestionType === 'mcq' || hotQuestionType === 'msq' || hotQuestionType === 'poll') && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {hotQuestionOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <Badge variant="outline" className="h-10 w-8 flex justify-center">{String.fromCharCode(65 + i)}</Badge>
                        <Input 
                          value={opt} 
                          onChange={e => {
                            const newOpts = [...hotQuestionOptions];
                            newOpts[i] = e.target.value;
                            setHotQuestionOptions(newOpts);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hotQuestionType !== 'poll' && (
                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  <Input 
                    value={hotQuestionCorrect} 
                    onChange={e => setHotQuestionCorrect(e.target.value)} 
                    placeholder={hotQuestionType === 'integer' ? "e.g. 2" : "e.g. A"}
                  />
                </div>
              )}

              <Button onClick={handleSaveHotQuestion} disabled={savingHot} className="w-full gap-2">
                {savingHot ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingQuestionId ? <CheckCircle className="h-4 w-4" /> : <Star className="h-4 w-4" />)}
                {editingQuestionId ? 'Update Question' : 'Post Daily Hot Question'}
              </Button>

              <div className="mt-8 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <HistoryIcon className="h-4 w-4" /> Question History & Management
                </h3>
                <div className="space-y-2">
                  {loadingHistory ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : history.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">No questions posted yet.</p>
                  ) : (
                    history.map(q => (
                      <div key={q.id} className="flex items-start justify-between p-3 rounded-lg border border-border bg-card">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[9px] uppercase">{q.type}</Badge>
                            <span className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="text-xs line-clamp-2 truncate">{q.content}</div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEditQuestion(q)}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shares" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5 text-primary" />Access Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <FolderAccessManager />
            </CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="moderation">
          <ModerationDashboard ownerPassword={ownerPassword} />
        </TabsContent>

        <TabsContent value="mapping">
          {renderMappingTab()}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
