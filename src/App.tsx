import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PWAProvider, PWAInstallPrompt, PWAUpdatePrompt, OfflineBanner } from "@/components/pwa";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppErrorBoundary, PageErrorBoundary } from "@/components/layout/ErrorBoundary";
import AuthPage from "./pages/AuthPage";
import { FocusMode } from "@/components/focus/FocusMode";
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
const WhatsAppPage = lazy(() => import("./pages/WhatsAppPage"));
const PlanningPage = lazy(() => import("./pages/PlanningPage"));
const PlanningDetailPage = lazy(() => import("./pages/PlanningDetailPage"));

const queryClient = new QueryClient();

// Thin wrapper so routes stay readable — adds a page-level error boundary
// that keeps the sidebar alive and lets the user retry or go home.
const P = ({ children }: { children: React.ReactNode }) => (
  <PageErrorBoundary>{children}</PageErrorBoundary>
);

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
          <PWAUpdatePrompt />
        </PWAProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/portal" element={<ProtectedRoute allowClient><P><ClientPortalPage /></P></ProtectedRoute>} />
              <Route path="/offline" element={<OfflinePage />} />
              <Route path="/" element={<ProtectedRoute><P><Dashboard /></P></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><P><ClientsPage /></P></ProtectedRoute>} />
              <Route path="/clients/:id" element={<ProtectedRoute><P><ClientDetailPage /></P></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><P><ProjectsPage /></P></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><P><TasksPage /></P></ProtectedRoute>} />

              <Route path="/finance" element={<ProtectedRoute><P><FinancePage /></P></ProtectedRoute>} />
              <Route path="/pipeline" element={<ProtectedRoute><P><PipelinePage /></P></ProtectedRoute>} />
              <Route path="/proposals" element={<ProtectedRoute><P><ProposalsPage /></P></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><P><TeamPage /></P></ProtectedRoute>} />
              <Route path="/contracts" element={<ProtectedRoute><P><ContractsPage /></P></ProtectedRoute>} />
              <Route path="/whatsapp" element={<ProtectedRoute><P><WhatsAppPage /></P></ProtectedRoute>} />

              <Route path="/planning" element={<ProtectedRoute><P><PlanningPage /></P></ProtectedRoute>} />
              <Route path="/planning/:id" element={<ProtectedRoute><P><PlanningDetailPage /></P></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><P><SettingsPage /></P></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <FocusMode />
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
