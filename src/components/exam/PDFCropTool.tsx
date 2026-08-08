import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LatexRenderer } from '@/components/ui/latex-renderer';
import { PDFPageImage } from '@/lib/pdf-cropper';
import { Crop, Download, RotateCcw, ChevronLeft, ChevronRight, Trash2, ZoomIn, ZoomOut, Plus, Image as ImageIcon, Pencil, Eye } from 'lucide-react';

interface CropRegion { x: number; y: number; width: number; height: number; }

/** Subject stays as a free-form string so users can type "Biology", "Section A", etc. */
export type CropSubject = string;
export type CropQType = 'MCQ' | 'MSQ' | 'Numerical' | 'Integer';

export interface CroppedImage {
  dataUrl: string;
  pageNumber: number;
  index: number;
  subject: CropSubject;
  section: string;
  qType: CropQType;
  correctAnswer?: string;
  /** Optional OCR/user-typed question text — used by the exam UI when present. */
  questionText?: string;
  /** Extra images added from the device gallery (diagrams, alternate crops). */
  extraImages?: string[];
}

interface PDFCropToolProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: PDFPageImage[];
  onCroppedQuestions: (images: CroppedImage[]) => void;
  /** Pre-load existing crops when re-opening the tool for review. */
  initialCrops?: CroppedImage[];
}

