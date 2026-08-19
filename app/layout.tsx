import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import AppSplash from '@/components/AppSplash';
import PageTransition from '@/components/PageTransition';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Salvá el Fútbol',
  description: 'Conectamos partidos con jugadores en segundos.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1E9E4A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-neutral-200">
        <AuthProvider>
          <ThemeProvider>
            <AppSplash>
              <div className="mx-auto min-h-screen max-w-[440px] bg-bg pb-24 shadow-2xl sm:my-6 sm:min-h-[calc(100vh-48px)] sm:rounded-3xl overflow-hidden relative">
                <Sidebar />
                <PageTransition>{children}</PageTransition>
                <Toaster position="bottom-center" />
              </div>
            </AppSplash>
            <BottomNav />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
