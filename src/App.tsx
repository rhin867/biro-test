import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CreateTest from "./pages/CreateTest";
import MyTests from "./pages/MyTests";
import ExamInterface from "./pages/ExamInterface";
import TestAnalysis from "./pages/TestAnalysis";
import History from "./pages/History";
import MistakeBook from "./pages/MistakeBook";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreateTest />} />
          <Route path="/tests" element={<MyTests />} />
          <Route path="/exam/:testId" element={<ExamInterface />} />
          <Route path="/analysis/:attemptId" element={<TestAnalysis />} />
          <Route path="/history" element={<History />} />
          <Route path="/mistakes" element={<MistakeBook />} />
          <Route path="/plan" element={<Dashboard />} />
          <Route path="/analysis" element={<History />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
