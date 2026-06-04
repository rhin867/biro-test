import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAppSettings,
  isTestCreationUnlocked,
  markTestCreationUnlocked,
  AppSettings,
} from '@/lib/app-settings';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';

interface Props {
  children: React.ReactNode;
}

export function TestCreationGate({ children }: Props) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppSettings().then((s) => {
      setSettings(s);
      setUnlocked(isTestCreationUnlocked(s));
      setLoading(false);
    });
  }, []);

  const handleUnlock = () => {
    if (!settings) return;
    if (password === settings.test_creation_password) {
      markTestCreationUnlocked(password);
      setUnlocked(true);
      toast.success('Unlocked! You can create tests now.');
    } else {
      toast.error('Incorrect password');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (unlocked) return <>{children}</>;

  const exp = settings?.test_creation_password_expires_at;

  return (
    <MainLayout>
      <PageHeader title="Create Test" description="Password required" />
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Enter Test Creation Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Test creation is protected by a password set by the owner. Ask the owner if you don't have it.
          </p>
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          />
          {exp && (
            <p className="text-xs text-muted-foreground">
              Current password expires: {new Date(exp).toLocaleString()}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleUnlock} className="flex-1">Unlock</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
