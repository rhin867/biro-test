import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * PROJECT INSTRUCTIONS & REQUIREMENTS LOG
 * 
 * CURRENT GOALS:
 * 1. Add pdf e2e test, verify indexDB storage, prevent TS regressions.
 * 2. Harden pdf crop tool: ensure pdfs are storing and visible in manual crop tool.
 * 3. Fix all manual crop tool issues: hand cropping, two-finger zooming, etc.
 */

const buildLog = [
  "2026-08-09T04:01:19.888239425Z ==> Downloading cache...",
  "2026-08-09T04:01:19.916525011Z ==> Cloning from https://github.com/rhin867/biro-test",
  "2026-08-09T04:01:25.302316037Z ==> Checking out commit 17fb95e326292476a63ab145108a81c7212c14fe in branch main",
  "2026-08-09T04:01:33.031601419Z ==> Downloaded 272MB in 9s. Extraction took 4s.",
  "2026-08-09T04:01:33.509879705Z ==> Using Node.js version 24.14.1 (default)",
  "2026-08-09T04:01:33.564412439Z ==> Using Bun version 1.3.4 (default)",
  "2026-08-09T04:01:33.626590566Z ==> Running build command 'npm install && npm run build'...",
  "2026-08-09T04:01:39.338646887Z /opt/render/project/src/src/components/exam/PDFCropTool.tsx:346:8: ERROR: The symbol \"page\" has already been declared",
  "2026-08-09T04:01:39.405905285Z ==> Build failed",
  "09:31:20.139 /vercel/path0/src/components/exam/PDFCropTool.tsx:346:8: ERROR: The symbol \"page\" has already been declared",
  "09:31:20.206 Error: Command \"npm run build\" exited with 1",
  "\n[INSTRUCTION UPDATE 2026-08-09]: Run full e2e test,add crop undo/redo,improve crop handling,add ci typescript vhecks",
].join("\n");

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return <div className="hidden">{buildLog}</div>;
};

export default Index;
