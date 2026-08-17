import React, { useEffect, useRef, useState } from 'react';
import { renderSinglePage } from '@/lib/pdf-cropper';
import { Skeleton } from '@/components/ui/skeleton';
import { useInView } from 'react-intersection-observer';

interface LazyPDFPageProps {
  pdfFile: File | ArrayBuffer;
  pageNumber: number;
  scale?: number;
  onLoad?: (imageDataUrl: string) => void;
  className?: string;
}

export function LazyPDFPage({ 
  pdfFile, 
  pageNumber, 
  scale = 1.2, 
  onLoad, 
  className 
}: LazyPDFPageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.1,
    rootMargin: '400px 0px',
  });

  useEffect(() => {
    let active = true;

    async function loadPage() {
      if (!inView || imageSrc || loading) return;
      
      setLoading(true);
      try {
        const dataUrl = await renderSinglePage(pdfFile, pageNumber, scale, 'image/jpeg', 0.6);
        if (active) {
          setImageSrc(dataUrl);
          onLoad?.(dataUrl);
        }
      } catch (error) {
        console.error(`Failed to render page ${pageNumber}`, error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [inView, pdfFile, pageNumber, scale, imageSrc, loading, onLoad]);

  // Memory management: Clear image if it's far out of view
  useEffect(() => {
    if (!inView && imageSrc) {
      // Small delay to prevent flickering on quick scrolls
      const timer = setTimeout(() => {
        setImageSrc(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [inView, imageSrc]);

  return (
    <div ref={ref} className={className} style={{ minHeight: '300px' }}>
      {imageSrc ? (
        <img 
          src={imageSrc} 
          alt={`Page ${pageNumber}`} 
          className="w-full h-auto shadow-md rounded-sm border"
          loading="lazy"
        />
      ) : (
        <Skeleton className="w-full h-[600px] rounded-md" />
      )}
    </div>
  );
}
