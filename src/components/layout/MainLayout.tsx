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
    <div className="flex h-screen w-full overflow-hidden bg-sidebar">
      <AppSidebar />
      <div
        className="flex-1 overflow-y-auto transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : 'var(--sidebar-current-width, 4rem)' }}
      >
        {/* TopBar — não fixo, rola com o conteúdo */}
        <TopBar />

        {/* Container usa bg-card — mesma cor dos cards, ficam transparentes dentro */}
        <div className="mx-8 mb-6 rounded-2xl bg-card min-h-[calc(100vh-6.5rem)] overflow-hidden">
          <div className="p-4 md:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
