import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PWAProvider, PWAInstallPrompt, PWAUpdatePrompt, OfflineBanner } from "@/components/pwa";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
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

const App = () => (
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
            <Route path="/portal" element={<ProtectedRoute allowClient><ClientPortalPage /></ProtectedRoute>} />
            <Route path="/offline" element={<OfflinePage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
            
            <Route path="/finance" element={<ProtectedRoute><FinancePage /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
            <Route path="/proposals" element={<ProtectedRoute><ProposalsPage /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
            <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>} />
            
            <Route path="/planning" element={<ProtectedRoute><PlanningPage /></ProtectedRoute>} />
            <Route path="/planning/:id" element={<ProtectedRoute><PlanningDetailPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <FocusMode />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
