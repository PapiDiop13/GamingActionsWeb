import './globals.css';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import Providers from '@/components/layout/Providers';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Gaming Actions — Rize to the GG ⚡',
  description: 'La plateforme sociale gaming. Clips, GGs, Rankings.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {/* hls.js from CDN for Mux HLS streams */}
        <Script
          src="https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js"
          strategy="beforeInteractive"
        />
        <Providers>
          <div className="min-h-screen flex flex-col" style={{ background: 'var(--black)' }}>
            <Navbar />
            <div className="flex flex-1 w-full">
              <Sidebar />
              <main className="flex-1 min-w-0 overflow-hidden">
                {children}
              </main>
            </div>
          </div>
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: 'var(--card)',
                color: 'var(--white)',
                border: '1px solid var(--gray3)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
