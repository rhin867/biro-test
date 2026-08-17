import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '@/components/ui/skeleton';

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
    rootMargin: '200px 0px',
  });

  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    if (inView) {
      onVisible(pageNumber);
      setHasBeenVisible(true);
    }
  }, [inView, pageNumber, onVisible]);

  return (
    <div ref={ref} className={className} style={{ minHeight: '300px' }}>
      {imageDataUrl ? (
        <img
          src={imageDataUrl}
          alt={`Page ${pageNumber}`}
          className="w-full h-auto rounded-lg shadow-sm"
          loading="lazy"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-[400px] bg-muted/30 rounded-lg animate-pulse">
          <Skeleton className="h-8 w-32 mb-4" />
          <p className="text-xs text-muted-foreground">Loading Page {pageNumber}...</p>
        </div>
      )}
    </div>
  );
}
