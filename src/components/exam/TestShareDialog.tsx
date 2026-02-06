import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Test } from '@/types/exam';
import { Copy, Share2, Link2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TestShareDialogProps {
  test: Test;
  onGenerateShareCode?: () => string;
}

export function TestShareDialog({ test, onGenerateShareCode }: TestShareDialogProps) {
  const [shareCode, setShareCode] = useState(test.shareCode || '');
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    const code = onGenerateShareCode?.() || `TEST-${test.id.slice(0, 8).toUpperCase()}`;
    setShareCode(code);
  };

  const shareUrl = shareCode 
    ? `${window.location.origin}/join/${shareCode}`
    : '';

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Test</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{test.name}</CardTitle>
              <CardDescription>
                {test.questions.length} questions • {test.duration} minutes
              </CardDescription>
            </CardHeader>
          </Card>

          {!shareCode ? (
            <Button onClick={generateCode} className="w-full gap-2">
              <Link2 className="h-4 w-4" />
              Generate Share Link
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Share Code</label>
                <div className="flex gap-2">
                  <Input value={shareCode} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(shareCode)}
                  >
                    {copied ? <Check className="h-4 w-4 text-correct" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Share URL</label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(shareUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Anyone with this link can access and take this test
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
