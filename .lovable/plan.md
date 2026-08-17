# Restoration of Original UI and PDF Infrastructure Enhancement

Restore the original UI look and feel (grid-based, dense) while upgrading the PDF processing backend for stability (20MB+ files), speed, and smoothness.

## User Review Required

> [!IMPORTANT]
> The original UI (grid-based Dashboard) was previously restored but the user reports a "changed look". I will re-align all core pages (Dashboard, Create Test, My Tests) to match the original AspirantAI aesthetic (dense, neon-accented, grid layouts).

- Are there specific pages where the UI feels "too new" or "too different"? I will assume Dashboard, Create Test, and My Tests are the primary focus.

## Proposed Changes

### UI Restoration
- **Dashboard**: Ensure the grid layout is dense and functional, mirroring the "previous" version (AspirantAI style).
- **Navigation**: Verify sidebar/drawer consistency.
- **My Tests**: Restore the list/grid view that prioritized quick access to start tests.

### PDF Infrastructure (Stability & Speed)
- **PDF Extraction**: Optimize `src/lib/pdf-cropper.ts` to handle 20MB+ PDFs without "Aw Snap" crashes.
- **Manual Cropping**: Enhance `PDFCropTool.tsx` to mirror the advanced cropping features of `biro-pdf2cbtes8` (smooth zooming, precise selection, multi-page stability).
- **Rendering Speed**: Implement more aggressive pre-rendering and caching in `CreateTest.tsx` to make the preview appear "immediately" as the user expects.

### Data Persistence & Backend
- **Storage**: Ensure all test data, manual crops, and user settings are persisted correctly in IndexedDB to avoid `localStorage` limits.
- **Sharing**: Verify share codes and public test links are generating correctly.

## Technical Details
- **Semaphore-based Rendering**: Limit concurrent `pdfjsLib` page rendering to prevent memory spikes.
- **Dual-Resolution Virtualization**: Use low-res thumbnails for navigation and high-res tiles for active cropping areas.
- **IndexedDB Chunking**: Continue using 1MB chunking for large PDFs but optimize the reassembly for faster previewing.
- **UI Theming**: Re-apply semantic neon tokens consistently across components to match the "AspirantAI" brand.

## Verification Plan
- **PDF Load Test**: Upload a 25MB+ PDF and verify immediate preview without crash.
- **Cropping Test**: Perform multiple manual crops across different pages and verify high-quality extraction.
- **UI Audit**: Compare current pages against the "dense grid" requirement and adjust spacing/layout.
- **History Test**: Ensure newly created tests appear in History and My Tests immediately.
