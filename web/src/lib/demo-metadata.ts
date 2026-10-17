import type { Metadata } from 'next';
import { en } from '@/i18n/en';
import { demoDocument } from './demo-titles';
import { sampleResult } from './sample';

/** What a page of the demo is called in the built page, in English; the browser then gives it in the language of the visitor. */
export function demoPageMetadata(path: string): Metadata {
  const texts = demoDocument(path, sampleResult, en, 'en');
  return {
    title: texts.standalone ? { absolute: texts.title } : texts.title,
    description: texts.description,
  };
}
