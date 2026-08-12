# Manual Crop Tool & PDF Visibility Fixes

## Infrastructure & Storage
- **PDF Persistence**: PDFs are stored in IndexedDB (`aspirantai_pdf_assets_v1`) in 1MB chunks to avoid memory crashes.
- **Image Storage**: Cropped question images and Daily Hot Question (DHQ) images are stored in the `biro-test-images` Supabase bucket.
- **Manual Cropping Logic**: PDF.js renders the PDF buffer from IndexedDB onto a high-res canvas (2.5x scale) for precision.

## Manual Crop Tool Improvements
- **Full Screen UI**: Change `DialogContent` to `max-w-none w-screen h-screen` to allow maximum workspace.
- **Cropping Button**: Add a dedicated "Confirm Crop" button overlay on the selection for mobile users who might miss the top-bar button.
- **Visibility Fix**: 
    - Fix the blank canvas issue by ensuring `pdfjsLib.getDocument` is called with a clean slice of the buffer.
    - Implement a "Loading Overlay" that stays until the image is actually rendered.
    - Ensure all pages are loaded correctly when navigating (fix the "1st page still visible" bug by resetting the image state on page change).

## Technical Details
- **Coordinate Mapping**: Ensure SVG overlays and crop coordinates use `naturalWidth`/`naturalHeight` of the rendered page for resolution-independent selection.
- **Memory Management**: Use `JPEG` with 0.7-0.85 quality and optimized canvas contexts to prevent browser crashes on low-end devices.

## User Guidance
- Added detailed instructions in the Admin mapping section explaining the PDF-to-CBT flow.
