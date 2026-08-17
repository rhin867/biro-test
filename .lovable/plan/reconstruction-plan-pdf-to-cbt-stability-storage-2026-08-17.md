# Reconstruction Plan: PDF-to-CBT Stability & Storage

This plan restores the PDF extraction and CBT conversion engine with a focus on stability for large files (200+ pages) and local-first storage.

## Core Pillars
1. **Memory Stability**: Implement aggressive memory management and virtualization to prevent "Aw Snap" crashes.
2. **Local-First Privacy**: Keep original PDFs and full page renders in IndexedDB (client-side only).
3. **Optimized Rendering**: Use sequential chunked rendering and sliding windows for the UI.

## Technical Details

### 1. Storage Layer (`src/lib/storage.ts`)
*   Implement `idb-keyval` for large binary storage (PDFs, page images).
*   Add methods: `savePdfBinary`, `loadPdfBinary`, `savePageImages`, `loadPageImages`.
*   Maintain Supabase for test metadata and shared results only.

### 2. PDF Engine (`src/lib/pdf-cropper.ts`)
*   Use `pdfjsLib` with a persistent worker.
*   `renderPDFPagesMetadata`: Extract page count and dimensions without full rendering.
*   `renderSinglePage`: Render on-demand with memory cleanup (`page.cleanup()`, `canvas.width = 0`).
*   Implement `renderSequentialChunks` for background processing.

### 3. UI Components
*   `LazyPDFPage.tsx`: Intersection-observer based renderer that revokes URLs when off-screen.
*   `PDFCropTool.tsx`: Restored zoom, pan, multi-select, and absolute coordinate mapping.
*   `CreateTest.tsx`: Restore upload flow with sequential page previews.

### 4. Safety Limits
*   Max PDF size: 50MB.
*   Max Pages: 500.
*   Render Scale: 1.2x (Mobile) to 1.5x (Desktop).

## Implementation Steps
1. Restore `storage.ts` with IndexedDB support.
2. Restore `pdf-cropper.ts` engine logic.
3. Restore `LazyPDFPage.tsx` virtualized component.
4. Restore `PDFCropTool.tsx` workspace.
5. Restore `CreateTest.tsx` workflow.
