import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LazyPDFPageProps {
  pageNumber: number;
  imageDataUrl?: string;
  onVisible: (pageNumber: number) => void;
  className?: string;
}

export function LazyPDFPage({ pageNumber, imageDataUrl, onVisible, className }: LazyPDFPageProps) {
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.1,
    rootMargin: '400px 0px', // Increased margin for smoother loading
  });

  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    if (inView) {
      onVisible(pageNumber);
      setHasBeenVisible(true);
    }
  }, [inView, pageNumber, onVisible]);

  return (
    <div ref={ref} className={cn("relative transition-all duration-300", className)} style={{ minHeight: '400px' }}>
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-sm">
          Page {pageNumber}
        </Badge>
      </div>
      {imageDataUrl ? (
        <img
          src={imageDataUrl}
          alt={`Page ${pageNumber}`}
          className="w-full h-auto rounded-lg shadow-md border border-muted"
          loading="lazy"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-[500px] bg-muted/20 rounded-lg border-2 border-dashed border-muted">
          <Loader2 className="h-10 w-10 animate-spin text-primary/40 mb-4" />
          <p className="text-sm text-muted-foreground font-medium">Rendering Page {pageNumber}...</p>
        </div>
      )}
    </div>
  );
}