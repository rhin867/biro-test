import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PDFPageImage } from '@/lib/pdf-cropper';
import { Crop, Download, RotateCcw, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface CropRegion { x: number; y: number; width: number; height: number; }

export type CropSubject = 'Physics' | 'Chemistry' | 'Maths';
export type CropQType = 'MCQ' | 'MSQ' | 'Numerical' | 'Integer';

export interface CroppedImage {
  dataUrl: string;
  pageNumber: number;
  index: number;
  subject: CropSubject;
  section: string; // e.g. "Section 1"
  qType: CropQType;
  correctAnswer?: string;
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
  // Default metadata applied to the next crop — user can change per crop after.
  const [subject, setSubject] = useState<CropSubject>('Physics');
  const [section, setSection] = useState<string>('Section 1');
  const [qType, setQType] = useState<CropQType>('MCQ');
  const imgRef = useRef<HTMLImageElement>(null);

  const page = pages[currentPage];

  useEffect(() => {
    if (open) { setCurrentPage(0); setCropRegion(null); setCropStart(null); setIsDrawing(false); }
  }, [open]);

  const getRelativeCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, clientY - rect.top)),
    };
  }, []);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const c = getRelativeCoords(e); setCropStart(c); setCropRegion(null); setIsDrawing(true);
  }, [getRelativeCoords]);
  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !cropStart) return;
    e.preventDefault();
    const c = getRelativeCoords(e);
    setCropRegion({
      x: Math.min(cropStart.x, c.x), y: Math.min(cropStart.y, c.y),
      width: Math.abs(c.x - cropStart.x), height: Math.abs(c.y - cropStart.y),
    });
  }, [isDrawing, cropStart, getRelativeCoords]);
  const handleEnd = useCallback(() => setIsDrawing(false), []);

  const handleCrop = useCallback(() => {
    if (!cropRegion || !page || !imgRef.current) return;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const srcX = Math.max(0, Math.round(cropRegion.x * scaleX));
    const srcY = Math.max(0, Math.round(cropRegion.y * scaleY));
    const srcW = Math.min(img.naturalWidth - srcX, Math.round(cropRegion.width * scaleX));
    const srcH = Math.min(img.naturalHeight - srcY, Math.round(cropRegion.height * scaleY));
    if (srcW < 5 || srcH < 5) return;
    const canvas = document.createElement('canvas');
    canvas.width = srcW; canvas.height = srcH;
    const ctx = canvas.getContext('2d')!;
    const tmp = new Image(); tmp.crossOrigin = 'anonymous';
    tmp.onload = () => {
      ctx.drawImage(tmp, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      setCroppedImages(prev => [...prev, {
        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
        pageNumber: page.pageNumber,
        index: prev.length,
        subject, section, qType,
      }]);
      setCropRegion(null);
    };
    tmp.src = page.imageDataUrl;
  }, [cropRegion, page, subject, section, qType]);

  const updateCrop = (i: number, patch: Partial<CroppedImage>) =>
    setCroppedImages(prev => prev.map((c, j) => j === i ? { ...c, ...patch } : c));

  const handleDone = () => { onCroppedQuestions(croppedImages); onOpenChange(false); };

  if (!page) return null;

  const subjectColor: Record<CropSubject, string> = {
    Physics: 'bg-physics/20 border-physics text-physics',
    Chemistry: 'bg-chemistry/20 border-chemistry text-chemistry',
    Maths: 'bg-maths/20 border-maths text-maths',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[95vh] p-3 md:p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm md:text-base">
            <Crop className="h-5 w-5 text-primary" /> Manual Crop — Page {currentPage + 1}/{pages.length}
          </DialogTitle>
        </DialogHeader>

        {/* Metadata bar — applied to the NEXT crop */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 rounded-lg bg-muted/40 border">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Subject</label>
            <Select value={subject} onValueChange={(v) => setSubject(v as CropSubject)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Physics">Physics</SelectItem>
                <SelectItem value="Chemistry">Chemistry</SelectItem>
                <SelectItem value="Maths">Maths</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Section</label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Section 1">Section 1</SelectItem>
                <SelectItem value="Section 2">Section 2</SelectItem>
                <SelectItem value="Section 3">Section 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Type</label>
            <Select value={qType} onValueChange={(v) => setQType(v as CropQType)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MCQ">MCQ (single)</SelectItem>
                <SelectItem value="MSQ">MSQ (multiple)</SelectItem>
                <SelectItem value="Numerical">Numerical</SelectItem>
                <SelectItem value="Integer">Integer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 h-[70vh]">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm" disabled={currentPage === 0}
                  onClick={() => { setCurrentPage(p => p - 1); setCropRegion(null); }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs md:text-sm px-2">Page {currentPage + 1}/{pages.length}</span>
                <Button variant="outline" size="sm" disabled={currentPage === pages.length - 1}
                  onClick={() => { setCurrentPage(p => p + 1); setCropRegion(null); }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCropRegion(null)} disabled={!cropRegion}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
                <Button size="sm" disabled={!cropRegion || cropRegion.width < 10 || cropRegion.height < 10} onClick={handleCrop}>
                  <Crop className="h-4 w-4 mr-1" /> Crop as {subject}/{qType}
                </Button>
              </div>
            </div>

            <div className="relative border rounded-lg overflow-auto flex-1 bg-muted/30">
              <div
                className="relative inline-block cursor-crosshair select-none"
                style={{ touchAction: 'none' }}
                onMouseDown={handleStart} onMouseMove={handleMove}
                onMouseUp={handleEnd} onMouseLeave={handleEnd}
                onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
              >
                <img
                  ref={imgRef}
                  src={page.imageDataUrl}
                  alt={`Page ${currentPage + 1}`}
                  className="max-w-full pointer-events-none"
                  draggable={false}
                  style={{ display: 'block' }}
                />
                {cropRegion && cropRegion.width > 0 && cropRegion.height > 0 && (
                  <div
                    className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
                    style={{
                      left: cropRegion.x, top: cropRegion.y,
                      width: cropRegion.width, height: cropRegion.height,
                      borderStyle: 'dashed',
                    }}
                  >
                    <div className="absolute -top-5 left-0 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                      {subject} · {qType} · {Math.round(cropRegion.width)}×{Math.round(cropRegion.height)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground text-center mt-1">
              Set subject/section/type above → drag on page → Crop. Change per-crop values in the list on the right.
            </p>
          </div>

          <div className="w-full lg:w-64 flex flex-col min-h-0">
            <p className="text-sm font-medium mb-2">Crops ({croppedImages.length})</p>
            <ScrollArea className="flex-1">
              <div className="flex lg:flex-col gap-2 pr-2 overflow-x-auto lg:overflow-x-visible">
                {croppedImages.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">Drag on the page to make a crop.</p>
                )}
                {croppedImages.map((ci, i) => (
                  <div key={i} className={`relative border-2 rounded-lg overflow-hidden group bg-card flex-shrink-0 w-40 lg:w-full ${subjectColor[ci.subject]}`}>
                    <img src={ci.dataUrl} alt={`Crop ${i + 1}`} className="w-full max-h-24 object-contain bg-white" />
                    <div className="p-1.5 space-y-1 bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold">Q{i + 1} · P{ci.pageNumber}</span>
                        <button
                          className="bg-destructive/80 text-destructive-foreground p-0.5 rounded"
                          onClick={() => setCroppedImages(prev => prev.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <Select value={ci.subject} onValueChange={(v) => updateCrop(i, { subject: v as CropSubject })}>
                        <SelectTrigger className="h-6 text-[10px] px-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Physics">Physics</SelectItem>
                          <SelectItem value="Chemistry">Chemistry</SelectItem>
                          <SelectItem value="Maths">Maths</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={ci.qType} onValueChange={(v) => updateCrop(i, { qType: v as CropQType })}>
                        <SelectTrigger className="h-6 text-[10px] px-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MCQ">MCQ</SelectItem>
                          <SelectItem value="MSQ">MSQ</SelectItem>
                          <SelectItem value="Numerical">Numerical</SelectItem>
                          <SelectItem value="Integer">Integer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={ci.correctAnswer || ''}
                        onChange={(e) => updateCrop(i, { correctAnswer: e.target.value })}
                        placeholder="Ans (opt)"
                        className="h-6 text-[10px] px-1"
                      />
                    </div>
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