const CANONICAL_SUBJECTS = ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'General'];
const SECTION_PRESETS = ['Section 1', 'Section 2', 'Section 3', 'Section A', 'Section B', 'Physics', 'Chemistry', 'Maths', 'Biology'];

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Compact free-text combobox: type anything or pick a preset. */
function ComboInput({
  value, onChange, presets, placeholder,
}: { value: string; onChange: (v: string) => void; presets: string[]; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex gap-1">
        <Input value={value} onChange={(e) => onChange(e.target.value)}
               placeholder={placeholder} className="h-8 text-xs flex-1" />
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="h-8 px-2" type="button">▾</Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-40 p-1">
        {presets.map(p => (
          <button key={p} type="button"
                  className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent"
                  onClick={() => { onChange(p); setOpen(false); }}>
            {p}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function PDFCropTool({ open, onOpenChange, pages, onCroppedQuestions, initialCrops }: PDFCropToolProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [optionRegions, setOptionRegions] = useState<CropRegion[]>([]);
  const [croppedImages, setCroppedImages] = useState<CroppedImage[]>(initialCrops || []);
  const [subject, setSubject] = useState<string>(initialCrops?.[0]?.subject || 'Maths');
  const [section, setSection] = useState<string>(initialCrops?.[0]?.section || 'Section 1');
  const [qType, setQType] = useState<CropQType>(initialCrops?.[0]?.qType || 'MCQ');
  const [zoom, setZoom] = useState(1);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const galleryRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const addBlankRef = useRef<HTMLInputElement>(null);
  const [lastTouchDist, setLastTouchDist] = useState<number | null>(null);

  const page = pages[currentPage];

  useEffect(() => {
    if (open) {
      setCurrentPage(0);
      setCropRegion(null);
      setCropStart(null);
      setIsDrawing(false);
      setZoom(1);
      if (initialCrops && initialCrops.length) setCroppedImages(initialCrops);
    }
  }, [open, initialCrops]);

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
    if ('touches' in e && e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setLastTouchDist(dist);
      return;
    }
    const c = getRelativeCoords(e); setCropStart(c); setCropRegion(null); setIsDrawing(true);
  }, [getRelativeCoords]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2 && lastTouchDist !== null) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const delta = dist / lastTouchDist;
      setZoom(z => Math.min(4, Math.max(0.5, z * delta)));
      setLastTouchDist(dist);
      return;
    }
    if (!isDrawing || !cropStart) return;
    const c = getRelativeCoords(e);
    setCropRegion({
      x: Math.min(cropStart.x, c.x), y: Math.min(cropStart.y, c.y),
      width: Math.abs(c.x - cropStart.x), height: Math.abs(c.y - cropStart.y),
    });
  }, [isDrawing, cropStart, getRelativeCoords, lastTouchDist]);

  const handleEnd = useCallback(() => {
    setIsDrawing(false);
    setLastTouchDist(null);
  }, []);

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

  const addExtraImage = async (i: number, file: File) => {
    const url = await fileToDataUrl(file);
    updateCrop(i, { extraImages: [...(croppedImages[i].extraImages || []), url] });
  };

  const addBlankQuestion = async (file: File) => {
    const url = await fileToDataUrl(file);
    setCroppedImages(prev => [...prev, {
      dataUrl: url, pageNumber: page?.pageNumber || 0, index: prev.length,
      subject, section, qType,
    }]);
  };

  const removeExtra = (i: number, j: number) =>
    updateCrop(i, { extraImages: (croppedImages[i].extraImages || []).filter((_, k) => k !== j) });

  const handleDone = () => { onCroppedQuestions(croppedImages); onOpenChange(false); };

  if (!page) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] lg:max-w-7xl h-full lg:h-[98vh] p-2 md:p-3 flex flex-col overflow-hidden">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Crop className="h-4 w-4 text-primary" />
            Manual Crop — Page {currentPage + 1}/{pages.length} · {croppedImages.length} crops
          </DialogTitle>
        </DialogHeader>

        {/* Compact single-row control bar */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-md bg-muted/40 border text-[10px]">
          <div>
            <label className="text-[9px] font-medium text-muted-foreground uppercase block mb-0.5">Subject</label>
            <ComboInput value={subject} onChange={setSubject} presets={CANONICAL_SUBJECTS} placeholder="Subject" />
          </div>
          <div>
            <label className="text-[9px] font-medium text-muted-foreground uppercase block mb-0.5">Section</label>
            <ComboInput value={section} onChange={setSection} presets={SECTION_PRESETS} placeholder="Section" />
          </div>
          <div>
            <label className="text-[9px] font-medium text-muted-foreground uppercase block mb-0.5">Type</label>
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

        <div className="flex flex-col lg:flex-row gap-2 flex-1 min-h-0 mt-1.5 overflow-hidden">
          {/* PDF viewer — takes most of the space */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            <div className="flex items-center justify-between mb-1 gap-1 flex-wrap">
              <div className="flex gap-1 items-center">
                <Button variant="outline" size="sm" className="h-7 px-2" disabled={currentPage === 0}
                        onClick={() => { setCurrentPage(p => p - 1); setCropRegion(null); }}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] px-1">{currentPage + 1}/{pages.length}</span>
                <Button variant="outline" size="sm" className="h-7 px-2" disabled={currentPage === pages.length - 1}
                        onClick={() => { setCurrentPage(p => p + 1); setCropRegion(null); }}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex gap-1 items-center">
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] w-10 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setCropRegion(null)} disabled={!cropRegion}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" className="h-7 px-2 text-[11px]"
                        disabled={!cropRegion || cropRegion.width < 10 || cropRegion.height < 10} onClick={handleCrop}>
                  <Crop className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
                <input ref={addBlankRef} type="file" accept="image/*" className="hidden"
                       onChange={e => { const f = e.target.files?.[0]; if (f) addBlankQuestion(f); e.target.value = ''; }} />
                <Button variant="secondary" size="sm" className="h-7 px-2 text-[11px]"
                        onClick={() => addBlankRef.current?.click()}>
                  <Plus className="h-3.5 w-3.5 mr-0.5" /><ImageIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="relative border rounded-md overflow-auto flex-1 bg-muted/30 overscroll-none min-h-[300px] touch-pan-x touch-pan-y">
              <div
                className="relative inline-block cursor-crosshair select-none"
                style={{ touchAction: isDrawing ? 'none' : 'auto', transformOrigin: '0 0' }}

                onMouseDown={handleStart} onMouseMove={handleMove}
                onMouseUp={handleEnd} onMouseLeave={handleEnd}
                onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
              >
                <img
                  ref={imgRef}
                  src={page.imageDataUrl}
                  alt={`Page ${currentPage + 1}`}
                  className="pointer-events-none"
                  draggable={false}
                  style={{ display: 'block', width: `${zoom * 100}%`, maxWidth: 'none' }}
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
                    <div className="absolute -top-5 left-0 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                      {subject} · {qType}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground bg-accent/30 p-2 rounded mt-1">
              <span className="font-bold text-primary">Instructions:</span> 1. Use two fingers to zoom/pan. 2. Drag a rectangle to select a question area. 3. Use the "Add" button to save the crop. 4. Use "+ 🖼" to upload separate images/diagrams for any question.
            </p>
          </div>

          {/* Crop list */}
          <div className="w-full lg:w-72 flex flex-col h-full overflow-hidden border-t lg:border-t-0 lg:border-l pt-2 lg:pt-0 lg:pl-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium">Questions ({croppedImages.length})</p>
              {croppedImages.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px]"
                        onClick={() => setCroppedImages([])}>Clear</Button>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="flex lg:flex-col gap-3 pr-1 overflow-x-auto lg:overflow-x-visible pb-2">
                {croppedImages.length === 0 && (
                  <p className="text-[10px] text-muted-foreground p-2">Drag on the page to crop a question.</p>
                )}
                {croppedImages.map((ci, i) => (
                  <div key={i} className="relative border rounded-md overflow-hidden bg-card flex-shrink-0 w-36 lg:w-full">
                    <div className="relative bg-white">
                      <img src={ci.dataUrl} alt={`Crop ${i + 1}`} className="w-full max-h-20 object-contain" />
                      <div className="absolute top-0.5 left-0.5 bg-primary/90 text-primary-foreground text-[9px] px-1 rounded flex items-center gap-1">
                        Q{i + 1}
                        {ci.qType && <span className="opacity-80">[{ci.qType}]</span>}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute top-0.5 right-0.5 h-5 w-5 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => setCroppedImages(prev => prev.filter((_, k) => k !== i))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="p-1.5 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <label className="text-[8px] uppercase text-muted-foreground font-bold">Subject</label>
                          <ComboInput value={ci.subject} onChange={(v) => updateCrop(i, { subject: v })}
                                 presets={CANONICAL_SUBJECTS} placeholder="Subject" />
                        </div>
                        <div>
                          <label className="text-[8px] uppercase text-muted-foreground font-bold">Type</label>
                          <Select value={ci.qType} onValueChange={(v) => updateCrop(i, { qType: v as CropQType })}>
                            <SelectTrigger className="h-8 text-[10px] px-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MCQ">MCQ</SelectItem>
                              <SelectItem value="MSQ">MSQ</SelectItem>
                              <SelectItem value="Numerical">Num</SelectItem>
                              <SelectItem value="Integer">Int</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] uppercase text-muted-foreground font-bold">Section / Chapter</label>
                        <ComboInput value={ci.section} onChange={(v) => updateCrop(i, { section: v })}
                               presets={SECTION_PRESETS} placeholder="Section" />
                      </div>
                      <div className="flex gap-1">
                        <Input value={ci.correctAnswer || ''} onChange={(e) => updateCrop(i, { correctAnswer: e.target.value })}
                               className="h-7 text-[10px] px-1 flex-1" placeholder="Answer (A, B...)" />
                        <Button variant="outline" size="sm" className="h-7 px-1" onClick={() => setPreviewIdx(i)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {ci.extraImages && ci.extraImages.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 py-0.5">
                          {ci.extraImages.map((ex, j) => (
                            <div key={j} className="relative">
                              <img src={ex} className="h-8 w-8 object-cover rounded border" />
                              <button className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-3 h-3 text-[7px] leading-none"
                                      onClick={() => removeExtra(i, j)}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-0.5 pt-0.5">
                        <div className="flex gap-0.5">
                          <button className="p-1 rounded hover:bg-accent" title="Edit text"
                                  onClick={() => setEditingIdx(i)}>
                            <Pencil className="h-3 w-3" />
                          </button>
                          <input ref={el => (galleryRefs.current[i] = el)} type="file" accept="image/*" className="hidden"
                                 onChange={e => { const f = e.target.files?.[0]; if (f) addExtraImage(i, f); e.target.value = ''; }} />
                          <button className="p-1 rounded hover:bg-accent" title="Add diagram from gallery"
                                  onClick={() => galleryRefs.current[i]?.click()}>
                            <ImageIcon className="h-3 w-3" />
                          </button>
                          <button className="p-1 rounded hover:bg-accent" title="Preview"
                                  onClick={() => setPreviewIdx(i)}>
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                        <button className="p-1 rounded hover:bg-destructive/20 text-destructive" title="Delete"
                                onClick={() => setCroppedImages(prev => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {croppedImages.length > 0 && (
              <Button onClick={handleDone} className="w-full mt-2" size="sm">
                <Download className="h-4 w-4 mr-1" /> Use {croppedImages.length} Question{croppedImages.length !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>

        {/* Text editor dialog */}
        {editingIdx !== null && croppedImages[editingIdx] && (
          <Dialog open={editingIdx !== null} onOpenChange={(o) => !o && setEditingIdx(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Edit Question {editingIdx + 1} Text</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Textarea rows={5} value={croppedImages[editingIdx].questionText || ''}
                          onChange={e => updateCrop(editingIdx, { questionText: e.target.value })}
                          placeholder="Type question text (LaTeX supported, e.g. $x^2 + y^2 = r^2$)" />
                <div className="text-xs text-muted-foreground">Preview:</div>
                <div className="border rounded p-2 min-h-[60px] bg-muted/30 text-sm">
                  <LatexRenderer content={croppedImages[editingIdx].questionText || '_(empty)_'} />
                </div>
                <Button onClick={() => setEditingIdx(null)} className="w-full" size="sm">Done</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Preview dialog */}
        {previewIdx !== null && croppedImages[previewIdx] && (
          <Dialog open={previewIdx !== null} onOpenChange={(o) => !o && setPreviewIdx(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Question {previewIdx + 1} preview</DialogTitle></DialogHeader>
              <img src={croppedImages[previewIdx].dataUrl} className="w-full rounded border" />
              {croppedImages[previewIdx].extraImages?.map((ex, j) => (
                <img key={j} src={ex} className="w-full rounded border mt-2" />
              ))}
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
