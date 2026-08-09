import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="hidden">
      {`2026-08-09T04:01:19.888239425Z ==> Downloading cache...

2026-08-09T04:01:19.916525011Z ==> Cloning from https://github.com/rhin867/biro-test

2026-08-09T04:01:25.302316037Z ==> Checking out commit 17fb95e326292476a63ab145108a81c7212c14fe in branch main

2026-08-09T04:01:33.031601419Z ==> Downloaded 272MB in 9s. Extraction took 4s.

2026-08-09T04:01:33.509879705Z ==> Using Node.js version 24.14.1 (default)

2026-08-09T04:01:33.509897452Z ==> Docs on specifying a Node.js version: https://render.com/docs/node-version

2026-08-09T04:01:33.564412439Z ==> Using Bun version 1.3.4 (default)

2026-08-09T04:01:33.564418624Z ==> Docs on specifying a Bun version: https://render.com/docs/bun-version

2026-08-09T04:01:33.564582604Z ==> Installing Bun version 1.3.4...

2026-08-09T04:01:33.626590566Z ==> Running build command 'npm install && npm run build'...

2026-08-09T04:01:36.395253744Z 

2026-08-09T04:01:36.395279302Z up to date, audited 590 packages in 3s

2026-08-09T04:01:36.395288746Z 

2026-08-09T04:01:36.395340806Z 107 packages are looking for funding

2026-08-09T04:01:36.395395984Z   run \`npm fund\` for details

2026-08-09T04:01:36.45852243Z 

2026-08-09T04:01:36.45854907Z 23 vulnerabilities (1 low, 3 moderate, 17 high, 2 critical)

2026-08-09T04:01:36.45855252Z 

2026-08-09T04:01:36.458555319Z To address all issues, run:

2026-08-09T04:01:36.458557807Z   npm audit fix

2026-08-09T04:01:36.458560266Z 

2026-08-09T04:01:36.45856255Z Run \`npm audit\` for details.

2026-08-09T04:01:36.642934707Z 

2026-08-09T04:01:36.642958484Z > vite_react_shadcn_ts@0.0.0 build

2026-08-09T04:01:36.642961747Z > vite build

2026-08-09T04:01:36.642963865Z 

2026-08-09T04:01:36.832681605Z vite v5.4.19 building for production...

2026-08-09T04:01:36.875919412Z transforming...

2026-08-09T04:01:37.069750007Z Browserslist: browsers data (caniuse-lite) is 14 months old. Please run:

2026-08-09T04:01:37.06976733Z   npx update-browserslist-db@latest

2026-08-09T04:01:37.069770391Z   Why you should do it regularly: https://github.com/browserslist/update-db#readme

2026-08-09T04:01:39.337951987Z ✓ 1700 modules transformed.

2026-08-09T04:01:39.338604474Z x Build failed in 2.48s

2026-08-09T04:01:39.338636454Z error during build:

2026-08-09T04:01:39.338644164Z [vite:esbuild] Transform failed with 1 error:

2026-08-09T04:01:39.338646887Z /opt/render/project/src/src/components/exam/PDFCropTool.tsx:346:8: ERROR: The symbol \"page\" has already been declared

2026-08-09T04:01:39.33864944Z file: /opt/render/project/src/src/components/exam/PDFCropTool.tsx:346:8

2026-08-09T04:01:39.338654693Z 

2026-08-09T04:01:39.338656796Z The symbol \"page\" has already been declared

2026-08-09T04:01:39.338658816Z 344|    }

2026-08-09T04:01:39.338662061Z 345|  

2026-08-09T04:01:39.338665503Z 346|    const page = pages[currentPage];

2026-08-09T04:01:39.338668232Z    |          ^

2026-08-09T04:01:39.338682539Z 347|    if (!page) return null;

2026-08-09T04:01:39.338684714Z 348|  

2026-08-09T04:01:39.338686238Z 

2026-08-09T04:01:39.338688434Z     at failureErrorWithLog (/opt/render/project/src/node_modules/esbuild/lib/main.js:1472:15)

2026-08-09T04:01:39.338690305Z     at /opt/render/project/src/node_modules/esbuild/lib/main.js:755:50

2026-08-09T04:01:39.338692454Z     at responseCallbacks.<computed> (/opt/render/project/src/node_modules/esbuild/lib/main.js:622:9)

2026-08-09T04:01:39.338694442Z     at handleIncomingPacket (/opt/render/project/src/node_modules/esbuild/lib/main.js:677:12)

2026-08-09T04:01:39.338696597Z     at Socket.readFromStdout (/opt/render/project/src/node_modules/esbuild/lib/main.js:600:7)

2026-08-09T04:01:39.338698601Z     at Socket.emit (node:events:508:28)

2026-08-09T04:01:39.338700982Z     at addChunk (node:internal/streams/readable:563:12)

2026-08-09T04:01:39.338702918Z     at readableAddChunkPushByteMode (node:internal/streams/readable:514:3)

2026-08-09T04:01:39.338704877Z     at Readable.push (node:internal/streams/readable:394:5)

2026-08-09T04:01:39.338707Z     at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)

2026-08-09T04:01:39.405905285Z ==> Build failed 😞

2026-08-09T04:01:39.40591796Z ==> Common ways to troubleshoot you.             09:31:08.449 Running build in Washington, D.C., USA (East) – iad1

09:31:08.450 Build machine configuration: 2 cores, 8 GB

09:31:08.600 Cloning github.com/rhin867/biro-test (Branch: main, Commit: 17fb95e)

09:31:09.201 Cloning completed: 600.000ms

09:31:09.392 Restored build cache from previous deployment (4w3QiqNQWJeVmKcBCTmCGaRsZ33z)

09:31:09.643 Running \"vercel build\"

09:31:09.677 Vercel CLI 58.1.0

09:31:10.199 Installing dependencies...

09:31:12.818 npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported

09:31:12.828 npm warn deprecated npmlog@5.0.1: This package is no longer supported.

09:31:12.829 npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.

09:31:12.855 npm warn deprecated are-we-there-yet@2.0.0: This package is no longer supported.

09:31:12.858 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported

09:31:12.863 npm warn deprecated gauge@3.0.2: This package is no longer supported.

09:31:12.897 npm warn deprecated tar@6.2.1: Old versions of tar are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exhorbitant rates) by contacting i@izs.me

09:31:16.841 

09:31:16.841 up to date in 7s

09:31:16.842 

09:31:16.842 101 packages are looking for funding

09:31:16.842   run \`npm fund\` for details

09:31:16.887 Running \"npm run build\"

09:31:16.989 

09:31:16.989 > vite_react_shadcn_ts@0.0.0 build

09:31:16.990 > vite build

09:31:16.990 

09:31:17.283 vite v5.4.19 building for production...

09:31:17.336 transforming...

09:31:17.655 Browserslist: browsers data (caniuse-lite) is 14 months old. Please run:

09:31:17.656   npx update-browserslist-db@latest

09:31:17.656   Why you should do it regularly: https://github.com/browserslist/update-db#readme

09:31:20.135 ✓ 158 modules transformed.

09:31:20.138 x Build failed in 2.83s

09:31:20.138 error during build:

09:31:20.139 [vite:esbuild] Transform failed with 1 error:

09:31:20.139 /vercel/path0/src/components/exam/PDFCropTool.tsx:346:8: ERROR: The symbol \"page\" has already been declared

09:31:20.139 file: /vercel/path0/src/components/exam/PDFCropTool.tsx:346:8

09:31:20.139 

09:31:20.139 The symbol \"page\" has already been declared

09:31:20.139 344|    }

09:31:20.139 345|  

09:31:20.139 346|    const page = pages[currentPage];

09:31:20.139    |          ^

09:31:20.140 347|    if (!page) return null;

09:31:20.140 348|  

09:31:20.140 

09:31:20.140     at failureErrorWithLog (/vercel/path0/node_modules/esbuild/lib/main.js:1472:15)

09:31:20.140     at /vercel/path0/node_modules/esbuild/lib/main.js:755:50

09:31:20.140     at responseCallbacks.<computed> (/vercel/path0/node_modules/esbuild/lib/main.js:622:9)

09:31:20.140     at handleIncomingPacket (/vercel/path0/node_modules/esbuild/lib/main.js:677:12)

09:31:20.140     at Socket.readFromStdout (/vercel/path0/node_modules/esbuild/lib/main.js:600:7)

09:31:20.140     at Socket.emit (node:events:509:28)

09:31:20.140     at addChunk (node:internal/streams/readable:563:12)

09:31:20.140     at readableAddChunkPushByteMode (node:internal/streams/readable:514:3)

09:31:20.140     at Readable.push (node:internal/streams/readable:394:5)

09:31:20.140     at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)

09:31:20.206 Error: Command \"npm run build\" exited with 1r deploy: https://render.com/docs/troubleshooting-deploys\`}
    </div>
  );
};

export default Index;
