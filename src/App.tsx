import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import HomePage from "./pages/HomePage";
import DecisionSpacesPage from "./pages/DecisionSpacesPage";
import ProposalsPage from "./pages/ProposalsPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import MeetingsPage from "./pages/MeetingsPage";
import DecisionsPage from "./pages/DecisionsPage";
import DecisionRecordsPage from "./pages/DecisionRecordsPage";
import AIEvaluationPage from "./pages/AIEvaluationPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuthorityPage from "./pages/AuthorityPage";
import DecisionReviewPage from "./pages/DecisionReviewPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/decision-spaces" element={<DecisionSpacesPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/decisions" element={<DecisionReviewPage />} />
        <Route path="/decision-records" element={<DecisionRecordsPage />} />
        <Route path="/ai-evaluation" element={<AIEvaluationPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/authority" element={<AuthorityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function AuthRoute() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
