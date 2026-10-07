import { VERSION } from 'greenlight';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VersionNote } from '@/components/shell/VersionNote';
import { versionLabel } from '@/lib/version';

describe('version note', () => {
  it('shows the version the package exports', () => {
    const markup = renderToStaticMarkup(createElement(VersionNote, { version: VERSION, placement: 'sidebar' }));
    expect(markup).toContain(`GreenLight v${VERSION}`);
  });

  it('is plain text, readable by a screen reader, with no hidden labels or links', () => {
    for (const [placement, tag] of [['sidebar', 'div'], ['page', 'footer']] as const) {
      const markup = renderToStaticMarkup(createElement(VersionNote, { version: '1.0.0', placement }));
      expect(markup).toMatch(new RegExp(String.raw`^<${tag} [^>]*><p [^>]*>GreenLight v1\.0\.0</p></${tag}>$`));
      expect(markup).not.toContain('aria-hidden');
    }
  });

  it('accepts release and pre-release numbers', () => {
    expect(versionLabel('1.0.0')).toBe('GreenLight v1.0.0');
    expect(versionLabel('2.10.3-beta.1')).toBe('GreenLight v2.10.3-beta.1');
  });

  it('shows nothing for anything that is not a version number', () => {
    for (const value of ['', 'latest', '1.0', '<img src=x onerror=alert(1)>', '1.0.0<script>', '1.0.0\n2', `1.${'0'.repeat(50)}.0`]) {
      expect(versionLabel(value)).toBeNull();
      expect(renderToStaticMarkup(createElement(VersionNote, { version: value, placement: 'sidebar' }))).toBe('');
    }
  });
});
