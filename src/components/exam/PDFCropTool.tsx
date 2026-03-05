import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PDFPageImage } from '@/lib/pdf-cropper';
import { Crop, Download, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const page = pages[currentPage];

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !page) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (cropRegion) {
      const scaleX = img.clientWidth / img.naturalWidth;
      const scaleY = img.clientHeight / img.naturalHeight;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.fillStyle = 'rgba(59,130,246,0.15)';
      const rx = cropRegion.x * scaleX;
      const ry = cropRegion.y * scaleY;
      const rw = cropRegion.width * scaleX;
      const rh = cropRegion.height * scaleY;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
    }
  }, [cropRegion, page]);

  useEffect(() => { drawOverlay(); }, [drawOverlay]);

  const getImageCoords = (e: React.MouseEvent) => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getImageCoords(e);
    setCropStart(coords);
    setCropRegion(null);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !cropStart) return;
    const coords = getImageCoords(e);
    setCropRegion({
      x: Math.min(cropStart.x, coords.x),
      y: Math.min(cropStart.y, coords.y),
      width: Math.abs(coords.x - cropStart.x),
      height: Math.abs(coords.y - cropStart.y),
    });
  };

  const handleMouseUp = () => { setIsDrawing(false); };

  const handleCrop = () => {
    if (!cropRegion || !page) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropRegion.width;
      canvas.height = cropRegion.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height, 0, 0, cropRegion.width, cropRegion.height);
      const cropped: CroppedImage = {
        dataUrl: canvas.toDataURL('image/png'),
        pageNumber: page.pageNumber,
        index: croppedImages.length,
      };
      setCroppedImages(prev => [...prev, cropped]);
      setCropRegion(null);
    };
    img.src = page.imageDataUrl;
  };

  const handleDone = () => {
    onCroppedQuestions(croppedImages);
    onOpenChange(false);
  };

  if (!page) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" /> Manual Crop Tool — Page {currentPage + 1}/{pages.length}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Main crop area */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => { setCurrentPage(p => p - 1); setCropRegion(null); }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage === pages.length - 1} onClick={() => { setCurrentPage(p => p + 1); setCropRegion(null); }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCropRegion(null)}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
                <Button size="sm" disabled={!cropRegion} onClick={handleCrop}>
                  <Crop className="h-4 w-4 mr-1" /> Crop Selection
                </Button>
              </div>
            </div>

            <div className="relative border rounded-lg overflow-auto max-h-[60vh] cursor-crosshair select-none"
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
              <img ref={imgRef} src={page.imageDataUrl} alt={`Page ${currentPage + 1}`}
                className="w-full" onLoad={drawOverlay} draggable={false} />
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
            </div>
            <p className="text-xs text-muted-foreground text-center">Click and drag to select a region, then click "Crop Selection"</p>
          </div>

          {/* Cropped images panel */}
          <div className="w-48 space-y-2">
            <p className="text-sm font-medium">Cropped ({croppedImages.length})</p>
            <ScrollArea className="h-[55vh]">
              <div className="space-y-2">
                {croppedImages.map((ci, i) => (
                  <div key={i} className="relative border rounded overflow-hidden group">
                    <img src={ci.dataUrl} alt={`Crop ${i + 1}`} className="w-full" />
                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 rounded">{i + 1}</div>
                    <button className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-xs px-1 rounded opacity-0 group-hover:opacity-100"
                      onClick={() => setCroppedImages(prev => prev.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {croppedImages.length > 0 && (
              <Button onClick={handleDone} className="w-full" size="sm">
                <Download className="h-4 w-4 mr-1" /> Use {croppedImages.length} Crops
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
