'use client';

import { usePathname } from 'next/navigation';
import { normalizePath } from './navigation';

export function usePath(): string {
  return normalizePath(usePathname());
}
