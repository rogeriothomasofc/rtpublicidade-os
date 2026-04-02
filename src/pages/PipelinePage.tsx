import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { InstagramProspecting } from '@/components/pipeline/InstagramProspecting';
import { GmbLeads } from '@/components/pipeline/GmbLeads';
import { CadenceReminders } from '@/components/pipeline/CadenceReminders';
import { ProspectionDashboard } from '@/components/pipeline/ProspectionDashboard';
import { useSalesPipeline } from '@/hooks/useSalesPipeline';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TrendingUp, Instagram, MapPin, LayoutDashboard } from 'lucide-react';

export default function PipelinePage() {
  const { data: leads, isLoading } = useSalesPipeline();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-72 h-96 bg-secondary/50 rounded-lg p-4">
                <Skeleton className="h-6 w-24 mb-4" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">
        <CadenceReminders />
        <Tabs defaultValue="dashboard">
          <TabsList className="h-9">
            <TabsTrigger value="dashboard" className="gap-1.5 text-sm">
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5 text-sm">
              <TrendingUp className="w-3.5 h-3.5" /> Pipeline
            </TabsTrigger>
            <TabsTrigger value="instagram" className="gap-1.5 text-sm">
              <Instagram className="w-3.5 h-3.5" /> Prospecção Instagram
            </TabsTrigger>
            <TabsTrigger value="gmb" className="gap-1.5 text-sm">
              <MapPin className="w-3.5 h-3.5" /> Google Maps
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <ProspectionDashboard />
          </TabsContent>
          <TabsContent value="pipeline" className="mt-4">
            <PipelineBoard leads={leads || []} />
          </TabsContent>
          <TabsContent value="instagram" className="mt-4">
            <InstagramProspecting />
          </TabsContent>
          <TabsContent value="gmb" className="mt-4">
            <GmbLeads />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
