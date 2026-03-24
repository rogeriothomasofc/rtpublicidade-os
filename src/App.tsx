import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PWAProvider, PWAInstallPrompt, OfflineBanner } from "@/components/pwa";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { usePermissions } from "@/hooks/usePermissions";
import { AppErrorBoundary, PageErrorBoundary } from "@/components/layout/ErrorBoundary";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import OfflinePage from "./pages/OfflinePage";

// Lazy-loaded pages for code splitting
const ClientPortalPage = lazy(() => import("./pages/ClientPortalPage"));
const Dashboard = lazy(() => import("./pages/Index"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const FinancePage = lazy(() => import("./pages/FinancePage"));
const PipelinePage = lazy(() => import("./pages/PipelinePage"));
const ProposalsPage = lazy(() => import("./pages/ProposalsPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const ContractsPage = lazy(() => import("./pages/ContractsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PlanningPage = lazy(() => import("./pages/PlanningPage"));
const PlanningDetailPage = lazy(() => import("./pages/PlanningDetailPage"));
const ContentPage = lazy(() => import("./pages/ContentPage"));
const SquadPage = lazy(() => import("./pages/SquadPage"));

const queryClient = new QueryClient();

// Page-level error boundary wrapper
const P = ({ children }: { children: React.ReactNode }) => (
  <PageErrorBoundary>{children}</PageErrorBoundary>
);

// Permission guard: redirects to / if user doesn't have access to the page
function G({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { hasPermission, loading } = usePermissions();
  if (loading) return null;
  if (!hasPermission(slug)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  // AppErrorBoundary: last-resort safety net for catastrophic failures
  // (broken providers, renderer crashes, etc.) — shows a reload prompt.
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAProvider>
          <OfflineBanner />
          <PWAInstallPrompt />
          <BrowserRouter>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/portal" element={<ProtectedRoute allowClient><P><ClientPortalPage /></P></ProtectedRoute>} />
              <Route path="/offline" element={<OfflinePage />} />
              <Route path="/" element={<ProtectedRoute><P><Dashboard /></P></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><G slug="clients"><P><ClientsPage /></P></G></ProtectedRoute>} />
              <Route path="/clients/:id" element={<ProtectedRoute><G slug="clients"><P><ClientDetailPage /></P></G></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><G slug="projects"><P><ProjectsPage /></P></G></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><G slug="tasks"><P><TasksPage /></P></G></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute><G slug="finance"><P><FinancePage /></P></G></ProtectedRoute>} />
              <Route path="/pipeline" element={<ProtectedRoute><G slug="pipeline"><P><PipelinePage /></P></G></ProtectedRoute>} />
              <Route path="/proposals" element={<ProtectedRoute><G slug="proposals"><P><ProposalsPage /></P></G></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><G slug="team"><P><TeamPage /></P></G></ProtectedRoute>} />
              <Route path="/contracts" element={<ProtectedRoute><G slug="contracts"><P><ContractsPage /></P></G></ProtectedRoute>} />
              <Route path="/planning" element={<ProtectedRoute><G slug="planning"><P><PlanningPage /></P></G></ProtectedRoute>} />
              <Route path="/planning/:id" element={<ProtectedRoute><G slug="planning"><P><PlanningDetailPage /></P></G></ProtectedRoute>} />
              <Route path="/content" element={<ProtectedRoute><G slug="content"><P><ContentPage /></P></G></ProtectedRoute>} />
              <Route path="/squad" element={<ProtectedRoute><P><SquadPage /></P></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><G slug="settings"><P><SettingsPage /></P></G></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </BrowserRouter>
        </PWAProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
