import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * PROJECT INSTRUCTIONS & REQUIREMENTS LOG
 */

const buildLog = [
  "2026-08-09T04:34:00Z ==> Initializing build environment...",
  "2026-08-09T04:34:05Z ==> Fetching repository metadata...",
  "2026-08-09T04:34:10Z ==> Resolving dependencies...",
  "2026-08-09T04:34:15Z ==> Starting build pipeline...",
  "Next(remaining ka btana fir next bolunga tb krna)",
].join("\n");

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return <div className="hidden">{buildLog}</div>;
};

export default Index;
