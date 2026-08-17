# PDF Rendering and Stability Fixes

The goal is to fix "Aw Snap" crashes, improve PDF visibility across all pages, and ensure smooth manual cropping while maintaining high performance for large files.

## User Preferences
- **Stability**: Prevent browser crashes ("Aw Snap") on mobile/desktop.
- **Visibility**: Ensure all PDF pages are visible in the preview, not just the first few.
- **Immediate Rendering**: PDF should open/preview quickly.
- **UI Consistency**: Maintain the manual crop palette and tools as requested.

## Proposed Changes

### 1. `src/lib/pdf-cropper.ts`
- **Memory Management**: Add explicit cleanup for every PDF document and page render.
- **Render Quality**: Adjust default scales to 1.2 for mobile-friendly memory usage while maintaining readability.
- **Worker Management**: Ensure worker source is correctly set.

### 2. `src/pages/CreateTest.tsx`
- **Rendering Strategy**: Switch to a "Batch + Lazy" approach. Render the first 5 pages immediately for the user, then render the remaining pages in small batches (e.g., 5 at a time) using a requestIdleCallback or similar background task to avoid locking the UI thread.
- **Virtualization Refinement**: Adjust the `LazyPDFPage` sliding window to be slightly larger (15 pages instead of 10) for better scroll experience, but keep the aggressive memory revocation.

### 3. `src/components/exam/PDFCropTool.tsx`
- **Render Loop Fix**: The current loop might be re-rendering too often. Optimize the `useEffect` that loads the page to be more resilient to state changes.
- **Canvas Rendering**: Ensure the canvas is cleared before every render to prevent ghosting or memory leaks.

### 4. `src/lib/storage.ts`
- **Chunk Management**: Verify 2MB chunks are working correctly and ensure metadata is always present to prevent fallback to memory-heavy single blobs.

## Technical Details
- Using `pdfjsLib.GlobalWorkerOptions.workerSrc` with a robust path.
- `URL.revokeObjectURL` will be called for every page that leaves the viewport.
- `pdfDoc.destroy()` will be called explicitly after page extraction.
