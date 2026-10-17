import type { Metadata } from 'next';
import { en } from '@/i18n/en';
import { siteUrl } from './demo';
import { demoDocument, fullTitle } from './demo-titles';
import { sampleResult } from './sample';

export const SOCIAL_IMAGE = { path: '/og/overview.png', width: 1200, height: 630, type: 'image/png' } as const;

/**
 * What a page of the demo says about itself to search engines and to the sites a link is shared
 * on. Those read the built page and run no script, so this is the English text; a visitor's
 * browser then shows the page in their own language. Every address is absolute, as the services
 * that make link previews require.
 */
export function demoPageMetadata(path: string): Metadata {
  const texts = demoDocument(path, sampleResult, en, 'en');
  const url = siteUrl(path);
  const home = path === '/';
  const shared = {
    title: home ? en.meta.defaultTitle : fullTitle(texts, en),
    description: home ? en.meta.description : texts.description,
  };
  const image = {
    url: siteUrl(SOCIAL_IMAGE.path),
    width: SOCIAL_IMAGE.width,
    height: SOCIAL_IMAGE.height,
    type: SOCIAL_IMAGE.type,
    alt: en.demo.socialImage,
  };

  return {
    title: texts.standalone ? { absolute: texts.title } : texts.title,
    description: texts.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: en.meta.title,
      url,
      locale: 'en_US',
      alternateLocale: ['es_ES'],
      images: [image],
      ...shared,
    },
    twitter: {
      card: 'summary_large_image',
      images: [{ url: image.url, alt: image.alt }],
      ...shared,
    },
  };
}
