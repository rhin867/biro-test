import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { NTAModeProvider } from "@/contexts/NTAModeContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import CreateTest from "./pages/CreateTest";
import MyTests from "./pages/MyTests";
import ExamInterface from "./pages/ExamInterface";
import TestAnalysis from "./pages/TestAnalysis";
import History from "./pages/History";
import MistakeBook from "./pages/MistakeBook";
import StudyPlanner from "./pages/StudyPlanner";
import ExportImport from "./pages/ExportImport";
import GoalTracker from "./pages/GoalTracker";
import JoinTest from "./pages/JoinTest";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <NTAModeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/join/:shareCode" element={<JoinTest />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <CreateTest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tests"
              element={
                <ProtectedRoute>
                  <MyTests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam/:testId"
              element={
                <ProtectedRoute>
                  <ExamInterface />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analysis/:attemptId"
              element={
                <ProtectedRoute>
                  <TestAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mistakes"
              element={
                <ProtectedRoute>
                  <MistakeBook />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plan"
              element={
                <ProtectedRoute>
                  <StudyPlanner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/export"
              element={
                <ProtectedRoute>
                  <ExportImport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goal"
              element={
                <ProtectedRoute>
                  <GoalTracker />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analysis"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </NTAModeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
