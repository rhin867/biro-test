import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ZoomIn, ZoomOut, RotateCcw, RotateCw, Undo, Redo, 
  Maximize, Minimize, MousePointer2, Crop, Check, X,
  ChevronLeft, ChevronRight, HelpCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { renderSinglePage } from '@/lib/pdf-cropper';
import { useInView } from 'react-intersection-observer';

interface PDFCropToolProps {
  pdfFile: File | ArrayBuffer;
  pageImages: { pageNumber: number; imageDataUrl: string; width: number; height: number }[];
  onSaveCrops: (crops: Record<string, string>) => void;
  onCancel: () => void;
  initialCrops?: Record<string, string>;
}

interface CropArea {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function PDFCropTool({
  pdfFile,
  pageImages,
  onSaveCrops,
  onCancel,
  initialCrops = {}
}: PDFCropToolProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCropMode, setIsCropMode] = useState(true);
  const [crops, setCrops] = useState<CropArea[]>([]);
  const [currentCrop, setCurrentCrop] = useState<Partial<CropArea> | null>(null);
  const [history, setHistory] = useState<CropArea[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentPage = pageImages[currentPageIndex];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCropMode || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setCurrentCrop({
      pageNumber: currentPage.pageNumber,
      x,
      y,
      width: 0,
      height: 0
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!currentCrop || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setCurrentCrop(prev => ({
      ...prev,
      width: x - (prev?.x || 0),
      height: y - (prev?.y || 0)
    }));
  };

  const handleMouseUp = () => {
    if (!currentCrop || !currentCrop.width || !currentCrop.height) {
      setCurrentCrop(null);
      return;
    }

    const newCrop: CropArea = {
      id: Math.random().toString(36).substr(2, 9),
      pageNumber: currentPage.pageNumber,
      x: currentCrop.x || 0,
      y: currentCrop.y || 0,
      width: currentCrop.width || 0,
      height: currentCrop.height || 0
    };

    // Normalize coordinates if dragged backwards
    if (newCrop.width < 0) {
      newCrop.x += newCrop.width;
      newCrop.width = Math.abs(newCrop.width);
    }
    if (newCrop.height < 0) {
      newCrop.y += newCrop.height;
      newCrop.height = Math.abs(newCrop.height);
    }

    const updatedCrops = [...crops, newCrop];
    updateHistory(updatedCrops);
    setCrops(updatedCrops);
    setCurrentCrop(null);
  };

  const updateHistory = (newCrops: CropArea[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newCrops]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevCrops = history[historyIndex - 1];
      setCrops([...prevCrops]);
      setHistoryIndex(historyIndex - 1);
    } else if (historyIndex === 0) {
      setCrops([]);
      setHistoryIndex(-1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextCrops = history[historyIndex + 1];
      setCrops([...nextCrops]);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const deleteCrop = (id: string) => {
    const updated = crops.filter(c => c.id !== id);
    updateHistory(updated);
    setCrops(updated);
  };

  const handleSave = async () => {
    toast.loading("Processing crops...");
    const results: Record<string, string> = {};
    
    try {
      for (let i = 0; i < crops.length; i++) {
        const crop = crops[i];
        const page = pageImages.find(p => p.pageNumber === crop.pageNumber);
        if (!page) continue;

        // Use canvas to extract the cropped area with better quality
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = page.imageDataUrl;
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error(`Failed to load page ${page.pageNumber}`));
        });
        
        // Scale factor if any (we use the original page dimensions)
        const scaleX = img.naturalWidth / page.width;
        const scaleY = img.naturalHeight / page.height;

        canvas.width = crop.width * scaleX;
        canvas.height = crop.height * scaleY;
        
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(
            img, 
            crop.x * scaleX, 
            crop.y * scaleY, 
            crop.width * scaleX, 
            crop.height * scaleY, 
            0, 
            0, 
            canvas.width, 
            canvas.height
          );
        }
        
        results[crop.id] = canvas.toDataURL('image/jpeg', 0.95);
        
        // Cleanup canvas
        canvas.width = 0;
        canvas.height = 0;
      }
      
      onSaveCrops(results);
      toast.dismiss();
      toast.success(`${crops.length} questions extracted successfully!`);
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error("Failed to extract crops.");
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background flex flex-col",
      isFullScreen ? "p-0" : "p-4 md:p-8"
    )}>
      <header className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold hidden md:block">Question Extraction Tool</h2>
        </div>

        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <Button 
            variant={isCropMode ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setIsCropMode(true)}
            className="gap-2"
          >
            <Crop className="h-4 w-4" /> <span className="hidden sm:inline">Crop</span>
          </Button>
          <Button 
            variant={!isCropMode ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setIsCropMode(false)}
            className="gap-2"
          >
            <MousePointer2 className="h-4 w-4" /> <span className="hidden sm:inline">Pan</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleUndo} disabled={historyIndex < 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="default" onClick={handleSave} className="gap-2">
            <Check className="h-4 w-4" /> Save ({crops.length})
          </Button>
        </div>
      </header>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Page Sidebar */}
        <div className="w-20 md:w-48 overflow-y-auto border rounded-lg bg-card p-2 hidden sm:block">
          {pageImages.map((page, idx) => (
            <button
              key={page.pageNumber}
              onClick={() => setCurrentPageIndex(idx)}
              className={cn(
                "w-full mb-2 rounded border overflow-hidden transition-all",
                currentPageIndex === idx ? "ring-2 ring-primary border-primary" : "opacity-60 hover:opacity-100"
              )}
            >
              <img src={page.imageDataUrl} alt={`Page ${page.pageNumber}`} className="w-full h-auto" />
              <div className="text-[10px] py-1 bg-muted">Page {page.pageNumber}</div>
            </button>
          ))}
        </div>

        {/* Main Workspace */}
        <div className="flex-1 relative border rounded-lg overflow-hidden bg-slate-900 flex flex-col">
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.min(z + 0.2, 4))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setIsFullScreen(!isFullScreen)}>
              {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>

          <div 
            ref={containerRef}
            className={cn(
              "flex-1 overflow-auto p-8 flex items-center justify-center scrollbar-hide",
              isCropMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
            )}
          >
            <div 
              className="relative shadow-2xl transition-transform duration-200 ease-out origin-center"
              style={{ transform: `scale(${zoom})` }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {currentPage && (
                <img 
                  ref={imageRef}
                  src={currentPage.imageDataUrl} 
                  alt="Current Page" 
                  className="max-w-none select-none"
                  draggable={false}
                />
              )}

              {/* Render Existing Crops */}
              {crops.filter(c => c.pageNumber === currentPage.pageNumber).map(crop => (
                <div
                  key={crop.id}
                  className="absolute border-2 border-primary bg-primary/10 group"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.width,
                    height: crop.height
                  }}
                >
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); deleteCrop(crop.id); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="absolute -bottom-6 left-0 bg-primary text-white text-[10px] px-1 rounded">
                    Q{crops.indexOf(crop) + 1}
                  </div>
                </div>
              ))}

              {/* Current Drawing Crop */}
              {currentCrop && (
                <div
                  className="absolute border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
                  style={{
                    left: currentCrop.width! < 0 ? currentCrop.x! + currentCrop.width! : currentCrop.x,
                    top: currentCrop.height! < 0 ? currentCrop.y! + currentCrop.height! : currentCrop.y,
                    width: Math.abs(currentCrop.width!),
                    height: Math.abs(currentCrop.height!)
                  }}
                />
              )}
            </div>
          </div>

          {/* Mobile Navigator */}
          <div className="p-4 bg-background/80 backdrop-blur flex items-center justify-between border-t sm:hidden">
            <Button variant="outline" size="icon" onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">Page {currentPage?.pageNumber} / {pageImages.length}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentPageIndex(p => Math.min(pageImages.length - 1, p + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
