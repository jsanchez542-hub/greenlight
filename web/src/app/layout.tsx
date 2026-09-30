import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'GreenLight scan results for n8n workflows',
  description:
    'Silent errors, slow-downs, silence and dropped schedules in n8n workflows, read from a scan of the instance.',
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
