import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LatexRenderer } from '@/components/ui/latex-renderer';
import { PDFPageImage, renderSinglePage } from '@/lib/pdf-cropper';
import { Crop, Download, RotateCcw, ChevronLeft, ChevronRight, Trash2, ZoomIn, ZoomOut, Plus, Image as ImageIcon, Pencil, Eye, Loader2, GitMerge, Type } from 'lucide-react';
import { toast } from 'sonner';
import { performClientOCR } from '@/lib/ocr';

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
  pdfBuffer?: ArrayBuffer;
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

export function PDFCropTool({ open, onOpenChange, pages, pdfBuffer, onCroppedQuestions, initialCrops }: PDFCropToolProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [presets, setPresets] = useState<Record<string, { subject: string; section: string; qType: CropQType }>>(() => {
    try {
      const saved = localStorage.getItem('biro_crop_presets');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const saveCurrentAsPreset = () => {
    const name = window.prompt("Enter preset name:");
    if (!name) return;
    const newPresets = { ...presets, [name]: { subject, section, qType } };
    setPresets(newPresets);
    localStorage.setItem('biro_crop_presets', JSON.stringify(newPresets));
    setActivePreset(name);
    toast.success(`Preset "${name}" saved!`);
  };

  const applyPreset = (name: string) => {
    const p = presets[name];
    if (p) {
      setSubject(p.subject);
      setSection(p.section);
      setQType(p.qType);
      setActivePreset(name);
    }
  };

  const [currentPage, setCurrentPage] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isCropMode, setIsCropMode] = useState(true);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRegion, setCurrentRegion] = useState<CropRegion | null>(null);
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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const addBlankRef = useRef<HTMLInputElement>(null);
  const [lastTouchDist, setLastTouchDist] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState<number | null>(null);
  const [currentPageImage, setCurrentPageImage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function loadPage() {
      if (!open || !pages[currentPage]) return;
      
      // Reset visibility states when changing pages
      setIsImgLoaded(false);
      setCurrentPageImage('');
      
      // If we have an existing imageDataUrl, use it as fallback
      if (pages[currentPage].imageDataUrl) {
        if (isMounted) setCurrentPageImage(pages[currentPage].imageDataUrl);
      }

      // If we have the raw pdfBuffer, re-render the page at high resolution to ensure visibility
      if (pdfBuffer) {
        try {
          // Use a fresh slice to ensure we don't have issues with detached buffers
          const bufferSlice = pdfBuffer.slice(0);
          const pdfDoc = await pdfjsLib.getDocument({ data: bufferSlice }).promise;
          const pageObj = await pdfDoc.getPage(currentPage + 1);
          
          // Higher scale for precision cropping, capped for memory efficiency on mobiles
          const isMobile = window.innerWidth < 768;
          const renderScale = isMobile ? 1.8 : 2.5;
          const viewport = pageObj.getViewport({ scale: renderScale * zoom });
          
          if (canvasRef.current && isMounted) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d', { alpha: false });
            if (context) {
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await pageObj.render({ canvasContext: context, viewport }).promise;
              const highResDataUrl = canvas.toDataURL('image/jpeg', 0.8);
              if (isMounted) {
                setCurrentPageImage(highResDataUrl);
                setIsImgLoaded(true);
              }
            }
          }
        } catch (error) {
          console.error("Failed to render PDF page:", error);
          if (isMounted) {
            toast.error("Failed to render PDF page. Showing lower quality preview.");
            setIsImgLoaded(true);
          }
        }
      } else {
        if (isMounted) setIsImgLoaded(true);
      }
    }
    
    loadPage();
    return () => { isMounted = false; };
  }, [open, currentPage, pages, pdfBuffer, zoom]);

  const page = pages[currentPage] ? { 
    ...pages[currentPage], 
    imageDataUrl: currentPageImage || pages[currentPage].imageDataUrl 
  } : null;

  useEffect(() => {
    if (open) {
      setCurrentPage(0);
      setCropRegion(null);
      setCropStart(null);
      setIsDrawing(false);
      setZoom(1);
      setIsImgLoaded(false);
      setOffset({ x: 0, y: 0 });
      if (initialCrops && initialCrops.length) setCroppedImages(initialCrops);
    }
  }, [open, initialCrops]);

  const getRelativeCoords = useCallback((e: React.MouseEvent | React.TouchEvent | { clientX: number, clientY: number }) => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as any).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as any).clientY;
    
    // Account for zoom and offset when calculating coordinates on the image
    // Note: rect already reflects the zoom (width/height), so we just need natural scaling
    const x = (clientX - rect.left) * (img.naturalWidth / rect.width);
    const y = (clientY - rect.top) * (img.naturalHeight / rect.height);

    return {
      x: Math.max(0, Math.min(img.naturalWidth, x)),
      y: Math.max(0, Math.min(img.naturalHeight, y)),
    };
  }, []);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setLastTouchDist(dist);
      setIsDrawing(false);
      setIsPanning(false);
      return;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as any).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as any).clientY;

    // If not in crop mode and not holding shift, we pan
    if (!isCropMode && !e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: clientX - offset.x, y: clientY - offset.y });
      setIsDrawing(false);
      return;
    }

    const c = getRelativeCoords(e); 
    setCropStart(c); 
    if (!e.shiftKey) {
      setCropRegion(null); 
      setOptionRegions([]);
    }
    setIsDrawing(true);
    setIsPanning(false);
  }, [getRelativeCoords, cropRegion, offset]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as any).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as any).clientY;

    if ('touches' in e && e.touches.length === 2 && lastTouchDist !== null) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const delta = dist / lastTouchDist;
      
      const newZoom = Math.min(4, Math.max(0.5, zoom * delta));
      setZoom(newZoom);
      setLastTouchDist(dist);
      return;
    }

    if (isPanning) {
      setOffset({
        x: clientX - panStart.x,
        y: clientY - panStart.y
      });
      return;
    }

    if (!isDrawing || !cropStart) return;
    const c = getRelativeCoords(e);
    const region = {
      x: Math.min(cropStart.x, c.x), y: Math.min(cropStart.y, c.y),
      width: Math.abs(c.x - cropStart.x), height: Math.abs(c.y - cropStart.y),
    };
    
    setCurrentRegion(region);
    
    // In drawing mode (Shift held), update the temporary selection or the main crop
    if (!e.shiftKey) {
      setCropRegion(region);
    }
  }, [isDrawing, isPanning, cropStart, getRelativeCoords, lastTouchDist, zoom, panStart]);

  const handleEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isDrawing && cropStart) {
      const c = getRelativeCoords(e as any || { clientX: 0, clientY: 0 }); // Fallback for end events
      const region = {
        x: Math.min(cropStart.x, c.x), y: Math.min(cropStart.y, c.y),
        width: Math.abs(c.x - cropStart.x), height: Math.abs(c.y - cropStart.y),
      };
      
      if (region.width > 5 && region.height > 5) {
        if (e.shiftKey) {
          setOptionRegions(prev => [...prev, region]);
        } else {
          setCropRegion(region);
        }
      }
    }
    setIsDrawing(false);
    setIsPanning(false);
    setCurrentRegion(null);
    setLastTouchDist(null);
  }, [isDrawing, cropStart, getRelativeCoords]);

  const moveCrop = (dx: number, dy: number) => {
    if (!cropRegion) return;
    setCropRegion(prev => prev ? {
      ...prev,
      x: Math.max(0, prev.x + dx),
      y: Math.max(0, prev.y + dy)
    } : null);
  };

  const resizeCrop = (dw: number, dh: number) => {
    if (!cropRegion) return;
    setCropRegion(prev => prev ? {
      ...prev,
      width: Math.max(10, prev.width + dw),
      height: Math.max(10, prev.height + dh)
    } : null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!cropRegion) return;
    const step = e.shiftKey ? 10 : 2;
    
    switch (e.key) {
      case 'ArrowUp': moveCrop(0, -step); e.preventDefault(); break;
      case 'ArrowDown': moveCrop(0, step); e.preventDefault(); break;
      case 'ArrowLeft': moveCrop(-step, 0); e.preventDefault(); break;
      case 'ArrowRight': moveCrop(step, 0); e.preventDefault(); break;
      case 'w': resizeCrop(0, -step); e.preventDefault(); break;
      case 's': resizeCrop(0, step); e.preventDefault(); break;
      case 'a': resizeCrop(-step, 0); e.preventDefault(); break;
      case 'd': resizeCrop(step, 0); e.preventDefault(); break;
      case 'Enter': handleCrop(); break;
    }
  };

  const handleCrop = useCallback(() => {
    if (!cropRegion || !page || !imgRef.current) return;
    const img = imgRef.current;
    
    const srcX = Math.round(cropRegion.x);
    const srcY = Math.round(cropRegion.y);
    const srcW = Math.round(cropRegion.width);
    const srcH = Math.round(cropRegion.height);
    if (srcW < 5 || srcH < 5) return;

    const processCrop = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = srcW; canvas.height = srcH;
      const ctx = canvas.getContext('2d')!;
      
      const tmp = new window.Image();
      tmp.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        tmp.onload = resolve;
        tmp.onerror = reject;
        tmp.src = page.imageDataUrl;
      });
      
      ctx.drawImage(tmp, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      const mainDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      const extraImages: string[] = [];
      for (const opt of optionRegions) {
        const oX = Math.round(opt.x);
        const oY = Math.round(opt.y);
        const oW = Math.round(opt.width);
        const oH = Math.round(opt.height);
        if (oW < 5 || oH < 5) continue;
        
        const oCanvas = document.createElement('canvas');
        oCanvas.width = oW; oCanvas.height = oH;
        const oCtx = oCanvas.getContext('2d')!;
        oCtx.drawImage(tmp, oX, oY, oW, oH, 0, 0, oW, oH);
        extraImages.push(oCanvas.toDataURL('image/jpeg', 0.82));
      }

      setCroppedImages(prev => [...prev, {
        dataUrl: mainDataUrl,
        pageNumber: page.pageNumber,
        index: prev.length,
        subject, section, qType,
        extraImages: extraImages.length > 0 ? extraImages : undefined,
      }]);
      setCropRegion(null);
      setOptionRegions([]);
    };

    processCrop().catch(console.error);
  }, [cropRegion, optionRegions, page, subject, section, qType]);

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

  const runOCR = async (i: number) => {
    const crop = croppedImages[i];
    if (!crop) return;
    setIsOcrLoading(i);
    try {
      const text = await performClientOCR(crop.dataUrl);
      if (text) {
        updateCrop(i, { questionText: (crop.questionText || '') + (crop.questionText ? '\n' : '') + text });
        toast.success("OCR completed!");
      } else {
        toast.error("No text found in crop.");
      }
    } catch (e) {
      toast.error("OCR failed to initialize.");
    } finally {
      setIsOcrLoading(null);
    }
  };

  const mergeWithPrevious = (i: number) => {
    if (i <= 0) return;
    const current = croppedImages[i];
    const prev = croppedImages[i-1];
    
    const updatedPrev = {
      ...prev,
      extraImages: [...(prev.extraImages || []), current.dataUrl, ...(current.extraImages || [])],
      questionText: (prev.questionText || '') + '\n' + (current.questionText || '')
    };
    
    setCroppedImages(prevList => {
      const newList = [...prevList];
      newList[i-1] = updatedPrev;
      newList.splice(i, 1);
      return newList;
    });
    toast.success("Questions merged!");
  };

  const handleDone = () => { onCroppedQuestions(croppedImages); onOpenChange(false); };

  if (!pages || pages.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">No PDF Content Loaded</h3>
              <p className="text-sm text-muted-foreground">
                The PDF pages have not been processed yet. Please wait a moment or try re-uploading the PDF.
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)}>Close Tool</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 flex flex-col overflow-hidden rounded-none border-none">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Crop className="h-4 w-4 text-primary" />
            Manual Crop — Page {currentPage + 1}/{pages.length} · {croppedImages.length} crops
          </DialogTitle>
        </DialogHeader>

        {/* Diagnostic Overlay */}
        {open && pages.length > 0 && !isImgLoaded && !currentPageImage && (
          <div className="absolute inset-0 z-[100] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <h3 className="font-bold text-lg mb-2">Rendering PDF Page...</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Generating high-resolution previews for precise cropping.
            </p>
            <Button variant="outline" size="sm" onClick={() => setIsImgLoaded(true)}>
              Taking too long? Force show
            </Button>
          </div>
        )}

        {/* Compact single-row control bar */}
        <div className="flex flex-col gap-2 p-2 rounded-md bg-muted/40 border mb-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Settings & Presets</span>
            <div className="flex gap-1">
              {Object.keys(presets).length > 0 && (
                <Select value={activePreset || ''} onValueChange={applyPreset}>
                  <SelectTrigger className="h-6 w-32 text-[10px] bg-background"><SelectValue placeholder="Load Preset" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(presets).map(name => (
                      <SelectItem key={name} value={name} className="text-[10px]">{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={saveCurrentAsPreset}>
                <Plus className="h-3 w-3 mr-1" /> Save Preset
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
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
        </div>

        <div className="flex flex-col lg:flex-row gap-2 flex-1 min-h-0 mt-1.5 overflow-hidden">
          {/* PDF viewer — takes most of the space */}
          <div className="flex flex-col min-w-0 flex-1 h-full overflow-hidden relative">

            <div className="flex items-center justify-between mb-1 gap-1 flex-wrap px-2">
              <div className="flex gap-1 items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-muted-foreground hover:text-foreground" 
                  onClick={() => onOpenChange(false)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div className="h-4 w-[1px] bg-border mx-1" />
                
                <div className="flex border rounded-md overflow-hidden bg-background mr-2">
                  <Button
                    variant={isCropMode ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-3 rounded-none text-[10px]"
                    onClick={() => setIsCropMode(true)}
                  >
                    <Crop className="h-3.5 w-3.5 mr-1" /> Crop
                  </Button>
                  <Button
                    variant={!isCropMode ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-3 rounded-none text-[10px]"
                    onClick={() => setIsCropMode(false)}
                  >
                    <ImageIcon className="h-3.5 w-3.5 mr-1" /> Pan
                  </Button>
                </div>

                <Button variant="outline" size="sm" className="h-7 px-2" disabled={currentPage === 0}
                        onClick={() => { setCurrentPage(p => p - 1); setCropRegion(null); setIsImgLoaded(false); }}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] px-1">{currentPage + 1}/{pages.length}</span>
                <Button variant="outline" size="sm" className="h-7 px-2" disabled={currentPage === pages.length - 1}
                        onClick={() => { setCurrentPage(p => p + 1); setCropRegion(null); setIsImgLoaded(false); }}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex gap-1 items-center">
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.05).toFixed(2)))}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <div className="flex items-center gap-1 group relative">
                  <Input 
                    className="h-7 w-14 text-[11px] px-1 text-center bg-background border-primary/20" 
                    value={Math.round(zoom * 100)} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) setZoom(Math.min(10, Math.max(0.1, val / 100)));
                    }}
                  />
                  <span className="text-[10px] absolute -right-3 text-muted-foreground">%</span>
                </div>
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setZoom(z => Math.min(10, +(z + 0.05).toFixed(2)))}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => { setCropRegion(null); setZoom(1); setOffset({ x: 0, y: 0 }); }}>
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

            <div ref={containerRef} className="relative border rounded-md overflow-auto flex-1 bg-muted/30 overscroll-none min-h-[300px] lg:min-h-[400px] touch-none flex items-start justify-center p-2 md:p-4">
              {!isImgLoaded && (
                <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-3">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">PDF</div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-sm font-bold animate-pulse text-primary">Loading High-Res Page...</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Page {currentPage + 1} of {pages.length}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-4 text-[10px]" onClick={() => setIsImgLoaded(true)}>
                    Stuck? Click to force show
                  </Button>
                </div>
              )}
              <div
                className="relative inline-block select-none outline-none focus-within:ring-2 ring-primary/20 bg-white"
                tabIndex={0}
                onKeyDown={handleKeyDown}
                style={{ 
                  touchAction: 'none', 
                  transformOrigin: 'top center',
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                  zIndex: 10,
                  opacity: isImgLoaded ? 1 : 0.5,
                  transition: 'opacity 0.2s ease-in-out',
                  minWidth: '100px',
                  minHeight: '100px',
                  cursor: isPanning ? 'grabbing' : (isDrawing ? 'crosshair' : 'grab')
                }}
                onMouseDown={handleStart} onMouseMove={handleMove}
                onMouseUp={handleEnd} onMouseLeave={handleEnd}
                onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
              >
                <canvas ref={canvasRef} className="hidden" />
                {page?.imageDataUrl ? (
                  <>
                    <img
                      ref={imgRef}
                      src={page.imageDataUrl}
                      alt={`Page ${currentPage + 1}`}
                      className="pointer-events-none shadow-2xl border"
                      draggable={false}
                      onLoad={() => setIsImgLoaded(true)}
                      style={{ 
                        display: 'block', 
                        width: 'auto',
                        height: 'auto',
                        maxWidth: 'none',
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        pointerEvents: 'none',
                        zIndex: 1, 
                        imageRendering: 'crisp-edges'
                      }}
                    />
                    {imgRef.current && (
                      <svg 
                        className="absolute inset-0 pointer-events-none overflow-visible"
                        style={{ 
                          width: imgRef.current.naturalWidth, 
                          height: imgRef.current.naturalHeight,
                          transform: `scale(${zoom})`,
                          transformOrigin: 'top left',
                          zIndex: 2
                        }}
                      >
                        {currentRegion && (
                          <rect
                            x={currentRegion.x} y={currentRegion.y}
                            width={currentRegion.width} height={currentRegion.height}
                            fill="rgba(59, 130, 246, 0.2)"
                            stroke="rgb(59, 130, 246)"
                            strokeWidth={2 / zoom}
                            strokeDasharray={`${4/zoom} ${2/zoom}`}
                          />
                        )}
                        {cropRegion && (
                          <rect
                            x={cropRegion.x} y={cropRegion.y}
                            width={cropRegion.width} height={cropRegion.height}
                            fill="rgba(34, 197, 94, 0.15)"
                            stroke="rgb(34, 197, 94)"
                            strokeWidth={3 / zoom}
                          />
                        )}
                        {optionRegions.map((r, i) => (
                          <rect
                            key={i}
                            x={r.x} y={r.y}
                            width={r.width} height={r.height}
                            fill="rgba(168, 85, 247, 0.15)"
                            stroke="rgb(168, 85, 247)"
                            strokeWidth={2 / zoom}
                          />
                        ))}
                      </svg>
                    )}
                  </>
                ) : (
                  <div className="w-[500px] h-[700px] flex items-center justify-center bg-white text-muted-foreground text-xs">
                    No page data available
                  </div>
                )}
                {cropRegion && cropRegion.width > 0 && cropRegion.height > 0 && (
                  <div
                    className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
                    style={{
                      left: `${(cropRegion.x / (imgRef.current?.naturalWidth || 1)) * 100}%`, 
                      top: `${(cropRegion.y / (imgRef.current?.naturalHeight || 1)) * 100}%`,
                      width: `${(cropRegion.width / (imgRef.current?.naturalWidth || 1)) * 100}%`, 
                      height: `${(cropRegion.height / (imgRef.current?.naturalHeight || 1)) * 100}%`,
                      borderStyle: 'dashed',
                    }}
                  >
                    <div className="absolute -top-5 left-0 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                      {subject} · {qType}
                    </div>
                    <Button 
                      size="sm" 
                      className="absolute left-1/2 -top-12 -translate-x-1/2 bg-green-600 hover:bg-green-700 text-white shadow-lg pointer-events-auto h-8 px-3 text-xs rounded-full flex items-center gap-1.5 whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCrop();
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Confirm Crop
                    </Button>
                  </div>
                )}
                {optionRegions.map((opt, i) => (
                  <div
                    key={i}
                    className="absolute border border-orange-500 bg-orange-500/10 pointer-events-none"
                    style={{
                      left: `${(opt.x / (imgRef.current?.naturalWidth || 1)) * 100}%`, 
                      top: `${(opt.y / (imgRef.current?.naturalHeight || 1)) * 100}%`,
                      width: `${(opt.width / (imgRef.current?.naturalWidth || 1)) * 100}%`, 
                      height: `${(opt.height / (imgRef.current?.naturalHeight || 1)) * 100}%`,
                      borderStyle: 'dotted',
                    }}
                  >
                    <div className="absolute -top-4 left-0 bg-orange-500 text-white text-[8px] px-1 rounded">
                      Opt {String.fromCharCode(65 + i)}
                    </div>
                  </div>
                ))}
                {currentRegion && currentRegion.width > 2 && currentRegion.height > 2 && (
                  <div
                    className="absolute border border-primary/50 bg-primary/10 pointer-events-none"
                    style={{
                      left: `${(currentRegion.x / (imgRef.current?.naturalWidth || 1)) * 100}%`, 
                      top: `${(currentRegion.y / (imgRef.current?.naturalHeight || 1)) * 100}%`,
                      width: `${(currentRegion.width / (imgRef.current?.naturalWidth || 1)) * 100}%`, 
                      height: `${(currentRegion.height / (imgRef.current?.naturalHeight || 1)) * 100}%`,
                      zIndex: 20
                    }}
                  />
                )}
              </div>
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground bg-accent/30 p-2 rounded mt-1 flex justify-between items-center">
              <p>
                <span className="font-bold text-primary">Instructions:</span> 1. Drag to select Question area. 2. <b>Hold SHIFT</b> and drag to select Option areas. 3. Click "Add" or the crop button.
              </p>
              {cropRegion && (
                <Button size="sm" className="h-7 px-3 bg-primary animate-pulse shadow-lg" onClick={handleCrop}>
                  <Crop className="h-3.5 w-3.5 mr-1" /> Confirm Crop
                </Button>
              )}
            </div>
          </div>

          {/* Crop list */}
          <div className="w-full lg:w-72 flex flex-col h-[200px] lg:h-full overflow-hidden border-t lg:border-t-0 lg:border-l pt-2 lg:pt-0 lg:pl-2">
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
                    <div className="absolute top-1 left-1 z-10 bg-primary/80 text-white text-[9px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm">
                      Q.{i + 1} (Pg.{ci.pageNumber})
                    </div>
                    <div className="relative bg-white pt-4">
                      <img src={ci.dataUrl} alt={`Crop ${i + 1}`} className="w-full max-h-24 object-contain" />
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
                          <button 
                            className={`p-1 rounded hover:bg-accent ${isOcrLoading === i ? 'animate-pulse text-primary' : ''}`} 
                            title="Extract text (OCR)"
                            onClick={() => runOCR(i)}
                            disabled={isOcrLoading !== null}
                          >
                            <Type className="h-3 w-3" />
                          </button>
                          {i > 0 && (
                            <button className="p-1 rounded hover:bg-accent text-primary" title="Merge with previous"
                                    onClick={() => mergeWithPrevious(i)}>
                              <GitMerge className="h-3 w-3" />
                            </button>
                          )}
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
