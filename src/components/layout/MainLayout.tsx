import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useUserAccessTracking } from '@/hooks/useUserAccessTracking';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  useUserAccessTracking();
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : 'var(--sidebar-current-width, 4rem)' }}
      >
        <div className="shrink-0 z-30 bg-background">
          <TopBar />
        </div>
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8 py-4 md:py-[25px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
