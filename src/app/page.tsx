"use client";

import { AIThemeGenerator } from '@/components/ai-theme-generator';
import { AppHeader } from '@/components/app-header';
import { ThemeCustomizer } from '@/components/theme-customizer';
import { ThemePreview } from '@/components/theme-preview';
import { ThemeSharer } from '@/components/theme-sharer';
import { useTheme } from '@/contexts/theme-context';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { isLoading } = useTheme();

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-card border-b shadow-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-7 w-32" />
            </div>
          </div>
        </header>
        <main className="flex-grow container mx-auto p-4 md:p-8">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-4 space-y-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-6 border rounded-lg shadow-lg space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                  {i < 3 && <Skeleton className="h-10 w-full" />}
                </div>
              ))}
            </div>
            <div className="md:col-span-8 p-6 border rounded-lg shadow-xl">
              <Skeleton className="h-8 w-1/3 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-6" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background transition-colors duration-300 ease-in-out">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid md:grid-cols-12 gap-6 lg:gap-8">
          {/* Controls Column */}
          <div className="md:col-span-5 lg:col-span-4 space-y-6">
            <AIThemeGenerator />
            <Separator />
            <ThemeCustomizer />
            <Separator />
            <ThemeSharer />
          </div>

          {/* Preview Column */}
          <div className="md:col-span-7 lg:col-span-8">
            <ThemePreview />
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-muted-foreground text-sm border-t">
        <p>&copy; {new Date().getFullYear()} App Everyone. Unleash your creativity.</p>
      </footer>
    </div>
  );
}
