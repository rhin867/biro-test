import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MailPlus, Loader2 } from 'lucide-react';

export default function JoinFolder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid share link');
      navigate('/tests');
      return;
    }

    const fetchFolderInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('test_folder_shares' as any)
          .select('folder_name')
          .eq('share_token', token)
          .single();
        
        if (error || !data) throw new Error('Folder not found or link expired');
        setFolderName((data as any).folder_name);
      } catch (e: any) {
        toast.error(e.message);
        navigate('/tests');
      } finally {
        setLoading(false);
      }
    };

    fetchFolderInfo();
  }, [token, navigate]);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    try {
      const { data: shares } = await supabase
        .from('test_folder_shares' as any)
        .select('id')
        .eq('share_token', token)
        .single();

      if (!shares) throw new Error('Invalid share link');

      const { error } = await supabase
        .from('folder_access_requests' as any)
        .insert({
          folder_share_id: (shares as any).id,
          requester_user_key: localStorage.getItem('user_key'),
          requester_email: email.trim(),
        } as any);

      if (error) throw error;
      toast.success('Access request sent! The owner will be notified.');
      navigate('/tests');
    } catch (e: any) {
      toast.error('Failed to request access: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader title="Join Shared Folder" description="Request access to a shared folder" />
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailPlus className="h-5 w-5 text-primary" />
              Access Shared Folder: {folderName}
            </CardTitle>
            <CardDescription>
              Enter your email address to request access to this folder. The owner will review your request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestAccess} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Email</label>
                <Input 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Request Access
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
