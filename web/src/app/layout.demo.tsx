import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { DemoDocument } from '@/components/demo/DemoDocument';
import { DemoLanguage } from '@/components/demo/DemoLanguage';
import { en } from '@/i18n/en';
import { LANGUAGE_INIT_SCRIPT } from '@/lib/demo-language';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: { default: en.meta.defaultTitle, template: `%s · ${en.meta.title}` },
  description: en.meta.description,
  referrer: 'no-referrer',
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: LANGUAGE_INIT_SCRIPT }} />
      </head>
      <body>
        <DemoLanguage>
          <DemoDocument />
          {children}
        </DemoLanguage>
      </body>
    </html>
  );
}
