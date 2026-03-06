import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PDFPageImage } from '@/lib/pdf-cropper';
import { Crop, Download, RotateCcw, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CroppedImage {
  dataUrl: string;
  pageNumber: number;
  index: number;
}

interface PDFCropToolProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: PDFPageImage[];
  onCroppedQuestions: (images: CroppedImage[]) => void;
}

export function PDFCropTool({ open, onOpenChange, pages, onCroppedQuestions }: PDFCropToolProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [croppedImages, setCroppedImages] = useState<CroppedImage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const page = pages[currentPage];

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentPage(0);
      setCropRegion(null);
      setCropStart(null);
      setIsDrawing(false);
    }
  }, [open]);

  const getRelativeCoords = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    // Return coordinates relative to the container (which matches the displayed image size)
    return {
      x: e.clientX - rect.left + container.scrollLeft,
      y: e.clientY - rect.top + container.scrollTop,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const coords = getRelativeCoords(e);
    setCropStart(coords);
    setCropRegion(null);
    setIsDrawing(true);
  }, [getRelativeCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !cropStart) return;
    e.preventDefault();
    const coords = getRelativeCoords(e);
    setCropRegion({
      x: Math.min(cropStart.x, coords.x),
      y: Math.min(cropStart.y, coords.y),
      width: Math.abs(coords.x - cropStart.x),
      height: Math.abs(coords.y - cropStart.y),
    });
  }, [isDrawing, cropStart, getRelativeCoords]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleCrop = useCallback(() => {
    if (!cropRegion || !page || !imgRef.current) return;
    
    const img = imgRef.current;
    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    const scaleX = img.naturalWidth / displayWidth;
    const scaleY = img.naturalHeight / displayHeight;
    
    // Convert display coords to image coords
    const srcX = cropRegion.x * scaleX;
    const srcY = cropRegion.y * scaleY;
    const srcW = cropRegion.width * scaleX;
    const srcH = cropRegion.height * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = srcW;
    canvas.height = srcH;
    const ctx = canvas.getContext('2d')!;

    const tempImg = new Image();
    tempImg.onload = () => {
      ctx.drawImage(tempImg, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      const cropped: CroppedImage = {
        dataUrl: canvas.toDataURL('image/png'),
        pageNumber: page.pageNumber,
        index: croppedImages.length,
      };
      setCroppedImages(prev => [...prev, cropped]);
      setCropRegion(null);
    };
    tempImg.src = page.imageDataUrl;
  }, [cropRegion, page, croppedImages.length]);

  const handleDone = () => {
    onCroppedQuestions(croppedImages);
    onOpenChange(false);
  };

  if (!page) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" /> Manual Crop Tool — Page {currentPage + 1}/{pages.length}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[75vh]">
          {/* Main crop area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => { setCurrentPage(p => p - 1); setCropRegion(null); }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm flex items-center px-2">Page {currentPage + 1} / {pages.length}</span>
                <Button variant="outline" size="sm" disabled={currentPage === pages.length - 1} onClick={() => { setCurrentPage(p => p + 1); setCropRegion(null); }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCropRegion(null)} disabled={!cropRegion}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
                <Button size="sm" disabled={!cropRegion || cropRegion.width < 10 || cropRegion.height < 10} onClick={handleCrop}>
                  <Crop className="h-4 w-4 mr-1" /> Crop Selection
                </Button>
              </div>
            </div>

            <div 
              ref={containerRef}
              className="relative border rounded-lg overflow-auto flex-1 cursor-crosshair select-none bg-muted/30"
              onMouseDown={handleMouseDown} 
              onMouseMove={handleMouseMove} 
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img 
                ref={imgRef} 
                src={page.imageDataUrl} 
                alt={`Page ${currentPage + 1}`}
                className="w-full pointer-events-none" 
                draggable={false} 
              />
              {/* Crop overlay using div instead of canvas */}
              {cropRegion && cropRegion.width > 0 && cropRegion.height > 0 && (
                <div 
                  className="absolute border-2 border-primary bg-primary/15 pointer-events-none"
                  style={{
                    left: cropRegion.x,
                    top: cropRegion.y,
                    width: cropRegion.width,
                    height: cropRegion.height,
                    borderStyle: 'dashed',
                  }}
                >
                  <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                    {Math.round(cropRegion.width)}×{Math.round(cropRegion.height)}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">Click and drag to select a region, then click "Crop Selection"</p>
          </div>

          {/* Cropped images panel */}
          <div className="w-52 flex flex-col">
            <p className="text-sm font-medium mb-2">Cropped Regions ({croppedImages.length})</p>
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-2">
                {croppedImages.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">Crop regions from PDF pages. They'll appear here.</p>
                )}
                {croppedImages.map((ci, i) => (
                  <div key={i} className="relative border rounded overflow-hidden group bg-card">
                    <img src={ci.dataUrl} alt={`Crop ${i + 1}`} className="w-full" />
                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded font-medium">
                      Q{i + 1} (P{ci.pageNumber})
                    </div>
                    <button 
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setCroppedImages(prev => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {croppedImages.length > 0 && (
              <Button onClick={handleDone} className="w-full mt-2" size="sm">
                <Download className="h-4 w-4 mr-1" /> Use {croppedImages.length} Crops
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
