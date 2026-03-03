import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, Star, Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export function getUserApiKey(): string | null {
  return localStorage.getItem('user_gemini_api_key');
}

export function setUserApiKey(key: string): void {
  localStorage.setItem('user_gemini_api_key', key);
}

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const existing = getUserApiKey();
    if (existing) {
      setApiKey(existing);
      setHasKey(true);
    }

    // Listen for PWA install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your Gemini API key');
      return;
    }
    setUserApiKey(apiKey.trim());
    setHasKey(true);
    toast.success('API key saved successfully! You can now create tests without limits.');
  };

  const handleRemoveKey = () => {
    localStorage.removeItem('user_gemini_api_key');
    setApiKey('');
    setHasKey(false);
    toast.success('API key removed');
  };

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') {
        toast.success('App installed successfully!');
      }
      setInstallPrompt(null);
    } else {
      toast.info('To install: tap the browser menu (⋮) → "Add to Home Screen" or "Install App"');
    }
  };

  const handleSubmitRating = () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    const ratings = JSON.parse(localStorage.getItem('app_ratings') || '[]');
    ratings.push({ rating, feedback, date: new Date().toISOString() });
    localStorage.setItem('app_ratings', JSON.stringify(ratings));
    toast.success('Thank you for your feedback!');
    setRating(0);
    setFeedback('');
  };

  return (
    <MainLayout>
      <PageHeader title="Settings" description="Configure your API key and app preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Gemini API Key
            </CardTitle>
            <CardDescription>
              Enter your Google Gemini API key for unlimited test creation. 
              Get one free at{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Google AI Studio
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasKey ? (
                <Badge className="bg-correct/20 text-correct border-correct/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Key Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="text-review border-review/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  No Key Set
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveKey} className="flex-1">Save Key</Button>
              {hasKey && (
                <Button variant="destructive" onClick={handleRemoveKey}>Remove</Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally in your browser and never sent to our servers.
            </p>
          </CardContent>
        </Card>

        {/* Install App */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Install App
            </CardTitle>
            <CardDescription>
              Install this app on your device for offline access and a native experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleInstall} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Install App
            </Button>
            <p className="text-xs text-muted-foreground">
              On mobile: Tap browser menu → "Add to Home Screen". On desktop: Click the install icon in the address bar.
            </p>
          </CardContent>
        </Card>

        {/* Rate App */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Rate This App
            </CardTitle>
            <CardDescription>Help us improve by rating features, speed, and usability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Label>Rating:</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{rating}/5</span>
            </div>
            <div className="space-y-2">
              <Label>Feedback (optional)</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What do you like? What can be improved?"
                rows={3}
              />
            </div>
            <Button onClick={handleSubmitRating}>Submit Rating</Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
