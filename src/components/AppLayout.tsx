import { useLanguage } from "@/contexts/LanguageContext";
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { TopBar } from '@/components/TopBar';
import { LicenseBanner } from '@/components/LicenseBanner';
import { PageBackButton } from '@/components/PageBackButton';
import { RecordFocus } from '@/components/RecordFocus';

export function AppLayout({ children }: { children: React.ReactNode }) {
  useLanguage();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <LicenseBanner />
          <main className="flex-1 overflow-auto p-4 sm:p-6 bg-background">
            <RecordFocus />
            <PageBackButton />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
