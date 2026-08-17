# Plan for Large PDF Stability and Local Storage Enforcement

The user reports that the "Aw Snap" crash persists for large PDFs (200+ pages) and requires that the original PDF be stored ONLY on the user's side (localStorage/IndexedDB) while the created test remains available in the database (Supabase).

## Proposed Changes

### 1. Optimize PDF Rendering (Stability)
*   **Virtualization in `CreateTest.tsx`**: Replace the full rendering of all pages with a virtualized list. Only pages visible or near the viewport will be rendered as images. Pages outside the viewport will be cleared from memory.
*   **Sequential Loading refinement**: Instead of rendering all pages on mount, only render the first few pages and load others on-demand as the user scrolls.
*   **Memory Management**: Aggressively use `URL.revokeObjectURL` when pages leave the "active" zone in the preview.

### 2. Local Storage Enforcement
*   **Supabase Filter**: Modify the test saving logic to ensure that `pdfPageImages` (full page renders) are NOT sent to Supabase.
*   **IndexedDB Sync**: Ensure that while the test metadata (name, duration, questions) is saved to the database, the heavy PDF assets (source PDF, page previews) stay exclusively in the user's IndexedDB.

### 3. PDF Handling for 200+ Pages
*   **Thumbnail Optimization**: Use lower resolution thumbnails for the navigator in `PDFCropTool.tsx`.
*   **Worker Cleanup**: Ensure `pdfjsLib` workers and document handles are properly destroyed when switching contexts.

## Technical Details
*   **`src/pages/CreateTest.tsx`**: Implement a `useIntersectionObserver` or a simple window-based virtualizer for the PDF page list.
*   **`src/integrations/supabase/client.ts` (Usage)**: Ensure `saveTest` call filters out the `pdfPageImages` field before hitting the network.
*   **`src/lib/storage.ts`**: Update `saveTest` and related functions to handle the split between local (IDB) and remote (Supabase) data.

## User Impact
*   **No "Aw Snap"**: Users can process 200+ page PDFs without browser crashes.
*   **Privacy/Efficiency**: The large PDF file stays on their device, only the final test (with specific cropped question images) is synced to the cloud.
