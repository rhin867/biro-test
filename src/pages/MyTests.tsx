import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TestShareDialog } from '@/components/exam/TestShareDialog';
import { getTests, getResultsByTestId, deleteTest, generateShareCode, saveTest, loadTestQuestionImages } from '@/lib/storage';
import { formatTimeMinutes } from '@/lib/exam-utils';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDisplayName, getCurrentUserKey } from '@/lib/app-settings';
import {
  Plus, Play, BarChart3, Trash2, Clock, FileText, Target, MoreVertical, Share2, Key, CheckCircle2, Pencil, Globe, FolderLock, MailPlus
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function MyTests() {
  const [tests, setTests] = useState(getTests());
  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [publishDialog, setPublishDialog] = useState<{ id: string } | null>(null);
  const [publishPw, setPublishPw] = useState('');
  const [publishName, setPublishName] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [folders, setFolders] = useState<string[]>(JSON.parse(localStorage.getItem('test_folders') || '["General"]'));
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showShareFolderDialog, setShowShareFolderDialog] = useState(false);
  const [shareFolderName, setShareFolderName] = useState<string>('General');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePassword, setSharePassword] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const handleDeleteTest = (testId: string) => {
    deleteTest(testId);
    setTests(getTests());
    toast.success('Test deleted');
  };

  const handleGenerateShareCode = (testId: string) => {
    return generateShareCode(testId);
  };

  const handleRename = () => {
    if (!renameDialog || !newName.trim()) return;
    const test = tests.find(t => t.id === renameDialog.id);
    if (test) {
      test.name = newName.trim();
      saveTest(test);
      setTests(getTests());
      toast.success('Test renamed');
    }
    setRenameDialog(null);
  };

  const handleMakePublic = async () => {
    if (!publishDialog) return;
    const test = tests.find(t => t.id === publishDialog.id);
    if (!test) return;
    setPublishing(true);
    try {
      const finalName = (publishName.trim() || test.name).slice(0, 240);
      const questionImages = await loadTestQuestionImages(test.id);
      const withImages = Object.keys(questionImages).length
        ? { ...test, questions: test.questions.map((q) => questionImages[q.id] ? { ...q, croppedImageUrl: questionImages[q.id], hasDiagram: true } : q) }
        : test;
      const publishTest = { ...withImages, name: finalName };
      const { data, error } = await supabase.functions.invoke('publish-public-test', {
        body: { test: publishTest, ownerName: getCurrentDisplayName(), password: publishPw.trim() || null },
      });
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      toast.success('Test published! Anyone can find it in Public Tests.');
      setPublishDialog(null);
      setPublishPw('');
      setPublishName('');
    } catch (e: any) {
      toast.error('Failed to publish: ' + (e.message || 'unknown error'));
    } finally {
      setPublishing(false);
    }
  };

  const filteredTests = selectedFolder === 'All' 
    ? tests 
    : tests.filter(t => (t as any).folder === selectedFolder);

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    const updated = [...folders, newFolderName.trim()];
    setFolders(updated);
    localStorage.setItem('test_folders', JSON.stringify(updated));
    setNewFolderName('');
    setShowFolderDialog(false);
    toast.success('Folder created');
  };

  const handleMoveToFolder = (testId: string, folderName: string) => {
    const test = tests.find(t => t.id === testId);
    if (test) {
      (test as any).folder = folderName;
      saveTest(test);
      setTests(getTests());
      toast.success(`Moved to ${folderName}`);
    }
  };

  const handleRequestAccess = async (shareToken: string, email: string) => {
    try {
      // Find share record first
      const { data: shares, error: shareErr } = await supabase
        .from('test_folder_shares' as any)
        .select('id')
        .eq('share_token', shareToken);
      
      if (shareErr || !shares || shares.length === 0) throw new Error('Invalid share link');
      const share = shares[0] as any;

      const { error } = await supabase
        .from('folder_access_requests' as any)
        .insert({
          folder_share_id: share.id,
          requester_user_key: localStorage.getItem('user_key'),
          requester_email: email,
        } as any);

      if (error) throw error;
      toast.success('Access request sent to owner!');
    } catch (e: any) {
      toast.error('Failed to request access: ' + e.message);
    }
  };

  const handleShareFolder = async () => {
    if (!shareFolderName) return;
    setIsSharing(true);
    try {
      const { data, error } = await supabase
        .from('test_folder_shares' as any)
        .insert({
          folder_name: shareFolderName,
          owner_user_key: localStorage.getItem('user_key'),
          shared_with_email: shareEmail.trim() || null,
          password_hash: sharePassword.trim() || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      const shareLink = `${window.location.origin}/join-folder?token=${(data as any).share_token}`;
      await navigator.clipboard.writeText(shareLink);
      
      toast.success('Share link generated and copied to clipboard! Anyone with the link can now request access.');
      setShowShareFolderDialog(false);
    } catch (e: any) {
      toast.error('Failed to share: ' + e.message);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader title="My Tests" description={`${tests.length} tests available`}>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowFolderDialog(true)}>
            <Plus className="h-4 w-4" /> New Folder
          </Button>
          <Link to="/create">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create New Test</Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={() => setShowShareFolderDialog(true)}>
            <FolderLock className="h-4 w-4" /> Share Folder
          </Button>
          <Button variant="ghost" className="gap-2" onClick={() => {
            const token = prompt('Enter share token/link:');
            const email = prompt('Enter your email for access request:');
            if (token && email) handleRequestAccess(token, email);
          }}>
            <MailPlus className="h-4 w-4" /> Join Shared Folder
          </Button>
        </div>
      </PageHeader>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <Button 
          variant={selectedFolder === 'All' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setSelectedFolder('All')}
        >
          All
        </Button>
        {folders.map(folder => (
          <Button 
            key={folder}
            variant={selectedFolder === folder ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedFolder(folder)}
          >
            {folder}
          </Button>
        ))}
      </div>

      {filteredTests.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Tests Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first test by uploading a PDF</p>
            <Link to="/create"><Button className="gap-2"><Plus className="h-4 w-4" /> Create Test</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTests.map((test) => {
            const results = getResultsByTestId(test.id);
            const bestResult = results.length > 0
              ? results.reduce((best, r) => r.score > best.score ? r : best, results[0])
              : null;

            return (
              <Card key={test.id} className="group hover:border-primary/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1 flex items-center gap-2">
                        {test.name}
                        {test.hasAnswerKey && <CheckCircle2 className="h-4 w-4 text-correct" />}
                      </CardTitle>
                      <CardDescription className="mt-1">{new Date(test.createdAt).toLocaleDateString()}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to={`/exam/${test.id}`}>Start Test</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setRenameDialog({ id: test.id, name: test.name }); setNewName(test.name); }}>
                          <Pencil className="h-3 w-3 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setPublishDialog({ id: test.id }); setPublishPw(''); setPublishName(test.name); }}>
                          <Globe className="h-3 w-3 mr-2" /> Make Public
                        </DropdownMenuItem>
                        {results.length > 0 && (
                          <DropdownMenuItem asChild>
                            <Link to={`/analysis/${results[results.length - 1].attemptId}`}>View Analysis</Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex w-full items-center px-2 py-1.5 text-sm outline-none hover:bg-accent cursor-pointer">
                            Move to Folder...
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {folders.map(f => (
                              <DropdownMenuItem key={f} onClick={() => handleMoveToFolder(test.id, f)}>
                                {f}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                              Delete Test
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Test?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete this test and all its attempts.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTest(test.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {test.subjects.map(subject => (
                      <Badge key={subject} variant="outline" className={`badge-${subject.toLowerCase()}`}>{subject}</Badge>
                    ))}
                    {!test.hasAnswerKey && (
                      <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                        <Key className="h-3 w-3 mr-1" /> No Key
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted p-2">
                      <FileText className="h-4 w-4 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium mt-1">{test.questions.length}</p>
                      <p className="text-xs text-muted-foreground">Questions</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2">
                      <Clock className="h-4 w-4 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium mt-1">{test.duration}</p>
                      <p className="text-xs text-muted-foreground">Minutes</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2">
                      <Target className="h-4 w-4 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium mt-1">{test.totalMarks}</p>
                      <p className="text-xs text-muted-foreground">Marks</p>
                    </div>
                  </div>
                  {bestResult && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-correct/10 border border-correct/20">
                      <span className="text-sm text-muted-foreground">Best Score</span>
                      <span className="font-medium text-correct">{bestResult.score}/{bestResult.maxScore} ({bestResult.accuracy.toFixed(1)}%)</span>
                    </div>
                  )}
                  {results.length > 0 && (
                    <p className="text-xs text-center text-muted-foreground">{results.length} attempt{results.length !== 1 ? 's' : ''}</p>
                  )}
                  <div className="flex gap-2">
                    <Link to={`/exam/${test.id}`} className="flex-1">
                      <Button className="w-full gap-2"><Play className="h-4 w-4" /> Start Test</Button>
                    </Link>
                    <TestShareDialog test={test} onGenerateShareCode={() => handleGenerateShareCode(test.id)} />
                    {results.length > 0 && (
                      <Link to={`/analysis/${results[results.length - 1].attemptId}`}>
                        <Button variant="outline" size="icon"><BarChart3 className="h-4 w-4" /></Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={open => !open && setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Test</DialogTitle></DialogHeader>
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Enter new name"
            onKeyDown={e => e.key === 'Enter' && handleRename()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Public Dialog */}
      <Dialog open={!!publishDialog} onOpenChange={open => !open && setPublishDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Make Test Public</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anyone will be able to find and attempt this test from the Public Tests panel.
            Rename it here if you want a different public title, and optionally protect it with a password.
          </p>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Public test name</label>
            <Input type="text" value={publishName} onChange={e => setPublishName(e.target.value)}
              placeholder="Test name shown to others" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Password (optional)</label>
            <Input type="text" value={publishPw} onChange={e => setPublishPw(e.target.value)}
              placeholder="Leave empty for no password" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialog(null)}>Cancel</Button>
            <Button onClick={handleMakePublic} disabled={publishing || !publishName.trim()}>
              {publishing ? 'Publishing...' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
          <Input 
            value={newFolderName} 
            onChange={e => setNewFolderName(e.target.value)} 
            placeholder="Folder name"
            onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>Cancel</Button>
            <Button onClick={handleAddFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Share Folder Dialog */}
      <Dialog open={showShareFolderDialog} onOpenChange={setShowShareFolderDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share Test Folder</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Folder to share</label>
              <select 
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                value={shareFolderName}
                onChange={e => setShareFolderName(e.target.value)}
              >
                {folders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Specific user email (optional)</label>
              <Input 
                type="email" 
                value={shareEmail} 
                onChange={e => setShareEmail(e.target.value)} 
                placeholder="User email"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Password (optional)</label>
              <Input 
                type="password" 
                value={sharePassword} 
                onChange={e => setSharePassword(e.target.value)} 
                placeholder="Folder password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareFolderDialog(false)}>Cancel</Button>
            <Button onClick={handleShareFolder} disabled={isSharing}>
              {isSharing ? 'Sharing...' : 'Generate Share Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
