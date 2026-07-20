import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
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
import ProfilePage from "./pages/ProfilePage";
import TeamPage from "./pages/TeamPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import InvitePage from "./pages/InvitePage";
import CEOProfilePage from "./pages/CEOProfilePage";
import DecisionIntakePage from "./pages/DecisionIntakePage";
import DecisionMemoryPage from "./pages/DecisionMemoryPage";
import DelegationEnginePage from "./pages/DelegationEnginePage";
import TrainingDataPage from "./pages/TrainingDataPage";
import StrategicAlignmentPage from "./pages/StrategicAlignmentPage";
import TwinOnboardingPage from "./pages/TwinOnboardingPage";
import TrustPage from "./pages/TrustPage";
import VoiceAssistantPage from "./pages/VoiceAssistantPage";
import NotFound from "./pages/NotFound";
import ExecutiveDashboardPage from "./pages/ExecutiveDashboardPage";
import ApprovalCenterPage from "./pages/ApprovalCenterPage";
import ExecutionCenterPage from "./pages/ExecutionCenterPage";
import PoliciesPage from "./pages/PoliciesPage";
import AuditLedgerPage from "./pages/AuditLedgerPage";
import DecisionRoomPage from "./pages/DecisionRoomPage";
import DecisionTwinPage from "./pages/DecisionTwinPage";
import StructuredMemoryPage from "./pages/StructuredMemoryPage";
import PostDecisionReviewsPage from "./pages/PostDecisionReviewsPage";
import AgentPerformancePage from "./pages/AgentPerformancePage";
import AnomalyDetectionPage from "./pages/AnomalyDetectionPage";
import ComplianceReportsPage from "./pages/ComplianceReportsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import IntegrationDetailPage from "./pages/IntegrationDetailPage";

import DecisionRolesPage from "./pages/DecisionRolesPage";
import LandingPage from "./pages/LandingPage";
import AskDecisionOSPage from "./pages/AskDecisionOSPage";
import CompanyBrainPage from "./pages/CompanyBrainPage";
import ClientsPage from "./pages/ClientsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProcessesPage from "./pages/ProcessesPage";
import CompanySkillsPage from "./pages/CompanySkillsPage";
import RisksPage from "./pages/RisksPage";
import DataSourcesPage from "./pages/DataSourcesPage";
import AdminPermissionsPage from "./pages/AdminPermissionsPage";
import DecisionDetailPage from "./pages/DecisionDetailPage";
import SecurityAuditPage from "./pages/SecurityAuditPage";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, loading: authLoading } = useAuth();
  const { workspace, loading: wsLoading } = useWorkspace();

  if (authLoading || wsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/landing" replace />;
  }

  // User is authenticated but has no workspace → onboarding
  if (!workspace) {
    return <OnboardingPage />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<ExecutiveDashboardPage />} />
        <Route path="/ask" element={<AskDecisionOSPage />} />
        <Route path="/brain" element={<CompanyBrainPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/processes" element={<ProcessesPage />} />
        <Route path="/skills" element={<CompanySkillsPage />} />
        <Route path="/risks" element={<RisksPage />} />
        <Route path="/data-sources" element={<DataSourcesPage />} />
        <Route path="/admin" element={<AdminPermissionsPage />} />
        <Route path="/home-legacy" element={<HomePage />} />
        <Route path="/approvals-center" element={<ApprovalCenterPage />} />
        <Route path="/execution" element={<ExecutionCenterPage />} />
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/audit" element={<AuditLedgerPage />} />
        <Route path="/decisions/:id" element={<DecisionRoomPage />} />
        <Route path="/decision-twin" element={<DecisionTwinPage />} />
        <Route path="/structured-memory" element={<StructuredMemoryPage />} />
        <Route path="/reviews" element={<PostDecisionReviewsPage />} />
        <Route path="/agent-performance" element={<AgentPerformancePage />} />
        <Route path="/anomalies" element={<AnomalyDetectionPage />} />
        <Route path="/compliance" element={<ComplianceReportsPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/integrations/:provider" element={<IntegrationDetailPage />} />

        <Route path="/decision-roles" element={<DecisionRolesPage />} />
        <Route path="/ceo-profile" element={<CEOProfilePage />} />
        <Route path="/decision-intake" element={<DecisionIntakePage />} />
        <Route path="/decision-memory" element={<DecisionMemoryPage />} />
        <Route path="/delegation-engine" element={<DelegationEnginePage />} />
        <Route path="/strategic-alignment" element={<StrategicAlignmentPage />} />
        <Route path="/training-data" element={<TrainingDataPage />} />
        <Route path="/twin-onboarding" element={<TwinOnboardingPage />} />
        <Route path="/voice-assistant" element={<VoiceAssistantPage />} />
        <Route path="/decision-spaces" element={<DecisionSpacesPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/decisions" element={<DecisionReviewPage />} />
        <Route path="/decisions/list" element={<DecisionsPage />} />
        <Route path="/decisions/list/:id" element={<DecisionDetailPage />} />
        <Route path="/decision-records" element={<DecisionRecordsPage />} />
        <Route path="/ai-evaluation" element={<AIEvaluationPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/authority" element={<AuthorityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/trust" element={<TrustPage />} />
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

function InviteRoute() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/auth" replace />;
  return <InvitePage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <Routes>
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/auth" element={<AuthRoute />} />
                <Route path="/invite" element={<InviteRoute />} />
                <Route path="/trust" element={<TrustPage />} />
                <Route path="/*" element={<ProtectedRoutes />} />
              </Routes>
            </WorkspaceProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
