# Development Plan - Performance, Stability, and System Restoration

This plan addresses the "Aw Snap" crashes, slow PDF uploads, rendering issues, and system regressions mentioned by the user. We will restore the stability and smoothness experienced in previous versions while hardening the storage and rendering architecture.

## User Review Required

> [!IMPORTANT]
> - **IndexedDB for PDF Storage**: We are already using chunked IndexedDB, but we will optimize the chunk size and retrieval logic to ensure 20MB+ PDFs don't hit memory limits during rendering.
> - **Sequential Rendering**: We will enforce a strict sequential rendering pipeline to prevent the browser from being overwhelmed by concurrent PDF.js operations.
> - **Admin Panel Visibility**: We will verify the `biro-test-images` bucket configuration and RLS policies to ensure images are correctly displayed.

## Proposed Changes

### Storage & Performance (lib/storage.ts & lib/pdf-cropper.ts)
- Increase IndexedDB chunk size to 2MB for faster throughput while maintaining safety.
- Implement a more aggressive garbage collection strategy for `URL.createObjectURL` references to free memory immediately after usage.
- Optimize the `renderPDFPagesMetadata` and `renderSinglePage` functions to use lower internal canvas resolutions for previews while keeping high-res for actual crops.

### PDF Handling & Visibility (pages/CreateTest.tsx & components/exam/PDFCropTool.tsx)
- Re-implement a "Batch Sequential" rendering approach: load 5 pages, wait for completion, clear memory, load next 5. This prevents the "Aw Snap" crash on 25+ page PDFs.
- Restore the "Immediate Preview" logic where the first 10 pages are rendered instantly and the rest load in the background, ensuring the user isn't stuck waiting.
- Fix the PDF visibility bug where pages beyond #25 were sometimes cut or blank by ensuring the state update for `pdfPageImages` is atomic.

### UI Restoration & Admin Panel (pages/AdminPanel.tsx & Dashboard.tsx)
- Revert recent layout changes to the Dashboard to match the "previous smooth version".
- Update `AdminPanel.tsx` to correctly handle the `biro-test-images` bucket for Daily Hot Question (DHQ) images, ensuring public access is correctly managed.
- Restore the "Manual Cropping" UI palette to its simpler, more responsive state from 1 month ago.

### Security & Backend
- Verify that all storage calls to `biro-test-images` use the correct bucket name and that RLS policies allow authenticated/admin access.
- Ensure the `extract-questions` Edge Function handles large text payloads without timing out by optimizing the prompt and response token limits.

## Technical Details

### Rendering Optimization
```typescript
// Proposed refinement for CreateTest.tsx
const BATCH_SIZE = 5;
for (let i = 0; i < totalPages; i += BATCH_SIZE) {
  const batch = Array.from({ length: Math.min(BATCH_SIZE, totalPages - i) }, (_, k) => i + k);
  await Promise.all(batch.map(pageIdx => renderPage(pageIdx)));
  // Explicit memory signal
  await new Promise(resolve => setTimeout(resolve, 100)); 
}
```

### Storage Hardening
- Audit `supabase/migrations/` to ensure `biro-test-images` bucket exists and has correct `SELECT` permissions for public visibility of DHQ images.

## Verification Plan

### Automated Tests
- Run `vitest` to ensure basic PDF parsing logic isn't broken.
- Verify IndexedDB connectivity in the sandbox environment.

### Manual Verification
- Upload a 15MB+ test PDF and verify zero "Aw Snap" crashes.
- Check that all 30+ pages of a large PDF are visible in the preview section.
- Verify that admin-uploaded images in DHQ are visible on the user-facing Dashboard.
- Test the Manual Crop tool for smoothness and coordinate accuracy.
