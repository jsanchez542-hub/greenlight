import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { LanguageProvider } from '@/i18n/context';
import { currentLanguage, currentMessages } from '@/lib/server/language';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await currentMessages();
  return {
    title: { default: t.meta.defaultTitle, template: `%s · ${t.meta.title}` },
    description: t.meta.description,
  };
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const lang = await currentLanguage();

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <LanguageProvider lang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
