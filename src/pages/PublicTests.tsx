import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Globe, Lock, Users, Play, Shield, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { saveTest, getTestById } from '@/lib/storage';
import { Test } from '@/types/exam';

interface PublicTestRow {
  id: string;
  test_id: string;
  name: string;
  subjects: string[];
  question_count: number;
  duration: number;
  total_marks: number;
  owner_name: string | null;
  has_password: boolean;
  attempts_count: number;
  created_at: string;
}

const ADMIN_PW_SESSION_KEY = 'admin_owner_pw_session';

export default function PublicTests() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PublicTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pwDialog, setPwDialog] = useState<PublicTestRow | null>(null);
  const [pwInput, setPwInput] = useState('');

  // Admin mode
  const [adminPw, setAdminPw] = useState<string>(() => sessionStorage.getItem(ADMIN_PW_SESSION_KEY) || '');
  const [adminDialog, setAdminDialog] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState('');
  const [renameRow, setRenameRow] = useState<PublicTestRow | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteRow, setDeleteRow] = useState<PublicTestRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('list-public-tests', { body: {} });
    if (error || data?.error) toast.error(data?.error || error?.message || 'Could not load public tests');
    setRows((data?.rows || []) as PublicTestRow[]);
    setLoading(false);
  }

  const startTest = async (row: PublicTestRow, password?: string) => {
    const { data, error } = await supabase.functions.invoke('start-public-test', {
      body: { id: row.id, password: password || '' },
    });
    if (error || data?.error) { toast.error(data?.error || error?.message || 'Could not start test'); return; }
    const test = data.test as Test;
    if (!getTestById(test.id)) saveTest(test);
    navigate(`/exam/${test.id}`);
  };

  const handleClick = (row: PublicTestRow) => {
    if (row.has_password) { setPwInput(''); setPwDialog(row); }
    else startTest(row);
  };

  const handlePwSubmit = () => {
    if (!pwDialog) return;
    const row = pwDialog;
    setPwDialog(null);
    startTest(row, pwInput);
  };

  const handleUnlockAdmin = async () => {
    if (!adminPwInput.trim()) return toast.error('Enter owner password');
    setBusy(true);
    try {
      const { data } = await supabase.functions.invoke('verify-password', {
        body: { kind: 'admin_2', password: adminPwInput.trim() },
      });
      if (!data?.ok) return toast.error(data?.error || 'Wrong password');
      sessionStorage.setItem(ADMIN_PW_SESSION_KEY, adminPwInput.trim());
      setAdminPw(adminPwInput.trim());
      setAdminDialog(false);
      setAdminPwInput('');
      toast.success('Admin mode unlocked for this session');
    } finally { setBusy(false); }
  };

  const handleRename = async () => {
    if (!renameRow || !renameInput.trim() || !adminPw) return;
    setBusy(true);
    try {
      const { data } = await supabase.functions.invoke('admin-manage-public-test', {
        body: { action: 'rename', id: renameRow.id, name: renameInput.trim(), password: adminPw },
      });
      if (data?.error) return toast.error(data.error);
      toast.success('Renamed');
      setRenameRow(null);
      setRenameInput('');
      load();
    } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!deleteRow || !adminPw) return;
    setBusy(true);
    try {
      const { data } = await supabase.functions.invoke('admin-manage-public-test', {
        body: { action: 'delete', id: deleteRow.id, password: adminPw },
      });
      if (data?.error) return toast.error(data.error);
      toast.success('Public test deleted');
      setDeleteRow(null);
      load();
    } finally { setBusy(false); }
  };

  return (
    <MainLayout>
      <PageHeader title="Public Tests" description="Tests shared by the community. Anyone can attempt them.">
        {adminPw ? (
          <Badge variant="outline" className="gap-1"><Shield className="h-3 w-3" /> Admin Mode</Badge>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdminDialog(true)} className="gap-1">
            <Shield className="h-3 w-3" /> Admin
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card className="text-center py-12"><CardContent>
          <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No public tests yet. Make one of yours public from My Tests.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(row => (
            <Card key={row.id} className="hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {row.name}
                  {row.has_password && <Lock className="h-4 w-4 text-yellow-500" />}
                </CardTitle>
                <p className="text-xs text-muted-foreground">By {row.owner_name || 'Anonymous'} • {new Date(row.created_at).toLocaleDateString()}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {row.subjects.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded bg-muted p-2"><p className="font-bold">{row.question_count}</p><p className="text-muted-foreground">Questions</p></div>
                  <div className="rounded bg-muted p-2"><p className="font-bold">{row.duration}m</p><p className="text-muted-foreground">Duration</p></div>
                  <div className="rounded bg-muted p-2"><p className="font-bold">{row.total_marks}</p><p className="text-muted-foreground">Marks</p></div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline"><Users className="h-3 w-3 mr-1" /> {row.attempts_count} attempts</Badge>
                  <Button size="sm" onClick={() => handleClick(row)} className="gap-2"><Play className="h-3 w-3" /> Start</Button>
                </div>
                {adminPw && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button size="sm" variant="outline" className="flex-1 gap-1"
                      onClick={() => { setRenameRow(row); setRenameInput(row.name); }}>
                      <Pencil className="h-3 w-3" /> Rename
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 gap-1"
                      onClick={() => setDeleteRow(row)}>
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Password to open password-protected test */}
      <Dialog open={!!pwDialog} onOpenChange={(o) => !o && setPwDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Password Required</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This test is password protected. Enter the password to start.</p>
          <Input type="password" value={pwInput} onChange={e => setPwInput(e.target.value)} placeholder="Enter password"
            onKeyDown={e => e.key === 'Enter' && handlePwSubmit()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwDialog(null)}>Cancel</Button>
            <Button onClick={handlePwSubmit}>Unlock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin unlock */}
      <Dialog open={adminDialog} onOpenChange={(o) => !o && setAdminDialog(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Owner Access</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Enter the owner password to enable rename / delete on public tests.</p>
          <Input type="password" value={adminPwInput} onChange={e => setAdminPwInput(e.target.value)}
            placeholder="Owner password" onKeyDown={e => e.key === 'Enter' && handleUnlockAdmin()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminDialog(false)}>Cancel</Button>
            <Button onClick={handleUnlockAdmin} disabled={busy}>{busy ? 'Verifying...' : 'Unlock'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={!!renameRow} onOpenChange={(o) => !o && setRenameRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Public Test</DialogTitle></DialogHeader>
          <Input value={renameInput} onChange={e => setRenameInput(e.target.value)}
            placeholder="New test name" onKeyDown={e => e.key === 'Enter' && handleRename()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameRow(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={busy || !renameInput.trim()}>{busy ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete "{deleteRow?.name}"?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This removes the test from the Public Tests panel for everyone. Local copies on other devices are not affected.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRow(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>{busy ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
