import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { UserProvider } from '@/components/user-provider';
import { Analytics } from "@vercel/analytics/next"
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OrganizAPP - Sistema de Gestión de Proyectos',
  description: 'Sistema de gestión de proyectos interno by SAIA LABS',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Sistema de gestión de proyectos interno by SAIA LABS" />

        {/* Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href="/icon-black.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/icon-white.png" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />

        {/* No indexing */}
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />

        {/* Open Graph */}
        <meta property="og:title" content="OrganizAPP by SAIA LABS" />
        <meta property="og:description" content="Sistema de gestión de proyectos interno by SAIA LABS" />
        <meta property="og:site_name" content="OrganizAPP" />
        <meta property="og:locale" content="es_ES" />
        <meta property="og:type" content="website" />

        {/* Author */}
        <meta name="author" content="SAIA LABS" />

        {/* Web App Manifest */}
        <link rel="manifest" href="/web-app-manifest-512x512.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <UserProvider>
            <Analytics />
            {children}
            <Toaster />
          </UserProvider>
        </ThemeProvider>

        {/* Analytics scripts — must be outside <head> in Next.js */}
        <Script
          strategy="afterInteractive"
          src="https://plausible.io/js/pa-DjNMEj3oROaXMoY4-HGLf.js"
        />
        <Script id="plausible-init" strategy="afterInteractive">{`
          window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)};
          window.plausible.init=window.plausible.init||function(i){plausible.o=i||{}};
          window.plausible.init();
        `}</Script>
        <Script
          strategy="afterInteractive"
          src="https://getsleek.io/v1.js"
          data-site="xRx3jLtq81ymAbbu"
        />
      </body>
    </html>
  );
}
