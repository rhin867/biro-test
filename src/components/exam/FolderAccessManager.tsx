
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function FolderAccessManager() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('folder_access_requests' as any)
      .select('*, test_folder_shares(folder_name)')
      .order('created_at', { ascending: false });
    
    if (error) toast.error('Failed to fetch requests');
    else setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (requestId: string, status: 'approved' | 'denied') => {
    const { error } = await supabase
      .from('folder_access_requests' as any)
      .update({ status } as any)
      .eq('id', requestId);

    if (error) toast.error('Failed to update request');
    else {
      toast.success(`Request ${status}`);
      fetchRequests();
    }
  };

  if (loading) return <div className="p-8 text-center">Loading requests...</div>;

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No access requests pending.</p>
      ) : (
        requests.map(req => (
          <Card key={req.id}>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="font-medium">{req.requester_email}</span>
                  <Badge variant={req.status === 'pending' ? 'outline' : req.status === 'approved' ? 'default' : 'destructive'} className="text-[10px]">
                    {req.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Wants access to: <span className="text-foreground font-medium">{req.test_folder_shares?.folder_name}</span>
                </p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  {new Date(req.created_at).toLocaleString()}
                </div>
              </div>
              {req.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-correct hover:bg-correct/10" onClick={() => handleAction(req.id, 'approved')}>
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-incorrect hover:bg-incorrect/10" onClick={() => handleAction(req.id, 'denied')}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
